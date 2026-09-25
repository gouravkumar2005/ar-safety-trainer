// Real-world-size copies of the 3D models, for Google Scene Viewer.
//
// Our .glb files are all normalised to a 1 m box; the app scales each one to
// its real size itself (the `scale` field in src/content/*.js). Google Scene
// Viewer can't be told a scale, so it would show a helmet 1 m tall. This
// Vite plugin writes dist/models/ar/<name>.glb for every model: the same
// file with the whole scene wrapped in one node scaled to real size.
//
// Only the small JSON part of each .glb changes; the mesh data is copied
// byte for byte. Web builds only (the APK uses its own AR, which scales
// the original file).

import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const JSON_CHUNK = 0x4e4f534a // "JSON"

// Wrap the default scene of a .glb in a node with the given uniform scale.
export function scaleGlb(buffer, scale) {
  if (buffer.readUInt32LE(0) !== 0x46546c67) throw new Error('not a glb file')
  const jsonLength = buffer.readUInt32LE(12)
  if (buffer.readUInt32LE(16) !== JSON_CHUNK) throw new Error('first chunk is not JSON')
  const json = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8'))
  const rest = buffer.subarray(20 + jsonLength) // BIN chunk (header + data), unchanged

  const sceneIndex = json.scene ?? 0
  const scene = json.scenes[sceneIndex]
  json.nodes ??= []
  json.nodes.push({ name: 'real-world-scale', scale: [scale, scale, scale], children: scene.nodes || [] })
  scene.nodes = [json.nodes.length - 1]

  let jsonBytes = Buffer.from(JSON.stringify(json), 'utf8')
  const pad = (4 - (jsonBytes.length % 4)) % 4
  jsonBytes = Buffer.concat([jsonBytes, Buffer.alloc(pad, 0x20)])

  const header = Buffer.alloc(20)
  header.writeUInt32LE(0x46546c67, 0) // "glTF"
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(20 + jsonBytes.length + rest.length, 8)
  header.writeUInt32LE(jsonBytes.length, 12)
  header.writeUInt32LE(JSON_CHUNK, 16)
  return Buffer.concat([header, jsonBytes, rest])
}

// model file name -> real-world scale, read from the app's own content files.
async function realScales(root) {
  const load = (file) => import(pathToFileURL(path.join(root, 'src/content', file)).href)
  const [{ modules }, { ppeItems }, { machineryItems }] = await Promise.all([
    load('modules.js'),
    load('ppeItems.js'),
    load('machineryItems.js'),
  ])
  const scales = {}
  for (const item of [...modules, ...ppeItems, ...machineryItems]) {
    if (item.model && item.scale) scales[path.basename(item.model)] = item.scale
  }
  return scales
}

export function realScaleModels() {
  let root = process.cwd()
  let outDir = 'dist'
  return {
    name: 'real-scale-models',
    apply: 'build',
    configResolved(config) {
      root = config.root
      outDir = path.resolve(config.root, config.build.outDir)
    },
    async closeBundle() {
      const scales = await realScales(root)
      const target = path.join(outDir, 'models', 'ar')
      fs.mkdirSync(target, { recursive: true })
      for (const [file, scale] of Object.entries(scales)) {
        const source = path.join(root, 'public', 'models', file)
        if (!fs.existsSync(source)) continue
        fs.writeFileSync(path.join(target, file), scaleGlb(fs.readFileSync(source), scale))
      }
    },
  }
}
