import { getModule } from '../../content/modules.js'
import { getItemGallery } from '../../content/itemGalleries.js'
import { t, pick } from '../../core/i18n/index.js'
import { icon, ITEM_ICONS, MODULE_ICONS } from '../../shared/ui/icon.js'

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
    <button class="back-btn" id="back">${icon('arrow-left', { size: 22 })} ${pick(mod.shortTitle || mod.title)}</button>
    <div class="page-head">
      <span class="head-icon">${icon(MODULE_ICONS[mod.domain] || 'box', { size: 30 })}</span>
      <div><h2>${t('ppeGalleryBtn')}</h2><p>${icon('hand', { size: 14 })} ${t('itemGallerySubheading')}</p></div>
    </div>
    <div class="tile-grid" id="item-list"></div>
  `

  main.querySelector('#back').addEventListener('click', () => navigate(`#/module/${mod.id}`))

  // One picture tile per item; the description is on the item's own screen.
  const list = main.querySelector('#item-list')
  items.forEach((item) => {
    const tile = document.createElement('button')
    tile.className = 'tile'
    tile.innerHTML = `
      <span class="tile-icon">${icon(ITEM_ICONS[item.id] || 'box', { size: 30 })}</span>
      <span class="tile-label">${pick(item.title)}</span>
    `
    tile.addEventListener('click', () => navigate(`#/module/${mod.id}/gallery/${item.id}`))
    list.appendChild(tile)
  })
}
