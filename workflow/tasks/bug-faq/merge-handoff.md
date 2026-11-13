# Bug FAQ merge handoff

Date: 2026-11-13. The human approved the reviewed Bug FAQ v0.4 implementation for merge in conversation, then explicitly approved the proposed SE-EDU message and scoped commit in conversation. No commit, push, deployment, or merge has occurred at this checkpoint.

## Proposed commit scope

Include the Bug FAQ implementation and its evidence only:

- `src/codeclinic/server/tickets/faq-routes.js`, `faq-store.js`, `faq-token.js`, plus the Bug FAQ additions in `route.js` and `store.js`.
- `src/codeclinic/src/tickets/StudentBugFaq.tsx`, `StudentBugFaq.css`, and `src/codeclinic/src/StudentDashboard.tsx`. The dashboard file includes the human's pre-existing Active Tickets / Ask for Help reorder, which the approved feature requires and preserves.
- `src/codeclinic/firestore.indexes.json`; `src/codeclinic/test/StudentBugFaq.test.tsx`, `bug-faq.api.contract.test.js`, `bug-faq.store.contract.test.js`, `bug-faq.tokens.contract.test.js`, and the Bug FAQ additions in `ta-tickets.indexes.test.js`.
- `docs/UserGuide.md`, `docs/DeveloperGuide.md`, `workflow/specs/bug-faq.md`, `workflow/tasks/bug-faq/`, and `logs/tasks/bug-faq/` including the small historical visual-failure screenshot.

Do not include the unrelated pre-existing edits in `Overview.md`, `workflow/PLAN.md`, or `workflow/specs/ta-ticket-queue.md`. Do not stage a root-level screenshot if one reappears. The branch is currently `student`; no target branch, push, or deployment is approved. Confirm the staged diff and file list before committing.

## Proposed SE-EDU commit message

```text
Add resolved-ticket Bug FAQ

Students need to find solutions in resolved tickets while keeping
other ticket states and owner details private.

Add resolved-only search and read-only detail with session-bound
references, Title/Tags controls, and Student/TA speaker labels.
Document the behavior and cover the store, API, and dashboard.

The 320 px dashboard check passed. Live Firestore and index deployment
remain separate follow-ups.
```

The human explicitly approved this commit message and scoped commit action on 2026-11-13. Merge approval does not approve a push, deployment, or live index change.
