# Pre-implementation test writer report

Task: `role-aware-login`  
Specification: `workflow/specs/role-aware-login.md` v0.2, separately approved in the conversation on 2026-11-05  
Checklist and handoff: v0.2, separately approved in the conversation on 2026-11-05; four-group mapping reconfirmed

## Scope and coverage

- Added nine pre-implementation cases in `src/libconnect-mp4/test/App.test.tsx`. The original `src/libconnect-mp4/src/App.test.tsx` starter test remains unchanged.
- R1 partial: an accessible email input, labelled password-masked input, visible Member and Librarian choices, and a login submit button.
- R2: both fields blank, email whitespace-only, and password whitespace-only each produce field-specific errors and no login request; nonblank submissions send one `POST /api/auth/login` with selected `accountType` and the exact untrimmed password. The request cases cover both Member and Librarian selection.
- R5 and R7 client outcomes: a `401` displays the common denial without signed-in confirmation; a `503` displays a retry message without confirmation; a `200` displays the server-returned Member type even when Librarian was selected.
- Synthetic input only. No Firebase project or external service was contacted. No production code, dependencies, specification, checklist, or handoff changed.

The tests assume the client uses the existing browser `fetch` API and sends JSON with `email`, `password`, and `accountType`. The request assertion allows additional JSON fields; the server must still reject client authorization claims per R3. The response fixtures use JSON objects with `message` for `401`/`503` and `accountType` for `200`, because the specification fixes status and meaning but not the JSON envelope. The mock also provides a text body. If the approved implementation uses a different envelope or equally accessible UI wording, adapt the fixtures/assertions without weakening the specified behavior. Validation errors are checked in accessible alert regions; R1 requires an accessible error place but does not prescribe that ARIA role. The selector helper accepts radio, button, or combobox patterns rather than requiring one widget.

## Verification

- `npx tsc --noEmit` in `src/libconnect-mp4` before relocation: passed. The project TypeScript configuration includes `src/`, so this check does not cover the relocated test under `test/`.
- `git diff --check` in repository root: passed after relocation.
- `CI=true npm test -- --watch=false --runInBand --listTests`: listed only `src/App.test.tsx`; the default Create React App configuration searches under `src/`.
- `CI=true npm test -- --watch=false --runInBand --runTestsByPath test/App.test.tsx --passWithNoTests=false`: no tests found, exit 1.
- `CI=true npm test -- --watch=false --runInBand --roots test --runTestsByPath test/App.test.tsx --silent`: no tests found, exit 1, because the default match patterns still target `src/`.
- `CI=true npm test -- --watch=false --runInBand --roots test --testMatch '**/test/**/*.test.tsx' --silent`: discovered `test/App.test.tsx`; nine tests failed as expected because unchanged starter `App` has no login form. The tests did not reach request or response assertions.
- `CI=true npm test -- --watch=false --runInBand --silent`: the restored starter test passed (1 test); this default command does not exercise the new tests.

## Gaps for the approved design and implementation

- R1 visual selected state is exercised through radio/combobox values where applicable; the button pattern is verified through its request result, since the specification does not mandate an ARIA state attribute. Keyboard-only selector behavior still needs an implementation-specific accessibility test.
- R3–R7 backend, session, rate-limit, and end-to-end tests need the server module interface, selected backend dependencies, approved shared-store implementation, and isolated synthetic fixtures. The v0.2 specification now fixes the product contract, but those implementation interfaces and dependencies are not present. No speculative backend test was written.
- `workflow/agents/test_writer.toml` is named `task grouper` internally and refers to absent `design.md` and `proposal.md`. The approved canonical specification and checklist/handoff were used instead. The user corrected its test path to `src/libconnect-mp4/test/`. Running those tests by default will require a separately approved test configuration change; the command-line `--roots` and `--testMatch` options can run them in the meantime.
