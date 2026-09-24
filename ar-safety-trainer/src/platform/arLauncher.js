// "View in your space" (real-world AR placement) inside the Android app.
//
// In a browser, <model-viewer>'s own AR button handles this (WebXR, or a
// hand-off to Google Scene Viewer). Inside the app's WebView neither works:
// WebView has no WebXR, and model-viewer's intent:// hand-off is blocked
// (it also rewrites the URL hash, which would confuse our hash router).
//
// So in the app, every model-viewer AR-button tap is intercepted here and
// opens the app's own AR screen (android/.../ar/ArViewerActivity.kt). It
// loads the model that's already bundled inside the APK, so it works fully
// OFFLINE, at the model's real-world size (its `scale` attribute).
//
// Phones that can't run ARCore at all fall back to Google Scene Viewer,
// which can only load models from the internet (the hosted copy at
// config.js's PUBLIC_SITE_URL), so that fallback needs a connection.

import { registerPlugin } from '@capacitor/core'
import { PUBLIC_SITE_URL } from '../config.js'
import { t } from '../core/i18n/index.js'

const ArViewer = registerPlugin('ArViewer')

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
  openAr(viewer)
}

async function openAr(viewer) {
  const src = viewer.getAttribute('src') // e.g. "/models/ppe-helmet.glb"
  const title = viewer.getAttribute('alt') || ''
  try {
    await ArViewer.open({
      // Capacitor packs the web build into the APK's assets/public/ folder.
      modelAsset: `public/${src.replace(/^\//, '')}`,
      title,
      sizeMetres: realWorldSize(viewer),
      hintScan: t('arHintScan'),
      hintTap: t('arHintTap'),
      hintPlaced: t('arHintPlaced'),
      errorText: t('arStartFailed'),
      closeLabel: t('arCloseLabel'),
    })
  } catch (err) {
    if (err?.code === 'unsupported') await openSceneViewerFallback(src, title)
    else alert(t('arStartFailed'))
  }
}

// <model-viewer scale="0.28 0.28 0.28"> -> 0.28. The .glb files are all
// normalised to a 1 m box, so this is the model's real size in metres.
function realWorldSize(viewer) {
  const size = Number.parseFloat(viewer.getAttribute('scale'))
  return Number.isFinite(size) && size > 0 ? size : 1
}

async function openSceneViewerFallback(src, title) {
  if (!navigator.onLine) {
    alert(t('arNeedsInternet'))
    return
  }
  try {
    await ArViewer.openSceneViewer({ file: new URL(src, PUBLIC_SITE_URL).toString(), title })
  } catch {
    alert(t('arUnavailable'))
  }
}
