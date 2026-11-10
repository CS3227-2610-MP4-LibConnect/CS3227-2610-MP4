const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.setImmediate = require('timers').setImmediate;
global.clearImmediate = require('timers').clearImmediate;
const request = require('supertest');
const { createServerApp } = require('../server');
const { SESSION_COOKIE } = require('../server/auth/login');

const sha256 = (value) => crypto.createHash('sha256').update(value, 'utf8').digest('hex');
const expectFirestoreTimestamp = (value) => {
  expect(value).toEqual(expect.objectContaining({
    toDate: expect.any(Function), toMillis: expect.any(Function),
  }));
  expect(value.constructor.name).toBe('Timestamp');
};
const good = {
  title: 'Loop boundary question', language: 'TypeScript',
  expectedBehaviour: 'The final item should be processed.',
  actualBehaviour: 'The last item is skipped.', attempted: 'I checked the loop condition.',
};
const activeFixtures = [];
afterEach(() => {
  for (const system of activeFixtures.splice(0)) system.cleanup();
});

function fixture() {
  const records = new Map();
  const sessions = new Map();
  const build = fs.mkdtempSync(path.join(os.tmpdir(), 'codeclinic-student-tickets-'));
  let failWrite = false;
  const db = {
    collection(name) {
      return {
        doc(id = crypto.randomUUID()) {
          const key = `${name}/${id}`;
          return {
            id,
            path: key,
            collection(subcollection) {
              return db.collection(`${key}/${subcollection}`);
            },
            async get() {
              const value = records.get(key);
              return { exists: value !== undefined, id, data: () => value };
            },
            async create(value) {
              if (failWrite) throw new Error('synthetic storage failure');
              if (records.has(key)) throw Object.assign(new Error('already exists'), { code: 6 });
              records.set(key, value);
            },
            async set(value) {
              if (failWrite) throw new Error('synthetic storage failure');
              records.set(key, value);
            },
          };
        },
      };
    },
    async runTransaction(callback) {
      return callback({
        async get(ref) { return ref.get(); },
        create(ref, value) {
          if (failWrite) throw new Error('synthetic storage failure');
          records.set(ref.path, value);
        },
        set(ref, value) { records.set(ref.path, value); },
        update(ref, value) {
          if (failWrite) throw new Error('synthetic storage failure');
          records.set(ref.path, { ...(records.get(ref.path) || {}), ...value });
        },
        delete(ref) { records.delete(ref.path); },
      });
    },
  };
  const authStore = {
    async getSession(hash) { return sessions.get(hash) || null; },
    async touchSession() { return true; },
    async deleteSession(hash) { sessions.delete(hash); },
    async deleteSessionsForUser() { return 0; },
    async reserveRateSlot() { return true; },
    async releaseRateSlot() {},
    async createSession() {},
    async rotateCsrfToken() {},
    async deleteSessionIfCsrfMatches() { return false; },
  };
  const app = createServerApp(db, build, authStore, { async createAccount() {} });
  function actor(userId, accountType = 'STUDENT', accountStatus = 'ACTIVE') {
    records.set(`users/${userId}`, { userId, accountType, accountStatus });
    const rawId = crypto.randomBytes(32).toString('base64url');
    const csrf = `csrf-${userId}`;
    sessions.set(sha256(rawId), {
      userId, accountTypeAtIssue: accountType, csrfTokenHash: sha256(csrf),
    });
    return { cookie: `${SESSION_COOKIE}=${rawId}`, csrf };
  }
  const collectionEntries = (name) => [...records.entries()].filter(([key]) => key.startsWith(`${name}/`));
  const collection = (name) => collectionEntries(name).map(([, value]) => value);
  const system = {
    app, records, tickets: () => collection('tickets'), ticketEntries: () => collectionEntries('tickets'),
    notifications: () => collection('notifications'),
    actor, failWrite(value) { failWrite = value; }, cleanup() { fs.rmSync(build, { recursive: true, force: true }); },
    seedTicket(ticketId, studentId, status = 'OPEN') {
      const ticket = { ticketId, studentId, status, claimedByTaId: status === 'CLAIMED' ? 'ta-1' : null,
        fixNote: null, resolvedAt: null, updatedAt: require('@google-cloud/firestore').Timestamp.fromMillis(1000) };
      records.set(`tickets/${ticketId}`, ticket);
      return ticket;
    },
  };
  activeFixtures.push(system);
  return system;
}

