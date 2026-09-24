// Simulations feature: the interactive drag-to-equip (PPE) and
// drag-to-operate (machinery) AR sims.
import './simulations.css'
import { renderPpeEquipSim } from './ppeEquipSim.js'
import { renderMachineryOpsSim } from './machineryOpsSim.js'

export const routes = [
  { path: '/module/:id/equip', render: renderPpeEquipSim },
  { path: '/module/:id/ops', render: renderMachineryOpsSim },
]
