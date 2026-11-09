# T01 server-wiring correction approval record

On 2026-11-09, the human explicitly approved reopening T01 for a scoped server-wiring regression fix and independent review, and instructed that Batch 3 remain on hold. This records that approval; it grants no commit, merge, push, deployment, guide update, or Batch 3 dispatch.

The observed full-suite regression is documented in [`t04-verification-pre-dispatch.md`](../../../logs/tasks/student-tickets/t04-verification-pre-dispatch.md): the registration suites pass at the clean pre-ticket baseline but return unexpected 503 responses with the current nested login app. The correction is limited to preserving existing registration behavior while retaining the approved ticket endpoint's 128 KiB parser boundary. Verify both registration suites and relevant ticket/security tests. The independent reviewer must inspect the exact correction and its effect on both paths.
