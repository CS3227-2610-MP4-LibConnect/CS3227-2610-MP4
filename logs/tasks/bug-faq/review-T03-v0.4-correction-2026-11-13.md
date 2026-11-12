# Bug FAQ T03 correction review log — revision 1

Date: 2026-11-13 (Asia/Singapore)
Snapshot: `C:\Users\Junho\AppData\Local\Temp\codeclinic-bug-faq-review-v04-batch2-correction-r1`
Base: clean `git archive HEAD`, commit `c991ddf3f7d3105e4deb19fdc1c11affb5612a48`

## Pre-review checks

- Fresh snapshot distinct from the prior Batch 2 review was built from a clean HEAD archive, with exact available Batch 1/2 implementation/evidence overlays. `node_modules` is junctioned to workspace dependencies.
- Verified manifest `correctionDispatch.revision: 1`, human approval dated 2026-11-13, exact four-file scope, correction reports/logs present, prior reviews present, and `human-visual-verification.md` present before running tests.
- `node src/workflow/validate-assignment.mjs workflow/tasks/bug-faq/assignment-batch-2.json plan` — PASS.
- Read current-state, approved v0.4 spec/checklist/handoff, Batch 2 manifest, correction proposal, human visual report, prior T03/T04 reviews and correction reports/logs.
- Two stale Batch 1 allowed paths (`src/codeclinic/server/server.js`, `src/codeclinic/server/tickets/index.js`) were absent from workspace and archive; neither is part of T03/T04's source graph and neither was overlaid.

## Commands and results

Working directory: `C:\Users\Junho\AppData\Local\Temp\codeclinic-bug-faq-review-v04-batch2-correction-r1\src\codeclinic`

1. Focused UI suite:

   `$env:CI='true'; npm test -- --runInBand --watchAll=false StudentBugFaq.test.tsx; exit $LASTEXITCODE`

   **PASS** — 1 suite / 6 tests, including the 100/101 Unicode code-point boundary.

2. Full suite:

   `$env:CI='true'; npm test -- --runInBand --watchAll=false; exit $LASTEXITCODE`

   **PASS** — 86 suites / 1,661 tests passed; 6 suites / 10 tests skipped (emulator-gated); 92 suites / 1,671 tests total; 130.935 seconds. No test failures. Existing React `act(...)`, TA duplicate-key, and Node punycode warnings appeared.

3. Production build:

   `npm run build; exit $LASTEXITCODE`

   **PASS** — optimized build compiled; 93.65 kB gzip JS and 7.46 kB gzip CSS. Existing Node `fs.F_OK` deprecation warning appeared.

4. Independent geometry diagnostic:

   `node -e "const {chromium}=require('playwright');const fs=require('fs');(async()=>{const css=fs.readFileSync('src/tickets/StudentBugFaq.css','utf8');const b=await chromium.launch({headless:true});const p=await b.newPage();const html='<style>:root{--lc-space-2:8px;--lc-space-3:12px;--lc-space-4:16px;--lc-space-5:20px;--lc-size-button-height:44px;--lc-color-border:#aaa;--lc-radius-control:4px;--lc-color-surface:#fff;--lc-color-text:#222;--lc-color-blue:#00f;--lc-color-focus:#f00}*{box-sizing:border-box}'+css+'</style><form class=student-bug-faq-search><label for=student-bug-faq-query>Search Bug FAQ</label><input id=student-bug-faq-query type=search><label for=student-bug-faq-field>Search field</label><select id=student-bug-faq-field><option>Title</option><option>Tags</option></select><button type=submit>Search</button></form>';await p.setContent(html);let bad=false;for(const width of [320,1440]){await p.setViewportSize({width,height:900});const boxes=await p.locator('label,input,select,button').evaluateAll(xs=>xs.map(x=>{const r=x.getBoundingClientRect();return{tag:x.tagName,text:x.textContent||x.getAttribute('aria-label'),x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}}));const overlaps=[];for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)if(Math.min(boxes[i].right,boxes[j].right)>Math.max(boxes[i].x,boxes[j].x)&&Math.min(boxes[i].bottom,boxes[j].bottom)>Math.max(boxes[i].y,boxes[j].y))overlaps.push([boxes[i].text,boxes[j].text]);const inside=boxes.every(x=>x.x>=0&&x.y>=0&&x.right<=width&&x.bottom<=900);console.log(JSON.stringify({viewport:width,boxes,overlaps,inside}));if(overlaps.length||!inside)bad=true}await b.close();if(bad)process.exit(1)})().catch(e=>{console.error(e);process.exit(1)})"`

   **PASS as geometry diagnostic** — 320px: Search Bug FAQ label x=8,y=8; input x=8,y=38; Search field label x≈231,y=94; select x=8,y=124; Search button x=8,y=180. No overlap; every rectangle stayed within 320px. The second label remains in the implicit column because `.student-bug-faq-search label:nth-of-type(2)` specificity `(0,2,1)` beats the mobile `.student-bug-faq-search label` rule `(0,1,1)`. 1440px: labels x=8 and x≈895 at y=8; input/select/Search controls y=38 and no overlap/overflow. The synthetic form does not constitute the required human route check.

No live Firestore, emulator, or production index was accessed. No `git diff --check` was run within the archive (there is no `.git` directory); whitespace of the newly written review artifacts was checked separately. No implementation/test/spec/checklist/handoff/manifest files were altered.
