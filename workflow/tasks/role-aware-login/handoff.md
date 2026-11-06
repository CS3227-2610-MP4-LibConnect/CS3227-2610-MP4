# Analyst handoff: role-aware login

Handoff version: 0.2 (2026-11-05)  
Task ID: `role-aware-login`  
Specification: `workflow/specs/role-aware-login.md`, version 0.2, linked from `workflow/tasks/role-aware-login/spec.md`  
Specification approval evidence: human approved version 0.1 scope and technical-design-proposal.md version 0.1, then replied "approved" to revised version 0.2 on 2026-11-05; no agent-set approval state  
Checklist: `workflow/tasks/role-aware-login/tasks.md`, version 0.2; T02/T04/T05 wording changed from version 0.1 to cover R7  
Checklist, handoff, and grouping approval evidence: human approved both version 0.1 artifacts and the four-group layout, then replied "approved" to revised version 0.2 artifacts and reconfirmed the four-group layout on 2026-11-05; no agent-set approval state

`workflow/templates/handoff.md` is absent. This handoff uses the required fields from `workflow/README.md` and `workflow/agents/analyst.toml`. It is an analyst-to-orchestrator contract, not permission to start implementation or access services.

## Scope and acceptance

Implement the login page and Express verification described in specification R1–R7 and checklist T01–T05, subject to the revised approval gates. The account type selector is a requested context, never an authorization grant. The approved immediate success UI is a signed-in confirmation state using the server-returned type. Registration, password reset, activation, manager administration, post-login destinations, and unrelated feature authorization remain outside scope. Acceptance scenarios and the test matrix are in the canonical specification.

## Allowed files and roles

- Analyst stage: canonical specification, task-local specification reference, checklist, handoff, and factual task log only.
- Test writer and implementer: specific frontend/backend source and test paths must be assigned by the orchestrator after required approvals. Production source belongs under `src/`. No blanket edit authorization is granted by this handoff.
- Orchestrator: owns checklist updates, grouping reconciliation, agent handoffs, and implementation evidence.
- Reviewer: independent review report, task security review, factual logs, and separately identified review-only tests under its profile.
- Separate branches or worktrees should be used where practical; the reviewer must use a separate worktree or clean checkout where practical.

## Trusted and untrusted inputs; authorization

The client supplies untrusted email, password, and selected type. Ignore client-supplied user ID, role, account status, manager flag, and hash as authorization claims. Express canonicalizes email by trimming and lowercasing the full address, resolves the hashed email-key mapping to a validated user record, and verifies the exact password against a versioned Argon2id hash. Server-read Firestore account records provide authoritative type and status. Express must require `ACTIVE` and match the stored type before creating a fresh server-side session. All credential/type/status denials share one `401` body; malformed input gets `400`, outage `503`, and limit breach generic `429`. Denials and backend failures must not authenticate. A protected `__Host-` cookie, durable shared store, server-side 30-minute idle/eight-hour absolute expiry, logout invalidation, status/role recheck, CSRF protection, and shared dual-key rate limits are required by revised specification R6–R7. Browser code must not read password hashes or query user records for login. Logs, responses, and evidence must exclude raw emails, passwords, hashes, and session material.

## Selected skills and sources

- Analyst planning: `.agents/skills/openspec-explore/SKILL.md` and `.agents/skills/openspec-propose/SKILL.md`, adapted to `workflow/specs/` and the repository's split approval gates.
- Future implementation: `.agents/skills/openspec-apply-change/SKILL.md` preflight via the repository adapter; `.agents/skills/firebase-firestore/SKILL.md` for server Firestore integration when that work is approved. This selection does not authorize the Firebase CLI, database access, provisioning, rule deployment, or external services. The skill's live database inspection/provisioning steps cannot run under the present no-external-access constraint.
- Sources: current user request and human decisions relayed by orchestrator; approved `technical-design-proposal.md` version 0.1; `AGENTS.md`; `Overview.md`; `workflow/README.md`; `workflow/agents/analyst.toml`; relevant starter React source, test, package, and Firebase emulator configuration. `workflow/PLAN.md` and a repository handoff template were absent.
- External sources: the official OWASP, Firebase, and Express documentation linked in `technical-design-proposal.md`; no Firebase project or credentials were accessed. MCP responses were public documentation only.

## Open decisions and permissions

The technical choices from the human-approved proposal are now in human-approved revised specification version 0.2, including the account and email-key contract. T03/T04 also depend on separately approved package choices, a durable shared session-store implementation and its collection design, browser security rules, and test setup as applicable. CI/deployment or proxy/routing changes, external project access, provisioning, push, deploy, messages, destructive changes, and merge require separate human approval. Existing-account migration and registration/email-change integration are unresolved external dependencies. Do not infer approval from this handoff, passing tests, or another agent's report. If implementation changes a requirement or authorization policy, return to specification approval first.

## Verification and evidence

Use the revised specification's React, Express, session/rate-limit, and security/integration test matrix with synthetic accounts. The test writer's initial four UI cases under `src/libconnect-mp4/test/` do not establish backend coverage; inspect them and extend tests only after the revised contract and needed dependencies are approved. Record exact specification version, changed files, commands, results, acceptance coverage, deviations, and unresolved risks in `workflow/tasks/role-aware-login/implementation-report.md` and `logs/tasks/role-aware-login/`. Retain an independent `review-report.md` and `security-review.md` because authentication is security-sensitive. No real credentials, session values, password hashes, or private user records may enter tests or evidence.

## Next gate

The previous version 0.1 checklist/handoff and four-group layout and revised version 0.2 specification/checklist/handoff and grouping received human approval replies. Resolve the remaining package, Firestore rules/session-store design, deployment, and test-coverage gates, and obtain implementation authorization before dispatching affected implementers.
