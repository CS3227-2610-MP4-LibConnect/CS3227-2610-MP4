# Local Book seed extension — 2026-11-08

Human instruction: extend the existing local seed to 120 Books with three copies each. The approved persistence shape remains `books/{isbn}` and top-level `bookCopies/{copyId}`. Catalog specification v0.2 and its 100-Book page size remain in force. No data model, authorization policy, dependency, or configuration changed.

Changed files: `src/libconnect-mp4/scripts/seed-local-books.js`, `src/libconnect-mp4/test/seed-local-books.test.js`, and `src/libconnect-mp4/README.md`. The first 30 Books and their ISBNs remain stable. The script adds 90 unique synthetic Books, yielding 120 Books and 360 `AVAILABLE` copies on an empty emulator. It reads target references before a create-only batch, preserving existing documents and copy statuses.

Verification: focused CRA Jest suite passed 4/4; syntax and dry-run checks passed. A local execution created 90 new Books and 270 new copies. A read-only emulator check found 120 Books, 360 copies, and exactly three linked copies for every Book. A paged read returned 100 then 20 Books. A rerun created zero documents. An independent reviewer passed the code and focused checks without blocking findings. Exact commands and results are in `logs/tasks/member-catalog-search/seed-120.md`.

Limitations: the seed preserves unrelated records and existing target documents rather than replacing them. The reviewer did not access the emulator; the orchestrator separately verified its contents. No cloud access, commit, merge, or deployment occurred.
