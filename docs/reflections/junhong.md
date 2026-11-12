# Jun Hong's Reflections

## Multi-Agent SE

### How to design and implement the coordination pattern for multiple agents?

We used specification and security analysis, human approval, test writing, implementation, independent review, and a human merge decision. The analyst, test writer, implementer, reviewer, and orchestrator have separate roles in `workflow/agents/`. The orchestrator owns shared checklist and handoff updates. It assigns at most two consecutive checklist items to one implementer, who completes them in order, followed by a different reviewer. This limits concurrent edits to dependent work and makes the handoffs explicit.

Earlier assignments copied full specifications, designs, handoffs, tests, and role instructions. Agents then read the same files again during preflight. I changed the assignment to include the task ID, approved paths and versions, exact items and criteria, allowed files, checks, selected skill, worktree, and evidence destination. Agents retrieve the approved documents from disk instead of relying on a possibly stale pasted copy.

### How to verify that the coordination patterns are properly followed in terms of triggering, context management, resource sharing and hands-off?

The orchestrator checks explicit, version-specific human approvals before dispatch. Each `assignment-batch-<n>.json` records item order, artifact versions, implementer, different reviewer, worktrees, and per-item evidence. The plan and complete modes of `src/workflow/validate-assignment.mjs` check structure, order, role separation, and evidence paths. They do not verify the truth of an approval or test result, so the orchestrator must inspect the linked records. The reviewer checks each item and the combined diff before the checklist is updated.

In `student-tickets` Batch 6, `current-state.md` links the approved artifacts, assignment, implementation reports, test results, and review. The reviewer recorded that a separate worktree was unavailable for the uncommitted shared-workspace change and limited its provenance claim to the exact scoped diff. That exception matters; a structurally valid manifest would not reveal it on its own.

### Were any agents idle, overloaded, or blocked while waiting for others?

The workflow has deliberate waiting points: implementation cannot start until the human approves the batch plan and dispatch, and a later batch cannot start until the current one has been independently reviewed and reconciled. The orchestrator can inspect the test writer's coverage and prepare the batch proposal while tests are being written; it also checks implementation evidence before assigning a reviewer. The current workflow has no separate task-grouper agent, so saying that the orchestrator is idle after grouping tasks does not describe its required work accurately.

There were documented blocks. In `ai-error-explainer`, T01 stopped because the deployed model limits were unconfirmed, which prevented T02 from starting under the approved checklist. The human later approved provisional caps and an amended plan. The task records do not measure how long agents waited or how much work each had, so I cannot conclude that particular agents were idle or that none were overloaded.

### Did retries, repeated analysis, or unnecessary tool calls consume resources?

Yes. Login and registration each consumed about 40% of my five-hour usage allowance. Repeated document copies and preflight reads contributed to the context cost. During `student-tickets` verification, a full run produced 68 similar registration failures. Reading repeated stack traces consumed input without clarifying the distinct cause. I added an evidence rule in `AGENTS.md`: retain full output in a task-local log, inspect the suite summary and first distinct failure, then expand only where needed. Every failing suite must still be reported.

Some retries are necessary. The `student-tickets` Batch 6 reviewer found a focus issue; the implementer corrected it and the reviewer verified the correction. I now repeat a check when it resolves a concrete risk or a required gate, and stop optional repeat checks once those are settled.

### How to resolve conflicts or disagreements between agents, if any?

The repository's source order settles contract conflicts: current user requirements, `Overview.md`, `workflow/PLAN.md`, approved specifications, handoff, then code and tests. A reviewer records the affected criterion and evidence; the orchestrator keeps the item open or reopens it and presents the finding to the human. A requirement change needs a reviewable specification amendment and fresh approvals before code follows it.

I have not encountered a documented disagreement based only on two agents' preferences. The observed conflicts involved an implementation proposal and an unresolved requirement. For example, the `bug-faq` implementer stopped when an opaque reference would have required an unapproved data model or deployment configuration change.

### Did the benefits of multi-agent coordination outweigh the costs?

For this project's consequential feature work, I think the benefits outweighed the costs. Separate implementer and reviewer roles caught a focus issue in `student-tickets` before its checklist item was closed, and the review verified the correction. The staged handoffs also stopped `ai-error-explainer` T01 when the model limits needed a human decision, instead of letting dependent work proceed on an unsupported assumption. These are concrete cases where coordination improved the result.

The cost was high. Each stage required agent setup, reading, reports, review, and approval; login and registration each used about 40% of my five-hour usage allowance. I reduced repeated documents and test output to make that cost more manageable. I cannot show a measured net saving in time or tokens, so my judgment is based on the defects and premature work the workflow prevented. I would keep the multi-agent pattern for security-sensitive and dependent features, but its overhead would not pay off for every small documentation edit.

### When should multi-agent coordination be used and when not?

I would use the full pattern for a multi-step feature, authorization or state-machine change, AI feature, or a change where independent review can catch a serious mistake. A small, reversible documentation correction or bounded investigation can be handled by one agent. Parallel implementers help only when tasks are genuinely independent, have separate files, and have a clear integration point. Our current batches use one implementer sequentially because consecutive checklist items often share dependencies.

