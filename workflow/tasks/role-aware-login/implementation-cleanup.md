# Login page cleanup handoff

Date: 2026-11-06  
Specification: `workflow/specs/role-aware-login.md` version 0.2  
User direction: remove unused starter files; rename `App` and related files to `LoginPage`; name tests for the source or behavior tested.

## Changes

- Renamed `src/App.tsx` and `src/App.css` to `src/LoginPage.tsx` and `src/LoginPage.css`, including component name and imports.
- Renamed `test/App.test.tsx` to `test/LoginPage.test.tsx`, `login-T03.test.js` to `login.credentials.test.js`, `login-T04.test.js` to `login.session.test.js`, and `firestore-store-T04.test.js` to `firestore-store.test.js`. `server.test.js` already matched its source.
- Removed unused Create React App logo, default icons, manifest, robots file, and web-vitals helper. Replaced starter HTML metadata and README text with LibConnect-specific content; removed the unused starter `code` CSS rule.
- Retained `setupTests.ts` and `react-app-env.d.ts`, which are used by the React toolchain. Did not change dependencies, build/deployment configuration, or authentication behavior.

## Verification

- `npm test -- --watchAll=false --runInBand` from `src/libconnect-mp4/`: pass, 5 suites and 54 tests.
- `npm run build` from `src/libconnect-mp4/`: pass.
- `git diff --check`: pass (Git printed line-ending notices only).
- Reference scan of active source, tests, public HTML, and project README: no old App import or removed asset reference.

The shared worktree contains pre-existing work and no separate commit for this cleanup. Historical task reports retain their original test filenames as factual records. The still-unused `web-vitals` package was left in the dependency manifest because the repository requires separate approval for dependency changes. T05 and live Firestore validation remain open from prior work.
