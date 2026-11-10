# CodeClinic

The Express server handles registration, login, sessions, tickets, and the
TA AI features. It serves the built React frontend from the same origin.
Firestore target mode must be selected before the server starts; there is no
default or fallback.

Run every command below from this directory (`src/codeclinic`). Install the
npm dependencies once with `npm install`. You also need the Firebase CLI
(`firebase`) for the local emulator.

## Run locally

Local runs use the Firestore emulator only. They never touch the live
database. You need three terminals.

### 1. Start the Firestore emulator

```sh
firebase emulators:start --only firestore --project demo-codeclinic
```

Wait until Firestore is listening on `127.0.0.1:8080`. The `demo-` prefix
marks an emulator-only project ID, so the Firebase tools cannot reach a cloud
project with it. The `.firebaserc` `default` alias is `demo-codeclinic`. The
emulator UI is at `http://127.0.0.1:4000/`.

### 2. Start Express on port 3000

macOS / Linux:

```sh
export CODECLINIC_FIRESTORE_MODE=local-emulator
export CODECLINIC_FIRESTORE_PROJECT_ID=demo-codeclinic
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
npm run build
node --env-file-if-exists=.env server/index.js
```

Windows PowerShell:

```powershell
$env:CODECLINIC_FIRESTORE_MODE = 'local-emulator'
$env:CODECLINIC_FIRESTORE_PROJECT_ID = 'demo-codeclinic'
$env:FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
npm run build
node --env-file-if-exists=.env server/index.js
```

`--env-file-if-exists=.env` loads the optional AI settings from `.env` (see
[TA AI features](#ta-ai-features-optional)); the server still starts without
the file. Wait for `CodeClinic server listening on port 3000.` You can stop here and
open `http://localhost:3000/` if you do not need hot reload.

### 3. Start the React development server on port 3001 (optional, for hot reload)

macOS / Linux:

```sh
PORT=3001 npm start
```

Windows PowerShell:

```powershell
$env:PORT = '3001'
npm start
```

Open `http://localhost:3001/` for login or `http://localhost:3001/register`
for registration. The React development server proxies `/api/*` requests to
Express on `127.0.0.1:3000`.

The emulator stores local `users`, `emailKeys`, `loginSessions`,
`loginFailureCounters`, and ticket records. It does not write them to Cloud
Firestore. Emulator data is discarded when it stops unless you explicitly
configure an export, so you may need to register test accounts again after a
restart.

### TA AI features (optional)

The TA AI draft and insight features need these server variables. Without
them, the server still starts and the AI features report that they are
disabled.

| Variable | Value |
| --- | --- |
| `SOCLAAS_API_KEY` | API key for the AI service |
| `SOCLAAS_BASE_URL` | `https://` base URL ending in `/v1` |
| `SOCLAAS_MODEL` | Model name |
| `AI_GLOBAL_LIMIT_PER_MINUTE` | Optional, 1–45 (default 40) |

Put them in a local `.env` file in this directory, one `NAME=value` per line.
It is git-ignored; never commit it. Step 2 loads it automatically. If the
server prints `AI gateway disabled: ... missing`, the file was not found or
Express was started without `--env-file-if-exists=.env`; `... malformed`
means a value has the wrong format.

### Create a TA Coordinator account

No coordinator account exists by default. Register a TA account through the
registration page, then promote it with the bootstrap script. With the
emulator running:

macOS / Linux:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
CODECLINIC_COORDINATOR_EMAIL=coord@example.test \
node scripts/bootstrap-coordinator.js --project demo-codeclinic
```

Windows PowerShell:

```powershell
$env:FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
$env:CODECLINIC_COORDINATOR_EMAIL = 'coord@example.test'
node scripts/bootstrap-coordinator.js --project demo-codeclinic
```

It prints `TA Coordinator account activated.` and the account can then sign
in as a TA. The script refuses to run if a coordinator already exists unless
you add `--allow-additional`. Always set `FIRESTORE_EMULATOR_HOST` and use the
`demo-codeclinic` project locally: without them, the script changes the live
database.

### Troubleshooting

- **"Unable to complete sign in" on every attempt, and `/api` requests return
  `431`:** Express is not running, and the React development server is on
  port 3000 proxying to itself. Stop it, start Express (step 2), then start
  React with `PORT=3001` (step 3).
- **Express exits at startup with a setup error:** the emulator is not
  running, a variable in step 2 is missing or wrong, or `npm run build` has
  not been run. Express never falls back to a cloud project.
- **Port 3000 is taken:** set `PORT` to another port for Express. The React
  proxy in `package.json` still points at `127.0.0.1:3000`, so only use
  Express's own frontend in that case.

## Live deployment

The live app runs on Firebase App Hosting (Cloud Run) in the production
Firebase project `libconnect-mp4`. `apphosting.yaml` defines the build
(`npm run build`), the start command (`node server/index.js`), and the
production environment variables. AI service settings are stored as App
Hosting secrets, not in the repository.

Deployment is managed by the team member who owns the App Hosting backend.
Ask them before changing `apphosting.yaml`, secrets, or the production
project.

### Production configuration

Deployment must explicitly set `CODECLINIC_FIRESTORE_MODE=production`,
`CODECLINIC_FIRESTORE_PROJECT_ID` to the intended production project ID,
and `GOOGLE_CLOUD_PROJECT` to the same ID. This configuration currently
recognizes Cloud Run through its `K_SERVICE` runtime signal and uses its
application-default runtime identity. Do not set `FIRESTORE_EMULATOR_HOST` or
`GOOGLE_APPLICATION_CREDENTIALS` in production. Missing or inconsistent
configuration prevents startup. Startup also rejects a well-known local gcloud
ADC file at `CLOUDSDK_CONFIG` or the platform's default gcloud config path,
and verifies the Cloud Run metadata project ID matches the configured project
before initializing Firebase Admin. It checks only for the file's presence;
it never reads its contents. Configure the deployment identity and
Firestore permissions as a separately approved release step. The production
project ID is set in `.firebaserc` and `apphosting.yaml`; this repository
does not contain production credentials.

## Verification

```sh
CI=true npm test -- --watchAll=false
npm run build
```

With the emulator already running and the three local target variables from
step 2 set, the opt-in integration test exercises registration and login
against it:

```sh
RUN_FIRESTORE_EMULATOR_TESTS=1 CI=true npm test -- --watchAll=false --runInBand --runTestsByPath test/firestore-mode.integration.test.js
```