## Context Engineering and Resource-aware Use

### How to engineer the system prompt and the skills for the agents?

I keep shared approval, security, and evidence rules in `AGENTS.md`, workflow mechanics in `workflow/README.md`, and role-specific actions in the five `workflow/agents/` profiles. I removed repeated repository-wide rules from those profiles to shorten context and reduce drift. The analyst and test-writer profile identities were corrected, and all five TOML profiles parsed after the edit. Skills are selected for the assigned task and named in its handoff. The workflow maps specification skills to the canonical `workflow/specs/` path so agents do not create a second specification tree. Optional `design.md` and `proposal.md` remain subordinate to the approved specification.

### When should information be supplied upfront, and when should the agent retrieve it as needed?

The assignment supplies the task ID, approved artifact paths and versions, exact items, relevant criteria, allowed files, checks, approval evidence, and report destination. An agent needs these to begin safely. It then reads the approved files from disk and opens the sections relevant to its item. It expands inspection for dependencies, ambiguity, failures, or security risks. This avoids copying whole documents into every prompt while retaining the requirement to verify approvals and scope.

### How does the organization of the context affect the agent's ability to find and follow important instructions?

The source hierarchy in `AGENTS.md` and fixed paths in `workflow/README.md` make conflicts and evidence easier to locate. Specifications live in `workflow/specs/`, handoffs and reports in `workflow/tasks/<task-id>/`, and exact command output in `logs/tasks/<task-id>/`. Reports link to logs rather than copying them. I added `student-tickets/current-state.md` as a short index to artifact versions, checklist status, findings, next action, and approval boundary. Agents verify its claims against primary records. It made the registration regression and later-batch hold visible without rereading the entire history.

### What should be recorded in notes.md or a handoff document so another agent can continue efficiently?

We use a task `handoff.md` and, for active tasks, `current-state.md` rather than a separate `notes.md`. The handoff records approved versions, scope, allowed files, authorization rules, trusted and untrusted inputs, selected skills, required checks, risks, approval evidence, and report destinations. The state index records current item status, open findings, links to reports and logs, the next permitted action, and the pending human decision. Full test output belongs in factual logs, not repeated handoffs.

### When has adding more context made an agent less effective? What signals revealed the problem?

During `student-ticket-activity` planning, the conversation accumulated approvals, specification and handoff excerpts, source and test output, skill instructions, and a detailed Firestore search result before implementation began. Input context kept growing without a corresponding new decision. The 68 similar `student-tickets` registration failures were a clearer signal: repeated traces obscured the first distinct cause. I updated `AGENTS.md` to require targeted file and line searches, bounded output, and opening only changed files and relevant approved sections first. Agents expand when a failure, risk, or gate requires it. The runtime did not expose a per-source token breakdown, so I cannot assign exact costs to each source.

### How to choose and configure the model based on the tasks and resource constraints?

The current role profiles assign `gpt-6-sol` at high reasoning effort to orchestration and `gpt-6-luna` to bounded implementation, test writing, and review. Review uses high effort; implementation and test writing use medium. This reflects the orchestrator's approval and reconciliation duties and the narrower assigned roles, but it is not a measured model comparison. I would revisit the choice when reports show repeated corrections, missed security findings, long durations, or high token use. Model choice must not weaken independent review or human gates.

### What should be done to reduce the cache miss? How much did it help to reduce the actual token usage?

For the application's AI gateway, `workflow/PLAN.md` puts stable system instructions first and changing user input last so repeated requests can reuse the fixed prefix. For coding agents, stable shared instructions and short task-specific assignments should avoid repeatedly changing a large prefix. Removing duplicate documents saves input even without cache reuse. I have no coding-agent cache hit or miss counters and no completed before-and-after token comparison. Older reports mark subagent usage unavailable, so any numerical saving would be an estimate rather than evidence.

### What is the percentage of tokens used in the internal reasoning for a specific task? How could persisted reasoning help?

A concise persisted decision record can still prevent repeated analysis: keep the chosen interpretation, approved version, blocker reason, completed checks, and unresolved questions in the handoff or state index. The next agent must verify that record against the primary evidence.

### What other approaches have you experimented with to monitor and reduce token usage?

I replaced copied documents with paths and versions, separated concise reports from full task-local logs, used targeted searches and bounded reads, added a current-state index, removed repeated role instructions, and corrected optional-file references so agents do not search for nonexistent required artifacts. The task grouper was also changed to keep dependent tasks in order when none can run in parallel. Reports ask for actual subagent token usage where available and forbid invented numbers. I have not measured the combined saving. A future comparison should record model, role, input and output tokens, cached input if available, retries, task complexity, and verification outcome.

### Which types of tasks consume the most tokens in your workflow? Did you manage to reduce the usage for such tasks?

Login and registration were the clearest observed high-cost tasks, each using about 40% of my five-hour allowance. Security and authorization features require long specifications, tests, corrections, and review. `student-tickets` verification and `student-ticket-activity` planning exposed two more costs: repeated failure output and accumulated context before implementation. I changed the workflow to address these sources while retaining full logs, required tests, independent review, and approvals. It has helped to reduce the total input token processed from about 65 million per feature to about 37 million.