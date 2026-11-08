# Account registration specification

Version: 0.7 (2026-11-08)  
Approval evidence: the human replied "all aproved" to version 0.7 on 2026-11-08; recorded at the human's request; no agent-set approval state  
Prior approval evidence: human replied "approved" to version 0.6 on 2026-11-08; human replied "approved" to version 0.5 on 2026-11-07, approved versions 0.4 and 0.3 on 2026-11-07 and version 0.2 on 2026-11-06; no agent-set approval state  
Task ID: `account-registration`

## Purpose and scope

An unauthenticated visitor can open a registration page from the login page, choose Student or TA, and create an account of that type. The page collects the common `User` fields that a person supplies and the relevant type-specific field from `Overview.md`. An Express endpoint validates the request, hashes the password, and creates the user record in Firebase Cloud Firestore along with the records needed by the approved role-aware login contract. Student accounts start active. Publicly registered TA accounts start inactive and require activation by a TA Coordinator account before sign-in. After successful creation, the page shows an accessible success message, then redirects to login.

This task covers registration navigation, form, endpoint, account persistence, and explicit Firestore target selection at server startup. It does not cover manager bootstrap or activation, account editing, email verification, password reset, automatic sign-in after registration, production Firestore rules/IAM, or deployment.

Local development MUST use the Firestore emulator. Deployed production MUST be able to use actual production Firestore through a separate, explicit production mode. Both modes use the same account schema and server authorization contract; production deployment itself remains separately gated.

## Sources and proposed decisions

- The current user requested a Register button on the login page that opens a registration page, an account-type choice, and the fields required for that type in `Overview.md`.
- The latest user clarification requires successful registration to persist the user in Firebase/Firestore, display an accessible success message, and then redirect to login. A Student starts `ACTIVE`; a TA starts `INACTIVE` pending activation by a TA Coordinator account.
- On 2026-11-07, the user explicitly required the local Firebase Firestore emulator for development instead of cloud Firestore. The existing `firebase.json` configures a Firestore emulator on port 8080 and `.firebaserc` identifies the intended local CLI project as `libconnect-mp4`. Current `server/index.js` initializes the Admin SDK without an explicit project or emulator target, and `npm start` starts only the React development server. A local credential environment can select a different cloud project if the emulator is not explicitly configured; no credential contents were inspected.
- The user then clarified that the emulator requirement applies to local development, while a deployed production instance must use actual production Firestore. The target must be selected by an explicit server mode and project configuration rather than inferred from a developer machine's credentials.
- The user now requires registration email format validation on the client, using `<non-empty-string>@<non-empty-string>.<non-empty-string>`. This revision applies the same check on the server because the client is untrusted. The chosen interpretation allows dot-separated nonempty local segments and two or more nonempty domain labels, including subdomains. It preserves the approved behavior of trimming surrounding email whitespace before validation, while rejecting whitespace inside the trimmed address, extra `@`, and empty segments. This is syntax validation only, not proof that an address exists or can receive mail.
- `Overview.md` defines `User` fields `userId`, `name`, `email`, `passwordHash`, `registrationDateTime`, `accountType`, and `accountStatus`; `Student.studentId`; and `TA.employeeId` and `isManager`. It requires new students to be active, new TAs to be inactive, and all public TA registrations to have `isManager = false`.
- Approved `workflow/specs/role-aware-login.md` v0.2 requires canonical email lookup through `emailKeys/{sha256(canonicalEmail)}`, an atomic user/key creation contract, exact-password Argon2id hashing, and server-controlled account type/status/manager privilege.
- Current source renders only `LoginPage` at the React root and has no registration route or endpoint. The Express server creates the login app and serves a static build. The proposed registration UI must work at a stable `/register` browser path and the server must serve that path on direct navigation or refresh.
- Proposed input policy for approval: the person enters `name`, `email`, `password`, `confirm password`, and, for TA only, `employeeId`. The server generates `userId`, `studentId` for Student, and `registrationDateTime`. Confirmation is client-only and is never stored. The server stores no plaintext password. The account type is selected explicitly and sent as a request value, but grants no privilege.
- Proposed output policy for approval: success returns HTTP `201` with only `accountType` and `accountStatus` after the Firestore transaction commits. The UI announces success in an accessible status region, shows a visible five-second return-to-login countdown and an immediate login link, then automatically redirects to login. The login page retains a non-sensitive registration-success notice after redirect so the outcome remains available to assistive technology. The TA notice explains that TA Coordinator activation is required. Registration does not issue a session or sign the user in.
- Proposed validation policy for approval: required strings are nonblank after whitespace checks; name and employee ID are trimmed before storage; registration email is trimmed first and must then satisfy R9, with its trimmed original case retained for display and lowercase form used for the canonical key; passwords are used exactly as entered and must be at least 8 characters and at most 1024 UTF-8 bytes. Email is at most 254 UTF-8 bytes, matching login. Bounded name and employee ID lengths and an overall request byte limit must be specified in the implementation design before coding.
- Proposed collision policy for approval: canonical email is unique across account types. A duplicate email, or a duplicate TA employee ID if uniqueness is adopted, returns HTTP `409` with one generic registration failure message and creates no account. The response must not reveal the existing account type or status.

