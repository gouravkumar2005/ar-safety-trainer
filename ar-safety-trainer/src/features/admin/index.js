// Admin feature: compliance dashboard (export/import device data,
// aggregate stats, audit report). Supervisors and admins only; linked from
// their profile screen.
import { renderAdmin } from './adminScreen.js'

export const routes = [{ path: '/admin', render: renderAdmin, roles: ['supervisor', 'admin'] }]
