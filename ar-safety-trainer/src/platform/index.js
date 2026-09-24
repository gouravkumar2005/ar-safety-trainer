// Tells the rest of platform/ whether we're inside the Android app
// (Capacitor) or a normal browser. Features never call this directly —
// they use the adapters in this folder, which pick the right implementation.
import { Capacitor } from '@capacitor/core'

export function isNativeApp() {
  return Capacitor.isNativePlatform()
}
