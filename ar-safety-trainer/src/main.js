// Entry point: load styles + the <model-viewer> web component, draw the
// app shell, hook up Android-only behaviour, start routing, and refresh the
// logged-in user's profile from the server (skipped silently if offline).
import '@google/model-viewer'
// Government-style type: Noto Sans (Latin) + Noto Sans Devanagari (Hindi),
// bundled locally so the APK needs no network for fonts.
import '@fontsource/noto-sans/latin-400.css'
import '@fontsource/noto-sans/latin-600.css'
import '@fontsource/noto-sans/latin-700.css'
import '@fontsource/noto-sans/latin-800.css'
import '@fontsource/noto-sans-devanagari/devanagari-400.css'
import '@fontsource/noto-sans-devanagari/devanagari-600.css'
import '@fontsource/noto-sans-devanagari/devanagari-700.css'
import '@fontsource/noto-sans-devanagari/devanagari-800.css'
import './styles/index.css'
import { mountShell } from './app/shell.js'
import { startRouter } from './app/router.js'
import { initNativeApp } from './platform/nativeApp.js'
import { isLoggedIn } from './core/session.js'
import { refreshProfile } from './features/account/accountApi.js'
import { initMesh } from './features/mesh/meshService.js'

const main = mountShell(document.querySelector('#app'))
initNativeApp()
startRouter(main)
if (isLoggedIn()) refreshProfile()
// Offline phone-to-phone network (Android app only; no-op on the website).
initMesh()
