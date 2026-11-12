# T02 output-filter follow-up review execution log

Date: 2026-11-11

- Read spec v0.3 R4, checklist v0.2 T02, active assignment, prior T02/T03 correction review, and T02 follow-up implementation evidence/log. Inspected Student feature filter and feature test changes only; no TA-specific source or tests.
- Command (cwd `src/codeclinic`): `npm test -- --watchAll=false --runInBand student-ticket-help.feature.test.js ai-gateway.test.js`
  - Result: PASS; 2 suites, 38 tests. The registered fake-provider cases include `console.log(value)`, `console.log(value);`, `items.push(value);`, `if (ready) {`, `value = compute()`, and a loop form. Shared gateway tests pass.
- Direct parser spot checks (cwd `src/codeclinic`): `node -e` loaded `server/ai/student-ticket-help.parse` and checked `console.log(value)`, `console.log(value);`, `items.push(value);`, `compute(value)`, `console.log(transform(value))`, `Use f(x) to describe the mapping.`, `The runtime is O(n).`, and `f(x)`. Result: the simple code calls and bare `f(x)` were rejected; natural-language f(x) and O(n) sentences were accepted; nested `console.log(transform(value))` was accepted.
- Registered fake-provider reproduction (cwd `src/codeclinic`): an inline Node script created `createAiGateway` with synthetic configuration, fake transport, fake limiter and usage store, registered `ERROR_EXPLAINER`, and sent a HINT containing `console.log(transform(value))`. Result: `{"ok":true,"data":{"type":"HINT","concept":"Logging","explanation":"A nested call.","hints":["console.log(transform(value))"]}}`. This confirms the nested call gap across the actual registered gateway boundary.
- No live provider, credential, network, rate-limit service, deployment, T03 files, or TA-specific code/tests were accessed. No source, review-only tests, or checklist status were changed.
- Verdict: T02 changes required because nested call-shaped output passes the output filter. Details and false-positive spot checks are in `workflow/tasks/ai-error-explainer/review-T02-followup.md`.

Exact direct-parser command:

```powershell
node -e "const {parse}=require('./server/ai/student-ticket-help'); const values=['console.log(value)','console.log(value);','items.push(value);','compute(value)','console.log(transform(value))','Use f(x) to describe the mapping.','The runtime is O(n).','f(x)']; for (const hint of values) { const result=parse({type:'HINT',concept:'Concept',explanation:'A concise explanation.',hints:[hint]}); process.stdout.write(JSON.stringify({hint,accepted:result.ok})+'\n'); }"
```

The registered fake-provider reproduction used this PowerShell here-string piped to `node`:

```javascript
const { createAiGateway } = require('./server/ai/gateway');
const { registerStudentTicketHelp } = require('./server/ai/student-ticket-help');
const content = JSON.stringify({ type: 'HINT', concept: 'Logging', explanation: 'A nested call.', hints: ['console.log(transform(value))'] });
const gateway = createAiGateway({
  env: { SOCLAAS_API_KEY: 'synthetic-test-key', SOCLAAS_BASE_URL: 'https://provider.invalid/v1', SOCLAAS_MODEL: 'fake-model' },
  transport: { send: async () => ({ ok: true, attempts: 1, response: { choices: [{ message: { content } }] } }) },
  rateLimiter: { reserve: async () => ({ ok: true }) },
  usageStore: { record: async () => {} },
  logger: { info: () => {} },
});
registerStudentTicketHelp(gateway);
gateway.run({ feature: 'ERROR_EXPLAINER', actor: { userId: 'student-test', accountType: 'STUDENT' }, input: { page: 'create', question: 'Help', draft: {} } })
  .then(result => process.stdout.write(JSON.stringify(result) + '\n'));
```
