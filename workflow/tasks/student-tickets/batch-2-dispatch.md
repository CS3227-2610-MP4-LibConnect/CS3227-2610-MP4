# Student tickets Batch 2 dispatch proposal

Status: **human-approved** (2026-11-09, Asia/Singapore; explicit "approve" in conversation after the Batch 2 dispatch request)

The human-approved batch plan v0.2 assigns T02, then T03, to Batch 2. T01 passed independent review after the human-approved Unicode correction; its checklist item is complete. Specification v0.3, checklist v0.2, and handoff v0.2 remain the approved contract. This proposal requests only the Batch 2 implementation dispatch. It does not authorize a commit, merge, push, deployment, external service, or Batch 3.

The implementer will complete and verify T02 before starting T03. T02 covers the protected `/student/tickets/new` frontend and server deep link, the required and optional form fields, bounded validation, accessible feedback, and failure preservation (R2–R3, R6; scenarios 3–5, 9, 11, 13–15). T03 adds the Student dashboard and header entry points and navigation with transient success feedback only after a verified `201` (R1, R5; scenarios 1–2, 9–10). A different reviewer will inspect each item and the combined change. The preimplementation frontend suite remains the red missing-feature baseline; the implementer will run it after each item and record results separately.

The exact assignment, allowed paths, roles, and evidence destinations are in `assignment-batch-2.json`. The reviewer will use a separate clean checkout if an exact implementation snapshot becomes available; otherwise it will document the shared-workspace exception and compensating checks as in Batch 1. T04 integration verification and guides remain for Batch 3.

The human approved this exact Batch 2 implementation dispatch after reviewing the T01 completion summary and this proposal. Commit, merge, push, deployment, external-service actions, and Batch 3 remain separate decisions.
