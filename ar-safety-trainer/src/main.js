// Entry point: load styles + the <model-viewer> web component, draw the
// app shell, hook up Android-only behaviour, and start routing.
import '@google/model-viewer'
import './styles/index.css'
import { mountShell } from './app/shell.js'
import { startRouter } from './app/router.js'
import { initNativeApp } from './platform/nativeApp.js'

const main = mountShell(document.querySelector('#app'))
initNativeApp()
startRouter(main)
