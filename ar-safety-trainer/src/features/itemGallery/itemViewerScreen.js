import { getModule } from '../../content/modules.js'
import { getGalleryItem } from '../../content/itemGalleries.js'
import { t, pick, getLang } from '../../core/i18n/index.js'
import { speak, stopSpeaking } from '../../platform/speech.js'
import { icon, ITEM_ICONS } from '../../shared/ui/icon.js'

// One gallery item's dedicated viewer — same <model-viewer> setup as
// training/arViewerScreen.js (rotate/zoom/AR-place, auto-rotate, interaction-prompt),
// scoped to a single item. Unlike a module's hotspots, the info here is
// already the whole point of the screen, so it's shown directly rather
// than hidden behind a tap. Generic over any module's gallery via
// content/itemGalleries.js (see itemGallery/galleryScreen.js's header comment).

export function renderItemViewer(main, navigate, params) {
  const mod = getModule(params.id)
  const item = getGalleryItem(params.id, params.itemId)
  if (!mod || !item) {
    navigate(`#/module/${params.id}/gallery`)
    return
  }

  // See content/ppeItems.js/machineryItems.js's notes: these .glb exports were
  // all normalized to a 1m bounding box, which is invisible here
  // (model-viewer auto-frames regardless of scale) but very wrong once
  // placed in real AR — `scale` corrects it there without needing to
  // re-export the file.
  const s = item.scale ?? 1

  main.innerHTML = `
    <button class="back-btn" id="back">${icon('arrow-left', { size: 22 })} ${t('ppeGalleryBtn')}</button>
    <div class="page-head">
      <span class="head-icon">${icon(ITEM_ICONS[item.id] || 'box', { size: 30 })}</span>
      <div>
        <h2>${pick(item.title)}</h2>
        <span class="offline-pill mt-8">${icon('wifi-off', { size: 14 })} ${t('offlineShort')}</span>
      </div>
    </div>

    <div class="viewer-wrap">
      <model-viewer
        id="mv"
        src="${item.model}"
        alt="${pick(item.title)}"
        scale="${s} ${s} ${s}"
        camera-controls
        touch-action="pan-y"
        shadow-intensity="1"
        exposure="1"
        auto-rotate
        auto-rotate-delay="1500"
        interaction-prompt="when-focused"
        ar
        ar-modes="scene-viewer webxr quick-look"
      >
        <button slot="ar-button" class="btn btn-accent ar-btn">${icon('scan', { size: 20 })} ${t('viewInAR')}</button>
      </model-viewer>
    </div>
    <div class="hint-icons">
      <span>${icon('rotate-3d', { size: 16 })} ${t('hintRotate')}</span>
      <span>${icon('move-3d', { size: 16 })} ${t('hintZoom')}</span>
    </div>

    <div class="module-card mt-16">
      <p style="color:var(--text);font-size:0.9375rem;">${pick(item.info)}</p>
      <button class="btn" id="listen-btn">${icon('volume-2', { size: 20 })} ${t('listenBtn')}</button>
      <p class="hint" id="voice-note" hidden>${t('voiceUnavailableNote')}</p>
    </div>
  `

  main.querySelector('#back').addEventListener('click', () => {
    stopSpeaking()
    navigate(`#/module/${mod.id}/gallery`)
  })
  main.querySelector('#listen-btn').addEventListener('click', async () => {
    const ok = await speak(`${pick(item.title)}. ${pick(item.info)}`, getLang())
    main.querySelector('#voice-note').hidden = ok
  })
}
