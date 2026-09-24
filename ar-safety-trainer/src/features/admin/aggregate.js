import * as ledger from '../../core/ledger.js'
import { getModule } from '../../content/modules.js'

// Pure functions over an array of parsed export bundles (each bundle is
// exactly what admin/adminScreen.js's doExport() produces: {entries, publicKeyJwk,
// exportedAt, worker, results}). No DOM/UI here — admin/adminScreen.js renders what
// these return.
//
// Every stat is scoped honestly to "this imported batch" — the app has no
// access to Jharkhand's total registered mining workforce (that number
// lives in systems like e-Shram, which this app cannot query — see
// certUanNote), so nothing here is phrased as a percentage of a total
// this app doesn't actually know.

// Re-verifies every bundle's own ledger before trusting its data for
// stats — a bundle that fails integrity is listed separately, never
// silently included or silently dropped.
export async function partitionBundles(bundles) {
  const trusted = []
  const excluded = []
  for (const bundle of bundles) {
    const result = await ledger.verifyChain(bundle.entries, bundle.publicKeyJwk)
    if (result.valid) trusted.push(bundle)
    else excluded.push({ bundle, result })
  }
  return { trusted, excluded }
}

export function computeModulePassRates(bundles) {
  const byModule = {}
  for (const bundle of bundles) {
    for (const entry of bundle.entries) {
      if (entry.type !== 'QUIZ_COMPLETED') continue
      const { moduleId, passed } = entry.payload
      byModule[moduleId] ??= { attempts: 0, passes: 0 }
      byModule[moduleId].attempts += 1
      if (passed) byModule[moduleId].passes += 1
    }
  }
  return Object.entries(byModule).map(([moduleId, { attempts, passes }]) => ({
    moduleId,
    attempts,
    passes,
    rate: attempts > 0 ? Math.round((passes / attempts) * 100) : 0,
  }))
}

// Counts wrong answers per (moduleId, questionIndex) across every
// QUIZ_COMPLETED entry that has `answers` recorded (older entries from
// before this field was added won't have it — skipped, not treated as 0
// misses).
export function computeMostMissedQuestions(bundles, topN = 5) {
  const misses = {} // key: `${moduleId}::${questionIndex}` -> count
  for (const bundle of bundles) {
    for (const entry of bundle.entries) {
      if (entry.type !== 'QUIZ_COMPLETED' || !Array.isArray(entry.payload.answers)) continue
      const { moduleId, answers } = entry.payload
      for (const a of answers) {
        if (a.selected === a.correct) continue
        const key = `${moduleId}::${a.questionIndex}`
        misses[key] = (misses[key] || 0) + 1
      }
    }
  }
  return Object.entries(misses)
    .map(([key, count]) => {
      const [moduleId, questionIndexStr] = key.split('::')
      const questionIndex = Number(questionIndexStr)
      const mod = getModule(moduleId)
      const question = mod?.quiz?.[questionIndex]?.question
      return { moduleId, questionIndex, count, question }
    })
    .filter((row) => row.question) // drop rows whose module/question no longer exists
    .sort((a, b) => b.count - a.count)
    .slice(0, topN)
}

export function computeWorkerCoverage(bundles) {
  const seen = new Map() // dedupe key -> worker
  bundles.forEach((bundle, i) => {
    const worker = bundle.worker || {}
    // Blank/anonymous IDs shouldn't silently collide into one row.
    const key = worker.id?.trim() ? `id:${worker.id.trim()}` : `anon:${i}`
    if (!seen.has(key)) seen.set(key, worker)
  })
  return { count: seen.size, workers: [...seen.values()] }
}

export function extractGrievances(bundles) {
  return bundles.flatMap((bundle) => bundle.entries.filter((e) => e.type === 'GRIEVANCE_SUBMITTED'))
}
