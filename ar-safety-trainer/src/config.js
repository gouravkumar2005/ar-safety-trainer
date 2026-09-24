// App-wide settings in one place.

// Where the website is hosted. The Android app bundles everything locally;
// only its AR fallback for phones without ARCore (Google Scene Viewer, a
// separate app that can't read files inside ours) loads the hosted copy of
// a model from here — see platform/arLauncher.js.
export const PUBLIC_SITE_URL = 'https://ar-safety-trainer.vercel.app'

// Accounts & login (features/account + ../server). Set to false to run the
// website and the app without login, exactly like before accounts existed
// (e.g. if the accounts server is ever down for a long time).
export const ACCOUNTS_ENABLED = true

// The accounts server (see ../server; hosted on Vercel, data in Neon).
// ONE address for both the website and the Android app, so they always
// share the same accounts:
//   - `npm run dev`: same origin; Vite forwards /api to the local server.
//   - any build (website on Vercel, APK): PRODUCTION_API_URL.
// Override with VITE_API_URL (set it empty to test a build against a local
// server with `vite preview`).
const PRODUCTION_API_URL = 'https://ar-safety-trainer-api.vercel.app'
const configuredApiUrl = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '' : PRODUCTION_API_URL)
export const API_BASE_URL = configuredApiUrl.replace(/\/$/, '')

// Mandatory PPE induction gate: every module except PPE redirects to it
// until it's been passed once (see PPE_GATE_MODULE_ID in content/modules.js).
// Temporarily switched off so every module is freely reachable for a live
// presentation. Flip back to true once the presentation is done.
export const PPE_GATE_ENABLED = false
