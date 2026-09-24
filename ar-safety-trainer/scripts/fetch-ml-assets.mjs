// Puts the MediaPipe runtime + models into public/mediapipe/ so the CPR hand
// tracker and pose overlay run offline (website and Android app alike).
//   wasm/   copied from node_modules/@mediapipe/tasks-vision
//   models/ downloaded once from Google's model storage
// Runs automatically before every build (npm "prebuild"). Files that
// already exist are skipped, so after the first run it needs no network.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'mediapipe')

const MODELS = {
  'hand_landmarker.task':
    'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  'pose_landmarker_lite.task':
    'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
}

// The "_module" variant is only loaded by forVisionTasks(path, true), which
// this app never uses — skipping it keeps ~12 MB out of the APK. The SIMD
// build is what modern phones load; "_nosimd" is the fallback for old ones.
function copyWasm() {
  const from = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm')
  const to = join(outDir, 'wasm')
  rmSync(to, { recursive: true, force: true })
  cpSync(from, to, { recursive: true, filter: (src) => !src.includes('_module_') })
  console.log('[ml-assets] wasm runtime ->', to)
}

async function downloadModels() {
  const modelsDir = join(outDir, 'models')
  mkdirSync(modelsDir, { recursive: true })
  for (const [name, url] of Object.entries(MODELS)) {
    const target = join(modelsDir, name)
    if (existsSync(target)) continue
    console.log('[ml-assets] downloading', name)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Download failed (${res.status}) for ${url}`)
    writeFileSync(target, Buffer.from(await res.arrayBuffer()))
  }
  console.log('[ml-assets] models ->', modelsDir)
}

copyWasm()
await downloadModels()
