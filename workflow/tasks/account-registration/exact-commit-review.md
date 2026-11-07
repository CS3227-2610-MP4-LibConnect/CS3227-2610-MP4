# Exact commit review: account registration

**Verdict: pass with follow-up.** Reviewed commit `b02daecf58db8258f6c59a84473026fed97aea7f` on `login-and-registration` against human-approved account-registration specification v0.5, checklist/handoff v0.4, and the prior independent implementation/security reviews. This is review evidence, not merge approval. The human merge decision can be presented with the limits below.

## Exact source and scope

- `HEAD` equals the approved commit. `git diff-tree` lists 52 committed files: registration frontend/server/tests, Firestore target and tests, application and developer documentation, canonical specification, task evidence, and factual logs. The seven checklist tasks are recorded `[x]` in the committed task file.
- The commit contains no `.env`, `.gitignore`, `firebase-debug.log`, `firestore-debug.log`, package lock, credential file, or path outside the approved registration source/docs/evidence scope. The unrelated `.gitignore` modification and two untracked debug logs remain outside the commit and were not read, edited, staged, or deleted.
- `git diff --name-only HEAD --` across the committed application, documentation, specification, and task evidence paths returned no working-tree changes. Thus the source/test content used for this check is the exact committed tree, matching the previously reviewed working tree. An independent worktree was not created because `.git` is read-only in this workspace and `git worktree add` would write Git metadata. Compensating controls: inspect the exact commit object and file list with `git show`/`git diff-tree`, compare committed paths to the current tree, scan the commit diff for credential indicators without printing matched content, and run tests/build against the unchanged committed application files.
- A filename and indicator scan found no excluded paths, PEM private-key block, inline credential JSON private key, or AWS access-key shaped string in the commit diff. This heuristic is supplementary to the earlier human-readable source/security review; it is not a proof that no secret of any form exists. Synthetic passwords in tests and a generated ephemeral emulator key in code are not credential material committed to the repository.

## Verification

From `src/libconnect-mp4`, after inspecting `package.json` scripts:

| Command | Result |
| --- | --- |
| `$env:CI='true'; npm test -- --watch=false --runInBand` | Exit 0; 11 suites, 230 tests passed; one opt-in emulator integration test skipped. |
| `$env:CI='true'; npm run build` | Exit 0; optimized frontend compiled successfully. |
| `git diff --check b02daec^ b02daec` | Reported trailing spaces in Markdown task/evidence lines used for hard line breaks; no application source whitespace error. Cosmetic follow-up only. |

The ordinary full suite includes the corrected T06 test isolation, T07 format checks, registration/login integration with synthetic fixtures, and the prior auth tests. No live production, metadata, or opt-in emulator call was made in this exact-commit review.

## Findings and limits

1. **Low — committed Markdown hard breaks trigger `git diff --check`.** Several specification, handoff, checklist, and evidence lines end with the two spaces used for Markdown hard breaks. This is formatting noise and does not affect application behavior or acceptance criteria. Consider normalizing in a separate approved follow-up if a whitespace-clean commit is required by a future gate; do not rewrite approved evidence silently.
2. **Verification limit — production and deployment.** Actual production runtime token acquisition, IAM/rules, deployed routing, and live Firestore writes remain unverified and require their separate approval gates. The opt-in local emulator test was not run in this exact-commit check; it passed in an earlier independent review, and a later rerun hit a persistent local rate counter. The ordinary synthetic suite and build pass.
3. **Historical low follow-up — login success notice lifetime.** The previous review noted that a client-side success marker can outlive a registration page until the login page consumes it. It is display-only and never authorizes a session. The approved R9 email-format policy resolves the earlier email-syntax ambiguity.

No blocking finding or unauthorized committed path was found. The orchestrator may present the exact commit and these residual risks to the human for a merge decision; neither this report nor passing tests grants merge approval. Factual command evidence is in `execution_logs/reviewer-2026-11-07-exact-commit.md`.
