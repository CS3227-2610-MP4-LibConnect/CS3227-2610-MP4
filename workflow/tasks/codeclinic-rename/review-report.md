# Independent review: CodeClinic rename T07/T08 docs and evidence

Date: 2026-11-08
Reviewer: independent reviewer
Task: `codeclinic-rename`, T07/T08
Reviewed specification references, checklist and handoff: versions listed in `workflow/tasks/codeclinic-rename/spec.md`, checklist/handoff v0.1 (human-approved)
Source snapshot: `/private/tmp/codeclinic-shared-review-20261108`, declared base `652e8ee`; exact diff `shared-continuation.diff`
Execution log: [`logs/tasks/codeclinic-rename/review-continuation.md`](../../../logs/tasks/codeclinic-rename/review-continuation.md)

## Conclusion

**Pass with follow-up.** The current User Guide labels checked against the current TSX source, and the current source search meets the amended T05 allowance. The guide/reflection content is consistent with the implementation and cited evidence. One task artifact still reports the earlier README search hit as unresolved even though the shared continuation reworded that README sentence and the current search passes. The implementation report needs a factual addendum so its T08 status matches the final source and command evidence. This review is not merge approval.

## Acceptance trace

| Criterion | Evidence | Result |
| --- | --- | --- |
| T07 User Guide covers current Student/TA flows and new routes, with retired catalog and release-status note removed | Reviewed `docs/UserGuide.md`; it describes current registration, login, dashboards, account support, and notifications, and labels planned tickets/AI as unavailable. | Met |
| T07 every quoted UI label matches code | Independently checked 50 bold spans before Planned features against recursive TSX source scan; no missing labels. `Deployed app:` and `Local copy:` are guide headings, not UI labels. | Met |
| T07 Developer Guide matches current layout/config/routes/catalog/shared components and known issue | Relevant sections match current files. The Notifications section accurately describes the shared writer, own-user API, CSRF mutations, inbox route, and outstanding composite index. | Met |
| T07 reflection claims are backed by links and do not invent measurements | Checked links to logs/task evidence and representative numeric claims (skill character counts and Group 1 token totals) against cited records. The reflection explicitly states where comparisons/measurements were not made and disclaims a token/cost inference from character reduction. | Met |
| T08 tests/build/emulator evidence | Current-snapshot full suite and build logs were supplied by the orchestrator; the focused relevant test batch was independently run and passed. Orchestrator reports all 3 opt-in integrations passed. | Met; full suite/build/emulator run not independently repeated |
| T05/T08 search check | Current snapshot search returns only `.firebaserc` and the two `apphosting.yaml` occurrences. The README sentence has been reworded to remove the literal project ID. | Met in current source; implementation report stale |

## Finding

| ID | Severity | Location | Finding | Recommended action |
| --- | --- | --- | --- | --- |
| L1 | Low | `workflow/tasks/codeclinic-rename/implementation-report.md` Deviations; `logs/tasks/codeclinic-rename/implement-T07-T08.md` T08 step 7 | The implementation report still says the T05/T08 search check is not met because `src/codeclinic/README.md` contains an extra project-ID hit. The current diff rewords that README sentence, and the same implementation log's later “Orchestrator follow-up” says the search now contains only the allowed hits. My fresh search confirms that result. The main implementation report was not reconciled. | Append a dated correction to the implementation report (preserving the earlier run as history) with the corrected search command/result and mark the criterion satisfied. |

No production code, tests, checklist, specification, or approval state was changed by this reviewer. No review-only tests were added. No other T07/T08 finding was identified. The N-G1 Firestore index prerequisite is documented under the notifications review and is not a rename-guide finding.
