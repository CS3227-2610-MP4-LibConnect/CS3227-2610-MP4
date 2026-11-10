# Implementation report: T04 (draft endpoint and registration)

Spec ai-ta-assist v0.2; checklist v0.2; handoff v0.2 (approval lines verified). Base f88ddf6, branch ai-ta-assist-t04.

Changed files (src/codeclinic):
- new `server/tickets/ta-ai-draft-route.js` (`createAiDraftRoutes`, `registerTaAiFeatures`)
- `server/tickets/ta-routes.js`: require + `router.use('/', createAiDraftRoutes(shared));` after the replies mount, before `/:ticketId`
- `server/index.js`: require + `registerTaAiFeatures(app.locals.aiGateway);` directly after `createAiGateway`

Behaviour: CSRF, then empty-body check (400), id pattern/missing ticket (404), then 409 unless status is CLAIMED and claimedByTaId equals the session actor. Gateway read from `req.app.locals.aiGateway` per request; missing or throwing gateway gives 503 AI_UNAVAILABLE. Success: 200 `{ draft }`. Failure: `{ code, message }` via `toAiErrorResponse`. No store writes, no notifications.
Gateway input: only title, language, conceptTags, errorOutput, expectedBehaviour, actualBehaviour, attempted, files {name, content}, replies {message, authorRole, createdAt}. Reply authorRole is derived server-side from the author's stored account type (store replies carry authorUserId only).

Verification (src/codeclinic): `CI=true npx react-scripts test --roots test --testMatch '**/test/**/*.test.*' --watchAll=false ta-ai-draft-route ta-tickets server.test ai-gateway` -> 9 suites passed, 1 skipped; 359 passed, 1 skipped.
Risks: a gateway result lacking a string draft maps to AI_INVALID_OUTPUT (defensive). Mount conflict with T05 in ta-routes.js expected.
