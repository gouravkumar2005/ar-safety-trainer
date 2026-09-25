import { getModule } from '../../content/modules.js'
import { t, pick, getLang } from '../../core/i18n/index.js'
import { recordResult } from '../../core/state.js'
import { speak, stopSpeaking } from '../../platform/speech.js'
import { playCorrect, playIncorrect } from '../../shared/ui/sound.js'
import { icon } from '../../shared/ui/icon.js'

const KEYS = ['A', 'B', 'C', 'D', 'E', 'F']

export function renderQuiz(main, navigate, params) {
  const mod = getModule(params.id)
  if (!mod) {
    navigate('#/')
    return
  }

  let index = 0
  let selected = null
  let answered = false
  const answers = []

  function renderQuestion() {
    const q = mod.quiz[index]
    main.innerHTML = `
      <button class="back-btn" id="back">${icon('arrow-left', { size: 22 })} ${t('back')}</button>
      <div class="progress-dots mt-8" aria-hidden="true">
        ${mod.quiz.map((_, i) => `<span class="${i < index ? 'done' : i === index ? 'current' : ''}"></span>`).join('')}
      </div>
      <div class="q-head">
        <span class="q-count">${icon('clipboard-check', { size: 14 })} ${t('question')} ${index + 1}/${mod.quiz.length}</span>
        <button class="icon-btn" id="listen-btn" aria-label="${t('listenBtn')}" title="${t('listenBtn')}">${icon('volume-2', { size: 22 })}</button>
      </div>
      <div class="question" id="question-text">${pick(q.question)}</div>
      <p class="hint" id="voice-note" hidden>${t('voiceUnavailableNote')}</p>
      <div id="options" role="radiogroup" aria-labelledby="question-text"></div>
      <button class="btn btn-primary btn-block mt-8" id="action-btn" disabled>${icon('check', { size: 22 })} ${t('submit')}</button>
      <p aria-live="polite" class="sr-only" id="answer-announce"></p>
    `

    main.querySelector('#back').addEventListener('click', () => {
      stopSpeaking()
      navigate(`#/module/${mod.id}`)
    })
    main.querySelector('#listen-btn').addEventListener('click', async () => {
      // Read the question AND all options — a low-literacy worker needs
      // the choices read aloud too, not just the question.
      const optionsText = q.options.map((opt, i) => `${t('optionLabel')} ${i + 1}: ${pick(opt)}`).join('. ')
      const ok = await speak(`${pick(q.question)}. ${optionsText}`, getLang())
      main.querySelector('#voice-note').hidden = ok
    })

    const optionsEl = main.querySelector('#options')
    const actionBtn = main.querySelector('#action-btn')

    q.options.forEach((opt, i) => {
      const el = document.createElement('button')
      el.className = 'option'
      el.setAttribute('role', 'radio')
      el.setAttribute('aria-checked', 'false')
      el.innerHTML = `<span class="option-key">${KEYS[i] ?? i + 1}</span><span class="option-text">${pick(opt)}</span><span class="option-mark"></span>`
      el.addEventListener('click', () => {
        if (answered) return
        selected = i
        optionsEl.querySelectorAll('.option').forEach((o) => o.setAttribute('aria-checked', 'false'))
        optionsEl.querySelectorAll('.option').forEach((o) => o.classList.remove('selected'))
        el.classList.add('selected')
        el.setAttribute('aria-checked', 'true')
        actionBtn.disabled = false
      })
      optionsEl.appendChild(el)
    })

    actionBtn.addEventListener('click', () => {
      if (!answered) {
        answered = true
        answers.push({ questionIndex: index, selected, correct: q.correctIndex })
        const optionEls = optionsEl.querySelectorAll('.option')
        const wasCorrect = selected === q.correctIndex
        // Text (not just color) signal for correct/incorrect — screen
        // readers and colorblind users both need this, not just sighted
        // color-perceiving users (WCAG 1.4.1, color not the only cue).
        // The icon is the visible cue; the hidden suffix is the same
        // message for screen readers.
        const mark = (el, iconName, suffix) => {
          el.querySelector('.option-mark').innerHTML = `${icon(iconName, { size: 26 })}<span class="sr-only"> ${suffix}</span>`
        }
        optionEls[q.correctIndex].classList.add('correct')
        mark(optionEls[q.correctIndex], 'circle-check', t('optionCorrectSuffix'))
        if (!wasCorrect) {
          optionEls[selected].classList.add('incorrect')
          mark(optionEls[selected], 'circle-x', t('optionIncorrectSuffix'))
        }
        main.querySelector('#answer-announce').textContent = wasCorrect ? t('answerCorrectAnnounce') : t('answerIncorrectAnnounce')
        navigator.vibrate?.(wasCorrect ? 20 : [30, 50, 30])
        wasCorrect ? playCorrect() : playIncorrect()
        actionBtn.innerHTML = index < mod.quiz.length - 1
          ? `${t('next')} ${icon('chevron-right', { size: 22 })}`
          : `${icon('trophy', { size: 22 })} ${t('yourScore')}`
        return
      }
      index += 1
      answered = false
      selected = null
      if (index < mod.quiz.length) {
        renderQuestion()
      } else {
        finish()
      }
    })
  }

  async function finish() {
    const score = answers.filter((a) => a.selected === a.correct).length
    const total = mod.quiz.length
    await recordResult(mod.id, { score, total, answers })
    navigate(`#/module/${mod.id}/result`)
  }

  renderQuestion()
}
