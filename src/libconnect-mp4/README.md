# LibConnect registration and login

The Express server handles registration, login, sessions, and rate counters.
It serves the built React frontend from the same origin. Firestore target mode
must be selected before the server starts; there is no default or fallback.

## Local development with the Firestore emulator

Install this directory's existing npm dependencies first. In one terminal,
start the local Firestore emulator from this directory:

```powershell
firebase emulators:start --only firestore --project libconnect-mp4
```

Wait until Firestore is listening on `127.0.0.1:8080`. In a second PowerShell
terminal, from this same directory, start Express:

```powershell
$env:LIBCONNECT_FIRESTORE_MODE = 'local-emulator'
$env:LIBCONNECT_FIRESTORE_PROJECT_ID = 'libconnect-mp4'
$env:FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
npm run build
node server/index.js
```

In a third PowerShell terminal, start the React development server on port
3001, leaving Express on port 3000:

```powershell
$env:PORT = '3001'
npm start
```

Open `http://localhost:3001/` for login or `http://localhost:3001/register`
for registration. The React development server proxies `/api/auth/*` requests
to Express on `127.0.0.1:3000`; Express uses only the Firestore emulator. You
can also open Express's built frontend at `http://localhost:3000/` if you do
not need hot reload. The emulator stores local `users`, `emailKeys`,
`loginSessions`, and `loginFailureCounters` records. It does not write them to
Cloud Firestore. Emulator data may be discarded when it stops unless you
explicitly configure an export.

If the emulator is absent, the host or project is wrong, or the build is
missing, Express exits before listening and prints a non-sensitive setup error.
It never switches to a cloud project. `PORT` may be set to another integer
from 1 through 65535 if port 3000 is occupied.

## Production configuration

Deployment must explicitly set `LIBCONNECT_FIRESTORE_MODE=production`,
`LIBCONNECT_FIRESTORE_PROJECT_ID` to the intended production project ID,
and `GOOGLE_CLOUD_PROJECT` to the same ID. This configuration currently
recognizes Cloud Run through its `K_SERVICE` runtime signal and uses its
application-default runtime identity. Do not set `FIRESTORE_EMULATOR_HOST` or
`GOOGLE_APPLICATION_CREDENTIALS` in production. Missing or inconsistent
configuration prevents startup. Startup also rejects a well-known local gcloud
ADC file at `CLOUDSDK_CONFIG` or the platform's default gcloud config path,
and verifies the Cloud Run metadata project ID matches the configured project
before initializing Firebase Admin. It checks only for the file's presence;
it never reads its contents. Configure the deployment identity and
Firestore permissions as a separately approved release step; this repository
does not contain production credentials or a production project ID.

## Verification

```powershell
$env:CI = 'true'
npm test -- --watch=false --runInBand
npm run build
```

With the emulator already running and the three local target variables set,
the opt-in integration test exercises registration and login against it:

```powershell
$env:RUN_FIRESTORE_EMULATOR_TESTS = '1'
npm test -- --watch=false --runInBand --runTestsByPath test/firestore-mode.integration.test.js
```
