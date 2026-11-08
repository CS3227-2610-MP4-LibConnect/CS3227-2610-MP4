import assert from 'node:assert/strict';

// Synthetic stand-in for ordered Firestore document-ID chunks. No Firestore access.
function scan(documents, predicate, pageSize = 100) {
  const sorted = [...documents].sort((a, b) => a.id.localeCompare(b.id));
  let after = null;
  let requests = 0;
  let reads = 0;
  let sawRaw = false;
  let sawValid = false;
  const found = [];
  while (true) {
    const chunk = sorted.filter((doc) => after === null || doc.id.localeCompare(after) > 0).slice(0, pageSize);
    requests++;
    reads += chunk.length;
    for (const doc of chunk) {
      sawRaw = true;
      if (!doc.valid) continue;
      sawValid = true;
      if (predicate(doc)) found.push(doc.id);
    }
    if (chunk.length < pageSize) break;
    after = chunk.at(-1).id;
  }
  return { requests, reads, sawRaw, sawValid, found };
}

for (const size of [0, 1, 100, 101, 1000]) {
  const documents = Array.from({ length: size }, (_, n) => ({
    id: String(n).padStart(4, '0'), valid: true, title: n === size - 1 ? 'tomcat' : 'other',
  }));
  const result = scan(documents, (doc) => doc.title.toLowerCase().includes('tom'));
  assert.equal(result.reads, size);
  assert.equal(result.requests, Math.floor(size / 100) + 1);
  assert.deepEqual(result.found, size ? [String(size - 1).padStart(4, '0')] : []);
  assert.equal(result.sawRaw, size > 0);
  assert.equal(result.sawValid, size > 0);
  console.log(`size=${size} reads=${result.reads} requests=${result.requests} matches=${result.found.length} raw=${result.sawRaw} valid=${result.sawValid}`);
}

const allInvalid = scan(Array.from({ length: 7 }, (_, n) => ({ id: String(n).padStart(4, '0'), valid: false })), () => true);
assert.deepEqual(allInvalid, { requests: 1, reads: 7, sawRaw: true, sawValid: false, found: [] });
console.log(`all-invalid reads=${allInvalid.reads} requests=${allInvalid.requests} matches=${allInvalid.found.length} raw=${allInvalid.sawRaw} valid=${allInvalid.sawValid}`);
