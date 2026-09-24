// Tiny app state. No framework, no store library — just an object plus
// localStorage persistence so progress survives a refresh / going offline.
// The durable, tamper-evident history of results/certificates lives in
// core/ledger.js instead — this file stays the fast "current UI
// state" cache (e.g. "what's the latest result for this module") that the
// screens read synchronously; the ledger is the append-only record
// underneath it.

import * as ledger from './ledger.js'
import { getCurrentUser, onSessionChange } from './session.js'

const KEY = 'ar-safety-trainer:state:v1'

const defaultState = {
  // uan = e-Shram Universal Account Number, self-reported by the worker.
  // Not verified against the real e-Shram database — see certUanNote in
  // i18n.js and the honesty note in certificate.js.
  worker: { name: '', id: '', uan: '' },
  // Quiz results per account, so workers sharing one phone never see (or
  // get certified on) each other's passes:
  //   userId -> moduleId -> { score, total, passed, answers, completedAt }
  resultsByUser: {},
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    // Pre-accounts builds kept one device-wide `results`; those can't be
    // attributed to any account, so they're dropped (the ledger keeps them).
    delete parsed.results
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

// The logged-in account's results ({} if nobody is logged in).
export function getAllResults() {
  const userId = getCurrentUser()?.id
  if (userId == null) return {}
  state.resultsByUser[userId] ??= {}
  return state.resultsByUser[userId]
}

export async function recordResult(moduleId, { score, total, answers }) {
  const passed = score / total >= 0.7
  getAllResults()[moduleId] = {
    score,
    total,
    passed,
    answers,
    completedAt: new Date().toISOString(),
  }
  save()
  // Durable record, independent of this device's localStorage: every
  // attempt (including failed ones) becomes a permanent, tamper-evident
  // ledger entry, even though the results above only keep the latest.
  // `answers` is included so aggregate stats (admin/aggregate.js) can
  // compute "most missed questions" across every attempt in the ledger,
  // not just each worker's single latest attempt.
  const workerId = getCurrentUser()?.workId
  await ledger.append('QUIZ_COMPLETED', { moduleId, score, total, passed, answers, workerId })
}

export function getResult(moduleId) {
  return getAllResults()[moduleId]
}

// The certificate and grievance forms read state.worker, so keep it in
// step with whoever is logged in.
onSessionChange((user) => {
  if (user) setWorker(user.fullName, user.workId, user.uan)
})
