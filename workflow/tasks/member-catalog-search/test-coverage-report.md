# Member catalog search test coverage

Spec v0.1, checklist v0.1, handoff v0.1; test-writing dispatch explicitly approved. This is a pre-implementation test draft. It does not approve grouping or implementation.

## Tests added

`MemberCatalogSearch.test.tsx` captures the specification-defined dashboard presentation that can be tested without assuming T01's endpoint or pagination contract:

- R1 / scenario 3: top-left `LibConnect` dashboard link and available logout control.
- R2 / scenario 5 prerequisites: labelled basic search control is discoverable as a searchbox.
- R3 / scenario 4: advanced search starts collapsed, exposes `aria-expanded`, hides fields on collapse, and restores the publisher value after reopening.

The tests use the existing React Testing Library/Jest setup. No production code, manifest, specification, checklist, or handoff was changed.

## Gaps pending T01

No tests assert endpoint URL/query parameters, request/response schema, validation bounds or supported year range, cursor/page size, stable ordering, catalog-empty metadata, or continuation behavior. Those are explicitly pending T01. API denial cases, adapter filtering/pagination, stale request handling, loading/error outcomes, cards, safe text rendering, and synopsis access require the approved T01 design and/or implementation seams before meaningful tests can be written without inventing contracts. Responsive layout and sticky behavior need visual inspection evidence in addition to component assertions.

## Verification

Focused test command and exact result are recorded in [MemberCatalogSearch.test-log.md](../../../logs/tasks/member-catalog-search/test-writer.md). The test command could not execute because `react-scripts` is unavailable in the workspace; no passing result is claimed.

## Runtime metrics

Input tokens: unavailable. Output tokens: unavailable. Total tokens: unavailable. Model: unavailable. Metric source: unavailable to this subagent runtime.

