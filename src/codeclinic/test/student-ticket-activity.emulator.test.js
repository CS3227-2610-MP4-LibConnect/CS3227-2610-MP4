/** @jest-environment node */
const { spawnSync } = require('child_process');
const path = require('path');

const emulatorTest = process.env.RUN_FIRESTORE_EMULATOR_TESTS === '1' ? test : test.skip;

emulatorTest('student ticket activity query, ownership, paging, writes, and close race work in Firestore emulator', () => {
  expect(process.env.FIRESTORE_EMULATOR_HOST).toBe('127.0.0.1:8080');
  expect(process.env.CODECLINIC_FIRESTORE_MODE).toBe('local-emulator');
  expect(process.env.CODECLINIC_FIRESTORE_PROJECT_ID).toBe('demo-codeclinic');
  const script = String.raw`
    const assert = require('node:assert/strict');
    const crypto = require('node:crypto');
    const request = require('supertest');
    const { createServerApp } = require('./server');
    const { createFirestoreTicketStore } = require('./server/tickets/store');
    const { resolveFirestoreTarget, connectFirestoreTarget } = require('./server/firestore-target');
    const { SESSION_COOKIE } = require('./server/auth/login');
    const { Timestamp } = require('@google-cloud/firestore');
    const sha256 = (value) => crypto.createHash('sha256').update(value, 'utf8').digest('hex');
    let step = 'connect';
    (async () => {
      const db = await connectFirestoreTarget(resolveFirestoreTarget(process.env));
      const suffix = crypto.randomUUID().replace(/-/g, '');
      const studentId = 'student-' + suffix;
      const otherStudentId = 'other-student-' + suffix;
      const taId = 'ta-' + suffix;
      const rawCookie = crypto.randomBytes(36).toString('base64url');
      const otherRawCookie = crypto.randomBytes(36).toString('base64url');
      const sessionHashes = [sha256(rawCookie), sha256(otherRawCookie)];
      const ticketIds = Array.from({ length: 9 }, (_, index) => 'activity-' + suffix + '-' + String(index).padStart(2, '0'));
      const replyTicketId = ticketIds[0];
      const racingTicketId = ticketIds[2];
      const fixedTime = Timestamp.fromMillis(Date.now() - 60000);
      const app = createServerApp(db);
      const store = createFirestoreTicketStore(db);
      const cleanup = async () => {
        for (const id of ticketIds) {
          const replies = await db.collection('tickets').doc(id).collection('replies').get();
          for (const reply of replies.docs) await reply.ref.delete();
          await db.collection('tickets').doc(id).delete();
        }
        for (const id of [studentId, otherStudentId, taId]) await db.collection('users').doc(id).delete();
        for (const id of sessionHashes) await db.collection('loginSessions').doc(id).delete();
      };
      try {
        step = 'seed synthetic accounts and sessions';
        const now = Date.now();
        for (const [id, accountType, name] of [[studentId, 'STUDENT', 'Synthetic Student'], [otherStudentId, 'STUDENT', 'Other Synthetic Student'], [taId, 'TA', 'Synthetic TA']]) {
          await db.collection('users').doc(id).set({ userId: id, name, accountType, accountStatus: 'ACTIVE', mustChangePassword: false });
        }
        for (const [index, userId] of [studentId, otherStudentId].entries()) {
          const rawId = index === 0 ? rawCookie : otherRawCookie;
          await db.collection('loginSessions').doc(sessionHashes[index]).set({
            userId, accountTypeAtIssue: 'STUDENT', issuedAt: new Date(now), lastSeenAt: new Date(now),
            expiresAt: new Date(now + 60 * 60 * 1000), csrfTokenHash: sha256('initial-csrf'),
          });
        }
        const studentCookie = SESSION_COOKIE + '=' + rawCookie;
        const otherCookie = SESSION_COOKIE + '=' + otherRawCookie;
        step = 'seed indexed ticket query and stable reply ties';
        for (let index = 0; index < 6; index += 1) {
          const id = ticketIds[index];
          await db.collection('tickets').doc(id).set({
            ticketId: id, studentId, title: 'Synthetic active ' + index, language: 'TypeScript', conceptTags: [],
            status: index === 5 ? 'CLAIMED' : 'OPEN', updatedAt: fixedTime, createdAt: fixedTime,
            expectedBehaviour: 'Expected', actualBehaviour: 'Actual', attempted: 'Tried', errorOutput: null,
            files: [], repoUrl: null, repoFilePaths: [], claimedByTaId: index === 5 ? taId : null,
            fixNote: null, resolvedAt: null,
          });
        }
        await db.collection('tickets').doc(ticketIds[6]).set({ ticketId: ticketIds[6], studentId, status: 'CLOSED', updatedAt: fixedTime });
        await db.collection('tickets').doc(ticketIds[7]).set({ ticketId: ticketIds[7], studentId, status: 'RESOLVED', updatedAt: fixedTime });
        await db.collection('tickets').doc(ticketIds[8]).set({ ticketId: ticketIds[8], studentId: otherStudentId, status: 'OPEN', updatedAt: fixedTime });
        for (let index = 0; index < 51; index += 1) {
          const replyId = 'reply-' + String(index).padStart(3, '0');
          await db.collection('tickets').doc(replyTicketId).collection('replies').doc(replyId).set({
            replyId, ticketId: replyTicketId, authorUserId: studentId,
            message: 'synthetic reply ' + index, createdAt: fixedTime,
          });
        }
        const active = await request(app).get('/api/tickets/active').set('Cookie', studentCookie);
        assert.equal(active.status, 200);
        assert.match(active.headers['cache-control'] || '', /no-store/);
        assert.deepEqual(active.body.tickets.map((ticket) => ticket.ticketId), ticketIds.slice(0, 5));
        assert.equal(active.body.tickets.length, 5);
        const ownDetail = await request(app).get('/api/tickets/' + replyTicketId).set('Cookie', studentCookie);
        assert.equal(ownDetail.status, 200);
        assert.equal(ownDetail.body.replies.length, 50);
        assert.deepEqual(ownDetail.body.replies.map((reply) => reply.replyId), Array.from({ length: 50 }, (_, i) => 'reply-' + String(i).padStart(3, '0')));
        assert.equal(typeof ownDetail.body.nextCursor, 'string');
        const nextPage = await request(app).get('/api/tickets/' + replyTicketId + '?cursor=' + encodeURIComponent(ownDetail.body.nextCursor)).set('Cookie', studentCookie);
        assert.equal(nextPage.status, 200);
        assert.deepEqual(nextPage.body.replies.map((reply) => reply.replyId), ['reply-050']);
        assert.equal(nextPage.body.nextCursor, undefined);
        const hidden = await request(app).get('/api/tickets/' + replyTicketId).set('Cookie', otherCookie);
        assert.equal(hidden.status, 404);
        assert.equal(hidden.body.ticket, undefined);
        const otherActive = await request(app).get('/api/tickets/active').set('Cookie', otherCookie);
        assert.equal(otherActive.status, 200);
        assert.deepEqual(otherActive.body.tickets.map((ticket) => ticket.ticketId), [ticketIds[8]]);

        step = 'reply write and dashboard refresh';
        const csrf = await request(app).get('/api/auth/csrf').set('Cookie', studentCookie);
        assert.equal(csrf.status, 200);
        const submitted = await request(app).post('/api/tickets/' + replyTicketId + '/replies').set('Cookie', studentCookie)
          .set('X-CSRF-Token', csrf.body.csrfToken).send({ message: '  synthetic new reply  ' });
        assert.equal(submitted.status, 201);
        const created = await db.collection('tickets').doc(replyTicketId).collection('replies').doc(submitted.body.reply.replyId).get();
        assert.equal(created.data().authorUserId, studentId);
        assert.equal(created.data().message, 'synthetic new reply');
        assert.equal(created.data().createdAt.constructor.name, 'Timestamp');
        const refreshed = await request(app).get('/api/tickets/active').set('Cookie', studentCookie);
        assert.equal(refreshed.status, 200);
        assert.equal(refreshed.body.tickets[0].ticketId, replyTicketId);

        step = 'close semantics and concurrent close conflict';
        const secondTicket = ticketIds[1];
        const close = await request(app).post('/api/tickets/' + secondTicket + '/close').set('Cookie', studentCookie)
          .set('X-CSRF-Token', csrf.body.csrfToken).send({});
        assert.equal(close.status, 200);
        const closed = await db.collection('tickets').doc(secondTicket).get();
        assert.equal(closed.data().status, 'CLOSED');
        assert.equal(closed.data().claimedByTaId, null);
        assert.equal(closed.data().fixNote, null);
        assert.equal(closed.data().resolvedAt, null);
        const races = await Promise.all([store.close(studentId, racingTicketId), store.close(studentId, racingTicketId)]);
        assert.equal(races.filter((result) => result.kind === 'OK').length, 1);
        assert.equal(races.filter((result) => result.kind === 'CONFLICT').length, 1);
        const raced = await db.collection('tickets').doc(racingTicketId).get();
        assert.equal(raced.data().status, 'CLOSED');
      } finally {
        await cleanup();
        await db.terminate();
      }
    })().catch((error) => {
      process.stderr.write('Student ticket emulator integration failed at ' + step + ': ' + (error.code || error.name) +
        (typeof error.actual === 'number' ? ' actual=' + error.actual : '') + (typeof error.expected === 'number' ? ' expected=' + error.expected : '') + '\n');
      process.exitCode = 1;
    });
  `;
  const result = spawnSync(process.execPath, ['-e', script], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, GOOGLE_APPLICATION_CREDENTIALS: path.join(__dirname, 'synthetic-missing-adc.json') },
    encoding: 'utf8', timeout: 120000,
  });
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(0);
}, 130000);
