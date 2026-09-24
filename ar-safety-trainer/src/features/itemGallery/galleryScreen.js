import { getModule } from '../../content/modules.js'
import { getItemGallery } from '../../content/itemGalleries.js'
import { t, pick } from '../../core/i18n/index.js'

// List of a module's individual items — tap one to see its own dedicated
// 3D model instead of a hotspot dot on the combined scene. Generic over
// any module with hasItemGallery:true (PPE Compliance, Machinery Safety)
// via content/itemGalleries.js's moduleId -> items lookup, rather than one
// hardcoded registry per module. Same .module-card pattern home/homeScreen.js
// already uses for the top-level module list.

export function renderItemGallery(main, navigate, params) {
  const mod = getModule(params.id)
  const items = getItemGallery(params.id)
  if (!mod) {
    navigate('#/')
    return
  }

  main.innerHTML = `
    <button class="btn btn-ghost" id="back">&larr; ${t('backToModules')}</button>
    <h2 class="h2-title" style="margin:12px 0 4px;">${pick(mod.title)}</h2>
    <p class="subtitle-dim" style="margin:0 0 18px;">${t('itemGallerySubheading')}</p>
    <div id="item-list"></div>
  `

  main.querySelector('#back').addEventListener('click', () => navigate(`#/module/${mod.id}`))

  const list = main.querySelector('#item-list')
  items.forEach((item) => {
    const card = document.createElement('div')
    card.className = 'module-card'
    card.style.cursor = 'pointer'
    card.innerHTML = `<h3>${pick(item.title)}</h3><p>${pick(item.info)}</p>`
    card.addEventListener('click', () => navigate(`#/module/${mod.id}/gallery/${item.id}`))
    list.appendChild(card)
  })
}
