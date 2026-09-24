// Grievance feature: anonymous-friendly "report a safety concern" form.
import { renderGrievance } from './grievanceScreen.js'

export const routes = [{ path: '/grievance', render: renderGrievance }]
