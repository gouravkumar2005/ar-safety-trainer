// Which per-item gallery (itemGallery/galleryScreen.js / itemGallery/itemViewerScreen.js)
// belongs to which module — the one place that knows this mapping, so
// those two screens stay generic rather than hardcoding one module's
// items each. A module opts in by setting `hasItemGallery: true` in
// modules.js AND having an entry here with the same key.

import { ppeItems } from './ppeItems.js'
import { machineryItems } from './machineryItems.js'

export const itemGalleries = {
  'ppe-compliance': ppeItems,
  'machinery-safety': machineryItems,
}

export const getItemGallery = (moduleId) => itemGalleries[moduleId] || []
export const getGalleryItem = (moduleId, itemId) => getItemGallery(moduleId).find((i) => i.id === itemId)
