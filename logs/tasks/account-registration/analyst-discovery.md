# Account registration analyst discovery

Date: 2026-11-06  
Task ID: `account-registration`  
Role: specification analyst  
Specification: `workflow/specs/account-registration.md` v0.2, human approved on 2026-11-06

## Sources inspected

- Current user request and repository `AGENTS.md` instructions; `workflow/agents/analyst.toml`; `workflow/README.md`; `Overview.md`.
- Approved `workflow/specs/role-aware-login.md` v0.2 and task-local reference/handoff; existing React login page and root, Express login/server/Firestore adapter, package manifest, and nearby login tests.
- `.agents/skills/openspec-explore/SKILL.md` and `.agents/skills/openspec-propose/SKILL.md`, adapted to this repository's canonical `workflow/specs/` directory.

## Read-only commands and results

- `rg --files workflow/specs workflow/tasks src`: found only the role-aware-login feature plus current application source and tests.
- `rg -n` over requirements, source, and prior evidence: confirmed registration is absent and login requires an atomic canonical email mapping from registration.
- `openspec list --json`: reported a repository root and no active changes. No OpenSpec change was created because the repository's canonical path is `workflow/specs/` and its path-adapter section is blank.
- `git status --short`: no output at discovery time.
- `Get-Content` of the listed sources: read-only; no tests run and no external services accessed.

## Findings and unresolved risks

- The overview fixes public account types and initial status/manager values but does not specify a registration API, password minimum, employee-ID verification/uniqueness, member-ID format, or abuse thresholds. Proposed choices and open decisions are in the canonical specification.
- The user clarified that successful registration must commit the user to Firebase/Firestore, announce success, and then redirect to login. Specification v0.2 makes Firestore commit a prerequisite of HTTP `201` and specifies a visible, accessible success state with a five-second redirect, immediate login link, and retained login-page notice. Member is active; Librarian is inactive until manager-librarian activation.
- `workflow/PLAN.md` and `workflow/templates/handoff.md` are referenced by instructions but absent. The checklist and handoff are intentionally deferred until after specification approval.
- Existing login uses a canonical email key and Argon2id hash contract. Registration must preserve those records atomically for new accounts to sign in.
- Local tests can establish behavior with synthetic fixtures. Actual Firestore transaction behavior, rules/IAM, and deployed routing remain unverified.

## Planning-stage update

- The human replied "approved" to specification v0.2 on 2026-11-06. This is evidence for the specification gate only.
- Read the approved canonical specification and existing role-aware-login checklist/handoff as a format and integration reference. Used the `openspec-propose` planning procedure with the repository's canonical `workflow/specs/` path. Drafted `workflow/tasks/account-registration/tasks.md` v0.1 and `handoff.md` v0.1; neither is marked approved.
- Proposed technical choices in the checklist/handoff: `memberId = userId`, bounded fields/body, shared direct-source registration limit, and no new package. Employee-ID uniqueness/roster assurance remains a product-policy decision for human checklist/handoff approval; it was not silently assigned to implementation.
- No source, test, dependency, CI/deployment, or Firestore project was changed or accessed.

## Checklist and handoff approval evidence

- On 2026-11-06, the human replied "approved" to the explicit request for `tasks.md` v0.1 and `handoff.md` v0.1 approval. The approval included self-entered librarian employee IDs without uniqueness or roster checks and the stated technical choices. The agent recorded that human decision; it did not approve its own artifacts.
- Only approval-evidence metadata and this factual log were updated. Checklist task wording and specification requirements were not changed.

Next gate: orchestrator test/task grouping proposal and human grouping approval. No implementation, external access, or merge approval is inferred from the checklist/handoff decision.

## Local-emulator revision, 2026-11-07

- The user explicitly required the local Firebase Firestore emulator for development instead of cloud Firestore. This is a new development-safety requirement. Prior approvals remain evidence for specification v0.2 and checklist/handoff v0.1 only.
- Read the existing registration planning artifacts, `src/libconnect-mp4/firebase.json`, `src/libconnect-mp4/package.json`, and `src/libconnect-mp4/server/index.js`. The emulator configuration uses Firestore port 8080; the intended local CLI project identifier is `libconnect-mp4`. Server startup currently initializes the Admin SDK without an explicit emulator/project target, and `npm start` runs only React. The orchestrator reported that ambient local credentials may select a different cloud project. No credential file contents were opened or recorded.
- Revised canonical specification to v0.3 with proposed R8 and scenarios 13–15 for explicit loopback emulator/project targeting, fail-closed startup, no cloud fallback, and a documented emulator/backend/frontend sequence. Updated task-local specification reference. Revised checklist/handoff to v0.2 and added unchecked T06; prior T01–T05 checked status was left as historical evidence.
- Used the `openspec-update-change` planning guidance, adapted to the repository's `workflow/specs/` canonical path. No source, test, package, Firebase configuration, or deployment file was changed; no external service was contacted.