describe('POST /api/tickets authentication and write boundary', () => {
  test('requires an authenticated active Student and CSRF token', async () => {
    const system = fixture();
    const visitor = await request(system.app).post('/api/tickets').send(good);
    const ta = system.actor('ta', 'TA');
    const taResponse = await request(system.app).post('/api/tickets').set('Cookie', ta.cookie).set('X-CSRF-Token', ta.csrf).send(good);
    const student = system.actor('student');
    const noCsrf = await request(system.app).post('/api/tickets').set('Cookie', student.cookie).send(good);
    const badCsrf = await request(system.app).post('/api/tickets').set('Cookie', student.cookie).set('X-CSRF-Token', 'wrong').send(good);
    expect(visitor.status).toBe(401);
    expect(taResponse.status).toBe(403);
    expect(noCsrf.status).toBe(403);
    expect(badCsrf.status).toBe(403);
    expect(system.tickets()).toHaveLength(0);
    system.cleanup();
  });

  test('rechecks active account and role from stored account data', async () => {
    const system = fixture();
    const inactive = system.actor('inactive');
    system.records.get('users/inactive').accountStatus = 'INACTIVE';
    const changedRole = system.actor('changed-role');
    system.records.get('users/changed-role').accountType = 'TA';
    for (const credentials of [inactive, changedRole]) {
      const response = await request(system.app).post('/api/tickets').set('Cookie', credentials.cookie)
        .set('X-CSRF-Token', credentials.csrf).send(good);
      expect(response.status).toBe(401);
    }
    expect(system.tickets()).toHaveLength(0);
    system.cleanup();
  });

  test('rejects forged server fields without creating a ticket', async () => {
    const system = fixture();
    const student = system.actor('verified-student');
    const response = await request(system.app).post('/api/tickets').set('Cookie', student.cookie)
      .set('X-CSRF-Token', student.csrf).send({
        ...good, studentId: 'attacker', ticketId: 'chosen-id', status: 'RESOLVED',
        claimedByTaId: 'ta', fixNote: 'forged', createdAt: '2000-01-01', updatedAt: '2000-01-01',
      });
    expect(response.status).toBe(400);
    expect(system.tickets()).toHaveLength(0);
    expect(system.notifications()).toHaveLength(0);
    expect(JSON.stringify(response.body)).not.toMatch(/verified-student|attacker|claimedByTaId|fixNote/i);
  });

  test('stores the complete C1 shape with Timestamp and specified empty values', async () => {
    const system = fixture();
    const student = system.actor('verified-student');
    const response = await request(system.app).post('/api/tickets').set('Cookie', student.cookie)
      .set('X-CSRF-Token', student.csrf).send(good);
    expect(response.status).toBe(201);
    expect(system.tickets()).toHaveLength(1);
    const ticket = system.tickets()[0];
    expect(system.ticketEntries()[0][0]).toBe(`tickets/${ticket.ticketId}`);
    expect(Object.keys(ticket).sort()).toEqual([
      'ticketId', 'studentId', 'title', 'language', 'conceptTags', 'files', 'repoUrl', 'repoFilePaths',
      'errorOutput', 'expectedBehaviour', 'actualBehaviour', 'attempted', 'status', 'claimedByTaId',
      'fixNote', 'createdAt', 'updatedAt', 'resolvedAt',
    ].sort());
    expect(ticket).toMatchObject({
      studentId: 'verified-student', title: good.title, language: 'TypeScript',
      expectedBehaviour: good.expectedBehaviour, actualBehaviour: good.actualBehaviour, attempted: good.attempted,
      conceptTags: [], files: [], repoUrl: null, repoFilePaths: [], errorOutput: null,
      status: 'OPEN', claimedByTaId: null, fixNote: null, resolvedAt: null,
    });
    expect(ticket.ticketId).toBe(response.body.ticketId);
    expectFirestoreTimestamp(ticket.createdAt);
    expectFirestoreTimestamp(ticket.updatedAt);
  });

  test('stores trimmed lowercase concept tags and rejects duplicates after normalization', async () => {
    const system = fixture();
    const student = system.actor('student');
    const accepted = await request(system.app).post('/api/tickets').set('Cookie', student.cookie)
      .set('X-CSRF-Token', student.csrf)
      .send({ ...good, conceptTags: ['  Loops ', 'ARRAYS', 'TypeScript', 'other', '  FUNCTION '] });
    expect(accepted.status).toBe(201);
    expect(system.tickets()[0].conceptTags).toEqual(['loops', 'arrays', 'typescript', 'other', 'function']);

    const duplicate = await request(system.app).post('/api/tickets').set('Cookie', student.cookie)
      .set('X-CSRF-Token', student.csrf).send({ ...good, conceptTags: [' Loop ', 'loop'] });
    expect(duplicate.status).toBe(400);
    expect(system.tickets()).toHaveLength(1);
  });

  test.each([
    ['missing title', { ...good, title: undefined }],
    ['whitespace expected behaviour', { ...good, expectedBehaviour: '  ' }],
    ['whitespace actual behaviour', { ...good, actualBehaviour: '  ' }],
    ['whitespace attempted work', { ...good, attempted: '  ' }],
    ['whitespace title', { ...good, title: '  ' }],
    ['wrong type', { ...good, language: 3 }],
    ['unknown property', { ...good, admin: true }],
    ['client role', { ...good, role: 'TA' }],
    ['client account type', { ...good, accountType: 'TA' }],
    ['custom language', { ...good, language: 'Rust' }],
    ['title over 255 characters', { ...good, title: 'x'.repeat(256) }],
    ['expected behaviour over 5000 characters', { ...good, expectedBehaviour: 'x'.repeat(5001) }],
    ['actual behaviour over 5000 characters', { ...good, actualBehaviour: 'x'.repeat(5001) }],
    ['attempted work over 5000 characters', { ...good, attempted: 'x'.repeat(5001) }],
    ['error output over 5000 characters', { ...good, errorOutput: 'x'.repeat(5001) }],
    ['tag over 30 normalized characters', { ...good, conceptTags: ['x'.repeat(31)] }],
    ['too many tags', { ...good, conceptTags: Array.from({ length: 6 }, (_, i) => `tag${i}`) }],
    ['blank normalized tag', { ...good, conceptTags: ['  '] }],
    ['too many files', { ...good, files: Array.from({ length: 4 }, (_, i) => ({ filename: `f${i}.ts`, content: 'x' })) }],
    ['path filename', { ...good, files: [{ filename: '../secret.ts', content: 'x' }] }],
    ['filename over 120 Unicode characters', { ...good, files: [{ filename: '😀'.repeat(121), content: 'x' }] }],
    ['file content over 24 KiB in UTF-8 bytes', { ...good, files: [{ filename: 'main.ts', content: 'é'.repeat(12_289) }] }],
    ['repository with query', { ...good, repoUrl: 'https://github.com/example/project?token=x', repoFilePaths: ['src/a.ts'] }],
    ['repository with empty query marker', { ...good, repoUrl: 'https://github.com/example/project?', repoFilePaths: ['src/a.ts'] }],
    ['repository with empty fragment marker', { ...good, repoUrl: 'https://github.com/example/project#', repoFilePaths: ['src/a.ts'] }],
    ['repository with empty credentials marker', { ...good, repoUrl: 'https://@github.com/example/project', repoFilePaths: ['src/a.ts'] }],
    ['repository URL over 255 characters', { ...good, repoUrl: `https://github.com/example/${'x'.repeat(230)}`, repoFilePaths: ['src/a.ts'] }],
    ['repository URL over 255 Unicode characters', { ...good, repoUrl: `https://github.com/example/${'😀'.repeat(256 - 'https://github.com/example/'.length)}`, repoFilePaths: ['src/a.ts'] }],
    ['repository path traversal', { ...good, repoUrl: 'https://github.com/example/project', repoFilePaths: ['src/../secret.ts'] }],
    ['repository paths over aggregate 5000 characters', { ...good, repoUrl: 'https://github.com/example/project', repoFilePaths: Array(10).fill('a'.repeat(501)) }],
    ['repository paths over aggregate 5000 Unicode characters', { ...good, repoUrl: 'https://github.com/example/project', repoFilePaths: ['😀'.repeat(5001)] }],
    ['two source methods', { ...good, files: [{ filename: 'main.ts', content: 'x' }], repoUrl: 'https://github.com/example/project', repoFilePaths: ['main.ts'] }],
    ['paths without repository', { ...good, repoFilePaths: ['main.ts'] }],
  ])('rejects %s without writing', async (_label, body) => {
    const system = fixture();
    const student = system.actor('student');
    const response = await request(system.app).post('/api/tickets').set('Cookie', student.cookie)
      .set('X-CSRF-Token', student.csrf).send(body);
    expect(response.status).toBe(400);
    expect(system.tickets()).toHaveLength(0);
    system.cleanup();
  });

  test('accepts revised maximum text lengths', async () => {
    const system = fixture();
    const student = system.actor('student');
    const body = {
      title: 't'.repeat(255), language: 'Other', expectedBehaviour: 'e'.repeat(5000),
      actualBehaviour: 'a'.repeat(5000), attempted: 'w'.repeat(5000), errorOutput: 'o'.repeat(5000),
    };
    const response = await request(system.app).post('/api/tickets').set('Cookie', student.cookie)
      .set('X-CSRF-Token', student.csrf).send(body);
    expect(response.status).toBe(201);
    expect(system.tickets()[0]).toMatchObject(body);
  });

  test('accepts supplementary Unicode at filename, repository URL, and path character limits', async () => {
    const system = fixture();
    const student = system.actor('student');
    const filename = '😀'.repeat(120);
    const fileResponse = await request(system.app).post('/api/tickets').set('Cookie', student.cookie)
      .set('X-CSRF-Token', student.csrf).send({ ...good, files: [{ filename, content: 'x' }] });
    expect(fileResponse.status).toBe(201);
    expect(system.tickets()[0].files[0].filename).toBe(filename);

    const repoUrl = `https://github.com/example/${'😀'.repeat(255 - 'https://github.com/example/'.length)}`;
    const repoFilePaths = ['😀'.repeat(5000)];
    const repoResponse = await request(system.app).post('/api/tickets').set('Cookie', student.cookie)
      .set('X-CSRF-Token', student.csrf).send({ ...good, repoUrl, repoFilePaths });
    expect(repoResponse.status).toBe(201);
    expect(system.tickets()[1].repoUrl).toBe(repoUrl);
    expect(system.tickets()[1].repoFilePaths).toEqual(repoFilePaths);
  });

  test('rejects malformed JSON and request bodies over 128 KiB', async () => {
    const system = fixture();
    const student = system.actor('student');
    const malformed = await request(system.app).post('/api/tickets').set('Cookie', student.cookie)
      .set('X-CSRF-Token', student.csrf).set('Content-Type', 'application/json').send('{');
    const oversized = await request(system.app).post('/api/tickets').set('Cookie', student.cookie)
      .set('X-CSRF-Token', student.csrf).set('Content-Type', 'application/json')
      .send(JSON.stringify({ ...good, files: [{ filename: 'large.txt', content: 'x'.repeat(132_000) }] }));
    expect(malformed.status).toBe(400);
    expect(oversized.status).toBe(413);
    expect(system.tickets()).toHaveLength(0);
  });

  test('accepts UTF-8 code files up to the approved 24 KiB per-file limit', async () => {
    const system = fixture();
    const student = system.actor('student');
    const response = await request(system.app).post('/api/tickets').set('Cookie', student.cookie)
      .set('X-CSRF-Token', student.csrf).send({ ...good, files: [{ filename: 'main.txt', content: 'x'.repeat(24 * 1024) }] });
    expect(response.status).toBe(201);
    expect(system.tickets()[0].files[0].content).toHaveLength(24 * 1024);
  });

  test('accepts reference-only GitHub context and literal HTML-like text', async () => {
    const system = fixture();
    const student = system.actor('student');
    const body = { ...good, title: '<script>literal</script>', conceptTags: ['loops', 'arrays'],
      repoUrl: 'https://github.com/example/project', repoFilePaths: ['src/main.ts'] };
    const response = await request(system.app).post('/api/tickets').set('Cookie', student.cookie)
      .set('X-CSRF-Token', student.csrf).send(body);
    expect(response.status).toBe(201);
    expect(system.tickets()[0].title).toBe(body.title);
    expect(system.tickets()[0].repoUrl).toBe(body.repoUrl);
    expect(system.tickets()[0].repoFilePaths).toEqual(body.repoFilePaths);
    system.cleanup();
  });

  test('returns safe retry response on storage failure without a write', async () => {
    const system = fixture();
    const student = system.actor('student');
    system.failWrite(true);
    const response = await request(system.app).post('/api/tickets').set('Cookie', student.cookie)
      .set('X-CSRF-Token', student.csrf).send(good);
    expect(response.status).toBe(503);
    expect(JSON.stringify(response.body)).not.toMatch(/synthetic|Loop boundary|student/i);
    expect(system.tickets()).toHaveLength(0);
    system.cleanup();
  });
});

