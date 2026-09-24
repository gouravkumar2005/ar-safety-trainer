// Entry point: load styles + the <model-viewer> web component, draw the
// app shell, hook up Android-only behaviour, start routing, and refresh the
// logged-in user's profile from the server (skipped silently if offline).
import '@google/model-viewer'
import './styles/index.css'
import { mountShell } from './app/shell.js'
import { startRouter } from './app/router.js'
import { initNativeApp } from './platform/nativeApp.js'
import { isLoggedIn } from './core/session.js'
import { refreshProfile } from './features/account/accountApi.js'

const main = mountShell(document.querySelector('#app'))
initNativeApp()
startRouter(main)
if (isLoggedIn()) refreshProfile()
