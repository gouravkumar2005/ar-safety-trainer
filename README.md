# SIH26041 — AR Safety Trainer

AR-based vocational training & certification prototype for industrial
safety in Jharkhand's mining & manufacturing sector, built for Smart
India Hackathon problem statement **SIH26041** (Government of Jharkhand).

**Live app:** https://ar-safety-trainer.vercel.app

## In this repo

- **[`ar-safety-trainer/`](ar-safety-trainer/)** — the actual app. One
  codebase that builds both as a website and as an offline **Android APK**
  (Capacitor, `npm run apk:release`). It's a Vite
  Progressive Web App using `<model-viewer>` for AR, a local hash-chained
  tamper-evident certificate ledger (Web Crypto), offline-first service
  worker, Hindi/English voice narration, and more — see that folder's own
  README for the full breakdown of what's built and why.
- **[`server/`](server/)** — the accounts API (registration, login,
  profiles, admin approval of Supervisor/Admin accounts). Node + Express +
  SQLite, with no separate database server to install.
- **[`pitch-deck/`](pitch-deck/)** — generates the SIH submission `.pptx`
  from a single content file, so it can be regenerated any time the
  project changes rather than hand-edited in PowerPoint.
