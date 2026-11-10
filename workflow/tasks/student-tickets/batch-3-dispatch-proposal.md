# Student tickets Batch 3 dispatch proposal

Status: **human-approved for T04 dispatch** (2026-11-09, Asia/Singapore; approval in conversation)

The human-approved batch plan v0.2 assigns only T04 to Batch 3. T01 passed independent review. T02 and T03 received independent pass-with-follow-up verdicts with no production defect; their only unverified criterion is real-browser keyboard-only and 320 CSS-pixel inspection, which T04 explicitly includes. The human accepted carrying that specific verification forward and instructed the orchestrator to update T02/T03 status, while holding Batch 3 dispatch. Both items are now checked.

If the human later approves this dispatch, one implementer will perform T04 integration verification using synthetic local data: focused and full project tests, production build, Firestore emulator-backed C1 storage checks, browser/keyboard/320-pixel inspection when available, and User Guide and Developer Guide updates for the shipped create flow. It will record implementation and security evidence under this task's workflow and log directories. A different reviewer will inspect the T04 evidence and final combined change before any human merge decision. The implementation remains limited to the approved create-ticket scope and handoff paths; no dependency, CI, deployment, production Firestore, external service, commit, merge, push, or publication is approved.

The local browser control surface is unavailable in this session. The T04 implementer must document any unavailable manual check rather than claim it passed. If it remains unavailable, the final review must identify the residual verification gap for a separate human decision.

## Approval

After reviewing the remaining T04 verification and deliverables, the human replied "proceed" in the conversation. This approves the proposed Batch 3 T04 implementation dispatch and its independent review. The earlier hold is lifted for this batch only. Commit, merge, push, deployment, publication, and any action beyond the approved create-ticket scope remain separate gates.
