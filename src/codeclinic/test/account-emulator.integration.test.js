/** @jest-environment node */
const { spawnSync } = require('child_process');
const path = require('path');

const emulatorTest = process.env.RUN_FIRESTORE_EMULATOR_TESTS === '1' ? test : test.skip;

emulatorTest('account bootstrap, support transitions, forced password change, and email transactions work in the emulator', () => {
  expect(process.env.FIRESTORE_EMULATOR_HOST).toBe('127.0.0.1:8080');
  expect(process.env.CODECLINIC_FIRESTORE_MODE).toBe('local-emulator');
  expect(process.env.CODECLINIC_FIRESTORE_PROJECT_ID).toBe('demo-codeclinic');

  const script = String.raw`
    const assert = require('node:assert/strict');
    const crypto = require('node:crypto');
    const request = require('supertest');
    const { createServerApp } = require('./server');
    const { bootstrapCoordinator } = require('./scripts/bootstrap-coordinator');
    const { createFirestoreRegistrationPersistence } = require('./server/auth/firestore-registration');
    const { emailKeyFor } = require('./server/auth/email');
    const { resolveFirestoreTarget, connectFirestoreTarget } = require('./server/firestore-target');
    let step = 'connect';
    (async () => {
      const db = await connectFirestoreTarget(resolveFirestoreTarget(process.env));
      const createdUsers = new Set();
      const createdKeys = new Set();
      const app = createServerApp(db);
      const registrationPersistence = createFirestoreRegistrationPersistence(db);
      const suffix = crypto.randomUUID();
      const password = 'synthetic-account-password-123';
      const nextPassword = 'synthetic-account-password-456';
      const studentEmail = 'synthetic-student-' + suffix + '@example.test';
      const collisionEmail = 'synthetic-other-' + suffix + '@example.test';
      const taEmail = 'synthetic-ta-' + suffix + '@example.test';
      const secondTaEmail = 'synthetic-ta2-' + suffix + '@example.test';
      const changedEmail = 'synthetic-changed-' + suffix + '@example.test';
      const addKey = async (email) => {
        const key = emailKeyFor(email); createdKeys.add(key);
        const snapshot = await db.collection('emailKeys').doc(key).get();
        if (snapshot.exists) createdUsers.add(snapshot.data().userId);
        return snapshot.exists ? snapshot.data().userId : null;
      };
      const register = async (accountType, email, extra = {}) => {
        await registrationPersistence.createAccount({ accountType, name: 'Synthetic Account', email, password, ...(accountType === 'TA' ? { employeeId: 'SYN-' + crypto.randomUUID() } : {}), ...extra });
        const id = await addKey(email); assert.ok(id); createdUsers.add(id);
        return id;
      };
      const login = async (email, pass, accountType) => {
        const response = await request(app).post('/api/auth/login').send({ accountType, email, password: pass });
        assert.equal(response.status, 200);
        const cookie = response.headers['set-cookie'][0].split(';')[0];
        return cookie;
      };
      const csrf = async (cookie) => {
        const response = await request(app).get('/api/auth/csrf').set('Cookie', cookie);
        assert.equal(response.status, 200);
        return response.body.csrfToken;
      };
      try {
        step = 'register accounts';
        const studentId = await register('STUDENT', studentEmail);
        const competitorId = await register('STUDENT', collisionEmail);
        const taId = await register('TA', taEmail);
        await register('TA', secondTaEmail);

        step = 'bootstrap coordinator and refusals';
        assert.deepEqual(await bootstrapCoordinator(db, taEmail), { outcome: 'promoted' });
        assert.deepEqual(await bootstrapCoordinator(db, secondTaEmail), { outcome: 'coordinator-exists' });
        assert.deepEqual(await bootstrapCoordinator(db, studentEmail, { allowAdditional: true }), { outcome: 'not-ta' });
        const taRecord = await db.collection('users').doc(taId).get();
        assert.equal(taRecord.data().isManager, true);
        assert.equal(taRecord.data().accountStatus, 'ACTIVE');
        const competitor = await db.collection('users').doc(competitorId).get();
        assert.equal(competitor.data().accountType, 'STUDENT');

        step = 'session and TA deactivation';
        const studentCookie = await login(studentEmail, password, 'STUDENT');
        assert.equal((await request(app).get('/api/account').set('Cookie', studentCookie)).status, 200);
        const coordinatorCookie = await login(taEmail, password, 'TA');
        const coordinatorCsrf = await csrf(coordinatorCookie);
        const deactivated = await request(app).post('/api/support/accounts/' + studentId + '/status').set('Cookie', coordinatorCookie).set('X-CSRF-Token', coordinatorCsrf).send({ accountStatus: 'INACTIVE' });
        assert.equal(deactivated.status, 204);
        const oldSessions = await db.collection('loginSessions').where('userId', '==', studentId).get();
        assert.equal(oldSessions.size, 0);
        assert.equal((await request(app).get('/api/account').set('Cookie', studentCookie)).status, 401);

        step = 'reactivate and reset password';
        const reactivated = await request(app).post('/api/support/accounts/' + studentId + '/status').set('Cookie', coordinatorCookie).set('X-CSRF-Token', coordinatorCsrf).send({ accountStatus: 'ACTIVE' });
        assert.equal(reactivated.status, 204);
        const firstOldCookie = await login(studentEmail, password, 'STUDENT');
        const secondOldCookie = await login(studentEmail, password, 'STUDENT');
        const reset = await request(app).post('/api/support/accounts/' + studentId + '/password-reset').set('Cookie', coordinatorCookie).set('X-CSRF-Token', coordinatorCsrf).send({});
        assert.equal(reset.status, 200);
        assert.match(reset.headers['cache-control'] || '', /no-store/);
        const temporaryPassword = reset.body.temporaryPassword;
        assert.equal(typeof temporaryPassword, 'string');
        assert.equal(temporaryPassword.length, 16);
        assert.equal((await request(app).get('/api/account').set('Cookie', firstOldCookie)).status, 401);
        assert.equal((await request(app).get('/api/account').set('Cookie', secondOldCookie)).status, 401);
        const resetSessions = await db.collection('loginSessions').where('userId', '==', studentId).get();
        assert.equal(resetSessions.size, 0);

        step = 'forced change and current-session retention';
        const forcedCookie = await login(studentEmail, temporaryPassword, 'STUDENT');
        const secondForcedCookie = await login(studentEmail, temporaryPassword, 'STUDENT');
        const forcedSession = await request(app).get('/api/auth/session').set('Cookie', forcedCookie);
        assert.equal(forcedSession.status, 200);
        assert.equal(forcedSession.body.mustChangePassword, true);
        const blocked = await request(app).get('/api/notifications/unread-count').set('Cookie', forcedCookie);
        assert.equal(blocked.status, 403);
        assert.equal(blocked.body.code, 'PASSWORD_CHANGE_REQUIRED');
        const forcedCsrf = await csrf(forcedCookie);
        const changed = await request(app).post('/api/account/password').set('Cookie', forcedCookie).set('X-CSRF-Token', forcedCsrf).send({ currentPassword: temporaryPassword, newPassword: nextPassword });
        assert.equal(changed.status, 204);
        assert.equal((await request(app).get('/api/account').set('Cookie', forcedCookie)).status, 200);
        assert.equal((await request(app).get('/api/account').set('Cookie', secondForcedCookie)).status, 401);
        assert.equal((await request(app).post('/api/auth/login').send({ accountType: 'STUDENT', email: studentEmail, password: temporaryPassword })).status, 401);

        step = 'email transaction and collision';
        const passwordLogin = await login(studentEmail, nextPassword, 'STUDENT');
        const passwordCsrf = await csrf(passwordLogin);
        const collision = await request(app).patch('/api/account/profile').set('Cookie', passwordLogin).set('X-CSRF-Token', passwordCsrf).send({ email: collisionEmail, currentPassword: nextPassword });
        assert.equal(collision.status, 409);
        assert.equal((await db.collection('emailKeys').doc(emailKeyFor(studentEmail)).get()).data().userId, studentId);
        assert.equal((await db.collection('emailKeys').doc(emailKeyFor(collisionEmail)).get()).data().userId, competitorId);
        const moved = await request(app).patch('/api/account/profile').set('Cookie', passwordLogin).set('X-CSRF-Token', passwordCsrf).send({ email: changedEmail, currentPassword: nextPassword });
        assert.equal(moved.status, 200);
        assert.equal(moved.body.email, changedEmail);
        assert.equal((await db.collection('emailKeys').doc(emailKeyFor(studentEmail)).get()).exists, false);
        assert.equal((await db.collection('emailKeys').doc(emailKeyFor(changedEmail)).get()).data().userId, studentId);
        assert.equal((await request(app).post('/api/auth/login').send({ accountType: 'STUDENT', email: studentEmail, password: nextPassword })).status, 401);
        assert.equal((await request(app).post('/api/auth/login').send({ accountType: 'STUDENT', email: changedEmail, password: nextPassword })).status, 200);
        process.stdout.write('Account emulator integration passed.\n');
      } finally {
        for (const userId of createdUsers) {
          const sessions = await db.collection('loginSessions').where('userId', '==', userId).get();
          for (const session of sessions.docs) await session.ref.delete();
          await db.collection('users').doc(userId).delete().catch(() => {});
        }
        for (const key of createdKeys) await db.collection('emailKeys').doc(key).delete().catch(() => {});
        await db.terminate();
      }
    })().catch((error) => {
      process.stderr.write('Account emulator integration failed at ' + step + ': ' + (error.code || error.name) + ' ' + (typeof error.actual === 'number' ? error.actual : '') + '\n');
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
  expect(result.stdout).toContain('Account emulator integration passed.');
}, 130000);
