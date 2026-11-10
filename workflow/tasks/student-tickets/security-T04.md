# T04 security evidence

Task: `student-tickets`, T04  
Security baseline: approved specification v0.3 R2–R4 and analyst handoff v0.2  
Status: verification evidence assembled; independent security review remains separate

## Findings

- **Identity and role are server-controlled.** Focused and full API suites pass. Existing tests reject visitor/TA requests, recheck the stored active Student account, require CSRF, and reject client-controlled authorization and initial-state fields. T04 changed no authorization code.
- **The browser does not access ticket collections.** `TicketCreatePage.tsx` calls `/api/auth/csrf` and `POST /api/tickets`; source inspection found no Firestore import, `collection()` use, or direct ticket read/write in the browser source. The server router and storage module own ticket validation and writes. The client submits only its create allowlist.
- **Input bounds are covered on both sides.** UI tests cover the fixed seven-language selector and `Other` note, padded-uppercase tag normalization, rejection above five tags, Unicode title length, source exclusivity, and the serialized request bound. API tests cover C1 `files`/`repoFilePaths`, accepted maxima and rejected invalid values, normalized duplicate tags, malformed/oversized bodies, and server-side field allowlisting. Final focused suite: 59 tests passed.
- **The C1 write is narrow and uses synthetic data.** The local emulator assertion observed exactly one `tickets/{ticketId}` write, the exact C1 fields, server owner and `OPEN` state, Firestore Timestamp values, specified null/empty initial fields, and no change to the `notifications` count. It then deleted its synthetic ticket. The isolated emulator used project `demo-codeclinic-t04` on loopback port 8180 and was shut down afterward.
- **Repository references are not fetched.** Source inspection and API tests show references are validated and stored as strings/paths; no outbound GitHub fetch is in the create path.
- **Browser evidence uses synthetic endpoints.** The local visual harness returned a synthetic Student session, CSRF token, and create response. It made no real account/session or ticket write and did not exercise backend authorization. The independent API suite and emulator check provide the backend evidence.

## Commands and logs

See [`implementation-T04.md`](implementation-T04.md) for exact commands and linked full output. The emulator-specific script and run output are [`emulator-C1-assertion.js`](../../../src/codeclinic/test/emulator-C1-assertion.js) and [`implementation-T04-emulator-final.log`](../../../logs/tasks/student-tickets/implementation-T04-emulator-final.log). The complete test logs are linked there as well.

No secrets, credentials, session identifiers, CSRF tokens from a real session, real user data, or repository contents were recorded. The local browser harness uses a fixed synthetic token only.

## Residual risk

The Chrome visual/keyboard run did not authenticate against the real Express session route because the headless inspection harness stubbed local endpoints. API and emulator verification are separate and passed. A reviewer should preserve that distinction when assessing T04 evidence. No security defect or requirement change was found in this verification phase.
