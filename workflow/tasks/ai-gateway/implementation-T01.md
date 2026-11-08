# Implementation report: AI gateway T01 (configuration and disabled state)

Status: implemented and verified locally; awaiting independent review. Not committed.
Specification: `workflow/specs/ai-gateway.md` v0.1 (2026-11-08), R2 and scenario 3.
Checklist and handoff: v0.1 (2026-11-08); approved grouping places T01 in Group 1.
Base: worktree `ai-gateway-t01` at `da3c249`, clean before changes.
Skill: path-adapted `openspec-apply-change`, as named in the approved handoff.

## Changed files

- `src/codeclinic/server/ai/config.js` (new)
- `src/codeclinic/test/ai-config.test.js` (new)

No existing file was modified. No dependency was added.

## Interface

`loadAiConfig(env)` (CommonJS, pure, never logs or throws) returns a frozen result:

- Enabled: `{ enabled: true, config: { baseUrl, model, globalLimitPerMinute, apiKey } }`.
  `config` is frozen; `apiKey` is non-enumerable so it is hidden from JSON,
  spread, and `Object.keys`; `baseUrl` is normalised to origin + pathname ending `/v1`.
- Disabled: `{ enabled: false, reason, invalidVariables }`. `reason` is one
  string naming variables only, never values or the key; `invalidVariables` is
  a frozen array of variable names.

Constants: `DEFAULT_GLOBAL_LIMIT_PER_MINUTE` (40), `MIN_GLOBAL_LIMIT_PER_MINUTE` (1),
`MAX_GLOBAL_LIMIT_PER_MINUTE` (45).

## Verification

Run in `src/codeclinic` (node_modules symlinked to the shared install; `npm ci` not run after the interruption):

- `CI=true npm test -- --watch=false`: 20 suites passed, 1 skipped; 304 tests passed, 1 skipped (305 total).
- T01 suite alone (`test/ai-config.test.js`): 36 of 36 passed.
- `npm run build`: compiled successfully (one Node `DEP0176 fs.F_OK` deprecation warning from tooling).

Coverage: valid config, production URL, limit bounds 1 and 45, default 40; key
hidden from serialisation; missing, empty, and whitespace values per required
variable and a non-object env; malformed key, URL, model, and limit;
out-of-range limits 0, 46, 90, 1000; every disabled result and reason checked
to exclude the test key value.

## Assumptions and deviations for review

1. A malformed or out-of-range `AI_GLOBAL_LIMIT_PER_MINUTE` disables the gateway
   instead of falling back to 40; unset or empty uses 40. The spec only requires
   disabling for bad required values, so this is an implementation choice.
2. No approved model list exists (spec open decision 2); `SOCLAAS_MODEL` is
   format-checked only: `^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$`.
3. `SOCLAAS_API_KEY` must be printable ASCII without whitespace (header-injection guard).
4. `SOCLAAS_BASE_URL` must be `https`, path ending exactly `/v1` (no trailing slash),
   with no credentials, query, or fragment.
5. Startup logging of the disabled reason is left to T08 wiring.

## Unresolved risks

- Environment: Node v24.2.0 is below `engines` `>=24.12.0` (EBADENGINE warnings only).
- The first attempt was interrupted by ENOSPC (see `logs/tasks/ai-gateway/implement-T01.md`);
  verification above was rerun after the coordinator freed space.
- Assumptions 1 and 2 need human or reviewer confirmation.
