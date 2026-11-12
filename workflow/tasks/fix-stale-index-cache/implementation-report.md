# Implementation report: fix-stale-index-cache

Date: 2026-11-12
Branch: `fix-stale-index-cache` (from `main` at `f8708b3`)
Specification: [`environments-and-deployment.md`](../../specs/environments-and-deployment.md) v0.3. This is a defect fix: R7 says `GET /` must return working HTML in production. No requirement, data model, or authorization rule changed.
Agent: Claude Code (Claude Opus 5.5), one session. The human approved this fix and the CI workflow in chat on 2026-11-12.

## Defect

The production app at `https://libconnect-mp4--libconnect-mp4.asia-southeast1.hosted.app/` showed a blank page in a browser that had visited before a release. curl from a fresh client loaded it correctly.

## Root cause (verified)

| Observation | Evidence |
| --- | --- |
| The server sends the new build | `curl /` gave `main.7b9a8cf8.js` on 6 of 6 requests, and that bundle returned `200` |
| The browser loads an old build | In Chrome, `document.scripts` was `main.5b968348.js`. The navigation transfer was 300 bytes (a revalidation), and `fetch('/', {cache:'no-store'})` returned `main.7b9a8cf8.js` |
| The old bundle is gone | `GET /static/js/main.5b968348.js` returns `404` |
| The ETag never changes between releases | Production sends `last-modified: Tue, 01 Jan 1980 00:00:01 GMT` and `etag: W/"202-49773873e8"`, which is size 514 plus that time. A request with `If-None-Match` set to that tag returns `304` |

Firebase App Hosting builds every file with the same 1980 modification time. Express's static ETag is made from size and modification time. So any release whose `index.html` is 514 bytes long keeps the same ETag. A returning browser revalidates, gets `304`, keeps the old `index.html`, requests a bundle that no longer exists, and renders nothing. No service worker or Cache Storage was involved: both were empty in the browser.

## Change

`src/codeclinic/server/index.js`:

- The app shell (`/`, `/register`, and every SPA route) is served through one `sendAppShell` handler. It replaces the three repeated `sendFile` callbacks, so the routes no longer duplicate the same code. It sends `Cache-Control: no-cache` and uses `res.send`, whose ETag comes from the content and so changes whenever a release changes `index.html`. An unchanged shell still revalidates cheaply with `304`.
- `express.static` sends no size-and-time ETag or `Last-Modified`. It caches content-hashed `/static/*` files for one year as `immutable`, and sends other files (favicon, manifest) with `no-cache`.

Why not `sendFile(..., { etag: false })`: in Express 5.3.0, `res.sendFile` replaces that option with the app-wide `etag` setting (`node_modules/express/lib/response.js:404`). A test run during this task confirmed it. Turning off ETags for the whole app would also have removed them from API responses.

## Tests

New test in `src/codeclinic/test/server.test.js`: *does not let browsers keep a stale app shell across releases built with a fixed file time*. It writes two releases with the same size and the same 1980 modification time. It then checks that:

- an unchanged shell returns `304`;
- after a release, `/`, `/index.html`, `/ta/queue` and `/student/dashboard` return `200` with the new bundle name, even when the request sends the old ETag and `If-Modified-Since`;
- hashed bundles are `immutable` and other files are `no-cache`.

| Command (from `src/codeclinic`) | Result | Log |
| --- | --- | --- |
| New test against the pre-fix `server/index.js` (`HEAD`) | Fails: `Cache-Control` is `public, max-age=0` | [`server-test-before-fix.log`](../../../logs/tasks/fix-stale-index-cache/server-test-before-fix.log) |
| `CI=true npx react-scripts test ... test/server.test.js` | 2 passed | [`server-test.log`](../../../logs/tasks/fix-stale-index-cache/server-test.log) |
| `CI=true npm test -- --watchAll=false` | 75 suites passed, 6 skipped (opt-in emulator and live suites); 1445 tests passed, 10 skipped | [`full-suite.log`](../../../logs/tasks/fix-stale-index-cache/full-suite.log) |
| `npm run build` | Exit 0 | [`build.log`](../../../logs/tasks/fix-stale-index-cache/build.log) |

