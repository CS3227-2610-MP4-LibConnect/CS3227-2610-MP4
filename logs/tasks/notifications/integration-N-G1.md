# notifications N-G1 integration — factual log

Date: 2026-11-08
Branch base: `4498e56` (`codeclinic-scope`)
Authority: the human's standing approval to merge a group after an independent review with no Critical or High findings; the human approved one review per wave.

## Review outcome

The Wave 1 review (run in Cursor) found no Critical or High issues in this group. Verdict: ready, pass with follow-up.

- Medium (`server/notifications/route.js:50-54`): the inbox list query needs a Firestore composite index on `recipientUserId` and `createdAt` (descending) that the repository does not define; without it the list returns `503` on real Firestore. Adding index configuration is ask-first; awaiting the human's decision.
- Low: a `401` does not clear the session cookie; `notify` can reject if input getters throw.
- Reviewer re-run: 438 tests passed, 1 skipped; build compiled.

## Subagent token usage

| Role | Task/group and run | Model | Input tokens | Output tokens | Total tokens | Usage source |
| --- | --- | --- | ---: | ---: | ---: | --- |
| implementer | notifications N-G1, run 1 and follow-up (Cursor) | unavailable | unavailable | unavailable | unavailable | unavailable |
| reviewer | Wave 1 review (Cursor) | unavailable | unavailable | unavailable | unavailable | unavailable |
