import { getModule } from '../../content/modules.js'
import { t, pick, getLang } from '../../core/i18n/index.js'
import { recordResult } from '../../core/state.js'
import { speak, stopSpeaking } from '../../platform/speech.js'
import { playCorrect, playIncorrect } from '../../shared/ui/sound.js'

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
      <button class="btn btn-ghost" id="back">&larr; ${t('backToModules')}</button>
      <div class="progress-dots" aria-hidden="true" style="margin-top:14px;">
        ${mod.quiz.map((_, i) => `<span class="${i < index ? 'done' : i === index ? 'current' : ''}"></span>`).join('')}
      </div>
      <p class="text-xs-dim" style="margin:0 0 6px;">${t('question')} ${index + 1}/${mod.quiz.length}</p>
      <div class="question" id="question-text">${pick(q.question)}</div>
      <button class="btn" id="listen-btn" style="margin-bottom:12px;">${t('listenBtn')}</button>
      <p class="hint" id="voice-note" hidden style="text-align:left;margin:-6px 0 12px;">${t('voiceUnavailableNote')}</p>
      <div id="options" role="radiogroup" aria-labelledby="question-text"></div>
      <button class="btn btn-primary btn-block" id="action-btn" disabled style="margin-top:8px;">${t('submit')}</button>
      <p aria-live="polite" class="hint" id="answer-announce" style="position:absolute;left:-9999px;"></p>
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
      el.innerHTML = `<span class="option-text">${pick(opt)}</span>`
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
        optionEls[q.correctIndex].classList.add('correct')
        optionEls[q.correctIndex].querySelector('.option-text').textContent += ` ${t('optionCorrectSuffix')}`
        if (!wasCorrect) {
          optionEls[selected].classList.add('incorrect')
          optionEls[selected].querySelector('.option-text').textContent += ` ${t('optionIncorrectSuffix')}`
        }
        main.querySelector('#answer-announce').textContent = wasCorrect ? t('answerCorrectAnnounce') : t('answerIncorrectAnnounce')
        navigator.vibrate?.(wasCorrect ? 20 : [30, 50, 30])
        wasCorrect ? playCorrect() : playIncorrect()
        actionBtn.textContent = index < mod.quiz.length - 1 ? t('next') : t('yourScore')
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