`workflow/PLAN.md` is referenced by repository instructions but absent. The `workflow/README.md` skill-integration/path-adapter section is blank. The OpenSpec CLI reports a repository root with no active changes; this repository's canonical specification remains `workflow/specs/`.

## Actors, data, and trust boundaries

- Actor: an unauthenticated visitor. The selected `accountType`, all text fields, and any additional JSON properties are untrusted.
- Trusted code: Express validation, identifier generation, Argon2id hashing, server-assigned status/manager fields, and the Firestore transaction. The server must not trust client-supplied `userId`, `studentId`, `passwordHash`, `registrationDateTime`, `accountStatus`, or `isManager`.
- Records in Firebase Cloud Firestore: `users/{userId}` contains the overview's common fields plus `canonicalEmailKey`, and type-specific `studentId` or `employeeId`. `emailKeys/{sha256(canonicalEmail)}` maps to `userId`. Any employee-ID uniqueness index, if selected, must be transactionally consistent with the user record.
- Local-development target: the Firestore emulator, with an explicitly selected project ID and loopback host. Local startup must establish that target before the Admin SDK can perform registration, login, session, or counter operations. An absent/unreachable emulator must produce a startup or request failure, never a fallback to cloud Firestore.
- Production target: actual Firestore for an explicitly configured production project ID, using credentials supplied by the deployment runtime. The production process must not accept emulator configuration or infer the project from developer application-default credentials. No actual production project ID or credential is recorded in this specification.
- Sensitive data: password and hash must never be returned, logged, stored in browser persistence, or placed in task evidence. The browser must not directly write account or email-key records.
- State transitions: no account to active Student, or no account to inactive non-manager TA, only after all validation and atomic writes succeed. Failure leaves no partial account and no authenticated session.

## Requirements

### R1. Navigation and registration page

The login page MUST show a clearly labelled Register action that navigates to `/register`. Direct navigation and refresh at `/register` MUST display the registration page. The registration page MUST provide a route back to login. Navigation MUST remain accessible by keyboard and assistive technology. The existing login form and its server contract MUST continue to work.

### R2. Account-type-specific form

The registration page MUST show an explicit Student or TA choice and make the selected choice clear. For either choice, it MUST collect labelled `name`, `email`, `password`, and `confirm password` fields. When TA is selected, it MUST also collect a labelled `employeeId` field; when Student is selected, it MUST not submit a stale employee ID. It MUST not offer a TA Coordinator choice or an `isManager` control. `userId`, `studentId`, `passwordHash`, `registrationDateTime`, and `accountStatus` are server-generated or server-set and MUST not be editable registration fields. The page MUST explain before submission that TA accounts need activation before sign-in.

### R3. Client feedback

The form MUST reject missing or whitespace-only required fields and mismatched confirmation without sending a request. It MUST show field-specific, accessible errors, prevent duplicate submissions while one is pending, and preserve entered values after a recoverable failure except the password policy may clear password fields for safety. Client validation is feedback, not an authorization or persistence boundary. The confirmation password MUST not be sent to the server.

### R4. Server request validation and abuse control

`POST /api/auth/register` MUST accept bounded JSON containing only the allowed person-entered fields: `accountType`, `name`, `email`, `password`, and `employeeId` for TA. It MUST reject malformed, missing, wrong-type, unsupported, whitespace-only, over-limit, or type-inapplicable values with HTTP `400` before any write. It MUST treat unexpected authorization or system fields as invalid rather than applying them. Password validation MUST preserve the exact entered password for hashing. The endpoint MUST use a shared, server-enforced request limit that resists repeated expensive hashing and account creation; its threshold and trusted source identification require a documented technical choice and tests before implementation. Exceeded limits MUST return a generic HTTP `429` without a write.

### R5. Identity and atomic persistence

