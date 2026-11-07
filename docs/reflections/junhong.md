# Jun Hong's Reflections

## Reducing token consumption in the agent workflow

The workflow was consuming large amounts of tokens because I found that the orchestrator copied full
specifications, designs, handoffs, tests, and role instructions into multiple
agent assignments. Each agent then read the same files again during its own
preflight. Reports and execution logs also repeated parts of the same evidence.
This increased the context needed for each task without adding new information.

The login and registration features each consumed about 40% of my five-hour
usage allowance, making this workflow overhead a priority to address.

I updated the workflow instructions to reduce that repetition while retaining
the approval, implementation, and independent review stages:

| Change | Why it was made and intended effect |
| --- | --- |
| The orchestrator now sends artifact paths and versions, one checklist item, allowed files, relevant criteria, checks, and an evidence destination instead of pasting whole documents. | Agents can read the current approved files directly. This should reduce repeated prompt text and avoid working from a copied document that has become stale. |
| Implementers, reviewers, test writers, and task groupers verify the approved files locally and focus first on their assigned criteria. They read more context when dependencies, ambiguity, or security risks require it. | Each role still checks the contract it must follow, but routine tasks need less unrelated context. Reviewers still inspect the complete assigned diff and affected behavior. |
| Reports record criterion status, findings, deviations, and risks; factual logs under `logs/tasks/<task-id>/` record commands and exact results. Reports link to logs instead of copying their output. | This gives each fact one primary location, making handoffs shorter while keeping failures and evidence reproducible. Existing `workflow/tasks/<task-id>/execution_logs/` records remain as legacy evidence. |
| `workflow/specs/` is stated as the canonical specification path, and `design.md` and `proposal.md` are optional context. | The workflow no longer spends time looking for files that this repository does not require or creating a second specification tree. |
| The `workflow/PLAN.md` reference remains, with an instruction to ignore it if the file does not exist. The absent handoff template likewise falls back to the required fields in `workflow/README.md`. | Agents can continue with available approved sources instead of stopping on missing optional files. They do not invent plan content or infer an approval from the missing file. |
| The analyst and test-writer profile identities were corrected, and the task grouper now keeps dependent tasks in order when none can run in parallel. | The correct role instructions can be selected reliably, and grouping will not incorrectly place dependent work together. |

The intended result is lower token use per handoff with the same required
approval checks, test evidence, security review, and human merge decision. The
reduction has not yet been measured against a completed task. Future
implementation reports will record token usage for each subagent so I can
measure the effect; earlier runs did not capture those figures.
