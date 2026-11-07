# Role-aware login implementation checklist

Task ID: `role-aware-login`  
Checklist version: 0.2 (2026-11-05)  
Specification: `workflow/specs/role-aware-login.md` version 0.2, human approval reply on 2026-11-05  
Checklist approval evidence: human approved version 0.1, then replied "approved" to revised version 0.2 on 2026-11-05; no agent-set approval state  
Grouping approval evidence: human approved the four-group layout for version 0.1 and reconfirmed it for revised version 0.2 on 2026-11-05

This checklist follows revised specification version 0.2. The orchestrator owns checklist status and grouping. An independent reviewer marks an item complete only after verifying its acceptance evidence. No task may choose an unresolved product, data, or authorization policy on its own.

## Prerequisites and gates

- The human approved `technical-design-proposal.md` version 0.1; specification version 0.2 incorporates its email identity, user-record/hash, uniform-denial, session, success, and abuse-control choices. The human subsequently replied "approved" to the revised specification, checklist, handoff, and group mapping.
- T03 must implement the canonical-email key and account consistency contract from R4, and T04 must implement the session, outcome, and abuse-control contract from R5–R7. Existing registration/email-change data and any migration remain separate integration work; do not invent live accounts or silently alter those flows.
- Before adding Express, Firestore server SDK, Argon2id, session, rate-limiter, or backend-test dependencies, obtain the separate dependency approval required by `AGENTS.md`. A durable shared store is required; the proposed Firestore-backed choice and exact package/data model require separate approval.
- Before changing Firestore rules, deployment configuration, trusted proxy/routing/CORS settings, provisioning Firestore, contacting a Firebase project, or using external services, obtain the corresponding separate approval. The implementation must not claim live integration until those gates are satisfied.
- The approved rate thresholds are five failures per 15 minutes per canonical key and 30 failures per 15 minutes per trusted source; T04/T05 must verify generic `429` and no account lockout. Source identity must not rely on untrusted forwarding headers.
- The human approved checklist version 0.1, handoff version 0.1, and its four-group layout, then separately approved this revised checklist and handoff and reconfirmed the four-group layout. Implementation authorization remains a separate gate.

## Ordered tasks

### Group 1

- [x] **T01 — Build the accessible role-aware login form (R1).** Replace the starter screen within assigned source files with labelled email and password controls, a visible Member/Librarian selector, submit control, and accessible error regions. Acceptance: component tests show both options, visible selection, and keyboard/label access without relying on client-side role as authority.

### Group 2

- [x] **T02 — Add client validation and request handling (R2, R5, R7).** Reject missing or whitespace-only fields with field-specific errors and no network call; send nonblank email, exact untrimmed password, and selected type once; show denial and retry errors without false success; on HTTP `200`, show a signed-in confirmation using only the server-returned account type. Acceptance: component tests cover both blank fields, either whitespace-only field, switching type, exact password transmission, server denial, temporary server failure, and success confirmation that does not trust the selector as the authenticated role.
- [x] **T03 — Add Express login request validation and Firestore account lookup (R3, R4).** Under the approved email and record contracts, implement bounded typed input validation, server-only account lookup, and password-hash verification; reject malformed or unknown records. Acceptance: endpoint tests with synthetic data cover valid request parsing, invalid shapes, input limits, missing/duplicate/malformed records, correct and incorrect passwords, and no browser access to hashes.

### Group 3

- [x] **T04 — Enforce account status/type, session, and abuse controls (R4–R7).** Use only server-stored `accountType` and `accountStatus`, deny inactive and mismatched accounts with the uniform `401`, and establish a fresh protected server-side session only after every check passes; return minimal account type on `200` and enforce the approved dual rate limits with generic `429`. Acceptance: endpoint/integration tests cover both valid types, wrong-type directions, inactive accounts, forged role/manager/status/user-ID/hash fields, absent accounts, no session on denial or backend error, protected cookie attributes, server-side expiry/logout/status-role rechecks, CSRF protection, both rate thresholds, no account lockout, and no sensitive data exposure.

### Group 4

- [x] **T05 — Verify end-to-end login outcomes and security evidence (R1–R7).** Exercise React-to-Express request/response behavior using synthetic accounts and isolated test data, including server-returned success confirmation, session lifecycle, and rate-limit outcomes; inspect error responses and logging for raw emails, passwords, hashes, and session identifiers; run relevant frontend/backend test and build checks. Acceptance: every specification scenario, including `200`/`401`/`429`/`503`, cookie security, expiry/logout/recheck/CSRF, and both rate thresholds has evidence; failures are recorded without weakening security tests, and the implementation report lists exact commands, files, results, and unresolved risks.

## Workflow follow-up

After implementation, independent review must inspect the exact diff from a separate worktree or clean checkout where practical, run relevant checks, and write `review-report.md` and security findings. The orchestrator then presents evidence and unresolved risks for a human merge decision. This section is not an implementation group.

