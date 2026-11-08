# Notifications T03/T04 continuation review — factual log

Date: 2026-11-08

## Inputs and scope

- Reviewed approved notifications specification v0.1, task checklist/handoff v0.1, repository workflow instructions, prior N-G1 review and implementation artifacts.
- Source snapshot: `/private/tmp/codeclinic-shared-review-20261108`, declared base `652e8ee`, no `.git`; reviewed exact `/private/tmp/codeclinic-shared-review-20261108/shared-continuation.diff`.
- Inspected notification UI/component tests and CSS, route and shared navigation integration, server mounting, relevant User/Developer Guide sections, Reflections, and continuation evidence.
- Reviewer did not modify production code or add tests.

## Commands and results

Working directory for application test commands: `/private/tmp/codeclinic-shared-review-20261108/src/codeclinic`.

1. `npm test -- --runTestsByPath test/Notifications.test.tsx test/notifications.api.test.js test/notifications.notify.test.js test/server.test.js test/DashboardRoutes.integration.test.tsx --watch=false --runInBand` — the UI, notify module, and dashboard-route suites passed, but API/server Supertest cases failed because the sandbox rejected local loopback binding (`listen EPERM: operation not permitted 127.0.0.1`). This environmental failure is retained here.
2. The same command with the approved isolated local-binding escalation — exit 0; 5 suites passed, 91 tests passed, 0 failed. No external service was accessed.
3. User Guide label check, from the snapshot root:

   ```sh
   python3 - <<'PY'
   from pathlib import Path
   import re
   p=Path('docs/UserGuide.md').read_text().split('## Planned features')[0]
   sources='\n'.join(x.read_text(errors='ignore') for x in Path('src/codeclinic/src').rglob('*.tsx'))
   labels=[' '.join(x.split()) for x in re.findall(r'\*\*(.+?)\*\*',p,re.S)]
   missing=[x for x in labels if x not in {'Deployed app:','Local copy:'} and x not in ' '.join(sources.split())]
   print('bold labels:',len(labels),'missing:',missing)
   PY
   ```

   Result: 50 bold spans checked; no missing labels. The two excluded spans are guide headings, not UI labels.
4. `rg -n -i 'libconnect' src/codeclinic --glob '!node_modules/**' --glob '!build/**'` — exactly two hits, both allowed production project ID values in `apphosting.yaml` (lines 39 and 45); no README hit remains in this snapshot.
5. The parent orchestrator supplied final current-snapshot verification evidence in its 2026-11-08 message and pointed to main-workspace raw logs: full suite 36 passed/3 opt-in skipped, 637 passed/3 skipped; production build compiled successfully; all 3 opt-in emulator integrations passed. These full-run checks were not independently rerun in this review. Raw regression/build logs are under `logs/tasks/account-management/verification/`.

## Browser evidence

The existing `logs/tasks/notifications/continuation.md` records the isolated loopback browser check: viewport width 320 CSS px, `document.scrollWidth` 320 px, literal markup displayed as text without a script element, and successful Mark as read interaction. No live account or backend data was used. The screenshot is `logs/tasks/notifications/visual/inbox-320.jpg`.

## Review result

No new T03/T04 defect found. The inherited N-G1 composite-index prerequisite remains open and is documented in the Developer Guide. Exact test counts, the initial sandbox failure, and the successful escalated retry are preserved above.

Runtime model and input/output/total token metrics were not exposed to this reviewer and are unavailable.