Earlier test runs failed because the new test's stubs were incomplete and it wrote `index.html` after creating the app. Those were mistakes in the test, fixed before the passing run. They are listed here so the evidence matches the history.

## CI workflow (spec R4, R9)

New `.github/workflows/ci.yml`, approved by the human in chat on 2026-11-12. It has three jobs:

- **Test and build:** `npm ci`, `npm test` with `CI=true`, `npm run build`.
- **Production dependency audit:** `npm audit --omit=dev --audit-level=high`.
- **Secret scan:** Gitleaks 8.30.1 over the full history, with the binary checked against its published SHA-256.

The workflow requests `contents: read` only, pins every action to a full commit SHA, and never deploys. It cancels superseded runs and caches npm.

### Dependency change (spec open decision 2)

Before the change, `npm audit --omit=dev --audit-level=high` found 17 high-severity findings ([`npm-audit.log`](../../../logs/tasks/fix-stale-index-cache/npm-audit.log)): 13 came from build tooling under `react-scripts` and 4 from the `firebase` client SDK, which no source, script or test file imports (the server uses `firebase-admin`). The human chose the spec's preferred option on 2026-11-12:

- Removed `firebase`.
- Moved `react-scripts`, `typescript`, `@testing-library/*` and `@types/*` to `devDependencies`. The runtime dependencies are now `express`, `argon2`, `firebase-admin`, `react`, `react-dom` and `web-vitals`.
- No package versions changed: a comparison of the lockfiles found 0 version changes, 0 additions, and 87 removals, all from the `firebase` client tree.

| Check | Result | Log |
| --- | --- | --- |
| `npm audit --omit=dev --audit-level=high` | Exit 0; 9 moderate findings remain, below the CI threshold | [`npm-audit-after.log`](../../../logs/tasks/fix-stale-index-cache/npm-audit-after.log) |
| `npm ci` (clean install, as CI runs it) | Exit 0. The first try failed with `EACCES` in the local `~/.npm` cache, a local sandbox limit; the retry used a scratch cache | [`npm-ci.log`](../../../logs/tasks/fix-stale-index-cache/npm-ci.log) |
| `CI=true npm test -- --watch=false` | 75 suites passed, 6 skipped; 1445 tests passed, 10 skipped | [`full-suite-after-deps.log`](../../../logs/tasks/fix-stale-index-cache/full-suite-after-deps.log) |
| `npm run build` | Exit 0 | [`build-after-deps.log`](../../../logs/tasks/fix-stale-index-cache/build-after-deps.log) |
| `npm ci --omit=dev` in a scratch copy, then `require('./server')` | The server loads with production dependencies only | This session's transcript |

### Secret scan

Gitleaks 8.30.1 (macOS binary, checksum verified, downloaded with the human's approval) scanned the 150 commits in the history and found 4 matches. All 4 are synthetic:

- two redaction-test inputs in `test/ai-redact.test.js`, built to look like a private key block and a bearer token;
- a mocked temporary password in `test/AccountPages.test.tsx`;
- an example App Check token in an upstream skill doc, already removed by the skill pruning.

Their exact fingerprints are in `.gitleaksignore`, with the reason for each. No rule was disabled. A rescan found no leaks.

## Unresolved risks and open items

1. **Build-time vulnerabilities remain** in the `react-scripts` toolchain, now under `devDependencies`. They don't ship in the runtime server, but the development tooling is unchanged.
2. **Spec R6, R7 and R8 are not implemented.** Production still deploys through App Hosting's automatic GitHub rollout, not through a GitHub Actions `deploy-prod.yml` behind an approval gate. Smoke checks do not run after deploy. The setup R8 needs (Workload Identity, a `production` environment, branch protection) is for humans to do.
3. **No independent review yet.** `AGENTS.md` requires a different reviewer before merge.
4. **Browsers already holding the stale shell** recover on the first load after this fix is deployed. They revalidate once, receive the new content-based ETag, and from then on get correct responses.
5. **The App Hosting build has not been checked with the new dependency split yet.** The local `npm ci` and `npm run build` pass. The next production rollout confirms it.
