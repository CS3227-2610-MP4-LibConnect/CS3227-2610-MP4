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

<!-- TODO (team): how you verified triggering, context management, resource
sharing, and handoffs were followed; evidence from workflow/tasks/*/ and
logs/tasks/*/. -->

### Idle, overloaded, or blocked agents

<!-- TODO (team): examples from orchestrator logs, e.g. implementers waiting on
review corrections (see the *-correction.md reports in
workflow/tasks/member-catalog-search/). -->

### Retries and repeated work

<!-- TODO (team): count correction/addendum rounds per task from
workflow/tasks/*/ and explain their causes. -->

### Conflicts between agents

<!-- TODO (team): reviewer-vs-implementer disagreements and how the human
resolved them. -->

### Costs versus benefits, and when to use multiple agents

<!-- TODO (team): compare a feature built with the full pipeline against one
built with a single agent, using token usage tables from implementation
reports. -->

## Context Engineering

### System prompts and skills

<!-- TODO (team): how AGENTS.md and the agent profiles were written and revised;
the skill pruning below is one example. -->

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

<!-- TODO (team): any observed change in skill selection or token use after
pruning. -->

### Handoff and notes content

<!-- TODO (team): which handoff fields proved essential, using
workflow/tasks/*/handoff.md as evidence. -->

## Resource-aware Use

### Model and reasoning-effort choices

The orchestrator runs `gpt-6-sol` at high reasoning effort and the reviewer runs
`gpt-6-luna` at high. The analyst, test writer, task grouper, and implementer
run `gpt-6-luna` at medium.

<!-- TODO (team): whether these choices held up; any task where effort was
changed and the effect. -->

### Token usage

Before the workflow change, login and registration each used about 40% of one
developer's five-hour usage allowance
([Jun Hong's reflection](reflections/junhong.md)).

<!-- TODO (team): per-subagent token tables from implementation reports created
after the token-usage requirement; which task types used the most tokens;
cache hit rates; internal reasoning share; effect of persisted reasoning. -->

### Resource-aware use in the app

<!-- TODO (team): SoC LLM rate limits, token caps, and cache-friendly prompt
ordering in the AI gateway, with token counts from AIUsageRecord data. -->
