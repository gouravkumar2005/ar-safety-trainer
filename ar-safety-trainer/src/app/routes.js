// The app's full route table, assembled from each feature's own `routes`.
// To add a feature: create features/<name>/index.js exporting `routes`,
// then add it to this list.
//
// Order matters — the first matching route wins. Emergency comes before
// training because its module has its own hub instead of the generic
// /module/:id 3D viewer.
import { routes as home } from '../features/home/index.js'
import { routes as emergency } from '../features/emergency/index.js'
import { routes as training } from '../features/training/index.js'
import { routes as itemGallery } from '../features/itemGallery/index.js'
import { routes as simulations } from '../features/simulations/index.js'
import { routes as certificates } from '../features/certificates/index.js'
import { routes as admin } from '../features/admin/index.js'
import { routes as grievance } from '../features/grievance/index.js'

export const routes = [
  ...home,
  ...emergency,
  ...training,
  ...itemGallery,
  ...simulations,
  ...certificates,
  ...admin,
  ...grievance,
]

// Shown for any hash that matches nothing.
export const fallbackRoute = home[0]
