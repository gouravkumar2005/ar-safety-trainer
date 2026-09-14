import { getModule } from '../data/modules.js'
import { t, pick } from '../utils/i18n.js'
import { getResult } from '../utils/state.js'
import { burstConfetti } from '../utils/confetti.js'

const RING_CIRCUMFERENCE = 2 * Math.PI * 60 // r=60, matches the SVG below

export function renderResult(main, navigate, params) {
  const mod = getModule(params.id)
  const result = getResult(params.id)
  if (!mod || !result) {
    navigate('#/')
    return
  }

  const pct = Math.round((result.score / result.total) * 100)
  const ringColor = result.passed ? 'var(--good)' : 'var(--bad)'

  main.innerHTML = `
    <button class="btn btn-ghost" id="back">&larr; ${t('backToModules')}</button>
    <h2 class="h2-title" style="margin:12px 0 0;">${pick(mod.title)}</h2>

    <div class="score-ring-wrap" id="score-ring-wrap">
      <svg viewBox="0 0 140 140" width="140" height="140">
        <circle cx="70" cy="70" r="60" fill="none" stroke="var(--border)" stroke-width="8" />
        <circle
          id="score-ring"
          cx="70" cy="70" r="60" fill="none"
          stroke="${ringColor}" stroke-width="8" stroke-linecap="round"
          stroke-dasharray="${RING_CIRCUMFERENCE}"
          stroke-dashoffset="${RING_CIRCUMFERENCE}"
          transform="rotate(-90 70 70)"
        />
      </svg>
      <div class="score-ring-text">
        <strong>${pct}%</strong>
        <span>${result.score}/${result.total}</span>
      </div>
    </div>

    <p style="text-align:center;font-weight:700;color:${result.passed ? 'var(--good)' : 'var(--bad)'};">
      ${result.passed ? t('pass') : t('fail')}
    </p>
    <p class="text-xs-dim" style="text-align:center;">${t('passThreshold')}</p>

    <div class="stack" style="margin-top:20px;">
      ${
        result.passed
          ? `<button class="btn btn-accent btn-block" id="cert-btn">${t('getCertificate')}</button>`
          : `<button class="btn btn-primary btn-block" id="retry-btn">${t('retryQuiz')}</button>`
      }
      <button class="btn btn-block" id="modules-btn">${t('backToModules')}</button>
    </div>
  `

  main.querySelector('#back').addEventListener('click', () => navigate('#/'))
  main.querySelector('#modules-btn').addEventListener('click', () => navigate('#/'))
  main.querySelector('#retry-btn')?.addEventListener('click', () => navigate(`#/module/${mod.id}/quiz`))
  main.querySelector('#cert-btn')?.addEventListener('click', () => navigate(`#/module/${mod.id}/certificate`))

  // Animate the ring fill — must set the "0%" starting state, let the
  // browser paint it, then change to the real value on the next frame so
  // the CSS transition actually has something to animate from.
  const ring = main.querySelector('#score-ring')
  ring.style.transition = 'stroke-dashoffset 1s ease-out'
  requestAnimationFrame(() => {
    ring.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - pct / 100))
  })

  if (result.passed) {
    // Burst over the whole screen area, not just the small ring — a
    // celebratory moment should spread, not stay cramped in a 140px box.
    burstConfetti(main)
  }
}
