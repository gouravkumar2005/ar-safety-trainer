# AR Safety Trainer — accounts server

A small API server for user accounts and profiles: registration, login,
profile editing, and admin approval. Built with Node + Express. It stores
data in SQLite using Node's built-in `node:sqlite`, so there's no database
server to install.

## Run it

```
npm install
npm run dev        # restarts on file changes; http://localhost:8787
npm test           # API tests against an in-memory database
```

Requires Node 22.13 or newer. Settings are optional: copy `.env.example`
to `.env` to change the port, database file, allowed web origins, or
session length.

### Create the first admin

Anyone registering as Supervisor or Admin must be approved by an existing
admin. That means the first admin has to be created from the command line:

```
npm run create-admin -- --work-id ADMIN-001 --phone 9876543210 \
  --name "Asha Kumari" --org "DGMS Ranchi" --district Ranchi --password "S3cure-pass"
```

## Roles

| Role | After registering | Can |
|---|---|---|
| `worker` | Active immediately | Train, take quizzes, earn certificates, edit own profile |
| `supervisor` | **Pending** until an admin approves | Everything a worker can, plus the compliance dashboard |
| `admin` | **Pending** until an admin approves | Everything, plus approve/reject/disable accounts |

## API

Every endpoint returns JSON. An error looks like
`{ error: 'code', message, fields?: { fieldName: 'code' } }`, and the app
translates the codes into English or Hindi.

| Method | Path | Who | What |
|---|---|---|---|
| GET | `/api/auth/options` | anyone | Roles and the 24 Jharkhand districts, for the sign-up form |
| POST | `/api/auth/register` | anyone | Create an account. Workers get `{ user, token }`; others get `{ user, pendingApproval: true }` |
| POST | `/api/auth/login` | anyone | `{ identifier, password }`, where identifier is a work ID or mobile number. Returns `{ user, token, expiresAt }` |
| POST | `/api/auth/logout` | logged in | Ends this session |
| GET | `/api/me` | logged in | Your profile |
| PATCH | `/api/me` | logged in | Update name, phone, organisation, district, designation, UAN, language. Role and work ID can't be changed here |
| POST | `/api/me/password` | logged in | `{ currentPassword, newPassword }`. Logs out your other sessions |
| GET | `/api/admin/users?status=&role=` | admin | List accounts |
| PATCH | `/api/admin/users/:id` | admin | `{ status: 'active' \| 'rejected' \| 'disabled' }` |

Logged-in requests send `Authorization: Bearer <token>`.

## Security notes

- Passwords are hashed with **scrypt** and a per-user salt; plain passwords
  are never stored or logged. They must be at least 8 characters with
  letters and digits.
- Session tokens are random 256-bit values. Only their SHA-256 hash is
  stored, so the database alone can't be used to log in. Sessions last 30
  days by default, so workers can train offline underground. Logging out,
  changing a password, or an admin disabling the account ends sessions
  immediately.
- **Login brute-force protection**: 5 failures per account or per IP locks
  that key out for 15 minutes. A wrong password and an unknown account
  return the same error and take the same time, so login attempts can't be
  used to find out which work IDs exist.
- No one can make themselves an admin: elevated roles need approval, and
  admins can't change their own status, so they can't lock themselves out.
- Request bodies are capped at 20 KB, and CORS only allows the configured
  web origins plus the Android app.

## Project layout

```
src/
  index.js             starts the server
  app.js               builds the Express app (the tests use this directly)
  config.js            settings from environment variables
  db.js                SQLite connection + table definitions
  errors.js            HttpError + JSON error handler
  auth/                passwords (scrypt), sessions, login rate limiter, middleware
  users/               validation rules, SQL for the users table
  routes/              authRoutes, profileRoutes, adminRoutes
scripts/create-admin.js
test/api.test.js
```

## Deploying

Run `npm start` behind HTTPS (e.g. nginx with a TLS certificate) on a
MeitY-empanelled / NIC cloud server. The worker data is personal data of
Indian workers, so it should stay on Indian government infrastructure.
Set `CORS_ORIGINS` to the website's address, `TRUST_PROXY=1` when behind a
proxy, and back up the file at `DB_PATH`.

The Android app must use an **https://** address. Build it with
`VITE_API_URL` set in `ar-safety-trainer/.env.android`.
