# T06 grouping application

Date: 2026-11-07
Task ID: `account-registration`
Specification: `workflow/specs/account-registration.md` v0.4
Checklist and handoff: v0.3

The orchestrator reported that the human explicitly approved the proposed Group 5 and its exact implementation and test file scope. The task grouper changed only the heading before T06 in `workflow/tasks/account-registration/tasks.md` from `## Grouping pending human approval` to `## Group 5`. Groups 1–4 and all task entries remain in their original order and state. T06 remains unchecked. No source or test files were edited by the task grouper.

The approved T06 sequence is independent test writing, Group 5 implementation, then independent review. The proposed implementation files are `src/libconnect-mp4/server/index.js`, a new `src/libconnect-mp4/server/firestore-target.js`, and `src/libconnect-mp4/README.md`. The proposed test files are `src/libconnect-mp4/test/firestore-target.test.js` and `src/libconnect-mp4/test/firestore-mode.integration.test.js`. Existing `src/libconnect-mp4/firebase.json`, `.firebaserc`, `package.json`, auth modules, and tests are read-only context for grouping. No dependency, configuration, CI, deployment, Firestore rules, credential, or live production access was approved by this grouping.
