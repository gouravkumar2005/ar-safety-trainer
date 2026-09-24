// Where the on-device MediaPipe models are loaded from. They're bundled
// with the app (copied/downloaded into public/mediapipe/ by
// scripts/fetch-ml-assets.mjs) instead of fetched from a CDN, so the CPR
// hand tracker and pose overlay work offline and inside the Android app.
const BASE = `${import.meta.env.BASE_URL}mediapipe`

export const MEDIAPIPE_WASM_DIR = `${BASE}/wasm`
export const HAND_LANDMARKER_MODEL = `${BASE}/models/hand_landmarker.task`
export const POSE_LANDMARKER_MODEL = `${BASE}/models/pose_landmarker_lite.task`
