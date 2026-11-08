# Independent review: notifications T03/T04 continuation

Date: 2026-11-08
Reviewer: independent reviewer
Specification: `workflow/specs/notifications.md` v0.1 (human-approved)
Checklist and handoff: v0.1 (human-approved)
Source reviewed: clean frozen snapshot `/private/tmp/codeclinic-shared-review-20261108`, base `652e8ee`; exact supplied diff `shared-continuation.diff`. The snapshot had no `.git`, so the exact diff and named source snapshot were used instead of Git metadata.
Execution log: [`logs/tasks/notifications/review-continuation.md`](../../../logs/tasks/notifications/review-continuation.md)

## Conclusion

**Pass with follow-up.** The T03/T04 UI and guide changes meet the reviewed R3 requirements. The focused notification, route, and server tests pass. The real-browser 320 CSS pixel check is recorded in the implementation continuation log. The pre-existing N-G1 Firestore composite-index deployment prerequisite remains open; it is documented and needs resolution before using the inbox against real Firestore. This review is not merge approval.

## Scope and acceptance trace

Reviewed `Notifications.tsx`, its CSS and tests, `NotificationsRoute.tsx`, the shared dashboard navigation and route/server mounting, the relevant shared-guide sections, `docs/Reflections.md`, the notification continuation implementation report and evidence, and the supplied diff. The account reviewer owns account/auth correctness independently; notification API tests were run here to check the integrated surface.

| Requirement | Evidence | Result |
| --- | --- | --- |
| R3 bell with unread count and inbox navigation | `NotificationBell` calls the own-user unread-count API, clamps the displayed count at 99, refreshes on mount and on notification changes; shared navigation includes it; `/notifications` is routed. | Met |
| R3 plain-text list with type and relative time | `NotificationInbox` renders `message` as React text and maps the four types to labels; relative time has an unavailable-time fallback. Tests assert literal markup is not interpreted as an element. | Met |
| R3 related-ticket link only when role can open it | `ticketHref` is optional and currently not supplied by `NotificationsRoute`; no role-owned ticket route exists in this snapshot. Route-less unread items have an accessible **Mark as read** action. No invented destination is exposed. | Met for current scope; future ticket integration remains pending |
| R3 mark-all, per-item read, and unread refresh | Read mutations obtain a CSRF token and use POST; a successful mutation dispatches the count-refresh event. Component tests cover mark-all, per-item read, retry, pagination, and count refresh. | Met |
| R3 loading, empty, and retryable error states | Separate loading, empty, initial-load error, and action-error/retry UI is present and component-tested. | Met |
| R3 shared theme and 320 px responsiveness | CSS uses shared theme variables and reflows under 520 px. Component test checks responsive rules. The recorded isolated browser check measured viewport and document width at 320 px, saw literal script text with no script element, and completed mark-read. | Met; browser evidence is in the linked execution log |
| T04 guide accuracy | User Guide notification labels and behaviors match the component; Developer Guide describes the shared writer, four API operations, CSRF mutations, route, and composite-index prerequisite. | Met |
| Reflection evidence | Reflection claims link to task logs/reports; numeric skill and token claims match the cited records and explicitly avoid converting character reduction into token/cost savings. | Met |

The current route intentionally does not supply `ticketHref`, because role-owned ticket routes are not present. This leaves ticket navigation unverified and is recorded as future integration work, not a defect in this task's agreed scope.

## Findings and residual risks

No new Critical, High, or Medium finding was identified in the reviewed continuation.

| ID | Severity | Location | Finding | Recommended action |
| --- | --- | --- | --- | --- |
| F1 | Medium, inherited N-G1 | `server/notifications/route.js` list query; `workflow/tasks/notifications/review-N-G1.md` M1 | Firestore needs a composite index for the recipient filter and descending creation-time order. Without it, the list call can return `503`. The Developer Guide now documents this prerequisite. | Deployment owner should approve/configure the index before using the inbox against real Firestore. No cloud configuration was changed in this review. |

No production code, test, specification, checklist, or approval state was changed. No review-only tests were added.
