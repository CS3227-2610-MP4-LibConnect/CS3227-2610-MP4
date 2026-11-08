# T01 factual log addendum

The human named Firestore collection `books`, specified “No books found” for zero raw documents including a not-yet-created collection, and gave an expected maximum of 1,000 Book documents. The original report and independent review were read before this addendum. No cloud collection was queried.

`node .task-staging/member-catalog-search/scan-demo.mjs` exited 0 with exact output:

```text
size=0 reads=0 requests=1 matches=0 raw=false valid=false
size=1 reads=1 requests=1 matches=1 raw=true valid=true
size=100 reads=100 requests=2 matches=1 raw=true valid=true
size=101 reads=101 requests=2 matches=1 raw=true valid=true
size=1000 reads=1000 requests=11 matches=1 raw=true valid=true
all-invalid reads=7 requests=1 matches=0 raw=true valid=false
```

The script is a dependency-free synthetic ordered-chunk model, not a Firestore integration test. It was added only under `.task-staging/member-catalog-search/`; no production source, test runner, dependency, configuration, or Firestore data changed. It verifies scan arithmetic and zero-raw versus all-invalid classification under static synthetic input, not an actual production bound or existing stored field types.

Later human clarification: each `books` document ID is its ISBN; `isbn`, `title`, and `author` are required nonempty strings, and `publicationYear` is an integer. The revised read parser requires exact `doc.id === isbn` and rejects ISBNs with surrounding whitespace, with no storage change. The `firebase-firestore` skill was read locally; it requires instance-edition identification before new data-model/dependency/rules work. No external-service approval exists, so no Firestore CLI or cloud operation was run. Edition remains unverified.
