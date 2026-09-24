# AR Safety Trainer — SIH26041

AR-based vocational training & safety certification prototype for Jharkhand's
mining & manufacturing sector.

## Two ways to run it: website and Android APK

The same code in `src/` builds two ways:

- **Website / PWA**: `npm run build`. It runs in Chrome on any phone or
  desktop, and a service worker caches it for offline use.
- **Android APK**: `npm run apk:release`. [Capacitor](https://capacitorjs.com)
  bundles the whole app inside a native Android app, which works fully
  offline from the first launch. Nothing is downloaded at runtime.

Only `src/platform/` knows which of the two it's running in (see
"Project structure" below). Every feature is written once.

### What differs between the website and the APK

| Capability | Website (Chrome) | Android APK |
|---|---|---|
| Offline | After the first visit (service worker) | Always. Everything is inside the APK |
| "View in your space" AR | WebXR, or Google Scene Viewer | The app's own AR screen (`android/.../ar/ArViewerActivity.kt`, ARCore + SceneView). It is **fully offline** because it loads the model bundled in the APK, and it uses each model's real-world `scale`. Tap a surface to place the model, pinch to resize, twist to rotate. Needs an ARCore-supported phone; on other phones it falls back to Google Scene Viewer, which needs internet |
| Drag-to-equip / operate sims | Real world-anchored WebXR where supported, otherwise camera overlay | Camera-overlay mode (Android's WebView has no WebXR). This is the same fallback the website already uses |
| Voice narration | Browser `speechSynthesis` | The phone's own TTS engine |
| Voice input (emergency) | Web Speech API | The phone's own speech recognizer |
| Export / audit report | File download | Android share sheet (save to Files, Drive, WhatsApp…) |
| CPR hand tracking / pose | MediaPipe, bundled locally | Same |
| Certificates / ledger | Web Crypto + IndexedDB | Same (Capacitor serves the app from `https://localhost`, a secure context) |
| Accounts / login | Same accounts server (`PRODUCTION_API_URL` in `src/config.js`) | Same server, so one account works on both |

## Project structure

```
ar-safety-trainer/
  src/
    main.js            entry point: shell + router + Android setup
    config.js          app-wide settings (hosted URL, PPE gate switch)
    app/               the app frame
      shell.js         top bar (🚨, text size, sound, verify, language)
      router.js        hash router: matches #/… to a feature's screen
      routes.js        the route table, collected from every feature
    features/          one folder per feature; each exports its `routes`
      home/            module list
      training/        3D/AR viewer, guided tour, quiz, result
      itemGallery/     per-item model gallery + viewer
      simulations/     drag-to-equip (PPE) and drag-to-operate (machinery) sims
      emergency/       voice triage hub, first-aid guides, CPR camera assist
      certificates/    QR certificate issue + verify
      admin/           compliance dashboard, aggregate stats, audit report
      grievance/       report-a-concern form
      account/         login, registration, profile, admin account approval
    content/           training content shared by features (modules, items)
    core/              app-wide logic: i18n/, state.js, ledger.js,
                       session.js (who's logged in), api.js (server calls)
    shared/            reusable pieces: ui/ (confetti, sound, escapeHtml), three/ (AR scene)
    platform/          web-vs-Android adapters: speech, voice input, files,
                       clipboard, AR launcher, ML asset paths, Android setup
    styles/            global CSS (feature CSS lives in its feature folder)
  public/models/       .glb 3D models
  android/             native Android project (Capacitor)
  assets/              app icon + splash sources (SVG)
  scripts/             build helpers (ML assets, icons, Gradle, signing notes)
```

Import rules that keep it easy to follow:

- A feature may import from `core/`, `content/`, `shared/` and `platform/`,
  **never from another feature**. Features link to each other only by
  navigating (`navigate('#/verify')`).
- Browser vs. Android differences live **only** in `platform/`.

### Adding a feature

1. Create `src/features/<name>/` with its screen(s), e.g. `fooScreen.js`
   exporting `renderFoo(main, navigate, params)`.
2. Add `src/features/<name>/index.js`:
   ```js
   import { renderFoo } from './fooScreen.js'
   export const routes = [{ path: '/foo/:id', render: renderFoo }]
   ```
3. Add it to the list in `src/app/routes.js`.
4. Add any UI text to both `src/core/i18n/strings.en.js` and `strings.hi.js`.


## What's built

- **Accounts, login and profiles** (`src/features/account/` + the
  [accounts server](../server/README.md)). **Currently switched OFF**
  (`ACCOUNTS_ENABLED` in `src/config.js`) until the server is hosted.
  While it's off, the website and app work without login, exactly as they
  did before accounts existed. Set it to `true` once the Render + Neon
  server is live, and everything below turns on for both. Registration asks for:
  - role (Worker / Supervisor / Administrator)
  - full name, work ID and mobile number
  - employer, district (all 24 Jharkhand districts) and designation
  - optional e-Shram UAN and preferred language
  - a password (min. 8 characters, letters + digits)
  - explicit consent to store the data

  Login accepts a work ID **or** a mobile number. Everything needs a login
  **except the 🚨 Emergency guides and certificate verification**, so
  first aid is never behind a login screen. Supervisor/Admin sign-ups stay
  *pending* until an admin approves them on **Profile → Manage accounts**,
  so nobody can grant themselves elevated access. Admins can also disable
  and re-enable accounts. Route access is declared per route
  (`public` / `guestOnly` / `roles`) and enforced in
  `src/app/router.js`; the server enforces it again on every API call.

  Other details:
  - **Offline**: the session is cached on the device (30 days by default),
    so a worker who logged in above ground keeps training underground.
    Profile edits need a connection.
  - **Per-account results**: quiz results are stored per account, so two
    workers sharing one phone never see or get certified on each other's
    passes.
  - **Certificates**: the name/work ID now come from the profile and are
    read-only.
  - **Language**: the app switches to the user's preferred language when
    they log in.

- **Module list** (`src/features/home/homeScreen.js`) — 6 modules: the PS's 5 domains
  plus a cross-cutting PPE Compliance module (see below). Two are wired to
  your real models:
  - **PPE Compliance Check** — your "uniform" model
    (`public/models/ppe-uniform.glb`). Doubles as a **mandatory induction
    gate**: `src/app/router.js` redirects to this module first, before any
    other, until it's been passed once — same as a real mine-site PPE
    check. It stays revisitable from the home screen afterward.
    Also has an **"Explore each item in detail" gallery**
    (`src/features/itemGallery/galleryScreen.js` / `itemViewerScreen.js`, `src/content/ppeItems.js`
    — these two screens are generic over any module via
    `src/content/itemGalleries.js`'s moduleId→items lookup, not PPE-specific
    despite the filenames' history) — 5 of your real per-item models
    (helmet+lamp, SCSR, vest, boots, gas detector), each with its own
    dedicated rotate/zoom/AR-place viewer, on-screen detail text, and a
    "Listen" button that narrates in whichever language is active. Purely
    additive — the combined-model view and its quiz/gate are unchanged.
    Its "🎮 Play as a Guided Tour" button opens an **interactive
    drag-to-equip AR sim** (`src/features/simulations/ppeEquipSim.js`) instead of a
    passive walkthrough: a stylized procedural mannequin
    (`src/shared/three/proceduralModels.js` — plain Three.js primitives, no new
    3D asset) stands in the camera view and you drag each of the 5 real
    PPE item models onto it in sequence; equipping one narrates, in
    Hindi/English, the real injury risk of skipping it
    (`content/ppeItems.js`'s `consequence` field), ending on the same "Fully
    Equipped!" + confetti screen as before. Placement is a real,
    world-anchored WebXR AR session on devices that support it (Android
    Chrome, via `hit-test` + `dom-overlay`) and automatically falls back
    to a fixed camera-preview overlay everywhere else — same shared
    core (`src/shared/three/xrPlacementScene.js`) both new sims use, and the
    active tier is shown on-screen, never silently swapped. If neither
    can start at all (no camera, no WebGL), it falls back to the
    original `tourScreen.js` walkthrough rather than a broken screen — that
    screen is unchanged and still what every locked-for-now module will
    use once unlocked.
  - **Machinery Safety** — your "continuous miner" model
    (`public/models/continuous-miner.glb`), with hotspots/quiz on the real
    hazards of that machine (methane/coal-dust ignition at the cutting
    drum, mechanical pinch points, the high-voltage trailing cable, roof
    fall risk, lockout-tagout). Its guided tour is the same kind of
    interactive AR sim (`src/features/simulations/machineryOpsSim.js`, a tabletop
    **diorama scale** — deliberately not the 1:1 scale the normal AR
    viewer uses for this model): drag the miner into a procedural coal
    pile (`buildCoalPile()`, same honest-placeholder spirit as the
    mannequin) to "cut" it while the module's 5 existing hotspots
    narrate in sequence — zero new machinery content, just replayed
    through this richer interaction — then drag the conveyor belt into
    place to carry the coal out, narrating its existing hazard copy.
    Also has an item gallery of its own real models — **Forklift** and
    **Conveyor Belt** (`src/content/machineryItems.js`) — general equipment
    hazards (tip-over/blind-spot risk; belt nip points/entanglement)
    alongside the continuous miner, same pattern as PPE's gallery.
  - Fire & Explosion, Gas Leak, and Chemical Hazard are **intentionally
    locked** — no real models for these yet. (Fire & Explosion briefly had
    a placeholder wired to what turned out to be the continuous-miner
    model; reverted rather than leave a mislabeled demo.) Drop a `.glb`
    into `public/models/`, flip `status` to `'active'`, fill in
    hotspots/quiz in `src/content/modules.js` — nothing else needs to change
    to unlock one.
  - **Emergency Response** is active but deliberately has **no 3D model**
    — its core mechanic is voice triage plus honest live-camera assist,
    not a static scene. Say what happened ("mujhe cut lag gaya" / "my leg
    is broken") and it opens the matching first-aid guide
    (`src/features/emergency/emergencyGuides.js`, Indian Red Cross Society protocol:
    Bleeding, Fracture, Burn, Choking, CPR), narrated step-by-step in
    Hindi/English exactly like the guided tours above; a manual grid of
    all 5 is always available too, in case voice isn't usable. **The
    camera never diagnoses an injury** — it only helps with *where*, once
    the person has already said or picked *what*: the CPR guide's
    compression step can open a real hand-motion-tracked rate check
    (`src/features/emergency/handTracker.js`, MediaPipe HandLandmarker running
    on-device — genuine detected compressions/min, never a canned
    number, and a relative-only depth bar, never a fake cm figure), and
    the Bleeding/Fracture guides can optionally overlay a "press/support
    here" marker on the limb already named
    (`src/features/emergency/poseTracker.js`, positioning only). Every camera/mic path
    degrades to the text-only guide cleanly if permission is denied or
    unsupported — never a broken screen, never a fake result.
- **AR viewer** (`src/features/training/arViewerScreen.js`) — loads the model, lets the
  worker rotate/zoom it or place it in real space via AR, and tap hotspots
  to read about each hazard.
- **Assessment** (`src/features/training/quizScreen.js`, `src/features/training/resultScreen.js`) —
  one-question-at-a-time quiz, 70% pass threshold, scored client-side.
- **Local tamper-evident ledger** (`src/core/ledger.js`) — a hash-chained,
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
  — `#/admin`'s "Generate audit report" (`src/features/admin/auditReport.js`) turns
  it into a plain-language document (device fingerprint, every entry
  restated, the integrity verdict) suitable for internal review or an
  RTI-style disclosure request. It still reflects one worker's device,
  not centralized government record-keeping — that would need the real
  backend this round deliberately doesn't add. Production hosting for that
  backend should sit on MeitY-empanelled / NIC Indian government cloud
  infrastructure, not a generic foreign host — noted here as a roadmap
  decision, not something a static frontend can enforce on its own.
- **QR certificate** (`src/features/certificates/certificateScreen.js`,
  `src/features/certificates/certificate.js`) — generates a QR-encoded, ledger-signed
  certificate after a pass, with a "copy certificate data" button for
  pasting straight into the verifier.
- **Certificate verifier** (`src/features/certificates/verifyScreen.js`, `#/verify`, reachable
  from the top bar) — paste a certificate's data, see **VALID**,
  **TAMPERED**, or **valid-but-unconfirmed-on-this-device**. Hand-edit one
  character of a real certificate and re-check it to see tamper detection
  live.
- **Compliance dashboard** (`src/features/admin/adminScreen.js`, `#/admin`, no nav link
  yet — direct URL only) — the PS's required "web-based admin compliance
  dashboard," built honestly for a no-backend build: a trainee device
  **exports** its data as one JSON file; the dashboard **imports** that
  file (on any device) and shows worker info, module results, issued
  certificates, and a ledger-integrity check reusing the exact same
  `verifyChain()` the verifier screen uses. Not live multi-device sync —
  that needs a real backend, which this round's scope deliberately excluded
  (see Backlog in the plan file). It now also has an **aggregate/MIS
  section** — import several exported files at once
  (`src/features/admin/aggregate.js`) for pass rates by module, most-missed quiz
  questions, and worker coverage **within that imported batch** (never
  phrased as a share of Jharkhand's total workforce — this app has no
  access to that number). Files that fail their own integrity check are
  excluded from the stats and listed separately, never silently dropped or
  silently counted.
- **Grievance / feedback channel** (`src/features/grievance/grievanceScreen.js`,
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
- **Voice narration** (`src/platform/speech.js`) — a "Listen" button on
  hotspot info and on quiz questions (reads the question *and* every
  option) using the browser's built-in SpeechSynthesis, offline, no
  dependency. If no voice exists for the current language on that device,
  it says so rather than reading the text in the wrong language's
  accent/pronunciation — a clear gap is safer than misleading audio for a
  low-literacy listener.
- **Voice input** (`src/platform/voiceInput.js`) — the counterpart to the
  above: the Web Speech API's `SpeechRecognition`, used only by the
  Emergency Response hub's mic button. Same honest-failure shape as
  `speech.js` — unsupported/denied/no-match all resolve to `null`, never a
  guessed transcript; the caller falls back to a manual list.
- **Language registry** (`LANGUAGES` in `src/core/i18n/`) — English and
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
- **i18n** — English + Hindi are filled in (`src/core/i18n/`). Santali
  is deliberately left as a TODO: machine-translating Santali (especially
  in Ol Chiki script) badly would be worse than not having it — get real
  copy from a native speaker/translator and it's a one-file change to add.

- **Animation/interaction polish** — the model auto-rotates when idle
  (`auto-rotate`) and hides the "drag to interact" hint until focused;
  hotspots pulse to read as tappable; tapping one glides the camera to
  face it (`model-viewer`'s `cameraTarget` interpolates on its own — no
  custom animation code — and resets on close); the result screen's score
  is an animated SVG ring (`stroke-dashoffset` transition) with a canvas
  confetti burst (`src/shared/ui/confetti.js`) on a pass; certificates animate
  in on generation; screens cross-fade via the native **View Transitions
  API** (`document.startViewTransition`, no-ops gracefully on unsupported
  browsers); haptic ticks (`navigator.vibrate`) and synthesized Web Audio
  tones (`src/shared/ui/sound.js`, mute toggle in the top bar) mark correct/
  incorrect answers and certificate issuance. Zero new dependencies.
  Deliberately **not** attempted: animating the 3D models themselves — both
  current `.glb` files have no baked-in animations (checked their glTF
  JSON directly), so a spinning drum or similar needs whoever makes the
  next batch of models to add it in Blender/etc.; `<model-viewer>` will
  autoplay a baked animation via one attribute the moment a model has one.

## Not built yet (offered, not selected this round — ask again anytime)

Encrypted local storage for worker PII, certificate validity window +
expiry, a full data-rights screen (registration now has a consent
checkbox, but no view/export/delete-my-data flow yet), syncing quiz results
and certificates to the accounts server (accounts are central, training
records are still per device), password reset (needs an SMS/OTP gateway),
tamper-detection-before-sync, an offline asset-integrity check,
a sync-queue design scaffold, photo-binding at certificate issuance, an
always-reachable offline emergency-reference widget, and the optional
public-blockchain testnet-anchoring stretch path (Polygon Amoy, would need
to be pre-anchored before any live demo — see the plan file for why). Also
still open: a real website favicon (the APK has its own icon; the web build still uses the Vite placeholder),
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

Hotspot positions in `src/content/modules.js` (`position`, `normal`) are
generic guesses, not measured against your actual model's geometry. Run the
dev server, open the module, and nudge the numbers ("x y z") until each dot
sits on the right spot — `<model-viewer>`'s camera-controls make this fast
to eyeball.

## Model scale in AR

Every `.glb` so far (`continuous-miner`, `ppe-uniform`, and all 5 PPE item
models) was exported normalized to a 1-metre bounding box — harmless in
the in-page viewer (it auto-frames regardless of absolute scale) but very
wrong once placed in **real AR**, where actual meters matter: a helmet
was appearing about a metre across. Each module/item in `content/modules.js` /
`content/ppeItems.js` now has a `scale` field (e.g. `0.28` for the helmet, `9` for
the continuous miner) applied via `<model-viewer scale="...">`, which is
the documented, official way to correct this without re-exporting the
file. **These are estimates based on typical real-world sizes, not
measured against the actual objects** — test each one in real AR on a
phone and adjust the number in the relevant data file if it still looks
too big/small. If a hotspot's camera-glide-on-tap (`arViewerScreen.js`) ever
looks off after changing a `scale`, check that function's math — hotspot
`position` values are in the model's local (unscaled) space, so they're
multiplied by `scale` before being used as `cameraTarget`, which expects
world-space coordinates.

## Running it

### Website

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

`npm run build` first runs `scripts/fetch-ml-assets.mjs`. That script copies
the MediaPipe runtime and downloads the hand/pose models into
`public/mediapipe/` (gitignored). It needs internet once; later builds skip
anything already there.

### Accounts server

Login needs the accounts server running (see [../server/README.md](../server/README.md)):

```
cd ../server
npm install
npm run create-admin -- --work-id ADMIN-001 --phone 9876543210 --name "Your Name" --org "Your Org" --district Ranchi --password "choose-one1"
npm run dev
```

`npm run dev` forwards `/api` to it automatically.

**One server for the website and the app.** Every build (the Vercel website
and the APK) talks to `PRODUCTION_API_URL` in `src/config.js`: the free
Render + Neon server described in
[../server/README.md](../server/README.md#free-render--neon). If that
address ever changes, update it there once; both builds pick it up. To try
a production build against your local server instead, run
`VITE_API_URL= npm run build && npm run preview`.

### Keeping the website and the APK in step

Both come from the same `src/`, so every change lands in both. How it
reaches users differs:

- **Website**: push to `master` and Vercel redeploys it.
- **Server**: push to `master` and Render redeploys it (see `render.yaml`).
- **APK**: rebuild with `npm run apk:release` and reinstall it on phones.

### Android APK

You'll need:

- **JDK 21**. The Android build doesn't support newer JDKs such as 25. If
  JDK 21 isn't your default, point Gradle at it in
  `~/.gradle/gradle.properties`:
  `org.gradle.java.home=C:/path/to/jdk-21`
- **Android SDK** with `platforms;android-36`, `build-tools;36.0.0` and
  `platform-tools`. Android Studio installs these. With only the
  command-line tools, run `sdkmanager` yourself.
- `android/local.properties` containing `sdk.dir=C:/Users/<you>/AppData/Local/Android/Sdk`
  (gitignored and machine-specific).

```
npm run apk:debug      # android/app/build/outputs/apk/debug/app-debug.apk
npm run apk:release    # android/app/build/outputs/apk/release/app-release.apk
```

Both commands build the web app in Android mode, copy it into `android/`
(`cap sync`), then run Gradle. The first Gradle run downloads its
dependencies and takes several minutes.

- **Signing**: a release build is signed only if `android/keystore.properties`
  exists. See [scripts/create-keystore.md](scripts/create-keystore.md), and
  back up the key.
- **Install on a phone**: enable USB debugging, then run
  `adb install -r android/app/build/outputs/apk/release/app-release.apk`.
  You can also just copy the APK to the phone and open it.
- **Icons / splash**: edit `assets/icon-foreground.svg` /
  `icon-background.svg`, then run `npm run android:icons`.
- **Native code** lives in `android/app/src/main/java/.../`.
  `ar/ArViewerActivity.kt` is the offline AR screen and `ar/ArViewerPlugin.kt`
  connects it to the web code (`src/platform/arLauncher.js`). Permissions are in
  `AndroidManifest.xml`. If Android Studio is installed, `npx cap open android`
  opens the project in it.
