import { getModule } from '../../content/modules.js'
import { t, pick } from '../../core/i18n/index.js'
import { getResult } from '../../core/state.js'
import { burstConfetti } from '../../shared/ui/confetti.js'
import { icon } from '../../shared/ui/icon.js'

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
    <button class="back-btn" id="back">${icon('arrow-left', { size: 22 })} ${t('backToModules')}</button>
    <h2 class="h2-title center" style="margin:8px 0 0;">${pick(mod.title)}</h2>

    <div class="score-ring-wrap" id="score-ring-wrap">
      <svg viewBox="0 0 140 140" width="150" height="150" aria-hidden="true">
        <circle cx="70" cy="70" r="60" fill="none" stroke="var(--surface-2)" stroke-width="10" />
        <circle
          id="score-ring"
          cx="70" cy="70" r="60" fill="none"
          stroke="${ringColor}" stroke-width="10" stroke-linecap="round"
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

    <div class="big-status ${result.passed ? 'is-good' : 'is-bad'}" style="margin-top:0;">
      <strong>${icon(result.passed ? 'circle-check' : 'circle-x', { size: 28 })} ${result.passed ? t('pass') : t('fail')}</strong>
      <span class="badge badge-info">${icon('trophy', { size: 14 })} ${t('passThreshold')}</span>
    </div>

    <div class="stack mt-16">
      ${
        result.passed
          ? `<button class="btn btn-good btn-block" id="cert-btn">${icon('award', { size: 24 })} ${t('getCertificate')}</button>`
          : `<button class="btn btn-primary btn-block" id="retry-btn">${icon('rotate-ccw', { size: 22 })} ${t('retryQuiz')}</button>`
      }
      <button class="btn btn-block" id="modules-btn">${icon('house', { size: 22 })} ${t('backToModules')}</button>
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
