# Bug FAQ T03 review log

Review cycle: began 2026-11-12; snapshot and verification completed 2026-11-13 (Asia/Singapore)
Snapshot: `C:\Users\Junho\AppData\Local\Temp\codeclinic-bug-faq-review-v04-batch2-r1`
Snapshot base HEAD: `c991ddf3f7d3105e4deb19fdc1c11affb5612a48`

## Pre-review checks

- Refreshed a distinct snapshot from `git archive HEAD`; overlaid 49 exact Batch 1/Batch 2 implementation and approval/evidence artifacts, plus reviewer instructions. `src/codeclinic/node_modules` is a junction to workspace dependencies.
- Verified Batch 2 manifest declares T03/T04, records human dispatch approval, and references existing T03/T04 implementation reports. UI component/test and both guides exist in the snapshot.
- Assignment plan validation: `node src/workflow/validate-assignment.mjs workflow/tasks/bug-faq/assignment-batch-2.json plan` — PASS.
- The Batch 1 manifest also lists `src/codeclinic/server/server.js` and `src/codeclinic/server/tickets/index.js`; both were absent in the workspace and the clean archive, so they were not overlaid. The paths are not required by T03/T04. This did not cause the focused tests or build to fail.
- Reviewed the approved v0.4 spec/checklist/handoff, reviewer profile, current-state, Batch 2 manifest, T03/T04 reports/logs, UI and dependent API/store tests, dashboard, and guide text.

## Commands and results

Working directory for Node commands: `C:\Users\Junho\AppData\Local\Temp\codeclinic-bug-faq-review-v04-batch2-r1\src\codeclinic`

1. Focused UI contract:

   `$env:CI='true'; npm test -- --runInBand --watchAll=false StudentBugFaq.test.tsx; exit $LASTEXITCODE`

   **PASS** — 1 suite / 5 tests.

2. Full regression suite:

   `$env:CI='true'; npm test -- --runInBand --watchAll=false; exit $LASTEXITCODE`

   **PASS** — 86 suites passed, 1,660 tests passed; 6 suites and 10 tests skipped (emulator-gated), 92 suites / 1,670 tests total; 141.31 seconds. Existing React `act(...)`, duplicate-key, and Node `punycode` warnings appeared; no test failed.

3. Production build:

   `npm run build; exit $LASTEXITCODE`

   **PASS** — optimized build compiled; 93.62 kB gzip JS and 7.42 kB gzip CSS. Existing Node `fs.F_OK` deprecation warning appeared.

4. Headless layout diagnostic (synthetic form markup, snapshot stylesheet):

   `node -e "const {chromium}=require('playwright');const fs=require('fs');(async()=>{const css=fs.readFileSync('src/tickets/StudentBugFaq.css','utf8');const b=await chromium.launch({headless:true});const p=await b.newPage({viewport:{width:1440,height:900}});const html='<style>:root{--lc-space-3:12px;--lc-size-button-height:44px;--lc-color-border:#aaa;--lc-radius-control:4px;--lc-color-surface:#fff;--lc-color-text:#222;--lc-space-5:20px;--lc-color-blue:#00f;--lc-color-focus:#f00}*{box-sizing:border-box}'+css+'</style><form class=student-bug-faq-search><label for=q>Search Bug FAQ</label><input id=q type=search><label for=f>Search field</label><select id=f><option>Title</option></select><button>Search</button></form>';await p.setContent(html);for(const width of [1440,320]){await p.setViewportSize({width,height:900});await p.waitForTimeout(30);console.log(width,JSON.stringify(await p.locator('label,input,select,button').evaluateAll(xs=>xs.map(x=>({tag:x.tagName,text:x.textContent||x.getAttribute('aria-label'),rect:(()=>{const r=x.getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}})()})))))}await b.close()})().catch(e=>{console.error(e);process.exit(1)})"`

   **PASS as a diagnostic** — at 320px both labels occupy the same rectangle origin (`y=8`, `x=8`, width 304px); at 1440px input, select, and Search share the controls row. This synthetic check is not the required human check at the actual dashboard route.

No `git diff --check` was run inside the archive because it has no `.git` metadata; the implementation report records its own whitespace check. No code or test files were edited by the reviewer.