The server MUST trim surrounding registration email whitespace, validate that trimmed address against R9, then canonicalize it using the approved login rule: lowercase the entire trimmed address for the application-wide key, while retaining the trimmed original-case address in the user record. It MUST reject canonical collisions across both account types. It MUST generate a unique `userId`; a Student MUST receive a server-generated unique `studentId`; a TA MUST retain the validated employee ID. The server MUST hash the exact password with a fresh-salted, versioned Argon2id encoding compatible with role-aware login, initially at least 19 MiB memory, two iterations, and parallelism one. It MUST atomically create the `users/{userId}` document and email-key mapping in Firebase Cloud Firestore, so concurrent attempts for the same canonical email produce at most one account. It MUST return success only after the Firestore write commits. Failure or transaction conflict MUST leave no orphan user or key. The record MUST include the server-generated registration timestamp.

### R6. Server-controlled role and status

For Student registration, the stored record MUST have `accountType = STUDENT` and `accountStatus = ACTIVE`. For TA registration, it MUST have `accountType = TA`, `accountStatus = INACTIVE`, and `isManager = false`. Registration MUST never create a manager account, activate a TA, or issue an authenticated session. A client-supplied status, manager flag, ID, timestamp, or hash MUST have no effect, including when hidden or manually crafted into the request. The existing login endpoint MUST accept a newly registered active Student and MUST deny a newly registered inactive TA until a TA Coordinator account activates it through a separately authorized workflow.

### R7. Outcomes and failure handling

On success, the endpoint MUST return HTTP `201` with only the new account type and status, after Firestore confirms the committed write. The page MUST display a visible, screen-reader-announced success message appropriate to the type, including the TA's need for TA Coordinator activation. It MUST offer an immediate login link, show that it will return to login in five seconds, then redirect automatically. The login page MUST retain a non-sensitive success notice after that redirect; automatic or manual navigation MUST not imply the account is signed in. The redirect MUST occur only after a confirmed `201` with a valid type/status response; a malformed success response or network/server failure MUST remain on registration with an error. Validation failures MUST use HTTP `400`; collisions MUST use a generic HTTP `409` response; temporary storage or hashing failures MUST use a non-sensitive HTTP `503` retry response. No failure may create a session or partial record. Responses, logs, and test evidence MUST not expose passwords, hashes, raw email, session identifiers, or unnecessary personal data.

### R8. Explicit, fail-closed Firestore target modes

The backend MUST require an explicit Firestore mode of `local-emulator` or `production` before it constructs an Admin SDK client or serves data-changing requests. There MUST be no default mode and no automatic fallback between modes. The same selected target MUST cover registration user/key writes and login/session/rate-counter reads and writes.

In `local-emulator` mode, the documented development flow MUST start the Firestore emulator and Express backend before the React frontend sends registration or login requests. The backend MUST bind the Admin SDK explicitly to the loopback emulator configured at port 8080 and project ID `demo-codeclinic`; it MUST NOT infer a target from ambient application-default credentials or CLI state. Missing, inconsistent, non-loopback, or unreachable emulator configuration MUST fail closed before any cloud Firestore operation. The local flow MUST provide a non-sensitive setup/failure message.

In `production` mode, the backend MUST require an explicit, nonempty production Firestore project ID and credentials supplied by the deployment runtime for that project. It MUST target actual production Firestore, reject any emulator host/configuration, and fail closed if the project or runtime credentials are missing, invalid, or inconsistent. It MUST NOT silently use developer application-default credentials or choose a project from local CLI state. Production rules/IAM and deployment remain separate approval gates; this requirement defines safe connection selection, not permission to contact or deploy to production. Neither mode may log or expose credential material.

### R9. Registration email format on client and server

Before submission, the registration page MUST trim surrounding whitespace from the email and check that the trimmed address has exactly one `@`; a nonempty local part; and a domain with at least two nonempty dot-separated labels. Dots MAY separate nonempty local-part segments, and the domain MAY have more than two labels. Neither the local part nor the domain may begin or end with a dot or contain adjacent dots. No whitespace is allowed inside the trimmed address. A practical equivalent syntax for the trimmed address is `^[^\s@.]+(\.[^\s@.]+)*@[^\s@.]+(\.[^\s@.]+)+$`. Thus `a@b.c`, `a.b@sub.example.com`, and `  a@b.c  ` after trimming are valid; `a@b`, `@b.c`, `a@.c`, `a@b.`, `a..b@c.d`, `a@b..c`, `a@@b.c`, and an address with internal whitespace are invalid. The client MUST display an accessible email-specific error and send no registration request for invalid format. The server MUST independently trim and apply the same rule to the submitted email before canonicalization, hashing, or account creation; a direct invalid request MUST return HTTP `400` and create no user or email-key record. The server MUST store the trimmed original-case address. This rule is a format check, not email deliverability verification, and does not change the existing login endpoint's email canonicalization policy.

