# Analyst handoff: account registration

Handoff version: 0.4 (2026-11-07)  
Task ID: `account-registration`  
Handoff approval evidence: human replied "approve" to version 0.4 on 2026-11-07; no agent-set approval state  
Prior handoff approval evidence: human replied "approve" to version 0.3 on 2026-11-07; no agent-set approval state  
Prior handoff approval evidence: human replied "approved" to version 0.1 on 2026-11-06, including the self-entered employee-ID policy and proposed technical choices; no agent-set approval state  
Canonical specification: `workflow/specs/account-registration.md` version 0.5, linked by `workflow/tasks/account-registration/spec.md`; human approved version 0.5 on 2026-11-07  
Prior specification approval evidence: human approved versions 0.4 and 0.3 on 2026-11-07 and version 0.2 on 2026-11-06; no agent-set approval state  
Checklist: `workflow/tasks/account-registration/tasks.md` version 0.4, human-approved on 2026-11-07; version 0.3 was human-approved on 2026-11-07

`workflow/templates/handoff.md` is absent. This handoff uses the fields required by `workflow/README.md` and `workflow/agents/analyst.toml`. It conveys analyst findings to the orchestrator; it grants no implementation, external-service, or merge permission.

## Scope and acceptance

Existing T01–T06 address specification R1–R8 and retain their historical review status. Human-approved R9 and new T07 add registration email-format validation on both client and server after trimming surrounding whitespace. The client must give an accessible email-specific error and avoid the request; the server must reject direct invalid requests with `400` before account writes. Both use the same precise syntax, store the trimmed original-case email, and preserve the existing lowercase canonical key and login endpoint policy. Local emulator and deployed-production Firestore modes remain as approved in v0.4. The production account schema and authorization contract remain unchanged. Acceptance scenarios 1–18 and the verification matrix are in human-approved canonical spec v0.5.

## Allowed files and role boundaries

- Analyst: `workflow/specs/account-registration.md`, task-local `spec.md`, `tasks.md`, `handoff.md`, and factual `logs/tasks/account-registration/` only.
- After approval and orchestrator assignment, test writer/implementer may work in specifically assigned files under `src/libconnect-mp4/src/`, `src/libconnect-mp4/server/`, and `src/libconnect-mp4/test/`, plus their task implementation report and factual logs. Likely integration points are `src/index.tsx`, `src/LoginPage.tsx`, new registration component/style, `server/index.js`, `server/auth/`, and nearby tests. This is an expected path list, not blanket edit approval.
- Orchestrator owns grouping, checklist updates, agent handoff records, and evidence reconciliation. Independent reviewer owns review/security reports and any clearly separate review tests. Use separate branches/worktrees where practical; reviewer inspects a clean checkout or separate worktree.
- Do not change packages, CI, deployment config, Firestore rules, or files outside assigned scope without the applicable separate human approval. Application source belongs under `src/`.
- T06 may require a local startup command/script or development documentation in `src/libconnect-mp4/`; the orchestrator must name exact allowed files in an approved grouping. This handoff itself grants no config edit permission.

## Proposed technical choices and unresolved policy

- Use the server-generated `userId` as `memberId`, satisfying a unique server-issued member identifier without another index. Use an 8 KiB JSON body limit, 200 UTF-8 byte name limit, 64 UTF-8 byte employee-ID limit, and the login contract's 254-byte email/1024-byte password limits. Use the approved eight-character password minimum. Preserve the exact password for hashing; store only Argon2id output.
- Apply a shared registration limit of five attempts per 15 minutes per direct socket source before password hashing. Return one generic `429`. The existing durable auth-store counters are a potential adapter; the implementer must verify their semantics and avoid mixing login and registration counters. Forwarded headers are untrusted until proxy policy is separately approved.
- **Human decision needed for employee ID.** The specification proposes a self-entered employee ID and later manager activation, but does not determine uniqueness or roster validation. This handoff proposes no uniqueness index and no roster integration for this task. If the human requires either, the analyst must revise the canonical specification/checklist before implementation, and roster access needs external-service approval. Do not let an implementer silently decide this policy.
- No new package appears necessary from the current manifest. If one becomes necessary, stop at the dependency approval gate. Direct `/register` refresh must work in the Express app without broadening deployment configuration silently.
- Require explicit `local-emulator` or `production` selection before Admin SDK construction; no default or fallback. Local mode requires loopback emulator port 8080 and project `libconnect-mp4`, and fails closed if the emulator is absent or configuration is inconsistent; it cannot use ambient developer credentials. Production mode requires a separately configured, nonempty production project ID and credentials from the deployment runtime, rejects emulator configuration, and fails closed without matching valid configuration. Do not hardcode a production project ID or credential into source, tests, or artifacts. Document the emulator, Express, and React local startup sequence. Production deployment and live access remain separately gated.
- For T07, trim surrounding registration email whitespace, then validate exactly one `@`, nonempty dot-separated local segments and at least two nonempty domain labels; reject internal whitespace, extra `@`, and leading/trailing/adjacent dots. This interprets the user's `<non-empty-string>@<non-empty-string>.<non-empty-string>` rule while allowing `a.b@sub.example.com` and preserving the approved trim behavior. Do not change login's email acceptance rule. Reject invalid registration on the client before fetch and on the server before canonicalization or account persistence; store trimmed original case.

