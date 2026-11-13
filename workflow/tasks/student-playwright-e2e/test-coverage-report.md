# Student Playwright E2E test coverage

Task: `student-playwright-e2e`
Approved specification: `workflow/specs/student-playwright-e2e.md` v0.1
Approved checklist and handoff: `workflow/tasks/student-playwright-e2e/tasks.md` v0.1 and `handoff.md` v0.1

## Prepared tests

- `src/codeclinic/test/e2e/student-workflows.spec.ts` contains two Playwright tests for R2 and R3.
- The first covers Student registration, Student sign-in, protected dashboard, ticket creation success, Open list and detail, description and reply, closing, Closed list and readable detail, disabled reply flow, sign-out, and denial of the former detail URL.
- The second creates a fresh owner ticket, signs in another newly registered Student in a separate browser context, checks their empty Open list and direct-detail denial without revealing the owner's title, description, or reply, then confirms the owner can still read the ticket.
- Both use unique synthetic values and runtime-generated passwords. A `beforeAll` guard requires the local emulator target and a loopback HTTP `baseURL` before browser actions.

## Assumptions and gaps

- The future Playwright config must set a `baseURL` on `127.0.0.1` and pass `CODECLINIC_FIRESTORE_MODE=local-emulator`, `CODECLINIC_FIRESTORE_PROJECT_ID=demo-codeclinic`, and `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` to test workers. It must enforce the emulator availability check and disable traces, screenshots, and video as R1 requires.
- The tests use current UI labels and routes from the React source. They assert the visible generic error for another Student's direct detail visit; existing API/emulator tests remain responsible for exact authorization status codes.
- R1 and R4 are pending the approved implementation batch. Playwright is not installed and no config exists yet, so these tests have **not** been executed in Chromium. The prepared test count is two, not a pass count.

Commands and exact results: [test-writer log](../../../logs/tasks/student-playwright-e2e/test-writer.md).
