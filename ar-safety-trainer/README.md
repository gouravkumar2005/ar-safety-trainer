# AR Safety Trainer — SIH26041

AR-based vocational training & safety certification prototype for Jharkhand's
mining & manufacturing sector.

## Why a web app when the PS asks for an APK?

No Android Studio / Unity / SDK was available in this dev environment, and a
website is what I could get running immediately, on any phone, with zero
install. So the plan is two phases:

1. **Now — PWA.** Everything below runs in Chrome on Android today (and
   desktop, for fast iteration). AR works via `<model-viewer>`'s AR button
   (WebXR / Google Scene Viewer). Offline is handled by a service worker
   (`vite-plugin-pwa`) that caches the app shell + `.glb` models.
2. **Before submission — wrap it into a real APK.** Once the flow is built
   out, run:
   ```
   npm run build
   npx @bubblewrap/cli init --manifest=https://<your-hosted-url>/manifest.webmanifest
   npx @bubblewrap/cli build
   ```
   Bubblewrap (Google's official tool) wraps a hosted PWA into a signed,
   installable `.apk`/`.aab` using a Trusted Web Activity — this is what
   satisfies the PS's "Functioning Android APK" outcome. It needs a real
   HTTPS URL to point at (Vercel/Netlify free tier works) and JDK (already
   installed) — it downloads its own minimal Android SDK on first run, no
   Android Studio needed.

   If AR training modules outgrow what `<model-viewer>` can do (custom
   physics, multi-object interaction, raycasting from the camera), the
   escape hatch is a full WebXR rewrite with Three.js directly — the module
   data model (`src/data/modules.js`) is deliberately framework-agnostic so
   that migration wouldn't touch the quiz/cert/state code at all. Native
   (Kotlin + ARCore/SceneView, or Unity + AR Foundation) is the other
   escape hatch if the team gets access to Android Studio/Unity later —
   ask me and I'll scaffold that instead.

## What's built

- **Module list** (`src/screens/home.js`) — 6 modules: the PS's 5 domains
  plus a cross-cutting PPE Compliance module (see below). Two are wired to
  your real models:
  - **PPE Compliance Check** — your "uniform" model
    (`public/models/ppe-uniform.glb`). Doubles as a **mandatory induction
    gate**: `main.js`'s router redirects to this module first, before any
    other, until it's been passed once — same as a real mine-site PPE
    check. It stays revisitable from the home screen afterward.
    Also has an **"Explore each item in detail" gallery**
    (`src/screens/itemGallery.js` / `itemViewer.js`, `src/data/ppeItems.js`
    — these two screens are generic over any module via
    `src/data/itemGalleries.js`'s moduleId→items lookup, not PPE-specific
    despite the filenames' history) — 5 of your real per-item models
    (helmet+lamp, SCSR, vest, boots, gas detector), each with its own
    dedicated rotate/zoom/AR-place viewer, on-screen detail text, and a
    "Listen" button that narrates in whichever language is active. Purely
    additive — the combined-model view and its quiz/gate are unchanged.
    Also has a **guided tour mode** (`src/screens/tour.js`, "🎮 Play as a
    Guided Tour" button) — swipe or tap through all 5 items one at a time,
    each auto-narrated, ending on a "Fully Equipped!" reveal of the
    combined model with a confetti burst.
  - **Machinery Safety** — your "continuous miner" model
    (`public/models/continuous-miner.glb`), with hotspots/quiz on the real
    hazards of that machine (methane/coal-dust ignition at the cutting
    drum, mechanical pinch points, the high-voltage trailing cable, roof
    fall risk, lockout-tagout). Its own guided tour walks the camera
    through those same hotspots in sequence, narrated — "how the machine
    works," step by step, reusing the exact hotspot data, no new content.
    Also has an item gallery of its own real models — **Forklift** and
    **Conveyor Belt** (`src/data/machineryItems.js`) — general equipment
    hazards (tip-over/blind-spot risk; belt nip points/entanglement)
    alongside the continuous miner, same pattern as PPE's gallery.
  - Fire & Explosion, Gas Leak, Chemical Hazard, and Emergency Response are
    **intentionally locked** — no real models for these yet. (Fire &
    Explosion briefly had a placeholder wired to what turned out to be the
    continuous-miner model; reverted rather than leave a mislabeled demo.)
    Drop a `.glb` into `public/models/`, flip `status` to `'active'`, fill
    in hotspots/quiz in `src/data/modules.js` — nothing else needs to
    change to unlock one.
- **AR viewer** (`src/screens/arViewer.js`) — loads the model, lets the
  worker rotate/zoom it or place it in real space via AR, and tap hotspots
  to read about each hazard.
- **Assessment** (`src/screens/quiz.js`, `src/screens/result.js`) —
  one-question-at-a-time quiz, 70% pass threshold, scored client-side.
- **Local tamper-evident ledger** (`src/utils/ledger.js`) — a hash-chained,
  append-only log in IndexedDB. Every quiz result, certificate, and
  grievance report is an entry signed with a per-device ECDSA key that's
  generated on first run and never leaves the device (`extractable:
  false`). Editing any past entry breaks the hash chain from that point
  forward — detectable, not just obfuscated. **Read the header comment in
  `ledger.js`** for what this precisely does and does not prove: it's
  honest single-device tamper-evidence, not a distributed blockchain. This
  replaced an earlier prototype that signed certificates with a secret
  string embedded in the JS bundle (readable via devtools, forgeable from
  any device) — that approach is gone, not just hidden better.
  **Accountability framing:** the same mechanism doubles as an audit trail
  — `#/admin`'s "Generate audit report" (`src/utils/auditReport.js`) turns
  it into a plain-language document (device fingerprint, every entry
  restated, the integrity verdict) suitable for internal review or an
  RTI-style disclosure request. It still reflects one worker's device,
  not centralized government record-keeping — that would need the real
  backend this round deliberately doesn't add. Production hosting for that
  backend should sit on MeitY-empanelled / NIC Indian government cloud
  infrastructure, not a generic foreign host — noted here as a roadmap
  decision, not something a static frontend can enforce on its own.
- **QR certificate** (`src/screens/certificate.js`,
  `src/utils/certificate.js`) — generates a QR-encoded, ledger-signed
  certificate after a pass, with a "copy certificate data" button for
  pasting straight into the verifier.
- **Certificate verifier** (`src/screens/verify.js`, `#/verify`, reachable
  from the top bar) — paste a certificate's data, see **VALID**,
  **TAMPERED**, or **valid-but-unconfirmed-on-this-device**. Hand-edit one
  character of a real certificate and re-check it to see tamper detection
  live.
- **Compliance dashboard** (`src/screens/admin.js`, `#/admin`, no nav link
  yet — direct URL only) — the PS's required "web-based admin compliance
  dashboard," built honestly for a no-backend build: a trainee device
  **exports** its data as one JSON file; the dashboard **imports** that
  file (on any device) and shows worker info, module results, issued
  certificates, and a ledger-integrity check reusing the exact same
  `verifyChain()` the verifier screen uses. Not live multi-device sync —
  that needs a real backend, which this round's scope deliberately excluded
  (see Backlog in the plan file). It now also has an **aggregate/MIS
  section** — import several exported files at once
  (`src/utils/aggregate.js`) for pass rates by module, most-missed quiz
  questions, and worker coverage **within that imported batch** (never
  phrased as a share of Jharkhand's total workforce — this app has no
  access to that number). Files that fail their own integrity check are
  excluded from the stats and listed separately, never silently dropped or
  silently counted.
- **Grievance / feedback channel** (`src/screens/grievance.js`,
  `#/grievance`, linked from the home screen) — a CPGRAMS-style "report a
  concern" form. Name/ID/contact are all optional; forcing identity on a
  hazard report risks suppressing honest reporting. Stored as a
  `GRIEVANCE_SUBMITTED` ledger entry (same mechanism as certificates, not a
  second storage system) and reviewable on `#/admin`.
- **Honest placeholders for real government systems this app can't
  actually reach** — e-Shram UAN (optional field on the certificate,
  clearly labeled "not verified against the e-Shram database"), an
  indicative NSQF level/competency per module (labeled "NOT an
  NSDC/NSQF-accredited qualification"), and a **disabled** "Save to
  DigiLocker" button with a "pending official onboarding" status chip.
  None of these fake a live government integration — each says plainly
  what would be required to make it real (department-level registration/
  accreditation this app cannot grant itself).
- **Accessibility (GIGW 3.0 / WCAG 2.1 AA)** — proper label/input
  associations, `role="radiogroup"`/`role="radio"`/`aria-checked` on quiz
  options, a text (not color-only) correct/incorrect signal, meaningful
  alt text on the QR image and 3D model, `document.documentElement.lang`
  now actually follows the language toggle, a visible `:focus-visible`
  style everywhere, and a text-size control (topbar "Aa") that scales
  every `rem`-based font in the app. Two real contrast failures were
  measured (not assumed) against the actual palette and fixed: a badge
  tint at 4.01:1 (needs 4.5:1) and card/input borders at ~1.4:1 (needs
  3.0:1, non-text contrast) — border color is now visibly brighter as a
  result, an intentional look change.
- **Voice narration** (`src/utils/speech.js`) — a "Listen" button on
  hotspot info and on quiz questions (reads the question *and* every
  option) using the browser's built-in SpeechSynthesis, offline, no
  dependency. If no voice exists for the current language on that device,
  it says so rather than reading the text in the wrong language's
  accent/pronunciation — a clear gap is safer than misleading audio for a
  low-literacy listener.
- **Language registry** (`LANGUAGES` in `src/utils/i18n.js`) — English and
  Hindi are real; Santali, Mundari, Ho, and Kurukh are now data-level
  entries marked `locked` (same honesty rule as before: naming a language
  isn't the same claim as translating into it, so nothing is fabricated).
  The visible toggle is still a simple en/hi switch — a bottom-sheet picker
  surfacing the locked languages as a visible "coming soon" list is a
  cheap follow-up, not built this round.
- **Offline** — service worker caches the app + models (`vite.config.js`).
  Dev server also runs over **HTTPS** (self-signed, via
  `@vitejs/plugin-basic-ssl`) because Web Crypto — used throughout the
  ledger — only works in a secure context, which a plain
  `http://<lan-ip>:5173` URL doesn't qualify as. Your browser will warn
  about the certificate; that's expected for local dev, click through it.
- **i18n** — English + Hindi are filled in (`src/utils/i18n.js`). Santali
  is deliberately left as a TODO: machine-translating Santali (especially
  in Ol Chiki script) badly would be worse than not having it — get real
  copy from a native speaker/translator and it's a one-file change to add.

- **Animation/interaction polish** — the model auto-rotates when idle
  (`auto-rotate`) and hides the "drag to interact" hint until focused;
  hotspots pulse to read as tappable; tapping one glides the camera to
  face it (`model-viewer`'s `cameraTarget` interpolates on its own — no
  custom animation code — and resets on close); the result screen's score
  is an animated SVG ring (`stroke-dashoffset` transition) with a canvas
  confetti burst (`src/utils/confetti.js`) on a pass; certificates animate
  in on generation; screens cross-fade via the native **View Transitions
  API** (`document.startViewTransition`, no-ops gracefully on unsupported
  browsers); haptic ticks (`navigator.vibrate`) and synthesized Web Audio
  tones (`src/utils/sound.js`, mute toggle in the top bar) mark correct/
  incorrect answers and certificate issuance. Zero new dependencies.
  Deliberately **not** attempted: animating the 3D models themselves — both
  current `.glb` files have no baked-in animations (checked their glTF
  JSON directly), so a spinning drum or similar needs whoever makes the
  next batch of models to add it in Blender/etc.; `<model-viewer>` will
  autoplay a baked animation via one attribute the moment a model has one.

## Not built yet (offered, not selected this round — ask again anytime)

Encrypted local storage for worker PII, certificate validity window +
expiry, a consent/data-rights screen, role-based access for the admin
dashboard, tamper-detection-before-sync, an offline asset-integrity check,
a sync-queue design scaffold, photo-binding at certificate issuance, an
always-reachable offline emergency-reference widget, and the optional
public-blockchain testnet-anchoring stretch path (Polygon Amoy, would need
to be pre-anchored before any live demo — see the plan file for why). Also
still open: real app icons (currently reusing the Vite favicon placeholder),
the remaining 4 domain modules once their `.glb` models arrive, real
DigiLocker/e-Shram/NSQF integration (needs the sponsoring government
department's formal onboarding — not something this codebase can do on its
own), and a proper language picker UI for the locked languages above.

**SMS/IVR fallback for feature-phone workers — deliberately not built.**
Real reach for workers without a capable smartphone needs a backend server
plus a paid third-party telephony/SMS gateway, and collecting phone
numbers brings its own consent/privacy handling — all of which contradicts
this build's current fully-offline, client-only, no-backend architecture.
This is a genuine gap for a real deployment (the PS's own background notes
many are contract workers, the population least likely to have a suitable
phone), not a solved problem — it needs a backend decision first, not more
frontend code.

Full reasoning behind all of the above:
`C:\Users\goura\.claude\plans\abhi-2-model-bnaya-unified-kettle.md`

## Tuning hotspots

Hotspot positions in `src/data/modules.js` (`position`, `normal`) are
generic guesses, not measured against your actual model's geometry. Run the
dev server, open the module, and nudge the numbers ("x y z") until each dot
sits on the right spot — `<model-viewer>`'s camera-controls make this fast
to eyeball.

## Model scale in AR

Every `.glb` so far (`continuous-miner`, `ppe-uniform`, and all 5 PPE item
models) was exported normalized to a 1-metre bounding box — harmless in
the in-page viewer (it auto-frames regardless of absolute scale) but very
wrong once placed in **real AR**, where actual meters matter: a helmet
was appearing about a metre across. Each module/item in `modules.js` /
`ppeItems.js` now has a `scale` field (e.g. `0.28` for the helmet, `9` for
the continuous miner) applied via `<model-viewer scale="...">`, which is
the documented, official way to correct this without re-exporting the
file. **These are estimates based on typical real-world sizes, not
measured against the actual objects** — test each one in real AR on a
phone and adjust the number in the relevant data file if it still looks
too big/small. If a hotspot's camera-glide-on-tap (`arViewer.js`) ever
looks off after changing a `scale`, check that function's math — hotspot
`position` values are in the model's local (unscaled) space, so they're
multiplied by `scale` before being used as `cameraTarget`, which expects
world-space coordinates.

## Running it

```
npm install
npm run dev
```

Dev server binds to `0.0.0.0` and serves HTTPS — on your phone (same
Wi-Fi), open `https://<your-pc-lan-ip>:5173` in Chrome (accept the
self-signed cert warning) to test the AR button *and* certificate
generation for real. Plain `http://` will load the app but certificate
generation will silently fail (see "What's built" → Offline, above).

```
npm run build      # production build, output in dist/
npm run preview    # serve the production build locally
```
