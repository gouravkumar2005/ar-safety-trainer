// Emergency Response feature: voice/manual first-aid hub, narrated
// step-by-step guides, and the camera-assisted CPR rate check.
// It replaces the generic 3D viewer for its module id (it has no .glb), so
// app/routes.js lists these routes before the training feature's.
import { EMERGENCY_RESPONSE_MODULE_ID } from '../../content/modules.js'
import { renderEmergencyHub } from './hubScreen.js'
import { renderEmergencyGuide } from './guideScreen.js'
import { renderCprCameraAssist } from './cprCameraScreen.js'

const base = `/module/${EMERGENCY_RESPONSE_MODULE_ID}`

export const routes = [
  { path: base, render: renderEmergencyHub },
  { path: `${base}/guide/:guideId`, render: renderEmergencyGuide },
  { path: `${base}/camera/cpr`, render: renderCprCameraAssist },
]
