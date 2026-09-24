// App-wide settings in one place.

// Where the website is hosted. The Android app bundles everything locally,
// but Google Scene Viewer ("View in your space" in the APK) runs as a
// separate app and can't read files inside ours, so it's handed the hosted
// copy of each model instead — see platform/arLauncher.js.
export const PUBLIC_SITE_URL = 'https://ar-safety-trainer.vercel.app'

// The accounts server (see ../server and ../render.yaml). ONE address for
// both the website and the Android app, so they always share the same
// accounts:
//   - `npm run dev`: same origin; Vite forwards /api to the local server.
//   - any build (website on Vercel, APK): PRODUCTION_API_URL.
// Override with VITE_API_URL (set it empty to test a build against a local
// server with `vite preview`).
const PRODUCTION_API_URL = 'https://ar-safety-trainer-api.onrender.com'
const configuredApiUrl = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '' : PRODUCTION_API_URL)
export const API_BASE_URL = configuredApiUrl.replace(/\/$/, '')

// Mandatory PPE induction gate: every module except PPE redirects to it
// until it's been passed once (see PPE_GATE_MODULE_ID in content/modules.js).
// Temporarily switched off so every module is freely reachable for a live
// presentation. Flip back to true once the presentation is done.
export const PPE_GATE_ENABLED = false