## Trusted and untrusted inputs; security

The unauthenticated client controls account-type selection, name, email, password, employee ID, and arbitrary request properties. It cannot authorize its own type, status, manager privilege, IDs, timestamp, or hash. Express validates a bounded request; generates ID, timestamp, `accountStatus`, and `isManager`; hashes the exact password; canonicalizes email with the approved login rule; and atomically creates `users/{userId}` and `emailKeys/{sha256(canonicalEmail)}` through the server-side Firestore Admin SDK. For Member, status is `ACTIVE` and member ID is server assigned. For Librarian, status is `INACTIVE` and manager flag is false. No status or manager flag in the request can alter these values. Duplicate/concurrent registrations must not create partial records. Registration returns no session. Browser code must not directly write account records. Passwords, hashes, raw emails, session identifiers, and unnecessary private data must not appear in responses, logs, tests, or evidence.

## Skills, sources, tools, and permissions

- Selected analyst skills: `.agents/skills/openspec-explore/SKILL.md` and `.agents/skills/openspec-propose/SKILL.md`, adapted to the repository's `workflow/specs/` canonical path and split human gates. The OpenSpec CLI reported a root but no active change; the repository adapter section is blank, so no second specification tree was created.
- Future implementation skills: `.agents/skills/openspec-apply-change/SKILL.md` for preflight and `.agents/skills/firebase-firestore/SKILL.md` for Firestore data modeling/adapter work. Skill selection does not authorize live project access, provisioning, rule edits, or deployment.
- Inspected sources: user registration request and local-emulator clarification, prior human approvals relayed by the orchestrator, `AGENTS.md`, `Overview.md`, `workflow/README.md`, `workflow/agents/analyst.toml`, approved `workflow/specs/role-aware-login.md` v0.2 and its task artifacts, registration specification, existing React root/login component, Express login/server/Firestore auth store, `firebase.json`, local CLI project identifier, package manifest, and nearby tests. `workflow/PLAN.md` and `workflow/templates/handoff.md` were absent. No credential contents, external sources, or MCP responses were read; no Firebase service was contacted.
- Permissions: analyst work was local planning only. External access, dependencies, Firestore rules/IAM, CI/deployment config, live Firebase project use, push, deploy, communication, destructive actions, and merge require their own human approval. The approved specification alone grants none of them.

## Test matrix and evidence

| Layer | Required tests and review evidence |
| --- | --- |
| UI/navigation | Direct `/register`, return to login, accessible type-specific form/errors, exact request shape, pending guard, visible and announced success, five-second redirect, retained notice, no redirect on failure. |
| Endpoint | Bounded typed payload, forged system fields, server-assigned status/manager/IDs, exact password hash, `201` only after commit, generic `400`/`409`/`429`/`503`, no session or sensitive response/log data. |
| Firestore adapter | Atomic `users`/`emailKeys` creation, canonical collision across types, concurrent race, no orphan on error, fresh Argon2id salt, valid record shape for login. |
| Integration/security | Synthetic register-then-login: active Member accepted, inactive Librarian denied; browser performs no direct account write; limit and failure outcomes; real Firestore/rules/deployment risks identified separately. |
| Firestore mode safety | Explicit local loopback emulator/project targeting, emulator-backed register-then-login with one user/key/session/counter project, missing/mismatched target and unavailable-emulator denial, no cloud call even with ambient developer credentials, and documented three-process startup. Isolated production-config tests verify explicit mode/project/runtime credentials, actual-Firestore target selection, rejection of emulator settings and absent/mismatched config, and no live production writes. |
| Registration email format | Both Member and Librarian client cases: valid minimal/local-dot/subdomain forms and surrounding-whitespace trim; invalid internal whitespace, missing/extra `@`, empty segments, edge/adjacent dots produce accessible email error and no fetch. Direct endpoint cases: same invalid inputs return `400` with no user/email-key write; valid trimmed address stores original case. No change to login acceptance. |

Use synthetic accounts and the local emulator for R8 verification; fakes remain useful for isolated earlier tests. Never use production data. Record spec version, assigned files, commands/results, scenario coverage, deviations, and risks in `workflow/tasks/account-registration/implementation-report.md` and `logs/tasks/account-registration/`. Independent review writes `review-report.md` and, because registration is security-sensitive, `security-review.md`.

## Next gate

The human approved specification v0.2 and checklist/handoff v0.1 on 2026-11-06, then specifications v0.3, v0.4, and v0.5 and checklist/handoff v0.3 and v0.4 on 2026-11-07. T01–T06 retain their completed history; it does not verify new R9. T07 grouping still needs separate approval. No T07 implementation, production access, deployment, or merge is authorized by this handoff.
