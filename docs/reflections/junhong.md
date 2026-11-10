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

## Making ongoing task verification easier to follow

During `student-tickets` verification, the full test run produced 68 similar
registration failures. Reading the repeated stack traces consumed substantial
input context without clarifying the distinct problem. I added an efficient
evidence-collection rule to `AGENTS.md`: search for relevant lines before
opening entire files, capture verbose test output in a task-local log, inspect
the suite summary and first distinct failure, and expand the log only when a
specific failure needs investigation. The full output and every failing suite
must still be retained and reported. This should reduce repeated reading while
preserving reproducible evidence and the required verification.

I also added a short `current-state.md` index for `student-tickets` and
documented its use in `AGENTS.md` and `workflow/README.md`. It points to the
approved artifacts, checklist status, open verification findings, next
permitted action, and approval boundary. An agent joining or resuming a phase
can read it first, then verify relevant claims against the linked primary
records. The orchestrator updates it at meaningful checkpoints rather than
after every command. This should make cross-agent handoffs and resumed work
faster to orient, without turning the index into a second source of approval.
For this task, it makes the unresolved registration regression and the hold on
Batch 3 dispatch visible immediately.

Finally, I removed repeated repository-wide approval, security, and evidence
instructions from the five role profiles in `workflow/agents/`. Those rules
remain in `AGENTS.md`; the profiles retain the actions and outputs specific to
each role. This should shorten the instructions each agent reads and reduce
the chance that duplicated rules drift apart. All five TOML profiles parsed
after the edit. The expected token savings have not yet been measured.

## Narrowing context during active agent work

While planning `student-ticket-activity`, I noticed that input context was
growing even though the implementation had not started. The conversation had
accumulated approval decisions, specification and handoff excerpts, source and
test output, skill instructions, and a detailed Firestore search result.
Repeatedly carrying this material forward increased token use without always
helping the next decision. I could not measure the exact contribution of each
source because the runtime did not expose a per-source token breakdown.

I updated the `Efficient evidence collection` section of `AGENTS.md` to make
the existing guidance more concrete. Agents now begin with targeted file and
line searches and bounded output, then open only changed files and the parts
of approved artifacts needed for the current decision. They avoid rereading
or pasting unchanged material already in context. Handoffs and reports point
to task artifacts and full logs instead of copying large excerpts. Agents
expand inspection or testing when a failure, unresolved risk, or required gate
calls for it, and stop optional repeat checks once those needs are resolved.

These changes should reduce repeated input tokens and make handoffs easier to
review. They should also help agents identify the first distinct failure
sooner while leaving complete test output in task-local logs. Required tests,
independent review, all failing-suite reports, and approval gates remain in
place. The effect is an expectation, not a measured saving yet; later task
reports can compare actual token usage and verification results.
