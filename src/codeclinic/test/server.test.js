const fs = require('fs');
const crypto = require('crypto');
const os = require('os');
const path = require('path');
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
// Nested Express routers need Node timers, which jsdom does not install.
global.setImmediate = require('timers').setImmediate;
global.clearImmediate = require('timers').clearImmediate;
const request = require('supertest');
const { createServerApp } = require('../server');

test('serves the built frontend and the login API from one origin', async () => {
  const buildDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'codeclinic-server-'));
  try {
    fs.writeFileSync(path.join(buildDirectory, 'index.html'), '<!doctype html><title>CodeClinic</title>');
    const db = {
      async runTransaction() { throw new Error('Account writes are not exercised by this server smoke test.'); },
      collection(name) {
        if (name === 'users') {
          return { doc: (id) => ({ get: async () => ({
            exists: id === 'forced-user',
            data: () => ({ userId: 'forced-user', accountType: 'STUDENT', accountStatus: 'ACTIVE', mustChangePassword: true }),
          }) }) };
        }
        expect(name).toBe('emailKeys');
        return { doc: () => ({ get: async () => ({ exists: false }) }) };
      },
    };
    const counters = new Map();
    const sessions = new Map();
    const authStore = {
      async deleteSessionsForUser() { throw new Error('Account writes are not exercised by this server smoke test.'); },
      async reserveRateSlot(kind, identifier, limit, now) {
        const key = `${kind}:${identifier}`;
        const count = counters.get(key) || 0;
        if (count >= limit) return false;
        counters.set(key, count + 1);
        return true;
      },
      async releaseRateSlot(kind, identifier) { counters.set(`${kind}:${identifier}`, Math.max(0, (counters.get(`${kind}:${identifier}`) || 0) - 1)); },
      async createSession(id, record) { sessions.set(id, record); },
      async getSession(id) { return sessions.get(id) || null; },
      async touchSession() { return true; },
      async rotateCsrfToken() {},
      async deleteSession(id) { sessions.delete(id); },
      async deleteSessionIfCsrfMatches(id, submittedHash) {
        const current = sessions.get(id);
        if (!current || current.csrfTokenHash !== submittedHash) return false;
        sessions.delete(id);
        return true;
      },
    };
    const registeredAccounts = [];
    const registrationPersistence = {
      async createAccount(account) { registeredAccounts.push(account); },
    };
    const app = createServerApp(db, buildDirectory, authStore, registrationPersistence);

    const page = await request(app).get('/');
    expect(page.status).toBe(200);
    expect(page.text).toContain('<title>CodeClinic</title>');

    const registrationPage = await request(app).get('/register');
    expect(registrationPage.status).toBe(200);
    expect(registrationPage.text).toContain('<title>CodeClinic</title>');

    const dashboardResults = [];
    for (const dashboardPath of ['/student/dashboard', '/ta/dashboard', '/student/tickets/new']) {
      const directNavigation = await request(app).get(dashboardPath);
      const refresh = await request(app).get(dashboardPath);
      dashboardResults.push(
        { path: dashboardPath, kind: 'direct', status: directNavigation.status, shell: directNavigation.text.includes('<title>CodeClinic</title>') },
        { path: dashboardPath, kind: 'refresh', status: refresh.status, shell: refresh.text.includes('<title>CodeClinic</title>') },
      );
    }
    expect(dashboardResults).toEqual([
      { path: '/student/dashboard', kind: 'direct', status: 200, shell: true },
      { path: '/student/dashboard', kind: 'refresh', status: 200, shell: true },
      { path: '/ta/dashboard', kind: 'direct', status: 200, shell: true },
      { path: '/ta/dashboard', kind: 'refresh', status: 200, shell: true },
      { path: '/student/tickets/new', kind: 'direct', status: 200, shell: true },
      { path: '/student/tickets/new', kind: 'refresh', status: 200, shell: true },
    ]);

    for (const formerPath of ['/member/dashboard', '/librarian/dashboard']) {
      const former = await request(app).get(formerPath);
      expect(former.status).toBe(404);
      expect(former.text).not.toContain('<title>CodeClinic</title>');
      expect(former.headers.location).toBeUndefined();
    }

    const retiredCatalog = await request(app).get('/api/member/catalog');
    expect(retiredCatalog.status).toBe(404);
    expect(retiredCatalog.text).not.toContain('<title>CodeClinic</title>');

    const login = await request(app).post('/api/auth/login').send({
      email: 'unknown@example.test', password: 'synthetic-password', accountType: 'STUDENT',
    });
    expect(login.status).toBe(401);
    expect(login.body).toEqual({ message: 'Incorrect email or password.' });
    expect(login.headers['set-cookie']).toBeUndefined();

    const registration = await request(app).post('/api/auth/register').send({
      accountType: 'STUDENT', name: 'Test Student', email: 'student@example.test', password: 'synthetic-password',
    });
    expect(registration.status).toBe(201);
    expect(registration.body).toEqual({ accountType: 'STUDENT', accountStatus: 'ACTIVE' });
    expect(registeredAccounts).toHaveLength(1);

    const forcedSessionId = 'f'.repeat(43);
    const forcedSessionHash = crypto.createHash('sha256').update(forcedSessionId).digest('hex');
    sessions.set(forcedSessionHash, { userId: 'forced-user', accountTypeAtIssue: 'STUDENT' });
    const forcedCookie = `__Host-codeclinic_session=${forcedSessionId}`;
    const validWhileForced = await request(app).post('/api/auth/register').set('Cookie', forcedCookie).send({
      accountType: 'STUDENT', name: 'Blocked Student', email: 'blocked@example.test', password: 'synthetic-password',
    });
    expect(validWhileForced.status).toBe(403);
    const malformedWhileForced = await request(app).post('/api/auth/register')
      .set('Cookie', forcedCookie).set('Content-Type', 'application/json').send('{');
    expect(malformedWhileForced.status).toBe(400);
    expect(malformedWhileForced.body).toEqual({ message: 'Enter valid registration details.' });
    expect(registeredAccounts).toHaveLength(1);
    sessions.delete(forcedSessionHash);

    const oversizedTicketBody = JSON.stringify({ title: 'x'.repeat(128 * 1024) });
    const oversizedTicket = await request(app).post('/api/tickets')
      .set('Content-Type', 'application/json').send(oversizedTicketBody);
    expect(oversizedTicket.status).toBe(413);
    expect(oversizedTicket.body).toEqual({ message: 'Request body is too large.' });
  } finally {
    fs.rmSync(buildDirectory, { recursive: true, force: true });
  }
});