describe('GET /api/tickets/:ticketId bounded detail input', () => {
  test('rejects an encoded slash in the ticket ID as a safe 400', async () => {
    const system = fixture();
    const student = system.actor('student');
    const response = await request(system.app).get('/api/tickets/a%2Fb').set('Cookie', student.cookie);
    expect(response.status).toBe(400);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(JSON.stringify(response.body)).not.toMatch(/stack|firestore|student/i);
    system.cleanup();
  });

  test('rejects malformed cursors as a safe 400', async () => {
    const system = fixture();
    const student = system.actor('student');
    const response = await request(system.app).get('/api/tickets/valid-ticket?cursor=not-a-valid-cursor').set('Cookie', student.cookie);
    expect(response.status).toBe(400);
    expect(response.headers['cache-control']).toBe('no-store');
    system.cleanup();
  });
});

describe('POST /api/tickets/:ticketId/replies and /close', () => {
  test.each(['OPEN', 'CLAIMED'])('stores an owned reply on an active %s ticket and advances its timestamp', async (status) => {
    const system = fixture();
    const student = system.actor('verified-student');
    system.seedTicket('active-ticket', 'verified-student', status);
    const response = await request(system.app).post('/api/tickets/active-ticket/replies').set('Cookie', student.cookie)
      .set('X-CSRF-Token', student.csrf).send({ message: '  Keep  internal spacing.  ' });
    const ticket = system.records.get('tickets/active-ticket');
    const replies = [...system.records.entries()].filter(([key]) => key.startsWith('tickets/active-ticket/replies/'));
    expect(response.status).toBe(201);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.reply).toMatchObject({ author: { name: 'Student', role: 'STUDENT' }, message: 'Keep  internal spacing.' });
    expect(replies).toHaveLength(1);
    expect(replies[0][1]).toMatchObject({ replyId: response.body.reply.replyId, ticketId: 'active-ticket',
      authorUserId: 'verified-student', message: 'Keep  internal spacing.' });
    expectFirestoreTimestamp(replies[0][1].createdAt);
    expectFirestoreTimestamp(ticket.updatedAt);
    expect(ticket.status).toBe(status);
    system.cleanup();
  });

  test('denies visitor, TA, missing CSRF, and a different ticket owner before writes', async () => {
    const system = fixture();
    system.seedTicket('other-ticket', 'student-1');
    const otherStudent = system.actor('student-2');
    const ta = system.actor('ta', 'TA');
    const visitor = await request(system.app).post('/api/tickets/other-ticket/replies').send({ message: 'hello' });
    const deniedTa = await request(system.app).post('/api/tickets/other-ticket/replies').set('Cookie', ta.cookie)
      .set('X-CSRF-Token', ta.csrf).send({ message: 'hello' });
    const noCsrf = await request(system.app).post('/api/tickets/other-ticket/close').set('Cookie', otherStudent.cookie).send({});
    const crossOwner = await request(system.app).post('/api/tickets/other-ticket/replies').set('Cookie', otherStudent.cookie)
      .set('X-CSRF-Token', otherStudent.csrf).send({ message: 'hello' });
    expect([visitor.status, deniedTa.status, noCsrf.status, crossOwner.status]).toEqual([401, 403, 403, 404]);
    expect([...system.records.keys()].filter((key) => key.startsWith('tickets/other-ticket/replies/'))).toHaveLength(0);
    expect(system.records.get('tickets/other-ticket').status).toBe('OPEN');
    system.cleanup();
  });

  test.each([
    ['blank', { message: '  \n ' }],
    ['oversized', { message: 'x'.repeat(5001) }],
    ['forged author', { message: 'hello', authorUserId: 'attacker' }],
    ['forged status', { message: 'hello', status: 'RESOLVED' }],
    ['wrong message type', { message: ['hello'] }],
  ])('rejects %s reply bodies without writes', async (_label, body) => {
    const system = fixture();
    const student = system.actor('student');
    system.seedTicket('active-ticket', 'student');
    const response = await request(system.app).post('/api/tickets/active-ticket/replies').set('Cookie', student.cookie)
      .set('X-CSRF-Token', student.csrf).send(body);
    expect(response.status).toBe(400);
    expect([...system.records.keys()].filter((key) => key.startsWith('tickets/active-ticket/replies/'))).toHaveLength(0);
    expect(system.records.get('tickets/active-ticket').updatedAt.toMillis()).toBe(1000);
    system.cleanup();
  });

  test.each(['replies', 'close'])('returns no-store parser errors for malformed and oversized %s requests', async (action) => {
    const system = fixture();
    const student = system.actor('student');
    system.seedTicket('active-ticket', 'student');
    const path = `/api/tickets/active-ticket/${action}`;
    const malformed = await request(system.app).post(path).set('Cookie', student.cookie)
      .set('X-CSRF-Token', student.csrf).set('Content-Type', 'application/json').send('{');
    const oversized = await request(system.app).post(path).set('Cookie', student.cookie)
      .set('X-CSRF-Token', student.csrf).set('Content-Type', 'application/json').send(JSON.stringify({ message: 'x'.repeat(132_000) }));
    expect(malformed.status).toBe(400);
    expect(oversized.status).toBe(413);
    expect(malformed.headers['cache-control']).toBe('no-store');
    expect(oversized.headers['cache-control']).toBe('no-store');
    expect([...system.records.keys()].filter((key) => key.startsWith('tickets/active-ticket/replies/'))).toHaveLength(0);
    expect(system.records.get('tickets/active-ticket').status).toBe('OPEN');
    system.cleanup();
  });

  test.each(['OPEN', 'CLAIMED'])('closes an owned %s ticket without a resolution', async (status) => {
    const system = fixture();
    const student = system.actor('student');
    system.seedTicket('active-ticket', 'student', status);
    const response = await request(system.app).post('/api/tickets/active-ticket/close').set('Cookie', student.cookie)
      .set('X-CSRF-Token', student.csrf).send({});
    expect(response.status).toBe(200);
    expect(system.records.get('tickets/active-ticket')).toMatchObject({ status: 'CLOSED', claimedByTaId: null, fixNote: null, resolvedAt: null });
    expectFirestoreTimestamp(system.records.get('tickets/active-ticket').updatedAt);
    system.cleanup();
  });

  test('rejects forged close fields and returns safe storage failure without changing state', async () => {
    const system = fixture();
    const student = system.actor('student');
    const ticket = system.seedTicket('active-ticket', 'student', 'CLAIMED');
    const forged = await request(system.app).post('/api/tickets/active-ticket/close').set('Cookie', student.cookie)
      .set('X-CSRF-Token', student.csrf).send({ studentId: 'attacker', status: 'CLOSED' });
    expect(forged.status).toBe(400);
    expect(system.records.get('tickets/active-ticket')).toEqual(ticket);
    system.failWrite(true);
    const failed = await request(system.app).post('/api/tickets/active-ticket/close').set('Cookie', student.cookie)
      .set('X-CSRF-Token', student.csrf).send({});
    expect(failed.status).toBe(503);
    expect(JSON.stringify(failed.body)).not.toMatch(/synthetic|student/i);
    expect(system.records.get('tickets/active-ticket')).toEqual(ticket);
    system.cleanup();
  });

  test.each(['CLOSED', 'RESOLVED'])('does not overwrite terminal %s state on reply or repeated close', async (status) => {
    const system = fixture();
    const student = system.actor('student');
    const ticket = system.seedTicket('terminal-ticket', 'student', status);
    const reply = await request(system.app).post('/api/tickets/terminal-ticket/replies').set('Cookie', student.cookie)
      .set('X-CSRF-Token', student.csrf).send({ message: 'hello' });
    const close = await request(system.app).post('/api/tickets/terminal-ticket/close').set('Cookie', student.cookie)
      .set('X-CSRF-Token', student.csrf).send({});
    expect(reply.status).toBe(409);
    expect(close.status).toBe(409);
    expect(system.records.get('tickets/terminal-ticket').status).toBe(status);
    expect(system.records.get('tickets/terminal-ticket').updatedAt).toBe(ticket.updatedAt);
    expect([...system.records.keys()].filter((key) => key.startsWith('tickets/terminal-ticket/replies/'))).toHaveLength(0);
    system.cleanup();
  });

  test('returns safe 503 without claiming success when the transaction fails', async () => {
    const system = fixture();
    const student = system.actor('student');
    system.seedTicket('active-ticket', 'student');
    system.failWrite(true);
    const response = await request(system.app).post('/api/tickets/active-ticket/replies').set('Cookie', student.cookie)
      .set('X-CSRF-Token', student.csrf).send({ message: 'hello' });
    expect(response.status).toBe(503);
    expect(JSON.stringify(response.body)).not.toMatch(/synthetic|hello|student/i);
    expect([...system.records.keys()].filter((key) => key.startsWith('tickets/active-ticket/replies/'))).toHaveLength(0);
    system.cleanup();
  });
});
