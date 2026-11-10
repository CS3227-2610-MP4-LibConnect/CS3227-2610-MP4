// Firebase Admin uses @google-cloud/firestore for its Timestamp values.
const { Timestamp } = require('@google-cloud/firestore');
const REPLY_PAGE_SIZE = 50;

function createFirestoreTicketStore(db, { timestampNow = () => Timestamp.now() } = {}) {
  if (!db || typeof db.collection !== 'function') throw new TypeError('A Firestore database is required.');
  async function ownedActiveTransaction(studentId, ticketId, write) {
    const ticketRef = db.collection('tickets').doc(ticketId);
    return db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ticketRef);
      if (!snapshot.exists) return { kind: 'NOT_FOUND' };
      const current = snapshot.data();
      if (!current || current.studentId !== studentId) return { kind: 'NOT_FOUND' };
      if (current.status !== 'OPEN' && current.status !== 'CLAIMED') return { kind: 'CONFLICT' };
      return write(transaction, ticketRef, current);
    });
  }
  return {
    async getOwned(studentId, ticketId, { cursor } = {}) {
      const ticketRef = db.collection('tickets').doc(ticketId);
      const ticketSnapshot = await ticketRef.get();
      if (!ticketSnapshot.exists) return null;
      const stored = ticketSnapshot.data();
      if (!stored || stored.studentId !== studentId) return null;
      const ticket = {
        ticketId: ticketSnapshot.id,
        title: stored.title,
        language: stored.language,
        conceptTags: stored.conceptTags,
        files: stored.files,
        repoUrl: stored.repoUrl,
        repoFilePaths: stored.repoFilePaths,
        errorOutput: stored.errorOutput,
        expectedBehaviour: stored.expectedBehaviour,
        actualBehaviour: stored.actualBehaviour,
        attempted: stored.attempted,
        status: stored.status,
        claimedByTaId: stored.claimedByTaId,
        fixNote: stored.fixNote,
        createdAt: stored.createdAt,
        updatedAt: stored.updatedAt,
        resolvedAt: stored.resolvedAt,
      };
      let repliesQuery = ticketRef.collection('replies')
        .orderBy('createdAt', 'asc')
        .orderBy('replyId', 'asc');
      if (cursor) repliesQuery = repliesQuery.startAfter(cursor.createdAt, cursor.replyId);
      const repliesSnapshot = await repliesQuery.limit(REPLY_PAGE_SIZE).get();
      const replies = repliesSnapshot.docs.map((doc) => {
        const reply = doc.data();
        return {
          replyId: reply.replyId || doc.id,
          authorUserId: reply.authorUserId,
          message: reply.message,
          createdAt: reply.createdAt,
        };
      });
      let hasMore = false;
      if (replies.length === REPLY_PAGE_SIZE) {
        const lastReply = replies[replies.length - 1];
        const nextSnapshot = await ticketRef.collection('replies')
          .orderBy('createdAt', 'asc')
          .orderBy('replyId', 'asc')
          .startAfter(lastReply.createdAt, lastReply.replyId)
          .limit(1)
          .get();
        hasMore = nextSnapshot.docs.length > 0;
      }
      const lastReply = replies[replies.length - 1];
      return { ticket, replies, hasMore, pageCursor: hasMore && lastReply
        ? { createdAt: lastReply.createdAt, replyId: lastReply.replyId }
        : null };
    },
    async listActive(studentId) {
      const snapshot = await db.collection('tickets')
        .where('studentId', '==', studentId)
        .where('status', 'in', ['OPEN', 'CLAIMED'])
        .orderBy('updatedAt', 'desc')
        .orderBy('ticketId', 'asc')
        .limit(5)
        .get();
      return snapshot.docs.map((doc) => {
        const ticket = doc.data();
        return {
          ticketId: ticket.ticketId,
          title: ticket.title,
          language: ticket.language,
          conceptTags: ticket.conceptTags,
          status: ticket.status,
          updatedAt: ticket.updatedAt,
        };
      });
    },
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
    async reply(studentId, ticketId, message) {
      const replyId = db.collection('tickets').doc(ticketId).collection('replies').doc().id;
      return ownedActiveTransaction(studentId, ticketId, (transaction, ticketRef) => {
        const createdAt = timestampNow();
        const updatedAt = createdAt;
        const replyRef = ticketRef.collection('replies').doc(replyId);
        transaction.create(replyRef, {
          replyId,
          ticketId,
          authorUserId: studentId,
          message,
          createdAt,
        });
        transaction.update(ticketRef, { updatedAt });
        return { kind: 'OK', replyId, createdAt, updatedAt };
      });
    },
    async close(studentId, ticketId) {
      return ownedActiveTransaction(studentId, ticketId, (transaction, ticketRef) => {
        const updatedAt = timestampNow();
        transaction.update(ticketRef, {
          status: 'CLOSED',
          claimedByTaId: null,
          fixNote: null,
          resolvedAt: null,
          updatedAt,
        });
        return { kind: 'OK', updatedAt };
      });
    },
  };
}

module.exports = { REPLY_PAGE_SIZE, createFirestoreTicketStore };
