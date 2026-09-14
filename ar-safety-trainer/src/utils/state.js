// Tiny app state. No framework, no store library — just an object plus
// localStorage persistence so progress survives a refresh / going offline.
// The durable, tamper-evident history of results/certificates lives in
// src/utils/ledger.js instead — this file stays the fast "current UI
// state" cache (e.g. "what's the latest result for this module") that the
// screens read synchronously; the ledger is the append-only record
// underneath it.

import * as ledger from './ledger.js'

const KEY = 'ar-safety-trainer:state:v1'

const defaultState = {
  // uan = e-Shram Universal Account Number, self-reported by the worker.
  // Not verified against the real e-Shram database — see certUanNote in
  // i18n.js and the honesty note in certificate.js.
  worker: { name: '', id: '', uan: '' },
  results: {}, // moduleId -> { score, total, passed, answers, completedAt }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    // Merge worker one level deep so upgrading from an older saved state
    // (missing e.g. `uan`) fills in the new default instead of leaving it
    // `undefined` — a shallow spread alone would drop it.
    return {
      ...defaultState,
      ...parsed,
      worker: { ...defaultState.worker, ...(parsed.worker || {}) },
    }
  } catch {
    return { ...defaultState }
  }
}

export const state = load()

export function save() {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function setWorker(name, id, uan = '') {
  state.worker = { name, id, uan }
  save()
}

export async function recordResult(moduleId, { score, total, answers }) {
  const passed = score / total >= 0.7
  state.results[moduleId] = {
    score,
    total,
    passed,
    answers,
    completedAt: new Date().toISOString(),
  }
  save()
  // Durable record, independent of this device's localStorage: every
  // attempt (including failed ones) becomes a permanent, tamper-evident
  // ledger entry, even though `state.results` above only keeps the latest.
  // `answers` is included so aggregate stats (src/utils/aggregate.js) can
  // compute "most missed questions" across every attempt in the ledger,
  // not just each worker's single latest attempt.
  await ledger.append('QUIZ_COMPLETED', { moduleId, score, total, passed, answers })
}

export function getResult(moduleId) {
  return state.results[moduleId]
}
