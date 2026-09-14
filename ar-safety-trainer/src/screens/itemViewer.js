import { getModule } from '../data/modules.js'
import { getGalleryItem } from '../data/itemGalleries.js'
import { t, pick, getLang } from '../utils/i18n.js'
import { speak, stopSpeaking } from '../utils/speech.js'

// One gallery item's dedicated viewer — same <model-viewer> setup as
// arViewer.js (rotate/zoom/AR-place, auto-rotate, interaction-prompt),
// scoped to a single item. Unlike a module's hotspots, the info here is
// already the whole point of the screen, so it's shown directly rather
// than hidden behind a tap. Generic over any module's gallery via
// itemGalleries.js (see itemGallery.js's header comment).

export function renderItemViewer(main, navigate, params) {
  const mod = getModule(params.id)
  const item = getGalleryItem(params.id, params.itemId)
  if (!mod || !item) {
    navigate(`#/module/${params.id}/gallery`)
    return
  }

  // See ppeItems.js/machineryItems.js's notes: these .glb exports were
  // all normalized to a 1m bounding box, which is invisible here
  // (model-viewer auto-frames regardless of scale) but very wrong once
  // placed in real AR — `scale` corrects it there without needing to
  // re-export the file.
  const s = item.scale ?? 1

  main.innerHTML = `
    <button class="btn btn-ghost" id="back">&larr; ${pick(mod.title)}</button>
    <h2 class="h2-title" style="margin:12px 0 4px;">${pick(item.title)}</h2>
    <div class="offline-pill">${t('offlineReady')}</div>

    <div class="viewer-wrap" style="margin-top:14px;">
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
        ar-modes="webxr scene-viewer quick-look"
      >
        <button slot="ar-button" class="btn btn-accent" style="position:absolute;bottom:12px;right:12px;">
          ${t('viewInAR')}
        </button>
      </model-viewer>
    </div>
    <p class="hint">${t('rotateHint')}</p>

    <div class="module-card" style="margin-top:16px;">
      <p style="color:var(--text);font-size:0.9375rem;line-height:1.5;">${pick(item.info)}</p>
      <div style="display:flex;gap:10px;margin-top:4px;">
        <button class="btn" id="listen-btn" style="flex:1;">${t('listenBtn')}</button>
      </div>
      <p class="hint" id="voice-note" hidden style="text-align:left;">${t('voiceUnavailableNote')}</p>
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
