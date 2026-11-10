# Proposed reconciliation with shared ticket data contract

Version: 0.3 proposal (2026-11-09, Asia/Singapore)
Status: human-approved reconciliation proposal (2026-11-09; approval in conversation); amended specification, checklist, handoff, tests, and implementation retain their separate gates
Current approved artifacts: `workflow/specs/student-tickets.md` v0.2, checklist and handoff v0.1
Current batch plan: v0.1 proposed, not approved or dispatched

## Source and scope

The human supplied sections C1 and C2 of a shared ticket data contract in the conversation and asked that the student ticket implementation match it. The creation feature has not begun production implementation. The shared contract takes precedence over older approved choices where they conflict. Replies, TA claim/unclaim/resolve, Student close, and ticket reads remain outside this creation task; this task must write records compatible with those later operations.

## Exact proposed specification edits

Amend `workflow/specs/student-tickets.md` to v0.3 and synchronize `workflow/tasks/student-tickets/spec.md`:

1. Replace request/source field names `codeFiles` and `repoPaths` with `files` and `repoFilePaths` throughout the API contract, form mapping, and acceptance/verification wording. Preserve the approved limit of three files at 24 KiB each. Store tickets at `tickets/{ticketId}` and include the complete C1 Ticket field set: `ticketId`, `studentId`, `title`, `language`, `conceptTags`, `files`, `repoUrl`, `repoFilePaths`, `errorOutput`, `expectedBehaviour`, `actualBehaviour`, `attempted`, `status`, `claimedByTaId`, `fixNote`, `createdAt`, `updatedAt`, `resolvedAt`.
2. Replace free-text `language` with an exact-choice selector and server validation allowing only `Python`, `Java`, `JavaScript`, `TypeScript`, `C`, `C++`, and `Other`. Do not permit a custom language value. Place a short note below the selector: if `Other` is selected, the Student can name the language in the title or another ticket detail field.
3. Change `conceptTags` to an array of 0–5 lowercase, trimmed strings, each 1–30 characters. The human restored C1's five-tag limit after initially requesting 15; it supersedes v0.2's eight-tag limit. Keep the Student-entered form. Recommendation: trim and lowercase on client and server, then reject duplicates after normalization.
4. Require Firestore `Timestamp` values for `createdAt` and `updatedAt`, written by trusted server code. At creation set `status: OPEN`, `claimedByTaId: null`, `fixNote: null`, and `resolvedAt: null`. Use empty arrays for absent `files`, `repoFilePaths`, and `conceptTags`, and `null` for absent `repoUrl` and `errorOutput`, if the human agrees these are the intended empty representations. Client values cannot set server-owned fields.
5. Record the C2 state-machine compatibility: creation is `(none) → OPEN` by the owning Student. `CLAIMED`, `RESOLVED`, and `CLOSED` are later operations with the stated owners; terminal-state, 409, and transaction rules are not implemented by this creation-only task. This task must not introduce a state shape that conflicts with later transitions or replies. Only trusted server code may access `tickets/{ticketId}` and its `replies` subcollection.
6. Set the maximum length of `title` and `repoUrl` to 255 characters each. Set the maximum length of `errorOutput`, `expectedBehaviour`, `actualBehaviour`, and `attempted` to 5,000 characters each. Limit the `repoFilePaths` input to 5,000 characters in total across all paths, while retaining at most 10 nonempty relative paths and the path safety rules. This interprets the user's "repoFilePaths ... 5000 character input length" as a total input-field limit; it replaces the former 256-character per-path cap. Preserve the approved 128 KiB body limit and the remaining nonconflicting caps.
7. Update acceptance and verification cases for the exact stored field names, null values, Timestamp types, fixed language choices and `Other` note, five-tag limit, revised text limits, and no browser Firestore access.

## Exact proposed planning and test edits

- Update `workflow/tasks/student-tickets/tasks.md` to v0.2: T01 explicitly writes the C1 document shape and validates language/tags; T02 uses the matching form and request names; T04 verifies schema compatibility. Keep T01–T04 order and creation-only scope.
- Update `workflow/tasks/student-tickets/handoff.md` to v0.2 with the approved shared contract, trust boundary, field names, and test expectations. Do not add allowed production files or dependencies.
- Revise `src/codeclinic/test/student-tickets.api.test.js` and `src/codeclinic/test/StudentTickets.test.tsx` after the amended spec, checklist, and handoff are approved. Update `test-coverage-report.md` and factual test log with a new preimplementation baseline. Do not silently reinterpret the existing red baseline.
- Revise `batch-plan.md` after the amended artifact and test evidence is ready, then seek fresh approval of the plan and Batch 1 dispatch. The current proposed plan is superseded for dispatch purposes.

## Remaining interpretation and representation choices

1. The 5,000-character `repoFilePaths` limit is interpreted as an aggregate input limit across at most 10 paths. The human may instead mean a per-path limit.
2. The contract defines tag casing but not whether input should be normalized or rejected when uppercase or padded; normalization is recommended above.
3. The contract lists fields but does not define empty representations for optional arrays and text; the proposed `[]`/`null` representation above is recommended for stable downstream reads.

These choices affect the stored data contract and tests. Human approval of this reconciliation and its missing choices is required before changing the approved specification. The amended specification, checklist/handoff, batch plan, and implementation dispatch each retain their workflow approval gates.

## Proposal history

- 2026-11-09: v0.1 proposed C1/C2 reconciliation and identified language Q1.
- 2026-11-09: v0.2 incorporated the human's exact language list, selector-only behavior and `Other` note, 255-character title/repository URL limits, 5,000-character detail and repository-path input limits, and the initially requested 15-tag limit.
- 2026-11-09: v0.3 restored C1's five-tag limit at the human's direction; the proposal and verification wording were corrected before any specification, test, or production edits.
- 2026-11-09: The human approved v0.3, including the aggregate `repoFilePaths` limit, tag normalization, and optional empty-value representations. Separate amended-artifact approvals remain pending.
