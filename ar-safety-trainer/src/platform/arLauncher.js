// "View in your space" (real-world AR placement) inside the Android app.
//
// In a browser, <model-viewer>'s own AR button handles this (WebXR, or a
// hand-off to Google Scene Viewer). Inside the app's WebView neither works:
// WebView has no WebXR, and model-viewer's intent:// hand-off is blocked
// (it also rewrites the URL hash, which would confuse our hash router).
//
// So in the app, every model-viewer AR-button tap is intercepted here and
// opens Scene Viewer through a small native plugin instead
// (android/.../SceneViewerPlugin.java). Scene Viewer is a separate app and
// can't read files inside ours, so it's given the hosted copy of the model
// (config.js's PUBLIC_SITE_URL) — this one feature needs internet.

import { registerPlugin } from '@capacitor/core'
import { PUBLIC_SITE_URL } from '../config.js'
import { t } from '../core/i18n/index.js'

const SceneViewer = registerPlugin('SceneViewer')

export function interceptModelViewerArButtons() {
  // Capture phase, so this runs before model-viewer's own click handler
  // (which lives inside its shadow DOM, further down the event path).
  document.addEventListener('click', onClick, true)
}

function onClick(event) {
  const path = event.composedPath()
  const viewer = path.find((el) => el.tagName === 'MODEL-VIEWER')
  const tappedArButton = path.some((el) => el.slot === 'ar-button' || el.classList?.contains('ar-button'))
  if (!viewer || !tappedArButton) return

  event.preventDefault()
  event.stopPropagation()
  openInSceneViewer(viewer.getAttribute('src'), viewer.getAttribute('alt') || '')
}

async function openInSceneViewer(modelPath, title) {
  if (!navigator.onLine) {
    alert(t('arNeedsInternet'))
    return
  }
  try {
    await SceneViewer.open({ file: new URL(modelPath, PUBLIC_SITE_URL).toString(), title })
  } catch {
    alert(t('arUnavailable'))
  }
}
