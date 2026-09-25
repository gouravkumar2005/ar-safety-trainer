// Offline phone-to-phone network: radio adapter.
//
// Android app: the native Mesh plugin (android/.../mesh/MeshPlugin.kt), which
// uses Google Nearby Connections (Bluetooth / Wi-Fi Direct, no internet).
// Browser: not possible. A web page can't advertise over Bluetooth or keep
// running in the background, so the website shows "Android app only".
//
// This only moves text between direct neighbours. Routing across several
// phones is in core/meshSync.js.

import { registerPlugin } from '@capacitor/core'
import { isNativeApp } from './index.js'

const Mesh = registerPlugin('Mesh')

export function isMeshSupported() {
  return isNativeApp()
}

export const meshRadio = {
  start: (deviceName) => Mesh.start({ deviceName }),
  stop: () => Mesh.stop(),
  send: (endpointId, data) => Mesh.send({ endpointId, data }),
  broadcast: (data) => Mesh.broadcast({ data }),
  // event: 'peerConnected' | 'peerLost' | 'message' | 'error'
  on: (event, fn) => Mesh.addListener(event, fn),
}
