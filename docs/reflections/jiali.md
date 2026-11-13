# Jiali's Reflections

I owned the TA role, which meant the ticket queue (`ta-ticket-queue`) and its
two AI features (`ai-ta-assist`). I also took a share of the team work, namely the AI
gateway, account management, notifications, UI consistency and deployment.

I've put the comparisons I measured in [Experiments](#experiments) first, and
the three topic sections refer back to them. They're small comparisons from my
own work, not controlled studies, so for each one I've said what it does and
doesn't show.

### How I count tokens

I use two token sources, and I never mix them in one comparison (see E6):

- **Runtime-reported** (`subagent_tokens`). I use these to compare runs and
  stages within one feature, such as E1, E2 and the stage split.
- **Transcript-derived**, counting each API message once by its message ID. I
  use these for cache rates and orchestrator totals, because only the
  transcripts break input down into cache reads and writes.

The two sources differ by more than an order of magnitude for the same work
(about 956k vs. 16.7M for the `ta-ticket-queue` subagents), so every number
below says which one it is.

## Experiments

### E1. Resuming an agent vs. starting a fresh one

The independent review of `ta-ticket-queue` came back with Low findings L1–L3
and F1. For the re-check, I resumed the same Opus reviewer, which still had the
original diff and its findings, instead of starting a new one. I did the same
for the fixes and resumed the original implementer. Runtime-reported figures:

| Run | Tokens | Tool calls |
| --- | --- | --- |
| First full review (fresh) | about 148k | 41 |
| Each resumed re-review | about 6–21k | 9 |
| Each resumed fix | about 3–22k | 9 |
| A fresh implementer, for comparison | about 55–80k | — |

Each re-review cost about a seventh of the first review, or less. I have to be
careful what that shows, though. A re-review has a much narrower scope than a
full review, so a *fresh* reviewer given only the re-check would also have been
much cheaper than 148k. The table mixes two effects, the narrower task and not
having to re-read the diff and rebuild the context. I can't separate them,
because I never ran a fresh re-reviewer on the same re-check.

The fix comparison is fairer, since a fresh implementer and a resumed one were
doing similar-sized jobs. There, resuming was about 3 to 20 times cheaper. Even
on the conservative reading, resuming saved more than anything else I tried. A
fair test next time would run one re-check both ways.

The findings, the fixes and each re-review verdict are in
[`workflow/tasks/ta-ticket-queue/review-report.md`](../../workflow/tasks/ta-ticket-queue/review-report.md).
The runtime reports cumulative figures, so each run's share is worked out by
subtraction.

### E2. Task grouping by a subagent vs. inline

In `ta-ticket-queue`, a Haiku subagent proposed and applied the grouping for 8
tasks. It used 65,636 runtime-reported tokens over two runs and added an extra
approval round for me. Its six serial groups were also more serial than they
needed to be, and I ended up replacing them with five. In `ai-ta-assist`, also
8 tasks, the orchestrator just grouped them inline in the checklist, and I
approved the grouping together with the checklist.

I didn't measure what inline grouping cost the orchestrator, so the net token
saving is less than 65,636 by an amount I don't know. The gains I'm sure of are
one fewer approval round and a grouping I didn't have to redo. On that basis, I
now group inline for anything under about 10 tasks.

### E3. Parallel vs. serial implementation

Group 3 of `ta-ticket-queue` ran three implementers in parallel, each in its own
worktree. Before dispatching them, I fixed one-line mount points in the shared
`ta-routes.js`. The only merge conflict was the one I'd planned for (keeping
both mount lines).

The group finished about 2.3 times faster than running the tasks one after
another. It worked because the interfaces were settled before anyone started.
Without that, the merges would have eaten up the time saved.

### E4. Prompt changes tested with live SoCLaaS runs

I did six improvement rounds on the two TA prompts. Each round had a spec
amendment, an implementation, live runs against fixed security and behaviour
checks, and an independent review
([07-ai-ta-assist.md](../../logs/chat/jiali/07-ai-ta-assist.md)). I tracked
checks passed, insights coverage, and how often drafts did things we didn't
want:

