# Bug FAQ T03 correction 2 review log

Date: 2026-11-13 (Asia/Singapore)
Snapshot: `C:\Users\Junho\AppData\Local\Temp\codeclinic-bug-faq-review-v04-batch2-correction2-r1`
Base HEAD: clean archive of `c991ddf3f7d3105e4deb19fdc1c11affb5612a48`

## Pre-review checks

- Built a fresh distinct snapshot using `git archive HEAD`, then overlaid the current Batch 1/2 implementation and approval evidence. `src/codeclinic/node_modules` is a dependency junction.
- Verified `assignment-batch-2.json` has `correctionDispatch.revision: 2`, human approval recorded for 2026-11-13, and the CSS-only T03 scope. Confirmed T03 correction2 report/log exist before tests.
- Confirmed current-state, approved v0.4 spec/checklist/handoff, Batch 2 manifest, correction2 proposal, human-visual-verification.md and screenshot, prior T03/T04 reports, and current implementation evidence exist in the snapshot.
- `node src/workflow/validate-assignment.mjs workflow/tasks/bug-faq/assignment-batch-2.json plan` — PASS.
- Two stale Batch 1 manifest allowlist entries (`src/codeclinic/server/server.js`, `src/codeclinic/server/tickets/index.js`) were absent in both workspace and archive; unrelated to this task.

## Checks and exact results

Working directory for npm commands: `C:\Users\Junho\AppData\Local\Temp\codeclinic-bug-faq-review-v04-batch2-correction2-r1\src\codeclinic`

1. Focused UI:

   `$env:CI='true'; npm test -- --runInBand --watchAll=false StudentBugFaq.test.tsx; exit $LASTEXITCODE`

   **PASS** — 1 suite / 6 tests. Coverage includes 100/101 Unicode code-point limits, search selection, detail and pagination.

2. Full suite:

   `$env:CI='true'; npm test -- --runInBand --watchAll=false; exit $LASTEXITCODE`

   **PASS** — 86 passed suites / 1,661 passed tests; 6 skipped suites / 10 skipped tests (emulator-gated); 92 suites / 1,671 tests total; 210.022 seconds. No failures. Existing React `act(...)`, TA duplicate-key `t1`, and Node `punycode` warnings appeared.

3. Build:

   `npm run build; exit $LASTEXITCODE`

   **PASS** — optimized build compiled; 93.65 kB gzip JS and 7.47 kB gzip CSS. Existing Node `fs.F_OK` deprecation warning appeared.

4. Independent geometry and keyboard-focus diagnostic, using the snapshot stylesheet and matching synthetic form markup:

   `node -e "const {chromium}=require('playwright');const fs=require('fs');(async()=>{const css=fs.readFileSync('src/tickets/StudentBugFaq.css','utf8');const b=await chromium.launch({headless:true});const html='<style>:root{--lc-space-2:8px;--lc-space-3:12px;--lc-space-4:16px;--lc-space-5:20px;--lc-size-button-height:44px;--lc-color-border:#aaa;--lc-radius-control:4px;--lc-color-surface:#fff;--lc-color-text:#222;--lc-color-blue:#00f;--lc-color-focus:#f00}*{box-sizing:border-box}'+css+'</style><form class=student-bug-faq-search><label for=student-bug-faq-query>Search Bug FAQ</label><input id=student-bug-faq-query type=search><label for=student-bug-faq-field>Search field</label><select id=student-bug-faq-field><option>Title</option><option>Tags</option></select><button type=submit>Search</button></form>';let failed=false;for(const width of [320,1440]){const p=await b.newPage({viewport:{width,height:900}});await p.setContent(html);const boxes=await p.locator('label,input,select,button').evaluateAll(xs=>xs.map(x=>{const r=x.getBoundingClientRect();return{tag:x.tagName,text:x.textContent||x.getAttribute('aria-label'),x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}}));const overlaps=[];for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)if(Math.min(boxes[i].right,boxes[j].right)>Math.max(boxes[i].x,boxes[j].x)&&Math.min(boxes[i].bottom,boxes[j].bottom)>Math.max(boxes[i].y,boxes[j].y))overlaps.push([boxes[i].text,boxes[j].text]);const inside=boxes.every(x=>x.x>=0&&x.y>=0&&x.right<=width&&x.bottom<=900);const label=boxes.find(x=>x.text==='Search field'),select=boxes.find(x=>x.tag==='SELECT');console.log(JSON.stringify({viewport:width,boxes,overlaps,inside,labelSelectXAligned:label.x===select.x}));if(overlaps.length||!inside||label.x!==select.x)failed=true;await p.keyboard.press('Tab');const focus=await p.evaluate(()=>({id:document.activeElement.id,outline:getComputedStyle(document.activeElement).outlineStyle,width:getComputedStyle(document.activeElement).outlineWidth}));console.log('focus',width,JSON.stringify(focus));if(focus.id!=='student-bug-faq-query'||focus.outline==='none'||focus.width==='0px')failed=true;await p.close()}await b.close();if(failed)process.exit(1)})().catch(e=>{console.error(e);process.exit(1)})"`

   **PASS** — no overlap/overflow, label and selector x coordinates match, and Tab focus on the search input shows a solid 3px outline at 320px and 1440px. 320px positions: first label x8/y8, input x8/y38, Search field label x8/y94, selector x8/y124, Search x8/y180. 1440px positions: first label x8/y8, input x8/y38, Search field label and selector x895.45 (y8/y38), Search x1345.17/y38.

5. CSS revision delta whitespace check, comparing prior revision-1 snapshot to this revision-2 snapshot:

   `git -c core.autocrlf=false diff --no-index --check -- <rev1>/src/codeclinic/src/tickets/StudentBugFaq.css <rev2>/src/codeclinic/src/tickets/StudentBugFaq.css`

   **PASS** — no whitespace errors. The diff contains only the added specificity-matched mobile `label:nth-of-type(2) { grid-column: 1; }` override. No `git diff --check` was run for the whole archive because the archive has no `.git` metadata; the implementer logged their root check.

No live Firestore/Emulator or index deployment. The human rendered-route check after this revision remains pending and is intentionally not represented as passed. No implementation/test/spec/checklist/handoff/manifest files were changed.
