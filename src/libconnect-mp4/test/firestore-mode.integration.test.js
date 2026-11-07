/** @jest-environment node */
const { spawnSync } = require('child_process');
const path = require('path');

// Opt in only after starting the Firestore emulator on the approved loopback port.
const emulatorTest = process.env.RUN_FIRESTORE_EMULATOR_TESTS === '1' ? test : test.skip;

emulatorTest('registration and login share the local Firestore emulator', () => {
  expect(process.env.FIRESTORE_EMULATOR_HOST).toBe('127.0.0.1:8080');
  expect(process.env.LIBCONNECT_FIRESTORE_MODE).toBe('local-emulator');
  expect(process.env.LIBCONNECT_FIRESTORE_PROJECT_ID).toBe('libconnect-mp4');

  // CRA/Jest has a browser-flavored resolver. Exercise the real Admin SDK in
  // a child Node process, matching the Express runtime.
  const script = String.raw`
    const assert = require('node:assert/strict');
    const crypto = require('node:crypto');
    const request = require('supertest');
    const { createServerApp } = require('./server');
    const { emailKeyFor } = require('./server/auth/login');
    const { resolveFirestoreTarget, connectFirestoreTarget } = require('./server/firestore-target');
    let step = 'connect';
    (async () => {
      const db = await connectFirestoreTarget(resolveFirestoreTarget(process.env));
      try {
        const suffix = crypto.randomUUID();
        const memberEmail = 'synthetic-member-' + suffix + '@example.test';
        const librarianEmail = 'synthetic-librarian-' + suffix + '@example.test';
        const password = 'synthetic-password-123';
        const app = createServerApp(db);
        step = 'member registration';
        const member = await request(app).post('/api/auth/register').send({
          accountType: 'MEMBER', name: 'Synthetic Member', email: memberEmail, password,
        });
        assert.equal(member.status, 201);
        assert.deepEqual(member.body, { accountType: 'MEMBER', accountStatus: 'ACTIVE' });
        step = 'librarian registration';
        const librarian = await request(app).post('/api/auth/register').send({
          accountType: 'LIBRARIAN', name: 'Synthetic Librarian', email: librarianEmail,
          password, employeeId: 'SYN-' + suffix,
        });
        assert.equal(librarian.status, 201);
        assert.deepEqual(librarian.body, { accountType: 'LIBRARIAN', accountStatus: 'INACTIVE' });
        step = 'record verification';
        const memberKey = await db.collection('emailKeys').doc(emailKeyFor(memberEmail)).get();
        const librarianKey = await db.collection('emailKeys').doc(emailKeyFor(librarianEmail)).get();
        assert.equal(memberKey.exists, true);
        assert.equal(librarianKey.exists, true);
        const memberUser = await db.collection('users').doc(memberKey.data().userId).get();
        const librarianUser = await db.collection('users').doc(librarianKey.data().userId).get();
        assert.equal(memberUser.data().accountStatus, 'ACTIVE');
        assert.equal(memberUser.data().memberId, memberKey.data().userId);
        assert.equal(librarianUser.data().accountStatus, 'INACTIVE');
        assert.equal(librarianUser.data().isManager, false);
        step = 'member login';
        const memberLogin = await request(app).post('/api/auth/login').send({
          accountType: 'MEMBER', email: memberEmail, password,
        });
        assert.equal(memberLogin.status, 200);
        assert.deepEqual(memberLogin.body, { accountType: 'MEMBER' });
        assert.ok(memberLogin.headers['set-cookie']);
        step = 'librarian login';
        const librarianLogin = await request(app).post('/api/auth/login').send({
          accountType: 'LIBRARIAN', email: librarianEmail, password,
        });
        assert.equal(librarianLogin.status, 401);
        assert.equal(librarianLogin.headers['set-cookie'], undefined);
        step = 'session and counter verification';
        const sessions = await db.collection('loginSessions').where('userId', '==', memberKey.data().userId).get();
        assert.equal(sessions.size, 1);
        const counters = await db.collection('loginFailureCounters').get();
        assert.equal(counters.empty, false);
      } finally {
        await db.terminate();
      }
    })().catch((error) => { process.stderr.write('Local emulator integration failed at ' + step + ': ' + (error.code || error.name) + ' ' + (typeof error.actual === 'number' ? error.actual : '') + '\n'); process.exitCode = 1; });
  `;
  const result = spawnSync(process.execPath, ['-e', script], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, GOOGLE_APPLICATION_CREDENTIALS: path.join(__dirname, 'synthetic-missing-adc.json') },
    encoding: 'utf8', timeout: 90000,
  });
  expect(result.error).toBeUndefined();
  if (result.status !== 0) expect(result.stderr).toBe('');
  expect(result.status).toBe(0);
}, 100000);
