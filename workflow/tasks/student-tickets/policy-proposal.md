# Student ticket creation: proposed policy decisions

Date: 2026-11-09 (Asia/Singapore)
Status: proposal for human decision; not part of approved specification v0.1
Canonical specification: `workflow/specs/student-tickets.md` v0.1

The human approved the student ticket specification in the current conversation. Its four "Open decisions before implementation" remain unresolved. The following values make the create API and form testable without adding a dependency or external service. If accepted, amend the canonical specification and task copy, then seek approval of the amended version before production changes.

1. **Body and text limits.** Limit JSON request bodies to 128 KiB of UTF-8. Limit trimmed title to 160 characters, language to 40, each of expected behaviour, actual behaviour, and attempted work to 4,000, and optional error output to 8,000. Accept a nonempty free-text language, rather than a closed vocabulary. Reject unknown fields and wrong types. Return `413` for body size and `400` for field validation.
2. **Source limits.** Accept up to three UTF-8 text code files, each at most 24 KiB, with nonempty basename-only filenames of at most 120 characters. Reject path separators, control characters, `.` and `..` as filenames. For a repository reference, accept an HTTPS `github.com` URL of at most 2,048 characters without credentials, query, or fragment, and up to 10 nonempty relative file paths of at most 256 characters each. Reject absolute paths, `.`/`..` segments, and control characters. Store the reference only; never fetch it.
3. **Source method.** Allow either pasted code files or a GitHub URL and paths in a ticket, not both. Both remain optional. This matches the "or" wording in `Overview.md` and keeps the bounded request contract simple.
4. **Concept tags.** Let Students enter up to eight free-text tags of at most 40 characters each. Trim tags, reject blank or duplicate tags, and store them as plain strings. No fixed vocabulary exists in the product scope.

These proposed limits are product and data-contract decisions. They must be reflected in both client and server validation, test cases, and the approved specification before implementation.