| Round | Change | Before | After |
| --- | --- | --- | --- |
| 1–2 | Insights coverage | 4/6 and 5/6 | 6/6 and 6/6 |
| 1–2 | Drafts stating an unsupported cause | 2/2 | 0/2 |
| 3 | Injected-instruction ticket grouped | 3/5 runs | 10/10 runs |
| 3 | Hedged drafts ("likely", "probably") | 3/20 | 1/40 |
| 4 | Final runs passing all checks | — | 5/5 at 51/51, with 7/7 coverage |
| 6 | Final runs passing all checks | — | 5/5 at 56/56 |

The round 3 change is `2d251e3` (*Group instruction-like tickets and curb draft
speculation*), and the round 6 change is `9e2c0cb` (*Require a concrete fix in AI
drafts*). Each round's live results and review are in
[`workflow/tasks/ai-ta-assist/implementation-report.md`](../../workflow/tasks/ai-ta-assist/implementation-report.md)
and [`review-report.md`](../../workflow/tasks/ai-ta-assist/review-report.md).

Basically, I treated the prompts like code. Having a measured baseline meant I
could see whether a change actually helped, and it caught regressions I would
otherwise have missed.

This was also my most expensive work (see
[Which tasks used the most tokens](#which-tasks-used-the-most-tokens-and-what-i-changed)).
I measured quality per round but not cost per round, which I should have done.

There are other limits too. The runs are few (2 to 10 per stage), and counting
hedge words is only a rough measure. The checks also can't tell whether a draft
suggests the right fix. I found that out in round 6, when I noticed that "name
only what's in the ticket" could stop a draft from suggesting the correct
library, so I had to judge those by hand.

### E5. Pruning skills that don't fit the stack

The team removed nine skills that had nothing to do with our stack
(mobile, analytics, Data Connect and others) from `.agents/skills/`. The skill
descriptions loaded into every agent session dropped from 7,269 to 4,446
characters (−39%), and about 361 KB of reference files went with them
(`logs/tasks/codeclinic-scope/skills-pruning.md`). Every session had been
paying for skills it never used, and the fix only had to be done once. I didn't
measure the effect on total tokens per task.

### E6. Two ways of counting tokens

My first token report was wrong. I summed the usage on every line of the Claude
Code transcripts, and the totals came out about twice too high, because Claude
Code repeats a message's usage on each of its content blocks. Counting each API
message once, by its message ID, fixed that.

Even then, the two sources didn't agree. For the same `ta-ticket-queue`
subagents, the runtime reported about 956k tokens, while the transcripts showed
16.7M input tokens including cache. The two measure different things, which is
why I set the rule at the top of this document to use one source per
comparison and always name it.

## Multi-Agent SE

### Designing the coordination pattern

Every feature went through the same steps:

1. analyst spec, then human approval;
2. checklist and handoff, then human approval;
3. tests written before any code;
4. dependency-ordered groups of implementers, each in its own git worktree and
   branch;
5. an independent reviewer on a clean checkout;
6. my merge decision.

The orchestrator (the main agent session) owned the merges, the checklist and
the evidence. Subagents only got file paths and versions, the sections to read,
and an explicit list of files they were allowed to write.

Shared helpers went in the earliest task, and later tasks had to import them
instead of writing their own. I added that rule after the first feature ended
up with a duplicate helper (F1).

### Checking that the pattern was followed

I didn't want to rely on the agents' own reports. After each merge, the
orchestrator ran the full suite, compared the diff stat against the task's
allowed files, and re-ran the task's target tests itself (for T01, that was 103
tests across five allowed files).

The diff-stat check costs one tool call, and it paid off. It caught a fix agent
that had committed a Firestore emulator debug log through a broad `git add`.
After that, we added a standing rule to stage by explicit path only, plus an
ignore rule (`ef05784`, `2f0ad51`).

The checklist boxes also made regressions easy to spot. When a later fix
reopened T06, its box went from `[x]` back to `[ ]`.

For triggering, no agent started on a passing test or another agent's message.
Each group was dispatched only after I approved it, and the approval was
recorded in the task's `tasks.md` and handoff before dispatch. For hand-offs,
every subagent ended by reporting back to the orchestrator. The orchestrator
treated that report as a claim to check, not as a result, and merged only
after its own checks passed. The one hand-off that failed was the T01 brief
pointing at an untracked path (below), and it was caught because T01's work was
checked before the merge.

There's one gap I should have closed. Jun Hong's tasks record each dispatch in
batch manifests that `src/workflow/validate-assignment.mjs` checks, for example
`workflow/tasks/ai-error-explainer/assignment-batch-1.json`. My TA tasks
recorded the grouping in `tasks.md` and `grouping-proposal.md` instead, so there
is no machine check that my dispatches matched the approved groups. Reviewing
the logs by hand was the only check. The validator already existed in our repo,
so I could have used it. Next time I'll write a manifest for every batch.

### Idle, blocked and overloaded agents

A T01 brief pointed at
`.claude/skills/...`, but `.claude/` is untracked, so it doesn't exist inside a
worktree and the agent couldn't find it. Now I check every prompt path inside
the target workspace before dispatch. The T08 emulator run simply hung, so
every prompt that starts a server or emulator now tells the agent to read stdin
from `/dev/null`, use a timeout, and check the port.

I once hit the usage limit in the middle of `ai-ta-assist`. The orchestrator
stopped the test writer at a safe point on its own. Because the work sat in an
isolated worktree, it picked up after the reset without redoing anything.

The agent that actually got overloaded was the orchestrator itself, since its
context kept growing through the whole session. I knew this and didn't fix it
(see [When more context made agents less
effective](#when-more-context-made-agents-less-effective)).

### Retries and repeated work

The review and fix loop for `ta-ticket-queue` cost about 210k runtime-reported
tokens, 22% of the feature. That sounds like a lot, but it caught 6 real
defects that the authors' tests missed, and resuming agents kept it cheaper
than it would otherwise have been (E1).

The clearest waste of tool calls was the hung T08 emulator run, which used
up time and a retry without producing anything. That's what led to the tool
hygiene rule above.

One retry was my own fault. My F1 decision changed what `claimedByMe` means,
and the queue badge (N1) still assumed the old meaning, so the fix needed
another fix. The rule I added afterwards tells the fix agent to grep every place
the field is used. On reflection, that check belongs earlier. I should grep the
field's usages *before* deciding to change what it means, so the decision
already includes the impact.

### Resolving conflicts between agents

In the UI-consistency task, an API reviewer reported a defect that contradicted
a guard already in the code, so I had the orchestrator run an actual request to check. The result disproved the
finding, and the reviewer withdrew it
([05-ui-consistency-and-feedback.md](../../logs/chat/jiali/05-ui-consistency-and-feedback.md)).
Since then, I only count a reviewer's finding if it comes with a reproduction.

When a reviewer and the spec disagreed (F1), we amended the spec first and
changed the code afterwards, so the spec stayed the source of truth.

Conflicts between implementers didn't come up much, because the worktree and
allowed-files rules kept them out of each other's files. The one shared file
(`ta-routes.js` in E3) was settled before dispatch.

### Did the benefits outweigh the costs, and when to use multiple agents

Two things were clearly worth it. One was parallel implementation once the interfaces
were fixed (E3), and the other was independent review, which found defects that every author
missed.

Other uses weren't. Grouping a short checklist with a separate agent cost more
than it gave (E2). Having agents write evidence was wasted effort too, since
the orchestrator already had the facts. My worst decision was the small UI
fixes. I used eleven Codex agents to fix a header, a missing menu and some
error messages, and the orchestrator's context alone used 40.3M input tokens.
One implementer and one reviewer would have done the job. I only saw that
afterwards, because I never asked before dispatching whether the work actually
split into independent pieces. The blank-page production bug was the opposite.
Each step depended on the last, so I correctly used one agent
([09-environments-and-deployment.md](../../logs/chat/jiali/09-environments-and-deployment.md)).

So I'd use multiple agents when the work splits into independent pieces with
fixed interfaces, or when independence is the whole point, as in review. For
anything sequential or small, or where I need to judge the UI with my own eyes
(like the user-testing fixes in
[08-user-testing-fixes.md](../../logs/chat/jiali/08-user-testing-fixes.md)),
one agent is enough. Before dispatching anything, I now ask *how many
pieces can run without waiting on each other?* If the answer is one or two, I
don't fan out.

## Context Engineering

### Engineering the system prompt and skills

I split the instructions across three places. `AGENTS.md` has the rules every
agent needs, such as the source-of-truth order, the approval gates and the
security baseline. Each role's procedure lives in its `workflow/agents/*.toml` profile.
Handoffs only carry what's specific to the task. Keeping the shared layers
stable also helped caching (see [Reducing cache
misses](#reducing-cache-misses-and-how-much-it-helped)).

The agent instructions improved through failures rather than planned tests.
Each fix became a rule in the layer it belonged to. Rules for every agent went
in `AGENTS.md`, like staging by explicit path. Rules for a role went in its
profile. Rules for a feature went in its handoff. From the second feature on, I
wrote the first feature's lessons into the handoff once instead of repeating
them in every prompt. These included prompt paths that work inside a worktree,
staging by explicit path, and the tool hygiene for long-running servers (stdin
from `/dev/null`, a timeout, and a port check). Unlike the TA prompts (E4), I
never measured the agent instructions against a baseline. That's a gap.

For skills, I linked `.agents/skills` as `.claude/skills` so they load
automatically, and we pruned the ones that didn't fit (E5).

### Upfront vs. retrieved as needed

I put things upfront when every implementer would otherwise have to work them
out separately. For example, the `ai-ta-assist` handoff has a short section on
how the gateway reaches the routes (`app.locals` is set after
`createServerApp`). Without it, five implementers would each have had to
discover that on their own.

Long specs I left for agents to look up when needed. For the `ai-ta-assist`
spec, the analyst read only the headings of the 289-line gateway spec, then the
trust, requirements and open sections. That took about 6 tool calls.

### How context organisation affects finding and following instructions

The clearest example is the glossary. On the first feature, the spec used
"claimed" without defining it. I had to stop and ask what it meant, and the
same ambiguity was behind F1 and the N1 badge bug. For `ai-ta-assist`, I put a
short glossary at the top of the spec (active ticket, claimer, draft, alias).
No question about term meanings came up during that feature. That's one feature
and not a controlled test, but the terms that had caused a defect stopped
causing questions.

Order matters as well as content. The rules agents had to follow without
exception (approval gates, allowed files, staging by path) sit in `AGENTS.md`
and at the top of each handoff. Reference material sits below them or behind a
file path. The one time an agent couldn't follow an instruction, the T01 brief,
it wasn't that the instruction was buried. It pointed at a path that didn't
exist in the agent's workspace. So "can the agent find it?" includes "does it
exist where the agent is running?"

### What goes in notes.md and the handoff

I used the two for different jobs, and the difference matters.

**The handoff is for continuing the work.** A new agent, or a new orchestrator
session, should be able to pick up from it without reading the chat history. It
should contain:

- **Current state:** which tasks are done, merged and verified, and which are
  open. In practice that's the `tasks.md` checklist, which the handoff points
  to rather than copying.
- **Decisions already made, and where they're recorded,** such as the F1
  amendment to the spec, so they don't get reopened.
- **Next step:** the next group to dispatch and its approval status.
- **Fixed interfaces** the next agents must not change, such as the shared
  ticket contract and the route mount points.
- **Environment facts** an agent would otherwise rediscover, such as the
  gateway's `app.locals` wiring, which paths exist in a worktree, and the
  emulator and server hygiene.
- **File pointers instead of pasted content,** so the handoff stays short and
  doesn't go stale.

**notes.md is for the next feature.** It holds a short retrospective for each
feature covering what worked, what cost us, and what to change next time. That's how
inline grouping, shared helpers in the first task, and committing planning
files before dispatch carried over to `ai-ta-assist`.

When I hit the usage limit, the resume worked because the work sat in an
isolated worktree and the checklist was up to date. It didn't need notes.md.
A good test of a handoff is whether someone could resume from the checklist and
the handoff alone. For my prompt rounds (E4), they couldn't have. Too much
of the state lived only in the orchestrator's context, and that's the main
thing I'd fix (next section).

### When more context made agents less effective

I have to separate sessions that got more *expensive* from
sessions where the agent got *worse*. My first draft mixed them up.

**Cost.** In `ai-ta-assist`, the orchestrator's cache reads (99.2M,
transcript-derived) were 6.6 times those of all 28 subagents together (15.1M),
even though the subagents wrote the code
([07-ai-ta-assist.md](../../logs/chat/jiali/07-ai-ta-assist.md)). That shows a
long session being re-read on every turn. It doesn't by itself show the
orchestrator doing worse work.

**Effectiveness.** My clearest signal is from the Codex sessions. Twice I asked
the orchestrator to find ways to improve efficiency, and both times it went
back to coordinating and didn't make a change. An instruction that doesn't get
acted on is the symptom I should have watched for. My request was also too
vague. "Find ways to improve efficiency" gives an overloaded agent nothing
specific to do. "Start a fresh session with this handoff" or "don't spawn
agents for these three fixes" would have been something it could act on.

What I didn't do was track this systematically. Next time I'd watch a few
specific signals as a session gets longer:

- instructions that are acknowledged but not acted on;
- the orchestrator re-asking about, or contradicting, decisions already in the
  handoff;
- more review findings or rework per task later in the session than earlier.

When any of these shows up, I'd reset by writing the handoff, starting a fresh
orchestrator, and carrying on from the checklist.

## Resource-aware Use

### Choosing and configuring models

I tried to match the model to the job. Haiku did bookkeeping like grouping,
Sonnet wrote tests and implementations, and Opus did orchestration and
independent review. Review is the last gate, so a missed defect there costs the
most, and that's where I wanted the strongest model. In the Codex profiles, the
orchestrator, analyst and reviewer run at high effort, and the test writer and
implementer at medium.

Here's how the runtime-reported subagent tokens for `ta-ticket-queue` (about
956k in total) split by stage:

| Stage | Model | Share |
| --- | --- | --- |
| Grouping | Haiku | 7% |
| Test writing | Sonnet | 14% |
| Implementation, including fixes | Sonnet | 60% |
| Review, 3 rounds | Opus | 18% |

So Sonnet stages took about three quarters of the subagent tokens, and the most
expensive model was limited to under a fifth. That was intentional, since the
usage limit was the constraint I actually hit. Spending it at the review gate
caught 6 defects, while the bulk work ran on the cheaper model. I'd reconsider two
things. Haiku saved little on grouping that the orchestrator could have
done inline anyway (E2), and I never tried Sonnet for re-reviews, which are
narrower than the first review.

### Reducing cache misses, and how much it helped

I measured these from the session transcripts, counting each API message once
(E6):

| Thread | Cache-hit rate | Cache writes as a share of input |
| --- | --- | --- |
| `ta-ticket-queue` orchestrator | 99.2% | 0.8% (0.33M of 39.9M) |
| `ta-ticket-queue` 13 subagents | 89.3% | 10.7% (1.79M of 16.7M) |
| `ai-ta-assist` orchestrator | 98.1% | 1.9% |
| `ai-ta-assist` 28 subagents | 90.1% | 9.8% |
| Codex orchestrators, long sessions | 99.3–99.4% | — |
| Codex spawned agents | 95.5–96.3% | — |

The main thing I noticed is that fresh agents miss more. Each new subagent has
to write its whole prefix into the cache before it can reuse it, which is why
the subagents' share of cache writes is several times the orchestrator's.

What kept misses down:

- **A stable shared prefix.** `AGENTS.md` and the profiles rarely change.
- **File paths instead of pasted documents** in briefs, so a brief's prefix
  doesn't change every time a document does.
- **Fewer fresh agents.** Resuming an agent reuses its prefix instead of writing
  a new one, and dropping the grouping agent removed a prefix altogether.

**How much did it help?** E1 shouldn't count as the answer, since most of its saving comes from not re-reading the diff
and from narrower tasks, not from a better cache rate. What the table does let
me say is roughly this. Cache reads are typically billed at about a tenth of
fresh input. The subagents at around 90% hit rate were therefore paying for far
less than their raw input total, and the 10% of input written to cache was
their main avoidable cost. The cheapest way to cut that is to start fewer
agents.

The same idea applies inside the app with SoCLaaS. The fixed system prompts
come before the delimited ticket data, so the provider can reuse the prefix
(gateway R7). Queue insights are also cached for 5 minutes while the queue is
unchanged, so if five TAs open the queue, it costs one call.

### Reasoning tokens and persisted reasoning

Codex reports reasoning tokens separately. For `ui-consistency-and-feedback`,
reasoning was 32,949 of the orchestrator's 82,848 output tokens (39.8%), and
30,651 of 115,817 for its 12 spawned agents (26.5%). The *Finish team-based
tasks* session looked similar, at 40.1% for the orchestrator and 37.4% for its
spawned agents. Claude Code doesn't report thinking tokens separately, so I
don't have matching numbers for the TA features built there.

So roughly a third to two fifths of output went to reasoning, and the
orchestrator reasoned proportionally more than its workers. That fits its job,
which was deciding rather than typing code.

Persisted reasoning helps by writing a conclusion down once so no agent pays to
reach it again. In my workflow that happened at three levels, with decisions in the
spec (like the F1 amendment), environment facts in the handoff, and lessons in
`notes.md`. The second feature started by applying those lessons instead of
rediscovering them, including inline grouping (E2), shared helpers in the first task,
planning files committed before dispatch, and tool hygiene in the handoff.

### Monitoring and reducing token usage

The implementation reports record each subagent run's token total and where
the number came from. Input and output are marked unavailable when the tool
didn't report them. To write the logs, I had the agent write a local script to
condense about 50 MB of Claude Code and Codex transcripts into about 390 KB of
prompts, decisions, agent operations, commits and token totals, and only read
the parts each log needed. For counting, I stuck to once per message ID and
named the source every time (E6). When the usage limit hit, the orchestrator
stopped the running agent at a safe point so it didn't fail halfway.

I bounded the AI calls in the app too. Insights only run on request and cover
at most the oldest 60 active tickets, and the prompt sends one short line per
ticket. The live test fails if the provider needs more than one retry.

### Which tasks used the most tokens, and what I changed

The most expensive work was `ai-ta-assist`, and within it the six prompt
improvement rounds (E4). In transcript-derived figures, its orchestrator read
99.2M tokens from cache alone, against 39.9M total input for the whole
`ta-ticket-queue` orchestrator. Its 28 subagents read another 15.1M. I didn't
split that by round, so I can't say how much each round cost. That's the
measurement I most regret not taking, because it would have told me whether
the later rounds were worth what they cost. Review and fix loops came second,
at about 210k runtime-reported tokens, or 22% of `ta-ticket-queue`.

What I changed:

- **Resumed agents for every fix round** after the first `ta-ticket-queue`
  review. Fixes were about 3–20 times cheaper than a fresh implementer (E1).
- **Dropped the grouping agent** in `ai-ta-assist`. This removed 65,636 tokens
  of subagent work and an approval round, minus whatever inline grouping cost
  the orchestrator, which I didn't measure (E2).

What I didn't change was the biggest cost, which was the orchestrator's context growing
across the prompt rounds. If I did it again, I'd end each round by updating the
handoff (state, decisions, next round's change) and start a fresh orchestrator
session for the next round. Each round would then start small instead of
re-reading everything before it, and I'd record each round's token cost
alongside its quality results.

## What I'd change next time

1. **Ask before fanning out.** Count the pieces that can run without waiting on
   each other. If it's one or two, use one implementer and one reviewer.
2. **Reset the orchestrator at phase boundaries**, such as each prompt round or
   each feature group, using the handoff, instead of letting one session grow.
3. **Give specific instructions.** Name the change I want instead of asking an
   overloaded agent to "find improvements".
4. **Check the impact before deciding to change shared fields.** Grep every
   usage before making the decision, not only in the fix prompt.
5. **Write a dispatch manifest for every batch** and check it with
   `validate-assignment.mjs`, like the rest of the team.
6. **Run small fair comparisons.** Same task, one variable changed, and record
   cost per round next to quality per round.
