# Developer Guide

## Running the development server

Run these commands from `src/libconnect-mp4` in three PowerShell terminals. Start the local Firestore emulator first:

```powershell
firebase emulators:start --only firestore --project libconnect-mp4
```

For Express, create a local `.env` file in `src/libconnect-mp4` containing:

```dotenv
LIBCONNECT_FIRESTORE_MODE=local-emulator
LIBCONNECT_FIRESTORE_PROJECT_ID=libconnect-mp4
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
```

Keep `.env` out of Git and do not put production credentials in it. In the second terminal, wait until the emulator is listening on port 8080, then build the frontend and start Express on port 3000:

```powershell
npm run build
node --env-file=.env server/index.js
```

The `--env-file=.env` flag is required; `node server/index.js` does not load the file automatically. In the third terminal, run React with hot reload on port 3001:

```powershell
$env:PORT = '3001'
npm start
```

Open `http://localhost:3001/register` or `http://localhost:3001/`. The React development server proxies `/api` requests to Express on port 3000; Express uses only the local Firestore emulator. If the emulator or its project settings are wrong, Express stops before accepting requests. The [application README](../src/libconnect-mp4/README.md#local-development-with-the-firestore-emulator) also shows a setup using PowerShell environment variables instead of `.env`.

## Running the production server

The Express server in `src/libconnect-mp4/server/index.js` serves the built React app and handles registration, login, sessions, and rate counters. Deploy it on Cloud Run with a service account that has the Firestore permissions the app needs. Set these runtime environment variables to the **actual production Firebase project ID**:

```text
LIBCONNECT_FIRESTORE_MODE=production
LIBCONNECT_FIRESTORE_PROJECT_ID=<production-project-id>
GOOGLE_CLOUD_PROJECT=<same-production-project-id>
```

From `src/libconnect-mp4`, build the frontend and start the server with:

```sh
npm run build
node server/index.js
```

Cloud Run supplies `PORT` and `K_SERVICE`. Use its service account identity for credentials; do not set `FIRESTORE_EMULATOR_HOST` or `GOOGLE_APPLICATION_CREDENTIALS` in production. The server rejects a local gcloud Application Default Credentials file and checks that the Cloud Run metadata project matches `LIBCONNECT_FIRESTORE_PROJECT_ID` before it starts accepting requests. Missing or inconsistent configuration stops startup rather than switching Firestore targets.

Production deployment, service account permissions, and a live Firestore connection still need to be configured and verified. The repository contains no production project ID or credentials. Production mode is designed to fail on a developer laptop.
