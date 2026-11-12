# Implementation report: gateway quota order and Firestore rules

Date: 2026-11-12
Branch: `gateway-quota-and-rules` (from `origin/main`)
Agent: Claude Code (Claude Opus 5.5), one session. The human approved both fixes in chat on 2026-11-12. Both were taken from the MP3 feedback review.

## 1. Rejected AI requests used up rate-limit quota

- **Specification:** [`ai-gateway.md`](../../specs/ai-gateway.md) v0.2, R4 and R5. The human replied "approved v0.2" on 2026-11-12.
- **Defect:** `server/ai/gateway.js` reserved per-user and global capacity *before* building and size-checking the user content. An empty or oversized request returned `AI_UNAVAILABLE` or `AI_INPUT_TOO_LARGE` without calling the provider, but still used up a slot of the shared global SoCLaaS quota. Peer reviewer 2 found the same defect class in MP3.
- **Change:**
  - The content is now built, redacted and checked against `maxInputChars` before `limiter.reserve`.
  - Spec R4 now states the order of input validation.
  - Spec R5 states that capacity is reserved only after validation.
- **Test:** `test/ai-gateway.test.js`, a new case for oversized, empty and blank content. It checks that `reserve` is never called. All 3 cases failed before the change and pass after it.

## 2. No Firestore security rules in the repository

- **Specification:** [`environments-and-deployment.md`](../../specs/environments-and-deployment.md) v0.3, R3.
- **Gap:** there was no `firestore.rules` file. `firebase.json` referenced only indexes, and the deploy workflow deployed only indexes.
- **Change:**
  - `src/codeclinic/firestore.rules` denies every client read and write. The browser never accesses Firestore, and the server's Admin SDK is not subject to the rules.
  - `firebase.json` references the rules file.
  - `.github/workflows/deploy-prod.yml` deploys `firestore:rules,firestore:indexes`.
  - `deploy-prod-setup.md` adds the `roles/firebaserules.admin` role that the deploy account needs.
- **Test:** `test/firestore-rules.test.js` checks two things: `firebase.json` references the rules, and the only `allow` statement is `allow read, write: if false;` on `/{document=**}`.

## Verification

| Command (from `src/codeclinic`) | Result |
| --- | --- |
| `CI=true npx react-scripts test ... test/ai-gateway.test.js`, before the gateway change | 3 failed, 20 passed |
| The same, after the change | 23 passed |
| `CI=true npm test -- --watch=false` | 83 suites passed, 6 skipped; 1606 tests passed, 10 skipped |
| `firebase emulators:exec --only firestore --project demo-codeclinic "echo EMULATOR_UP"` | Exit 0. The emulator loaded the new rules and ran the command |

## Open items

- Before the next *Deploy production* run, a human must grant the deploy account `roles/firebaserules.admin`, or the rules deploy fails.
- There is no rules-emulator test with a client SDK: adding `@firebase/rules-unit-testing` would be a new dependency, which needs separate approval. The static test and the emulator start are the evidence.
