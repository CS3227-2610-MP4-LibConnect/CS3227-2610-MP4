# Local seed 120 execution log — 2026-11-08

- `CI=true npm test -- --watch=false --runInBand --runTestsByPath test/seed-local-books.test.js`: 1 suite passed, 4 tests passed. The test process also printed Node's unrelated `punycode` deprecation warning.
- `node scripts/seed-local-books.js --dry-run`: exit 0; reported 120 Books and 360 copies.
- `node --check scripts/seed-local-books.js`: exit 0.
- `node scripts/seed-local-books.js`: exit 0; created 90 Books and 270 copies, preserving existing IDs.
- Read-only local emulator check using the pinned `libconnect-mp4` target at `127.0.0.1:8080`: 120 Books, 360 BookCopies, exactly three linked copies per Book, and 100 then 20 Book documents in two ordered pages.
- `node scripts/seed-local-books.js` rerun: exit 0; created zero Books and zero copies.
- Independent reviewer: PASS; reran focused Jest 4/4, dry run, and syntax check; no blocking findings. Reviewer did not access the emulator.
- No cloud access, commit, merge, or deployment occurred.
