// Single source of truth for the SIH pitch deck. generate.js reads this
// and builds the actual .pptx — nothing here is itself a slide, it's just
// data. Keep this file in sync with the real project state (same habit as
// updating ar-safety-trainer/README.md after every feature this session)
// and re-run `npm run generate` whenever you want a fresh, current .pptx.
//
// TEAM SECTION: I can't fabricate your teammates' names, institution, or
// contact details — fill in the `team` object below yourself (or tell me
// and I'll drop it in), everything else is grounded in the real project.

export const team = {
  teamName: '[Your Team Name]',
  members: ['[Member 1 — Team Leader]', '[Member 2]', '[Member 3]', '[Member 4]', '[Member 5]', '[Member 6]'],
  institution: '[Your College / Institution Name]',
  contact: '[team-email@example.com]',
}

export const meta = {
  appName: 'AR Safety Trainer',
  psId: 'SIH26041',
  psTitle: "AR-Based Vocational Training Simulator for Industrial Safety in Jharkhand's Mining & Manufacturing Sector",
  organization: 'Government of Jharkhand',
  category: 'Software',
  theme: 'AR/VR | Smart Education — Blockchain & Cybersecurity track',
}

export const problem = {
  heading: 'The Problem',
  points: [
    "Jharkhand is India's leading mineral-producing state — coal mines, steel plants, and mica units employ hundreds of thousands of workers, many young tribal recruits with no prior industrial exposure.",
    'Classroom-only safety training (static manuals, live drills) shows retention below 20% after one week.',
    '48 fatal accidents recorded by DGMS in Jharkhand in 2022-23 — a large share involving workers in their first 30 days on the job.',
    'VR headset simulators exist but are inaccessible to small mines and contract workers; no standardized digital training platform exists in regional languages with comprehension verification.',
  ],
}

export const solution = {
  heading: 'Our Solution',
  pitch: 'A mobile AR training and blockchain-secured certification platform — workers learn safety by interacting with real 3D equipment, narrated in their own language, fully offline.',
  features: [
    'AR training modules + per-item galleries — PPE (helmet, vest, boots, SCSR, gas detector), Machinery Safety (continuous miner, forklift, conveyor belt), each a real rotatable/AR-placeable 3D model',
    'Gamified guided tours — swipe through hazards one at a time, auto-narrated in Hindi or English, ending in a certification-ready assessment',
    'Tamper-evident certification — every result and certificate is signed with a per-device key and hash-chained (a local, honest "blockchain-lite" ledger, not a marketing label)',
    'QR certificate verifier + admin compliance dashboard — an inspector can scan a cert and see VALID/TAMPERED instantly; compliance officers get aggregate pass-rate/audit reporting',
    'Fully offline-first — the whole training + certification flow works underground with zero signal, syncing only when convenient',
  ],
  differentiation: "No VR headset required — runs on any mid-range Android phone, unlike existing simulator solutions that need dedicated hardware small mines and contract workers can't access.",
}

export const tech = {
  heading: 'Technical Feasibility',
  stack: [
    ['Frontend', 'Vite + vanilla JS Progressive Web App'],
    ['AR rendering', '<model-viewer> — WebXR / Google Scene Viewer (ARCore) / Quick Look'],
    ['Offline', 'Service worker (Workbox) caching the app shell + all 3D models'],
    ['Security / "blockchain-lite"', 'Web Crypto ECDSA per-device signing, hash-chained tamper-evident ledger (IndexedDB)'],
    ['Languages', 'Hindi + English live; Santali/Mundari/Ho/Kurukh scaffolded, pending verified translation'],
    ['Accessibility', 'GIGW 3.0 / WCAG 2.1 AA — ARIA roles, measured contrast fixes, voice narration, adjustable text size'],
  ],
  status: 'Builds and runs today — tested end-to-end on real devices. Path to a submittable Android APK (Bubblewrap / Trusted Web Activity) already documented.',
}

export const impact = {
  heading: 'Impact & Scalability',
  points: [
    ['Social', 'Reaches contract and informal workers specifically — the population least likely to get formal induction training; voice narration serves low-literacy users directly, not as an afterthought.'],
    ['Safety', 'Directly targets the documented failure mode (DGMS data): fatal accidents concentrated in a worker’s first 30 days, before real competency is verified.'],
    ['Economic', 'Free, open, zero-license-cost — reduces training and compliance overhead for small mines that cannot afford dedicated VR hardware.'],
    ['Scalability', 'Every hazard module is data-driven (a registry pattern, not hardcoded) — adding a new machine, PPE item, or even a new state’s hazard set is a content change, not a rebuild.'],
  ],
}

export const references = {
  heading: 'Research & References',
  sources: [
    'Directorate General of Mines Safety (DGMS) — 2022-23 fatal accident statistics, Jharkhand',
    'GIGW 3.0 (Guidelines for Indian Government Websites and Apps), MeitY/NIC',
    'National Skills Qualification Framework (NSQF) / PMKVY alignment, PIB',
    'e-Shram (National Database of Unorganised Workers) and DigiLocker Issuer API — identified integration roadmap, not yet live (requires official department onboarding)',
  ],
}
