# Local seed 30 execution log — 2026-11-08

- Before modification, read-only localhost emulator listing returned 10 `books` and 30 `bookCopies` documents.
- `CI=true npm test -- --watch=false --runInBand --runTestsByPath test/seed-local-books.test.js`: 1 suite passed, 4 tests passed.
- `node scripts/seed-local-books.js --dry-run`: initially reported the 30/90 target with existing IDs preserved; after the README wording correction, reports that new copies start `AVAILABLE` and existing IDs are preserved.
- `node --check scripts/seed-local-books.js`: exit 0.
- `node scripts/seed-local-books.js`: exit 0; created 20 Books and 60 copies, preserving existing IDs. The command emitted no credential deprecation warning.
- Read-only localhost emulator listing and link checks: 30 Books, 90 BookCopy documents, exactly three linked copies per Book.
- Separate reviewer inspected the exact updated script, tests, README and reran 4/4 focused tests: PASS, no blocking findings.
- The local target was `libconnect-mp4` at `127.0.0.1:8080`; no cloud access, commit, merge, or deployment occurred.
