# CS3227-2610-MP4: CodeClinic

CodeClinic is a course help desk: students submit coding problems as tickets,
TAs claim and resolve them, and AI gives hints rather than full solutions.
The app lives in
[`src/codeclinic`](src/codeclinic).

## Quick start (local)

From `src/codeclinic`, in three terminals:

```sh
# 1. Firestore emulator
firebase emulators:start --only firestore --project demo-codeclinic

# 2. Express server on port 3000
export CODECLINIC_FIRESTORE_MODE=local-emulator
export CODECLINIC_FIRESTORE_PROJECT_ID=demo-codeclinic
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
npm run build && node --env-file-if-exists=.env server/index.js

# 3. React dev server on port 3001 (optional, for hot reload)
PORT=3001 npm start
```

Then open `http://localhost:3001/`, or `http://localhost:3000/` without
step 3.

See [`src/codeclinic/README.md`](src/codeclinic/README.md) for Windows
commands, the optional AI settings, creating a TA Coordinator account,
troubleshooting, tests, and the live deployment.

## Live

The live app is deployed on Firebase App Hosting in the `libconnect-mp4`
Firebase project. See the app README for its configuration.

## Project workflow

Agent and contributor rules are in [`AGENTS.md`](AGENTS.md). Specifications
live under [`workflow/specs`](workflow/specs).
