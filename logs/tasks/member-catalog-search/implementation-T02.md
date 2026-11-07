# T02 factual execution log

- Read canonical spec v0.1, task copy v0.1, checklist/handoff v0.2, batch-2 manifest, T01 final design/review, login/session code, server entry, and relevant tests. Both spec copies had SHA-256 `AE609123AD4151616BADFEA10C1EE91B710E1C441E17D43FE77C8703D91A4842`.
- Implemented `server/catalog/adapter.js` and `test/member-catalog.adapter.test.js` in T02 scope.
- `node .deps-batch2/node_modules/react-scripts/scripts/test.js --watch=false --runInBand --runTestsByPath test/member-catalog.adapter.test.js` with `NODE_PATH=.deps-batch2/node_modules`, `CI=true`: exit 1 before Jest; CRA resolved from app-root `node_modules` and could not find `typescript`. No test assertion ran.
- `node .deps-batch2/node_modules/jest/bin/jest.js --config '{"testEnvironment":"node"}' --runInBand test/member-catalog.adapter.test.js` with the same `NODE_PATH`: exit 0, one suite, 5 tests passed. Jest reported a harmless haste naming collision between the app package and isolated `.deps-batch2/package.json`.
- Fixtures were synthetic. No Firebase CLI, cloud read, Book write, dependency/config edit, commit, or external action occurred.
