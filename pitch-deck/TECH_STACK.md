# AR Safety Trainer — Tech Stack & Architecture (SIH26041)

Input → processing on the worker's phone → trust layer → sync → server → output.

## 1. Input (worker's phone)
- Touch: taps, drag-to-equip, quiz answers
- Camera: AR placement, CPR hand tracking, injury position
- Microphone: "tell me what happened" emergency triage
- Login: work ID / mobile number + password

## 2. Worker app (runs on the phone, works offline)
| Part | Technology |
|---|---|
| App shell | Vite 8 + vanilla JavaScript PWA (hash router) |
| Android app | Capacitor 8 (APK), Kotlin native plugins |
| UI | Government-style design (GIGW / UX4G), Lucide icons, Noto Sans + Noto Sans Devanagari |
| Languages | English, Hindi (Santali / Mundari / Ho / Kurukh scaffolded) |
| 3D viewer | Google `<model-viewer>` 4.3, .glb models |
| AR (online) | Google Scene Viewer (real-size models generated at build time) |
| AR (offline) | ARCore + SceneView 2.3.3 (Filament renderer), Kotlin |
| Simulations | three.js 0.183 (drag-to-equip PPE, drag-to-operate machinery) |
| Voice | Text-to-speech (speechSynthesis / Capacitor TTS), speech recognition (Web Speech / Capacitor plugin) |
| Vision (on-device AI) | MediaPipe Tasks Vision: HandLandmarker (CPR rate), PoseLandmarker (injury position) |
| Assessment | Quiz engine, 70% pass mark, results per account |
| Offline | Workbox service worker (vite-plugin-pwa); APK bundles everything |

## 3. Trust layer ("blockchain-lite")
| Part | Technology |
|---|---|
| Record ledger | Hash-chained, append-only ledger in IndexedDB |
| Signatures | SHA-256 + ECDSA P-256, one key per device (Web Crypto) |
| Certificate | QR code (`qrcode`), verifier shows VALID / TAMPERED |
| Mesh privacy | ECDH + AES-GCM, records sealed for the admin |

## 4. Sync to admin
| Path | Technology |
|---|---|
| With internet | HTTPS REST API (JSON) |
| No internet | Bluetooth mesh: Google Nearby Connections 19.3 (Bluetooth / BLE / Wi-Fi Direct), shortest-hop gradient routing, store-and-forward, ACKs |
| Manual | JSON export / import file |

## 5. Server
| Part | Technology |
|---|---|
| API | Node.js + Express 5, Vercel serverless functions |
| Database | PostgreSQL on Neon (PGlite for local development) |
| Security | scrypt password hashing, random session tokens (only SHA-256 stored), login rate limit, roles: worker / supervisor / admin, CORS allow-list |

## 6. Output
- Admin compliance dashboard: KPIs, pass rates, most-missed questions, audit report
- Live offline network view: which workers' records arrived, by which path, genuine or not
- Certificate verification by QR: VALID / TAMPERED
- Worker's certificate with QR; grievance records

## 7. Hosting, build and tools
GitHub · Vercel (website + API) · Gradle + JDK 21 + Android SDK 36 · Node test runner

## Simple version: what is used for what
| What | Used for |
|---|---|
| Vite + JavaScript | Building the app (website) |
| Capacitor | Turning the website into an Android app |
| model-viewer | Showing 3D models you can rotate |
| Google Scene Viewer | Smooth AR when internet is on |
| ARCore + SceneView | AR without internet |
| three.js | Drag-and-drop 3D training games |
| MediaPipe | Camera AI: counts CPR pushes, finds body position |
| Text-to-speech / Speech recognition | App speaks in Hindi/English, understands spoken emergencies |
| IndexedDB + Web Crypto | Saving results as a tamper-proof signed chain |
| QR code | Certificate anyone can scan and verify |
| Service worker (Workbox) | Website works offline |
| Nearby Connections | Phone-to-phone Bluetooth network with no internet |
| Node.js + Express | Login and accounts server |
| PostgreSQL (Neon) | Storing user accounts |
| Vercel | Hosting the website and server |
| Lucide + Noto Sans | Icons and Hindi/English fonts |
