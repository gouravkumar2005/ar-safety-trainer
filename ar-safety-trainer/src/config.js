// App-wide settings in one place.

// Where the website is hosted. The Android app bundles everything locally,
// but Google Scene Viewer ("View in your space" in the APK) runs as a
// separate app and can't read files inside ours, so it's handed the hosted
// copy of each model instead — see platform/arLauncher.js.
export const PUBLIC_SITE_URL = 'https://ar-safety-trainer.vercel.app'

// The accounts server (see ../server). Empty means "same origin": the dev
// server and `vite preview` forward /api to http://localhost:8787 (see
// vite.config.js). A hosted website or the Android app must be built with
// VITE_API_URL set to the server's public https:// address.
export const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

// Mandatory PPE induction gate: every module except PPE redirects to it
// until it's been passed once (see PPE_GATE_MODULE_ID in content/modules.js).
// Temporarily switched off so every module is freely reachable for a live
// presentation. Flip back to true once the presentation is done.
export const PPE_GATE_ENABLED = false