test('does not let browsers keep a stale app shell across releases built with a fixed file time', async () => {
  const buildDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'codeclinic-cache-'));
  const indexPath = path.join(buildDirectory, 'index.html');
  const fixedBuildTime = new Date('1980-01-01T00:00:01Z');
  const writeRelease = (bundleHash) => {
    fs.writeFileSync(indexPath, `<!doctype html><script src="/static/js/main.${bundleHash}.js"></script>`);
    fs.utimesSync(indexPath, fixedBuildTime, fixedBuildTime);
  };
  try {
    fs.mkdirSync(path.join(buildDirectory, 'static', 'js'), { recursive: true });
    fs.writeFileSync(path.join(buildDirectory, 'static', 'js', 'main.bbbbbbbb.js'), 'void 0;');
    fs.writeFileSync(path.join(buildDirectory, 'favicon.ico'), 'icon');
    writeRelease('aaaaaaaa');
    const db = {
      async runTransaction() { throw new Error('Firestore is not exercised by this static asset test.'); },
      collection: () => ({ doc: () => ({ get: async () => ({ exists: false }) }) }),
    };
    const unusedAuthMethods = ['reserveRateSlot', 'releaseRateSlot', 'createSession', 'getSession', 'touchSession',
      'rotateCsrfToken', 'deleteSession', 'deleteSessionIfCsrfMatches', 'deleteSessionsForUser'];
    const authStore = Object.fromEntries(unusedAuthMethods.map((name) => [name, async () => {
      throw new Error('Authentication is not exercised by this static asset test.');
    }]));
    const registrationPersistence = { async createAccount() { throw new Error('Registration is not exercised by this static asset test.'); } };
    const app = createServerApp(db, buildDirectory, authStore, registrationPersistence);

    const firstVisit = await request(app).get('/');

    expect(firstVisit.text).toContain('main.aaaaaaaa.js');
    expect(firstVisit.headers['cache-control']).toBe('no-cache');
    const unchanged = await request(app).get('/').set('If-None-Match', firstVisit.headers.etag);
    expect(unchanged.status).toBe(304);
    writeRelease('bbbbbbbb');

    for (const shellPath of ['/', '/index.html', '/ta/queue', '/student/dashboard']) {
      const revisit = await request(app).get(shellPath)
        .set('If-None-Match', firstVisit.headers.etag)
        .set('If-Modified-Since', fixedBuildTime.toUTCString());
      expect(revisit.status).toBe(200);
      expect(revisit.headers['cache-control']).toBe('no-cache');
      expect(revisit.headers['last-modified']).toBeUndefined();
      expect(revisit.text).toContain('main.bbbbbbbb.js');
    }

    const bundle = await request(app).get('/static/js/main.bbbbbbbb.js');
    expect(bundle.status).toBe(200);
    expect(bundle.headers['cache-control']).toBe('public, max-age=31536000, immutable');

    const favicon = await request(app).get('/favicon.ico');
    expect(favicon.headers['cache-control']).toBe('no-cache');
  } finally {
    fs.rmSync(buildDirectory, { recursive: true, force: true });
  }
});
