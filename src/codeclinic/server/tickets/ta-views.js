// Shared TA ticket R2 detail view (spec ta-ticket-queue v0.1, R2). Explicit allow-list.
function toIsoString(value) {
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString();
  if (typeof value === 'number') return new Date(value).toISOString();
  return null;
}

/** Shared rule (R1, R2): the viewer is the ticket's claimer, including on RESOLVED tickets. */
function isClaimedByViewer(ticket, viewerId) {
  return typeof ticket.claimedByTaId === 'string' && ticket.claimedByTaId === viewerId;
}

function toFileView(file) {
  return { name: file && file.name, content: file && file.content };
}

/** Builds a name/role lookup that reads each `users` record at most once per request. */
function createUserLookup(accountStore) {
  const cache = new Map();
  return async (userId) => {
    if (typeof userId !== 'string') return null;
    if (!cache.has(userId)) cache.set(userId, await accountStore.getAccount(userId));
    return cache.get(userId);
  };
}

async function toDetailView(ticket, viewerId, lookup) {
  const student = await lookup(ticket.studentId);
  const claimer = ticket.claimedByTaId ? await lookup(ticket.claimedByTaId) : null;
  const replies = [];
  for (const reply of Array.isArray(ticket.replies) ? ticket.replies : []) {
    const author = await lookup(reply.authorUserId);
    replies.push({
      replyId: reply.replyId,
      message: reply.message,
      createdAt: toIsoString(reply.createdAt),
      authorName: author && typeof author.name === 'string' ? author.name : 'Unknown user',
      authorRole: author && author.accountType === 'TA' ? 'TA' : 'STUDENT',
      isMine: reply.authorUserId === viewerId,
    });
  }
  return {
    ticketId: ticket.ticketId,
    title: ticket.title,
    language: ticket.language,
    conceptTags: Array.isArray(ticket.conceptTags) ? [...ticket.conceptTags] : [],
    files: Array.isArray(ticket.files) ? ticket.files.map(toFileView) : [],
    repoUrl: ticket.repoUrl === undefined ? null : ticket.repoUrl,
    repoFilePaths: Array.isArray(ticket.repoFilePaths) ? [...ticket.repoFilePaths] : [],
    errorOutput: ticket.errorOutput === undefined ? null : ticket.errorOutput,
    expectedBehaviour: ticket.expectedBehaviour,
    actualBehaviour: ticket.actualBehaviour,
    attempted: ticket.attempted,
    status: ticket.status,
    fixNote: ticket.fixNote === undefined ? null : ticket.fixNote,
    createdAt: toIsoString(ticket.createdAt),
    updatedAt: toIsoString(ticket.updatedAt),
    resolvedAt: toIsoString(ticket.resolvedAt),
    studentName: student && typeof student.name === 'string' ? student.name : null,
    claimedByMe: isClaimedByViewer(ticket, viewerId),
    claimedByName: claimer && typeof claimer.name === 'string' ? claimer.name : null,
    replies,
  };
}

module.exports = { isClaimedByViewer, toIsoString, createUserLookup, toDetailView };
