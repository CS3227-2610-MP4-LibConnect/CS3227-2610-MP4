# T01 finalization factual log

Date: 2026-11-07. Scope: local-only contract finalization for `member-catalog-search` batch 1, T01. No external service, production source, test, dependency, configuration, specification, checklist, or handoff was changed.

Inputs read from canonical paths: `workflow/specs/member-catalog-search.md` v0.1, task `spec.md`, `tasks.md` v0.2, `handoff.md` v0.2, `assignment-batch-1.json`, original `implementation-T01.md`, `implementation-T01-addendum.md`, and independent `review-T01.md`. The current user separately confirmed `books`, zero-raw-document wording, expected maximum 1,000, document-ID/ISBN equality, required fields, and acceptance of the conditional scan budget and local-only Firestore-edition exception. Original report, addendum, and review remain preserved.

| Command | Exact result |
| --- | --- |
| `Get-FileHash` canonical spec and task spec copy, SHA-256 | Exit 0; both `AE609123AD4151616BADFEA10C1EE91B710E1C441E17D43FE77C8703D91A4842`, matching the approved handoff. |
| `node --check workflow/tasks/member-catalog-search/scan-demo.mjs` via its absolute canonical path | Exit 0; no output. |
| `node workflow/tasks/member-catalog-search/scan-demo.mjs` via its absolute canonical path | Exit 0; exact output below. |
| `git status --short -- .task-staging/member-catalog-search` | Exit 0; `?? .task-staging/member-catalog-search/`. The final report/log are staging evidence only. |

```text
size=0 reads=0 requests=1 matches=0 raw=false valid=false
size=1 reads=1 requests=1 matches=1 raw=true valid=true
size=100 reads=100 requests=2 matches=1 raw=true valid=true
size=101 reads=101 requests=2 matches=1 raw=true valid=true
size=1000 reads=1000 requests=11 matches=1 raw=true valid=true
all-invalid reads=7 requests=1 matches=0 raw=true valid=false
```

An initial attempt to run `node .task-staging/member-catalog-search/scan-demo.mjs` exited 1 with `MODULE_NOT_FOUND` because the orchestrator had already transferred the script to the canonical task directory and removed the staging copy. The subsequent canonical-path run above succeeded. This failed command is retained rather than concealed.

The demonstration uses static synthetic documents and an in-memory ordered chunk model. It proves the arithmetic and classification under those fixtures; it does not execute Firestore queries, inspect real documents, verify the instance edition, test an Express route, or run React tests. The pre-implementation React suite still has no passing result because `react-scripts` is absent locally. The human-approved local-only exception was used only for design and synthetic checks; no Firestore CLI/cloud operation was run.
