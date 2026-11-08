# T06 factual review log

- Read applicable repository instructions (`AGENTS.md`, `workflow/README.md`, and reviewer profile), `Overview.md`, canonical and task spec v0.1, checklist/handoff v0.2, T01 final design, batch-4 assignment, T06 initial/correction implementation reports and logs, and prior final T02–T05 review reports/logs.
- Confirmed batch 4 is the approved T06 singleton and that the manifest amendment allows `test/DashboardRoutes.integration.test.tsx`.
- Workspace was uncommitted. Inspected the exact combined current diff against HEAD, while excluding unrelated pre-existing documentation and workflow edits. No production files were changed by the reviewer. The T06 tracked change is the route/logout test harness correction.
- `NODE_PATH` was set to the existing isolated dependency tree `.deps-batch4/node_modules`.

## Commands and results

1. Full TSX suite:
   `node .deps-batch4\node_modules\jest\bin\jest.js --config .deps-batch4\jest.frontend.config.cjs --runInBand`
   Result: **8 suites passed; 86 tests passed, 0 failed.** Includes `DashboardRoutes.integration.test.tsx`.

2. Full JavaScript suite:
   `node .deps-batch4\node_modules\jest\bin\jest.js --config .deps-batch4\jest.frontend.config.cjs --testMatch '**/test/**/*.test.js' --runInBand`
   Result: **9 suites passed, 1 skipped; 160 tests passed, 1 skipped, 0 failed (161 total).**

3. Isolated TypeScript no-emit check. Refreshed `.deps-batch4/typecheck/src` and its `tsconfig.json` from the current app source/config, then ran `..\node_modules\.bin\tsc.cmd --noEmit` from `.deps-batch4/typecheck`.
   Result: **exit 0, no diagnostics.**

4. Isolated production build. Refreshed `.deps-batch4/build-check/src`, `public`, `tsconfig.json`, and `package.json`, then ran `..\node_modules\.bin\react-scripts.cmd build` from `.deps-batch4/build-check`.
   Result: **compiled successfully.** Output stayed in the isolated build-check directory.

5. Scoped diff hygiene:
   `git diff --check -- src/MemberDashboard.tsx src/DashboardLogout.tsx src/DashboardViews.css server/auth/login.js server/index.js test/DashboardRoutes.integration.test.tsx`
   Result: **exit 0**; Git emitted line-ending conversion warnings only.

6. Read-only source scan:
   `rg -n 'dangerouslySetInnerHTML|console\.' src\MemberCatalog.tsx server\catalog`
   `rg -n 'collection|\.set\(|\.update\(|\.delete\(' server\catalog`
   Result: no `dangerouslySetInnerHTML`, catalog console logging, or Firestore write call found; adapter reads `collection('books')`.

## Review notes and limitations

- The route-test harness handles only the member catalog path and delegates every other fetch to the original mock. Inspected tests still assert session calls, CSRF retrieval, logout POST headers, navigation after confirmation, denial states, and logout retry paths; all passed in the complete TSX run.
- Endpoint tests verify per-request current-account revalidation, member-only access, forged query rejection, bounded reads, output field filtering, and non-sensitive 401/403/400/503 responses.
- Found a malformed-response invariant gap in `isCatalogResponse`: scan flags are not cross-validated against each other and `books`. The approved valid empty-collection payload remains accepted; the finding concerns contradictory combinations only. See the review report for examples and recommended correction.
- Browser host unavailable; rendered desktop/320-pixel layout, scroll, focus, continuation, and synopsis checks were not performed. No live or emulator Firestore access, external service, secret access, or production mutation occurred.
