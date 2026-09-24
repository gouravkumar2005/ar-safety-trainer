# AR Safety Trainer — accounts server

A small API server for user accounts and profiles: registration, login,
profile editing, and admin approval. Built with Node + Express and
**PostgreSQL**:

- **Production** connects to a hosted Postgres through `DATABASE_URL`,
  e.g. a free [Neon](https://neon.tech) database.
- **On your PC and in the tests** it uses **PGlite**, a real Postgres that
  runs inside Node, so you don't need to install a database. Local data is
  kept in `data/pglite/`.

## Run it

```
npm install
npm run dev        # restarts on file changes; http://localhost:8787
npm test           # API tests against an in-memory database
```

Requires Node 22.9 or newer. Settings are optional: copy `.env.example`
to `.env` to change the port, database, allowed web origins, or session
length. To run the tests against a real Postgres, set
`TEST_DATABASE_URL`. Use an empty test database, because the tests create
accounts in it.

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
  db.js                Postgres connection (pg, or PGlite locally) + tables
  errors.js            HttpError + JSON error handler
  auth/                passwords (scrypt), sessions, login rate limiter, middleware
  users/               validation rules, SQL for the users table
  routes/              authRoutes, profileRoutes, adminRoutes
scripts/create-admin.js
test/api.test.js
```

## Deploying

### Free: Render + Neon

Render's free plan wipes the disk on every restart, so the data goes to
Neon's free Postgres (0.5 GB, doesn't expire).

1. **Neon**: sign up at [neon.tech](https://neon.tech) and create a project
   (region: *Asia Pacific (Singapore)*). Copy the **pooled** connection
   string (`postgresql://...?sslmode=require`).
2. **Render**: sign up at [render.com](https://render.com) with GitHub.
   Choose **New → Blueprint**, pick this repo, and paste the Neon string as
   `DATABASE_URL` when asked. [`../render.yaml`](../render.yaml) sets up
   everything else, and every push to `master` redeploys the server.
3. **First admin**: on your PC, run the command below. It writes straight
   to Neon.
   ```
   DATABASE_URL="postgresql://...neon.tech/...?sslmode=require" npm run create-admin -- --work-id ... (same flags as above)
   ```
4. Check the service's address on Render. If it isn't
   `https://ar-safety-trainer-api.onrender.com` (Render adds a suffix
   when a name is taken), update `PRODUCTION_API_URL` in
   `ar-safety-trainer/src/config.js`.

Free Render services sleep after 15 minutes without traffic. The first
request after that takes about a minute while it wakes up. No data is lost,
because the data is in Neon.

### Long term: NIC / MeitY cloud

The worker data is personal data of Indian workers, so for real use it
should move to MeitY-empanelled / NIC government infrastructure: `npm start`
behind HTTPS, with a Postgres database, `DATABASE_URL` set,
`CORS_ORIGINS` set to the website's address, and `TRUST_PROXY=1` behind
a proxy.

If the server's address changes, update `PRODUCTION_API_URL` in
`ar-safety-trainer/src/config.js`. The website and the APK both read it.
The address must be **https://**.
