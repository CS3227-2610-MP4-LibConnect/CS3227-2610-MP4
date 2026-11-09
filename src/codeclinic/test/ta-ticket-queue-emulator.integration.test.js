/** @jest-environment node */
// T05 (spec C2, R1, R7; scenarios 1, 3, 8): runs only with RUN_FIRESTORE_EMULATOR_TESTS=1.
// Tickets are seeded straight into `tickets/{id}` per the C1 contract, so the test
// depends only on the collection shape plus `createServerApp(db)` mounting the TA routes.
const { spawnSync } = require('child_process');
const path = require('path');

const emulatorTest = process.env.RUN_FIRESTORE_EMULATOR_TESTS === '1' ? test : test.skip;

emulatorTest('TA ticket queue: concurrent claim race, filter queries, and notification documents work in the emulator', () => {
  expect(process.env.FIRESTORE_EMULATOR_HOST).toBe('127.0.0.1:8080');
  expect(process.env.CODECLINIC_FIRESTORE_MODE).toBe('local-emulator');
  expect(process.env.CODECLINIC_FIRESTORE_PROJECT_ID).toBe('demo-codeclinic');

  const script = String.raw`
    const assert = require('node:assert/strict');
    const crypto = require('node:crypto');
    const request = require('supertest');
    const { createServerApp } = require('./server');
    const { createFirestoreRegistrationPersistence } = require('./server/auth/firestore-registration');
    const { emailKeyFor } = require('./server/auth/email');
    const { resolveFirestoreTarget, connectFirestoreTarget } = require('./server/firestore-target');
    let step = 'connect';
    (async () => {
      const db = await connectFirestoreTarget(resolveFirestoreTarget(process.env));
      const createdUsers = new Set();
      const createdKeys = new Set();
      const createdTickets = new Set();
      const suffix = crypto.randomUUID();
      const password = 'synthetic-ticket-password-123';
      const app = createServerApp(db);
      const persistence = createFirestoreRegistrationPersistence(db);
      const register = async (accountType, label) => {
        const email = 'synthetic-' + label + '-' + suffix + '@example.test';
        await persistence.createAccount({ accountType, name: 'Synthetic ' + label, email, password, ...(accountType === 'TA' ? { employeeId: 'SYN-' + crypto.randomUUID() } : {}) });
        const key = emailKeyFor(email); createdKeys.add(key);
        const userId = (await db.collection('emailKeys').doc(key).get()).data().userId; createdUsers.add(userId);
        // TA registrations start INACTIVE until a coordinator activates them; do that directly here.
        if (accountType === 'TA') await db.collection('users').doc(userId).update({ accountStatus: 'ACTIVE' });
        return { userId, email, accountType };
      };
      const signIn = async (account) => {
        const login = await request(app).post('/api/auth/login').send({ accountType: account.accountType, email: account.email, password });
        assert.equal(login.status, 200);
        const cookie = login.headers['set-cookie'][0].split(';')[0];
        const csrf = (await request(app).get('/api/auth/csrf').set('Cookie', cookie)).body.csrfToken;
        return { cookie, csrf };
      };
      const seed = async (id, fields) => {
        createdTickets.add(id);
        await db.collection('tickets').doc(id).set({
          ticketId: id, studentId: student.userId, title: 'Title ' + id, language: 'Python', conceptTags: ['loops'],
          files: [{ name: 'a.py', content: 'x = 1' }], repoUrl: null, repoFilePaths: [], errorOutput: '', expectedBehaviour: 'e',
          actualBehaviour: 'a', attempted: 't', status: 'OPEN', claimedByTaId: null, fixNote: null, resolvedAt: null,
          createdAt: new Date(Date.now() - 100000), updatedAt: new Date(), ...fields,
        });
      };
      const notificationsFor = async (ticketId) =>
        (await db.collection('notifications').where('ticketId', '==', ticketId).get()).docs.map((d) => d.data());
      let student;
      try {
        step = 'register';
        student = await register('STUDENT', 'student');
        const taA = await register('TA', 'taa');
        const taB = await register('TA', 'tab');
        step = 'sign in';
        const a = await signIn(taA);
        const b = await signIn(taB);
        const tag = 'emu' + suffix.slice(0, 8);

        step = 'filters';
        const base = Date.now() - 500000;
        await seed(tag + '-open-py', { language: 'Python', conceptTags: [tag], createdAt: new Date(base) });
        await seed(tag + '-open-java', { language: 'Java', conceptTags: [tag, 'arrays'], createdAt: new Date(base + 1000) });
        await seed(tag + '-claimed', { status: 'CLAIMED', claimedByTaId: taB.userId, language: 'Python', conceptTags: [tag], createdAt: new Date(base + 2000) });
        await seed(tag + '-closed', { status: 'CLOSED', language: 'Python', conceptTags: [tag], createdAt: new Date(base + 3000) });
        const list = async (query) => {
          const response = await request(app).get('/api/ta/tickets?concept=' + tag + query).set('Cookie', a.cookie);
          assert.equal(response.status, 200);
          return response.body.tickets.map((t) => t.ticketId);
        };
        assert.deepEqual(await list(''), [tag + '-open-py', tag + '-open-java', tag + '-claimed']);
        assert.deepEqual(await list('&status=CLOSED'), [tag + '-closed']);
        assert.deepEqual(await list('&status=CLAIMED'), [tag + '-claimed']);
        assert.deepEqual(await list('&language=Java'), [tag + '-open-java']);
        assert.deepEqual(await list('&status=OPEN&language=Python'), [tag + '-open-py']);

        step = 'claim race';
        const race = tag + '-race';
        await seed(race, {});
        const results = await Promise.all([
          request(app).post('/api/ta/tickets/' + race + '/claim').set('Cookie', a.cookie).set('X-CSRF-Token', a.csrf).send({}),
          request(app).post('/api/ta/tickets/' + race + '/claim').set('Cookie', b.cookie).set('X-CSRF-Token', b.csrf).send({}),
        ]);
        assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
        const winner = results[0].status === 200 ? taA.userId : taB.userId;
        assert.equal((await db.collection('tickets').doc(race).get()).data().claimedByTaId, winner);
        const winnerAuth = winner === taA.userId ? a : b;
        const claimNotes = await notificationsFor(race);
        assert.equal(claimNotes.length, 1);
        assert.equal(claimNotes[0].notificationType, 'TICKET_CLAIMED');
        assert.equal(claimNotes[0].recipientUserId, student.userId);

        step = 'reply and resolve';
        const reply = await request(app).post('/api/ta/tickets/' + race + '/replies').set('Cookie', winnerAuth.cookie).set('X-CSRF-Token', winnerAuth.csrf).send({ message: 'Look at line 3.' });
        assert.equal(reply.status, 201);
        const stored = await db.collection('tickets').doc(race).collection('replies').get();
        assert.equal(stored.size, 1);
        assert.equal(stored.docs[0].data().authorUserId, winner);
        const resolve = await request(app).post('/api/ta/tickets/' + race + '/resolve').set('Cookie', winnerAuth.cookie).set('X-CSRF-Token', winnerAuth.csrf).send({ fixNote: 'Fixed the bound.' });
        assert.equal(resolve.status, 200);
        const ticket = (await db.collection('tickets').doc(race).get()).data();
        assert.equal(ticket.status, 'RESOLVED');
        assert.equal(ticket.fixNote, 'Fixed the bound.');
        assert.ok(ticket.resolvedAt);
        const types = (await notificationsFor(race)).map((n) => n.notificationType).sort();
        assert.deepEqual(types, ['TICKET_CLAIMED', 'TICKET_REPLY', 'TICKET_RESOLVED']);
        const late = await request(app).post('/api/ta/tickets/' + race + '/replies').set('Cookie', winnerAuth.cookie).set('X-CSRF-Token', winnerAuth.csrf).send({ message: 'late' });
        assert.equal(late.status, 409);
        process.stdout.write('TA ticket queue emulator integration passed.\n');
      } finally {
        for (const id of createdTickets) {
          const replies = await db.collection('tickets').doc(id).collection('replies').get();
          for (const r of replies.docs) await r.ref.delete();
          const notes = await db.collection('notifications').where('ticketId', '==', id).get();
          for (const n of notes.docs) await n.ref.delete();
          await db.collection('tickets').doc(id).delete().catch(() => {});
        }
        for (const userId of createdUsers) {
          const sessions = await db.collection('loginSessions').where('userId', '==', userId).get();
          for (const session of sessions.docs) await session.ref.delete();
          await db.collection('users').doc(userId).delete().catch(() => {});
        }
        for (const key of createdKeys) await db.collection('emailKeys').doc(key).delete().catch(() => {});
        await db.terminate();
      }
    })().catch((error) => {
      process.stderr.write('TA ticket queue emulator integration failed at ' + step + ': ' + (error.code || error.name) + ' ' + (typeof error.actual === 'number' ? error.actual : '') + '\n');
      process.exitCode = 1;
    });
  `;
  const result = spawnSync(process.execPath, ['-e', script], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, GOOGLE_APPLICATION_CREDENTIALS: path.join(__dirname, 'synthetic-missing-adc.json') },
    encoding: 'utf8', timeout: 120000,
  });
  expect(result.error).toBeUndefined();
  if (result.status !== 0) expect(result.stderr).toBe('');
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('TA ticket queue emulator integration passed.');
}, 130000);
