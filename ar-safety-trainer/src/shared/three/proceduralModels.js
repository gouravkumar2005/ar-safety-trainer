// Stand-in 3D geometry for the interactive AR sims (ppeEquipSim.js /
// machineryOpsSim.js) — no new binary assets, everything here is built
// from plain Three.js primitives at real-world (metre) scale. This is
// deliberately NOT attempting photorealism: the mannequin is a simple
// grey figure, the coal is a cluster of dark rocks. Honest placeholders,
// same spirit as every other disclosed simplification in this app
// (NSQF/DigiLocker notes, the emergency module's camera-diagnosis
// boundary) — see each sim screen's on-screen caption.

import * as THREE from 'three'

const MANNEQUIN_MATERIAL = new THREE.MeshStandardMaterial({ color: 0x9aa7bb, roughness: 0.8, metalness: 0.05 })
const COAL_MATERIAL = new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.95, metalness: 0.1 })

// A ~1.75m-tall stylized figure standing at the origin, feet on the
// ground plane (y=0). Anchor points below are hand-picked real-world
// heights for THIS figure's own proportions (not reverse-engineered
// from ppe-uniform.glb's internal coordinate space, which is a
// different asset with its own convention) — same body zones and
// ordering as the combined model's existing hotspots in modules.js
// (head / belt / chest / feet / chest-side), tuned directly here.
export function buildMannequin() {
  const group = new THREE.Group()
  group.name = 'mannequin'

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 16), MANNEQUIN_MATERIAL)
  head.position.set(0, 1.55, 0)
  group.add(head)

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.5, 6, 12), MANNEQUIN_MATERIAL)
  torso.position.set(0, 1.15, 0)
  group.add(torso)

  const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.2, 12), MANNEQUIN_MATERIAL)
  hips.position.set(0, 0.8, 0)
  group.add(hips)

  const legGeom = new THREE.CylinderGeometry(0.07, 0.06, 0.75, 10)
  const legL = new THREE.Mesh(legGeom, MANNEQUIN_MATERIAL)
  legL.position.set(-0.08, 0.375, 0)
  group.add(legL)
  const legR = new THREE.Mesh(legGeom, MANNEQUIN_MATERIAL)
  legR.position.set(0.08, 0.375, 0)
  group.add(legR)

  const armGeom = new THREE.CylinderGeometry(0.05, 0.045, 0.55, 10)
  const armL = new THREE.Mesh(armGeom, MANNEQUIN_MATERIAL)
  armL.position.set(-0.24, 1.05, 0)
  armL.rotation.z = 0.12
  group.add(armL)
  const armR = new THREE.Mesh(armGeom, MANNEQUIN_MATERIAL)
  armR.position.set(0.24, 1.05, 0)
  armR.rotation.z = -0.12
  group.add(armR)

  // Named anchor points (local to this group) for each PPE item's equip
  // target — items are parented here once equipped. Matches the body
  // zone each real item actually belongs to.
  group.userData.anchors = {
    'ppe-helmet': new THREE.Vector3(0, 1.68, 0),
    'ppe-scsr': new THREE.Vector3(0, 0.85, 0.16), // worn on the belt
    'ppe-vest': new THREE.Vector3(0, 1.1, 0.05),
    'ppe-boots': new THREE.Vector3(0, 0.03, 0),
    'ppe-gas-detector': new THREE.Vector3(0.16, 1.1, 0.1), // clipped to the vest
  }

  return group
}

// A small irregular cluster of dark rock-like shapes, randomized once
// per call so repeated coal piles (coal face + drop-off) don't look
// identical. `scale` controls the overall footprint in metres.
export function buildCoalPile(scale = 0.4) {
  const group = new THREE.Group()
  group.name = 'coal-pile'
  const rockCount = 7
  for (let i = 0; i < rockCount; i++) {
    const size = scale * (0.25 + Math.random() * 0.35)
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 0), COAL_MATERIAL)
    const angle = (i / rockCount) * Math.PI * 2 + Math.random() * 0.5
    const radius = scale * (0.15 + Math.random() * 0.35)
    rock.position.set(Math.cos(angle) * radius, size * 0.5, Math.sin(angle) * radius)
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
    group.add(rock)
  }
  return group
}
