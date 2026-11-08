# Task specification reference

Task ID: `codeclinic-rename` (human-confirmed 2026-11-08)

This task implements already approved specification changes. It adds no new
requirement. The canonical specifications are the source of truth:

| Specification | Version | What this task implements |
| --- | --- | --- |
| [`account-registration`](../../specs/account-registration.md) | 0.7 (approved 2026-11-08) | `STUDENT`/`TA` account types, `studentId`, TA Coordinator wording, emulator project ID `demo-codeclinic` |
| [`role-aware-login`](../../specs/role-aware-login.md) | 0.3 (approved 2026-11-08) | Student/TA login selection and `STUDENT`/`TA` values |
| [`role-based-dashboards`](../../specs/role-based-dashboards.md) | 0.5 (approved 2026-11-08) | `/student/dashboard` and `/ta/dashboard`, `StudentDashboard.tsx` and `TADashboard.tsx`, no redirects from the former paths |
| [`environments-and-deployment`](../../specs/environments-and-deployment.md) | 0.2 (approved 2026-11-08) | `CODECLINIC_FIRESTORE_MODE` and `CODECLINIC_FIRESTORE_PROJECT_ID` variable names only; the rest of that spec is a separate task |
| [`member-catalog-search`](../../specs/member-catalog-search.md) | Retired (approved 2026-11-08) | Removal of the Book catalog code, seed script, and tests |

`Overview.md` (amendments approved 2026-11-08) requires every remaining
LibConnect name to become CodeClinic, except the GitHub organization and
repository names. `workflow/PLAN.md` v0.1 (amendment of 2026-11-08) places this
work before `ai-gateway` Group 1 and includes the planned refactor of the email
helpers in `server/auth/login.js`.

The checklist and handoff require separate human approval before
implementation.
