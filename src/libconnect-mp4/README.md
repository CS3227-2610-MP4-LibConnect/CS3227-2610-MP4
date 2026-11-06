# LibConnect login

The React login page is in `src/LoginPage.tsx`. The Express server in
`server/index.js` serves the built page and handles `/api/auth/login`,
`/api/auth/csrf`, and `/api/auth/logout` from the same origin. Server-side
Firestore access uses Firebase Admin application credentials; the browser
sends credentials only to the Express endpoint.

## Run

From this directory:

```sh
npm run build
node server/index.js
```

The server listens on port 3000 by default. Set `PORT` to another valid port
when needed. For isolated local development, configure the Firestore emulator
and a demo project ID in the process environment. Real Firebase access and
deployment routing require separate approval under the repository workflow.

## Check

```sh
npm test -- --watchAll=false --runInBand
npm run build
```

Tests are in `test/` and cover the login page, server entry point, login
credential handling, session behavior, and Firestore session store.