## Acceptance scenarios

1. From login, Register opens `/register`; direct navigation and refresh at that path show the same page; back-to-login returns to the login form.
2. Selecting Student shows common fields and no employee-ID field. Selecting TA shows the employee-ID field and activation notice. Switching back to Student does not submit a stale employee ID.
3. Missing, blank, or mismatched fields produce accessible field errors and no network request. A pending submission cannot trigger a second request.
4. A valid Student submission commits one active Student to Firebase Cloud Firestore with a generated user/student ID, timestamp, compatible password hash, and email-key mapping. Only after the commit, the response contains type/status and no session cookie; the UI announces success, offers immediate login, and automatically returns to login after five seconds. The login page retains a success notice.
5. A valid TA submission commits one inactive TA to Firebase Cloud Firestore with the supplied validated employee ID and `isManager = false`; the UI announces success and explains TA Coordinator activation, then returns to login after five seconds. Immediate login is denied until an authorized TA Coordinator activates the account.
6. Mixed-case and surrounding-whitespace email variants map to the same canonical key after trimming. A second registration for that key, including the other account type, yields generic `409` and no second account. The user record keeps the trimmed original-case address.
7. Two concurrent requests for the same canonical email cannot both succeed or leave an orphan record.
8. A forged manager flag, active status, user/student ID, timestamp, or password hash cannot alter stored authorization data or create a manager account.
9. Malformed, oversized, unexpected-field, unsupported-type, and type-inapplicable requests return `400` with no write. Rate-limited requests return generic `429` with no write.
10. A storage or hashing failure returns a non-sensitive retry response, leaves no partial account or session, and logs no sensitive input.
11. A newly registered active Student can use the existing login flow with the chosen password; the stored TA cannot sign in while inactive.
12. A failed request, malformed `201` response, or Firestore commit failure shows an error on registration and does not trigger the redirect or a login success notice.
13. Following the documented local flow starts the Firestore emulator and Express backend for project `demo-codeclinic`; a registration creates the user/key documents in that emulator, and the existing login flow reads the same emulator records.
14. Starting local development without the emulator, with an invalid emulator host, or with a mismatched project fails before account/session/rate-counter data can be written; it does not use ambient cloud credentials or make a cloud Firestore request.
15. The React-only development command is not presented as a complete registration setup; the documented local flow identifies the emulator, backend, and frontend startup sequence and how to recognize a local-target failure without revealing credentials.
16. A deployed instance configured explicitly for `production` with a production project ID and deployment-runtime credentials selects actual Firestore and does not use an emulator; its account writes have the same schema and authorization behavior. This is verified with configuration tests or a controlled deployment gate, not by writing to a live production project during development.
17. Missing/unknown mode, production mode with emulator variables, absent or mismatched production project/credentials, or local mode with developer cloud credentials but no valid emulator fails closed before a Firestore write. No mode silently switches target.
18. For both Student and TA, `a@b.c`, `a.b@sub.example.com`, and an address with only surrounding whitespace pass format validation after trimming; the stored email retains trimmed original case. Missing/extra `@`, missing or empty domain labels, leading/trailing/adjacent dots in either part, and internal whitespace produce an accessible email error with no client request. Direct calls with those invalid addresses return `400` without user or email-key writes. Valid format does not imply deliverability.

## Verification matrix

| Layer | Required evidence |
| --- | --- |
| React component/navigation | Register and login links, direct `/register` rendering, type-specific fields, activation notice, labels, accessible errors, confirmation mismatch, one request while pending, accessible success announcement, five-second redirect, immediate link, retained login notice, and no redirect on failure. |
| Express endpoint | Bounded schema and status codes; client-forged fields ineffective; exact-password Argon2id hashing; server-assigned type/status/IDs/timestamp; no session; generic failures. |
| Firestore adapter | Firebase Cloud Firestore user and email-key documents committed before `201`; atomic creation, canonical collision and concurrent race behavior, no orphan on failure; employee-ID uniqueness if approved. |
| Integration/security | Register-then-login with synthetic users; active Student accepted, inactive TA denied; no browser direct account writes; no sensitive response/log data; shared abuse limit. |
| Firestore mode safety | Local emulator-backed register-then-login for the explicit project; same target for user/key/session/counter data; missing emulator, wrong host/project, and ambient cloud-credential cases fail closed with no cloud requests; documented startup sequence. Production configuration tests prove explicit mode/project/runtime-credential selection, rejection of emulator settings and developer credential fallback, and unchanged account contract without live production writes. |
| Email format | Client tests for valid minimal/subdomain/local-dot forms and surrounding-whitespace trim, plus invalid internal whitespace, missing/extra `@`, empty segments, and edge dots, with accessible error and zero requests; Express endpoint tests independently enforce the same rule and return `400` with zero account writes for invalid forms. |

