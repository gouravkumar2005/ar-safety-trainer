// Admin feature: compliance dashboard (export/import device data,
// aggregate stats, audit report). Direct URL only: #/admin
import { renderAdmin } from './adminScreen.js'

export const routes = [{ path: '/admin', render: renderAdmin }]
