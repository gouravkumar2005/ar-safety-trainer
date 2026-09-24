// Tiny hash router. URLs look like #/module/ppe-compliance/quiz.
// Route patterns ("/module/:id/quiz") live in each feature's index.js; this
// file only matches the current hash against them and renders the winner.

import { PPE_GATE_ENABLED } from '../config.js'
import { PPE_GATE_MODULE_ID, EMERGENCY_RESPONSE_MODULE_ID } from '../content/modules.js'
import { getResult } from '../core/state.js'
import { routes, fallbackRoute } from './routes.js'

let mainEl = null

export function navigate(hash) {
  window.location.hash = hash
}

// The current hash as a clean path, e.g. "#/module/x/" -> "/module/x".
export function currentPath() {
  return '/' + window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).join('/')
}

// Matches "/module/:id/quiz" against "/module/fire/quiz" -> { id: 'fire' },
// or returns null if the path doesn't fit the pattern.
function matchPath(pattern, path) {
  const want = pattern.split('/').filter(Boolean)
  const got = path.split('/').filter(Boolean)
  if (want.length !== got.length) return null
  const params = {}
  for (let i = 0; i < want.length; i++) {
    if (want[i].startsWith(':')) params[want[i].slice(1)] = decodeURIComponent(got[i])
    else if (want[i] !== got[i]) return null
  }
  return params
}

function resolve(path) {
  for (const route of routes) {
    const params = matchPath(route.path, path)
    if (params) return { route, params }
  }
  return { route: fallbackRoute, params: {} }
}

// Emergency Response is exempt from the gate on purpose, gate-enabled or
// not — the topbar's 🚨 button promises one-tap access from anywhere, and
// blocking real first-aid help behind an unrelated induction quiz would be
// actively dangerous during an actual accident.
function isBlockedByPpeGate(params) {
  if (!PPE_GATE_ENABLED || !params.id) return false
  if (params.id === PPE_GATE_MODULE_ID || params.id === EMERGENCY_RESPONSE_MODULE_ID) return false
  return !getResult(PPE_GATE_MODULE_ID)?.passed
}

// Renders whatever screen the current hash points at.
export function render() {
  const { route, params } = resolve(currentPath())

  // A redirect (no visible frame of its own) shouldn't get wrapped in a
  // transition — that would animate nothing and just add latency before
  // the real destination renders.
  if (isBlockedByPpeGate(params)) {
    navigate(`#/module/${PPE_GATE_MODULE_ID}`)
    return
  }

  // Every screen gets a brand-new container, and the previous one is
  // detached. Screens keep timers/narration callbacks alive (tour
  // auto-advance, sim completion); if one fires after the user has left,
  // it now draws into the detached container instead of over the new screen.
  const renderScreen = () => {
    window.scrollTo(0, 0)
    const screenEl = document.createElement('div')
    screenEl.className = 'screen'
    mainEl.replaceChildren(screenEl)
    route.render(screenEl, navigate, params)
  }

  // Progressive enhancement — document.startViewTransition simply doesn't
  // exist on unsupported browsers, so they just get the old instant swap,
  // never a broken half-state.
  if (document.startViewTransition) document.startViewTransition(renderScreen)
  else renderScreen()
}

export function startRouter(main) {
  mainEl = main
  window.addEventListener('hashchange', render)
  render()
}
