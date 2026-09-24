// Item gallery feature: browse a module's individual equipment models
// (PPE items, machinery) one at a time, each with its own viewer.
import { renderItemGallery } from './galleryScreen.js'
import { renderItemViewer } from './itemViewerScreen.js'

export const routes = [
  { path: '/module/:id/gallery', render: renderItemGallery },
  { path: '/module/:id/gallery/:itemId', render: renderItemViewer },
]