Next gate for the revision: human approval of specification v0.3, then separate approval of revised checklist/handoff v0.2 and orchestrator grouping for T06. Existing approvals do not automatically cover the revised artifacts.

## Specification v0.3 approval evidence

- On 2026-11-07, the human replied "approved" immediately after the orchestrator's explicit request to approve specification v0.3. This records a human decision, not agent self-approval. The response does not approve checklist/handoff v0.2, T06 grouping or implementation.

Next gate: separate human approval of revised checklist/handoff v0.2, then human approval of the orchestrator's T06 grouping.

## Corrected Firestore mode requirement, 2026-11-07

- Before checklist/handoff v0.2 approval, the user clarified that local development must use the Firestore emulator while deployed production must use actual production Firestore. Prior human approval of specification v0.3 does not approve this corrected mode contract; checklist/handoff v0.2 remained proposed and were not approved.
- Revised canonical specification to v0.4 and task-local reference accordingly. R8 now requires an explicit `local-emulator` or `production` mode, no default/fallback, an explicit production project ID with deployment-runtime credentials, and fail-closed invalid configuration. The account schema, registration outcomes, and authorization policy remain unchanged. Production deployment and access are still separate approval gates.
- Revised checklist/handoff to proposed v0.3, retaining prior T01–T05 history and updating unchecked T06 for both modes and isolated production configuration tests. No production code, tests, package, Firebase configuration, deployment file, or credential contents were changed or inspected; no Firebase service was contacted.

Next gate: human approval of specification v0.4, then separate approval of checklist/handoff v0.3 and orchestrator grouping for T06. Prior approvals do not authorize the revised work.

## Specification v0.4 approval evidence

- On 2026-11-07, the human replied "approved" directly to the orchestrator's explicit request for specification v0.4 approval. This is a human decision, not agent self-approval. Checklist/handoff v0.3, T06 grouping, implementation, production access, and deployment were not approved by that response.

Next gate: separate human approval of checklist/handoff v0.3, followed by human approval of the orchestrator's T06 grouping.

## Checklist and handoff v0.3 approval evidence

- On 2026-11-07, the human replied "approve" directly to the orchestrator's explicit request for checklist v0.3 and handoff v0.3 approval. This records the human decision and does not represent agent self-approval. T06 remains unchecked; grouping, implementation, production access, and deployment were not approved by that response.

Next gate: human approval of the orchestrator's T06 grouping. Implementation authorization and later review/merge decisions remain separate.

## Registration email-format revision, 2026-11-07

- The user required client registration validation matching `<non-empty-string>@<non-empty-string>.<non-empty-string>`. The analyst interpreted this as exactly one `@`, nonempty dot-separated local segments, at least two nonempty domain labels, and no whitespace or empty/edge/adjacent dot segments. This accepts `a@b.c` and `a.b@sub.example.com`; it is syntax validation, not proof of delivery.
- The rule changes the earlier registration behavior that would trim surrounding email whitespace. It applies on the client for accessible feedback and independently on the Express server before canonicalization or account writes; login's existing email policy is unchanged.
- Revised canonical specification to proposed v0.5 and task-local reference. Revised checklist/handoff to proposed v0.4 with new unchecked T07. Existing T01–T06 completion history was preserved; none of it verifies R9. No production code, tests, configuration, secrets, or external services were changed or accessed.

Next gate: human approval of specification v0.5, then separate approval of checklist/handoff v0.4 and orchestrator grouping for T07.

## Email-format draft correction, 2026-11-07

- Before presentation, the orchestrator clarified that the new syntax rule must preserve the approved registration behavior of trimming surrounding email whitespace. The initial proposed v0.5 draft had incorrectly rejected surrounding whitespace.
- Corrected proposed specification v0.5, checklist/handoff v0.4, examples, and verification cases to validate the trimmed address on both client and server, retain trimmed original case in the user record, and reject only internal whitespace and malformed syntax. Existing approval state and T01–T06 history remain unchanged; no code or external service was touched.

## Specification v0.5 approval evidence

- On 2026-11-07, the human replied "approved" to the orchestrator's explicit request for specification v0.5 approval. This records the human decision, not agent self-approval. Checklist/handoff v0.4, T07 grouping, and implementation were not approved by that response.

Next gate: separate human approval of checklist/handoff v0.4, followed by human approval of T07 grouping.
