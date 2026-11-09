// Firebase Admin uses @google-cloud/firestore for its Timestamp values.
const { Timestamp } = require('@google-cloud/firestore');

function createFirestoreTicketStore(db, { timestampNow = () => Timestamp.now() } = {}) {
  if (!db || typeof db.collection !== 'function') throw new TypeError('A Firestore database is required.');
  return {
    async create(studentId, input) {
      const ticketRef = db.collection('tickets').doc();
      const timestamp = timestampNow();
      const ticket = {
        ticketId: ticketRef.id,
        studentId,
        title: input.title,
        language: input.language,
        conceptTags: input.conceptTags,
        files: input.files,
        repoUrl: input.repoUrl,
        repoFilePaths: input.repoFilePaths,
        errorOutput: input.errorOutput,
        expectedBehaviour: input.expectedBehaviour,
        actualBehaviour: input.actualBehaviour,
        attempted: input.attempted,
        status: 'OPEN',
        claimedByTaId: null,
        fixNote: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        resolvedAt: null,
      };
      await ticketRef.create(ticket);
      return ticketRef.id;
    },
  };
}

module.exports = { createFirestoreTicketStore };
