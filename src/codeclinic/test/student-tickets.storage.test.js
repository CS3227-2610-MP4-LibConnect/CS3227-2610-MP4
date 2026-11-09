const { Timestamp } = require('@google-cloud/firestore');
const { createFirestoreTicketStore } = require('../server/tickets/store');

test('creates one C1 ticket document at the generated ticket path', async () => {
  const writes = [];
  const timestamp = Timestamp.fromMillis(1_800_000_000_000);
  const db = {
    collection(name) {
      return {
        doc(id) {
          const ticketId = id || 'generated-ticket-id';
          return {
            id: ticketId,
            async create(value) { writes.push({ path: `${name}/${ticketId}`, value }); },
          };
        },
      };
    },
  };
  const store = createFirestoreTicketStore(db, { timestampNow: () => timestamp });
  const ticketId = await store.create('student-1', {
    title: 'Loop question', language: 'TypeScript', conceptTags: [], files: [], repoUrl: null,
    repoFilePaths: [], errorOutput: null, expectedBehaviour: 'Expected', actualBehaviour: 'Actual', attempted: 'Tried',
  });

  expect(ticketId).toBe('generated-ticket-id');
  expect(writes).toHaveLength(1);
  expect(writes[0].path).toBe('tickets/generated-ticket-id');
  expect(writes[0].value).toMatchObject({
    ticketId, studentId: 'student-1', status: 'OPEN', claimedByTaId: null,
    fixNote: null, resolvedAt: null, conceptTags: [], files: [], repoUrl: null,
    repoFilePaths: [], errorOutput: null,
  });
  expect(writes[0].value.createdAt).toBe(timestamp);
  expect(writes[0].value.updatedAt).toBe(timestamp);
  expect(writes[0].value.createdAt).toBeInstanceOf(Timestamp);
  expect(Object.keys(writes[0].value).sort()).toEqual([
    'ticketId', 'studentId', 'title', 'language', 'conceptTags', 'files', 'repoUrl', 'repoFilePaths',
    'errorOutput', 'expectedBehaviour', 'actualBehaviour', 'attempted', 'status', 'claimedByTaId',
    'fixNote', 'createdAt', 'updatedAt', 'resolvedAt',
  ].sort());
});
