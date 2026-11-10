/**
 * Shared test harness for the ta-ticket-queue API tests (not a test file).
 *
 * Assumed production interfaces (see the coverage report, "Assumed interfaces"):
 *   require('../../server/tickets/store').createInMemoryTicketStore({ now, newId })
 *   require('../../server/tickets/ta-routes').createTaTicketsRouter(
 *     { authStore, accountStore, ticketStore, notify })   // mounted at /api/ta/tickets
 */
const crypto = require('crypto');
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.setImmediate = require('timers').setImmediate;
global.clearImmediate = require('timers').clearImmediate;
const express = require('express');
const { SESSION_COOKIE } = require('../../server/auth/login');

const sha256 = (value) => crypto.createHash('sha256').update(value, 'utf8').digest('hex');
const T0 = Date.UTC(2026, 10, 9, 9, 0, 0);

// Distinctive identifiers so a leak is detectable by substring search (scenario 10).
const IDS = Object.freeze({ student: 'user-stu-9f3', taA: 'user-ta-a-77c', taB: 'user-ta-b-31d', student2: 'user-stu-2e8' });
const EMAILS = Object.freeze({
  [IDS.student]: 'sam.student@example.edu', [IDS.taA]: 'alice.ta@example.edu',
  [IDS.taB]: 'bob.ta@example.edu', [IDS.student2]: 'dana.student@example.edu',
});
const NAMES = Object.freeze({
  [IDS.student]: 'Sam Student', [IDS.taA]: 'Alice TA', [IDS.taB]: 'Bob TA', [IDS.student2]: 'Dana Student',
});

function makeTicket(ticketId, overrides = {}) {
  return {
    ticketId,
    studentId: IDS.student,
    title: `Ticket ${ticketId}`,
    language: 'Python',
    conceptTags: ['loops'],
    files: [{ name: 'main.py', content: 'print("hi")' }],
    repoUrl: null,
    repoFilePaths: [],
    errorOutput: 'IndexError: list index out of range',
    expectedBehaviour: 'Print every item',
    actualBehaviour: 'Crashes on the last item',
    attempted: 'Changed the range bounds',
    status: 'OPEN',
    claimedByTaId: null,
    fixNote: null,
    createdAt: new Date(T0),
    updatedAt: new Date(T0),
    resolvedAt: null,
    ...overrides,
  };
}

function makeReply(replyId, ticketId, authorUserId, offsetSeconds, message = `Message ${replyId}`) {
  return { replyId, ticketId, authorUserId, message, createdAt: new Date(T0 + offsetSeconds * 1000) };
}

/**
 * @param {{ createStore: Function, createRouter: Function }} factories lazily required modules
 */
function makeSystem({ createInMemoryTicketStore, createTaTicketsRouter }) {
  const users = new Map();
  const sessions = new Map();
  let clock = T0 + 3600 * 1000;
  let replyCounter = 0;
  let storeError = null;
  let authError = null;

  const ticketStore = createInMemoryTicketStore({
    now: () => clock,
    newId: () => `reply-${++replyCounter}`,
  });
  // Wrapper lets tests inject storage failures without knowing the store internals.
  const wrapped = {};
  ['listTickets', 'getTicket', 'claimTicket', 'unclaimTicket', 'resolveTicket', 'addReply'].forEach((method) => {
    wrapped[method] = async (...args) => {
      if (storeError) throw storeError;
      return ticketStore[method](...args);
    };
  });

  const authStore = {
    async getSession(idHash) { if (authError) throw authError; return sessions.get(idHash) || null; },
    async touchSession(idHash) { return sessions.has(idHash); },
    async deleteSession(idHash) { sessions.delete(idHash); },
  };
  const accountStore = {
    async getAccount(userId) { if (authError) throw authError; return users.get(userId) || null; },
  };
  const notify = jest.fn(async () => ({ ok: true, notificationId: 'n-1' }));

  const app = express();
  app.use(express.json());
  app.use('/api/ta/tickets', createTaTicketsRouter({ authStore, accountStore, ticketStore: wrapped, notify }));

  function addUser(userId, accountType, extra = {}) {
    users.set(userId, {
      userId, accountType, accountStatus: 'ACTIVE', name: NAMES[userId] || userId,
      email: EMAILS[userId] || `${userId}@example.edu`, ...extra,
    });
    const rawId = crypto.randomBytes(32).toString('base64url');
    const csrf = crypto.randomBytes(32).toString('base64url');
    sessions.set(sha256(rawId), { userId, accountTypeAtIssue: accountType, csrfTokenHash: sha256(csrf) });
    return { cookie: `${SESSION_COOKIE}=${rawId}`, csrf, userId };
  }

  return {
    app, users, sessions, ticketStore, notify, addUser, IDS,
    setClock(ms) { clock = ms; },
    failStorage(error = new Error('synthetic storage failure')) { storeError = error; },
    failAuth(error = new Error('synthetic auth failure')) { authError = error; },
    clearFailures() { storeError = null; authError = null; },
    /** Standard cast: one student, two TAs, one second student. */
    standardCast() {
      return {
        student: addUser(IDS.student, 'STUDENT'),
        taA: addUser(IDS.taA, 'TA'),
        taB: addUser(IDS.taB, 'TA'),
        student2: addUser(IDS.student2, 'STUDENT'),
      };
    },
  };
}

const withAuth = (req, actor, { csrf = true } = {}) => {
  req.set('Cookie', actor.cookie);
  if (csrf) req.set('X-CSRF-Token', actor.csrf);
  return req;
};

/** Deep JSON snapshot of a ticket (with replies) to prove "no change". */
async function snapshot(store, ticketId) {
  return JSON.parse(JSON.stringify(await store.getTicket(ticketId)));
}

module.exports = { IDS, EMAILS, NAMES, T0, makeTicket, makeReply, makeSystem, withAuth, snapshot };
