# Bug FAQ Batch 1 implementation report — T01

Status: **Blocked before implementation**

Specification: `workflow/specs/bug-faq.md` v0.3 approved. Checklist and handoff: v0.3 approved. Assignment: Batch 1 T01 then T02; plan validation passed. No production or test files were changed.

## Blocker

T01 requires an opaque FAQ reference that is bound to the requesting Student and resolved server-side. The current server has no persistent FAQ-reference mapping or configured key suitable for encrypting a stateless reference. A process-local key or lookup cache would make references fail across restarts and could fail across server instances. A persistent mapping would add a data-model/write behavior, while introducing key configuration would change deployment configuration; neither strategy is specified or authorized by the current handoff. This needs a human-approved specification decision before implementing T01.

## Acceptance status

- Resolved-only bounded search and detail store: **Not started**; blocked by the reference strategy needed to safely implement the store contract.
- T02 protected APIs: **Not started**; do not begin until T01 is complete and verified.

## Checks and evidence

See `logs/tasks/bug-faq/implementation-T01-2026-11-12.md` for preflight commands and results. No tests were run because no behavior was implemented.

## Risks / next action

No change has been made to production source, tests, Firestore indexes, or deployment configuration. The orchestrator should obtain a human decision on durable opaque-reference resolution, update the approved specification/handoff if needed, and dispatch a new validated assignment before implementation resumes.
