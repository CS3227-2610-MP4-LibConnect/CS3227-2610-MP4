# Reflections

These are the team's reflections on Multi-Agent SE, Context Engineering, and
Resource-aware Use while building CodeClinic. Each section summarises the team's
findings and links to the individual reflections for detailed examples:

- [Jun Hong's reflection](reflections/junhong.md)
- [Jiali's reflection](reflections/jiali.md)

Every claim should be backed by an experiment or a recorded log under `logs/`.
Where a measurement has not been taken yet, the section says so.

## Multi-Agent SE

### Coordination pattern

The team uses an orchestrator-led, gated pipeline with six specialized agents
(`workflow/agents/`): an analyst, an orchestrator, a test writer, a task
grouper, implementers, and a reviewer. A human approves every gate. The
`workflow/README.md` lifecycle and permission matrix define who may read,
write, and act at each stage.

The 8 Nov continuation resumed from the last merged feature groups and inspected
Claude's leftover worktrees before editing. The orchestrator recovered unfinished
guide and transport changes, assigned account and notification files to separate
implementers, and kept shared server wiring and guides under one owner. An
independent reviewer inspected a frozen gateway snapshot. The
[gateway execution log](../logs/tasks/ai-gateway/continuation.md) and
[review log](../logs/tasks/ai-gateway/review-continuation.md) distinguish work,
verification and review from approval. This provides an auditable example of
handoff use, rather than proving that every historical run followed every rule.

### Idle, overloaded, or blocked agents

AI gateway Group 1 was interrupted by disk exhaustion for five implementers,
and the first review stopped at a usage limit. The
[Group 1 integration log](../logs/tasks/ai-gateway/integration-G1.md) records both
interrupted and resumed runs. More parallel agents did not solve the shared disk
or account limit. During the continuation, sandbox restrictions also prevented
local HTTP listeners; local emulator tests passed once that execution restriction
was resolved. These were environment blocks, not evidence that requirements or
security assertions should be relaxed.

### Retries and repeated work

The same Group 1 log records five interrupted implementation runs and five
resumptions, totalling 590,797 reported tokens for those ten runs; 312,800 were
in the interrupted runs. The continuation also exposed a different form of
repeated work: new navigation requests consumed sequential auth mocks, and newly
mounted account routes required richer fake stores. Human-approved fixture
updates preserved the original security assertions. Reusable request-aware
fixtures can reduce this maintenance cost. We have not measured correction
rounds across the entire repository.

### Conflicts between agents

The gateway reviewer identified a conflict between the literal usage-audit
requirement and the absence of a trustworthy user ID in an invalid-actor call.
The implementation rejected the call without inventing an identity. The human
approved clarifying R4/R11 so usage recording begins only after both the feature
and server actor validate. The [review addendum](../workflow/tasks/ai-gateway/review-report.md)
retains the original finding and its resolution. This was a specification
decision; a passing test alone did not settle it.

### Costs versus benefits, and when to use multiple agents

Separate review found specification and test-isolation issues that the initial
gateway implementation had not recorded. Parallel account and notification work
was possible because file ownership was split, while shared navigation and route
integration still required coordination. The evidence supports using independent
review for security-sensitive shared code and serializing shared files. It does
not establish a token or elapsed-time advantage: we did not run a comparable
single-agent baseline, and several runs lack runtime usage metrics.

## Context Engineering

### System prompts and skills

`AGENTS.md` establishes source precedence, trust boundaries and approval gates;
role profiles narrow each assignment. Skills supply task procedures rather than
authority to broaden scope. One practical adaptation is important here: OpenSpec
references map to `workflow/specs/` and `workflow/tasks/`; agents must not create a
second planning tree. The [workflow](../workflow/README.md) and task handoffs make
that mapping explicit. Skill pruning below reduced irrelevant descriptions,
while the continuation selected implementation and AI-security procedures.

### Upfront versus retrieved context

The orchestrator first pasted whole specifications, designs, and handoffs into
each assignment. The team changed this to sending artifact paths and versions,
with agents reading only the sections they need. The motivation and the changes
are recorded in [Jun Hong's reflection](reflections/junhong.md). The reduction
has not yet been measured against a completed task.

### Context organisation and effectiveness

On 8 Nov 2026, nine skills unrelated to the stack were removed. This cut the
skill descriptions loaded into every session from 7,269 to 4,446 characters
(−39%) (`logs/tasks/codeclinic-scope/skills-pruning.md`).

The [pruning log](../logs/tasks/codeclinic-scope/skills-pruning.md) explicitly
limits the measurement to characters and on-demand file sizes. No controlled
before/after run measured wrong skill selections or token consumption. A 39%
smaller description catalog therefore must not be reported as 39% fewer tokens
or 39% lower cost.

### Handoff and notes content

Exact versions, allowed files, approval evidence, existing-test constraints and
external-action boundaries were particularly useful when resuming another agent's
work. The [account handoff](../workflow/tasks/account-management/handoff.md)
made the test-fixture exception explicit; the
[notification handoff](../workflow/tasks/notifications/handoff.md) separated inbox
infrastructure from role-owned event decisions. Recording unfinished checks
prevents a new agent from treating a previous completion message as a verified
result or as permission to deploy.

## Resource-aware Use

### Model and reasoning-effort choices

The orchestrator profile selects `gpt-6-sol` at high reasoning effort and the reviewer profile selects
`gpt-6-luna` at high. The analyst, test writer, task grouper, and implementer
run `gpt-6-luna` at medium.

These are profile defaults, not a claim that every historical run used those
models. Earlier Claude runs report different models in their task logs. The
continuation used the implementer and reviewer profile settings, with an
independent gateway reviewer. There was no controlled model or reasoning-effort
comparison, so we cannot attribute correctness, latency or cost changes to a
particular model setting.

### Token usage

Before the workflow change, login and registration each used about 40% of one
developer's five-hour usage allowance
([Jun Hong's reflection](reflections/junhong.md)).

Historical runtime totals, when available, are retained in task evidence; the
Group 1 implementation totals above are one bounded example. Current
[implementation reports](../workflow/tasks/ai-gateway/implementation-report.md)
mark unavailable usage rather than estimating it from file sizes or message
lengths. A cross-run total is invalid when included runs lack totals. Cache-hit
rates, reasoning-token share and the effect of persisted reasoning were not
measured. The earlier five-hour allowance estimate is a developer observation,
not a token count or a controlled cost experiment.

### Resource-aware use in the app

The shared gateway enforces 5 calls per user per minute, 50 per day and a
default environment limit of 40 per minute (at most 45). Two environments can
therefore remain within the approved shared-key cap of 90 per minute. Feature
registrations specify input and output caps; fixed system instructions precede
delimited user content so a provider can reuse the stable prompt prefix.
Timeouts, one retry and a circuit breaker bound failure handling.

`aiUsage` stores outcome, attempts, latency and provider-reported token counts,
including cached tokens when available, without prompt or response text. The
[loopback/emulator test](../src/codeclinic/test/ai-gateway-emulator.integration.test.js)
verifies this data path using synthetic provider counts. Those counts verify
plumbing only; they are not real SoC usage or evidence of cache savings. No
role-specific AI feature is registered, and real provider model/max-token support
and usage measurements remain human follow-up.
