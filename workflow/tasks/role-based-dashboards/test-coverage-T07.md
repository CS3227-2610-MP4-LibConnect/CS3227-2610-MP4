# T07 test coverage

Specification: `workflow/specs/role-based-dashboards.md` v0.3.

`src/libconnect-mp4/test/SharedTheme.test.tsx` covers:

- R2: each dashboard view is imported through its role-specific module, and the route guard imports the matching member and librarian modules.
- R2 and R7: each role module uses the shared logout component, and the shared dashboard stylesheet is imported by at least one role module or a common route/app module; both rendered views retain semantic headings, main content, and an accessible logout control.
- R7: the theme remains imported once by the app entry point, dashboard markup classes are represented in shared/page styles, theme tokens are consumed, and responsive/focus rules remain checked.

Assumption: the split modules keep the existing named component exports (`MemberDashboard`, `LibrarianDashboard`) and each imports the established `DashboardLogout` component. The dashboard stylesheet may be imported from either role module, the route guard, or app entry because the spec requires shared use, not a particular CSS import location.

Gap: before the implementation creates the two modules, Jest stops at module resolution, so assertions inside `SharedTheme.test.tsx` are not yet reached. The existing route integration suite passed in the focused run; see [test-writer-T07.log](../../../logs/tasks/role-based-dashboards/test-writer-T07.log) for the exact command and result. The test suite should be rerun after the scoped implementation.