Tests MUST use synthetic identities and an emulator or fake adapter, never a production Firebase project or real credentials.

## Open decisions and integration risks

1. **Employee ID assurance and uniqueness.** The overview calls `employeeId` an organizational identifier but does not say how it is verified. This proposal lets a registrant enter it and relies on later TA Coordinator activation for authorization. Approval should confirm whether employee IDs must also be unique or checked against an authoritative roster. A roster check would require separate external-service scope and approval.
2. **Student ID shape.** The overview lists both `userId` and `studentId` but no format or equality rule. This proposal requires a server-generated unique student ID; implementation may use the user ID as the student ID if that is approved in the technical design and does not break downstream references.
3. **Registration limits.** The precise source/key thresholds and source derivation are not yet fixed. They must be resolved in the task checklist/technical design before implementation, without trusting forwarded headers from an unapproved proxy.
4. **Password policy.** The proposed eight-character minimum is a new registration policy absent from `Overview.md`; specification approval should confirm it. The approved login maximum of 1024 UTF-8 bytes remains compatible.
5. **Infrastructure.** Real Firestore transaction contention, browser rules/IAM, HTTPS and SPA routing, and deployment are not proven by local synthetic tests and remain separately gated. `workflow/PLAN.md` is absent, so plan dependencies could not be checked.
6. **Target safety.** The current Admin SDK startup has no explicit emulator/project target and `npm start` runs only React. Version 0.4 requires explicit local-emulator and production modes with fail-closed configuration. The existing production account schema and authorization rules are unchanged. Production credentials, IAM/rules, and deployment need separate approvals and cannot be proven by local tests.
7. **Email format interpretation.** Version 0.5 treats each dot as a separator between nonempty local or domain segments. It allows multiple domain labels and local dots, preserves approved surrounding-whitespace trimming, and rejects internal whitespace. Implementation still requires the separate checklist, handoff, and grouping approvals.

The human approved version 0.2 on 2026-11-06 and versions 0.3, 0.4, and 0.5 on 2026-11-07. Specification approval does not by itself approve the revised checklist/handoff, implementation, dependencies, Firestore rules, production access, deployment, or merge.

## Amendments

### 2026-11-08 — v0.6 draft: CodeClinic roles

The human directed amending this specification for the CodeClinic scope. This version renames the account types only; it adds no feature and changes no authorization rule. It depends on the matching `role-aware-login` v0.3 draft.

The terms follow the 2026-11-08 `Overview.md` amendment: Member → Student, Librarian → TA, manager librarian → TA Coordinator, `MEMBER` → `STUDENT`, `LIBRARIAN` → `TA`, and `memberId` → `studentId`. The `employeeId` and `isManager` field names, the Firestore project ID `libconnect-mp4`, and every security, validation, and session requirement are unchanged.

Implementation impact, for the separate checklist and handoff: stored `accountType` values, the student identifier field, request validation, and UI labels and messages change. No production accounts exist, so records holding the former values in local emulator data are treated as malformed and fail closed; developers clear or re-seed emulator data rather than migrate it.

### 2026-11-08 — v0.7 draft: CodeClinic internal names

The human directed renaming every remaining LibConnect name to CodeClinic. This version changes only the local emulator project ID in R8 and acceptance scenario 13, from `libconnect-mp4` to `demo-codeclinic`. The `demo-` prefix marks a Firebase project ID that exists only in the emulator, so the Firebase tools cannot reach a cloud project with it; this strengthens the existing fail-closed rule. The configuration variables become `CODECLINIC_FIRESTORE_MODE` and `CODECLINIC_FIRESTORE_PROJECT_ID`, as defined in `environments-and-deployment`. The mode values, validation, and every other requirement are unchanged. Historical source notes above keep the former ID.

The human approved version 0.7 on 2026-11-08.
