# Local Book seed extension — 2026-11-08

Human instruction: change the local Firestore seed from 10 Books with 3 copies each to 30 Books with 3 copies each. The previously approved persistence shape remains `books/{isbn}` and top-level `bookCopies/{copyId}` with `copyId`, `isbn`, `shelfLocation`, and `status`. No product or authorization model changed. Catalog specification v0.2 is current; the catalog API's 100-Book page size remains unchanged.

Changed files: `src/libconnect-mp4/scripts/seed-local-books.js`, `src/libconnect-mp4/test/seed-local-books.test.js`, and `src/libconnect-mp4/README.md`. The script now defines 30 deterministic ISBN-13 Books and 90 copies. It reads the 120 target references from the pinned local emulator, skips existing IDs without modifying them, and atomically creates only missing IDs. On a fully seeded emulator, it performs no write batch.

Verification: focused CRA Jest suite passed 4/4; `node scripts/seed-local-books.js --dry-run` reported the 30/90 target; `node --check` passed. A local execution created 20 new Books and 60 new copies while preserving the original ten and their copies. A read-only emulator check verified 30 Book documents and exactly three linked copies per Book (90 total). The independent reviewer passed 4/4 focused tests and reported no blocking findings. Exact command outcomes are in `logs/tasks/member-catalog-search/seed-30.md`.

Limitations: the seed does not delete unrelated records or overwrite existing target IDs; existing copy statuses remain as they were. Thirty Book records are below the catalog's 100-Book page size, so this data set does not expose the `Load more books` button. No cloud access, commit, merge, or deployment occurred.
