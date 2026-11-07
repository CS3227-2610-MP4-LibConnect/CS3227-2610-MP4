const fs = require('fs');
const os = require('os');
const path = require('path');
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
const request = require('supertest');
const { createServerApp } = require('../server');

test('serves the built frontend and the login API from one origin', async () => {
  const buildDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'libconnect-server-'));
  try {
    fs.writeFileSync(path.join(buildDirectory, 'index.html'), '<!doctype html><title>LibConnect</title>');
    const db = {
      collection(name) {
        expect(name).toBe('emailKeys');
        return { doc: () => ({ get: async () => ({ exists: false }) }) };
      },
    };
    const counters = new Map();
    const sessions = new Map();
    const authStore = {
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
    const registrationPersistence = {
      async createAccount() { throw new Error('Registration is not exercised by this server smoke test.'); },
    };
    const app = createServerApp(db, buildDirectory, authStore, registrationPersistence);

    const page = await request(app).get('/');
    expect(page.status).toBe(200);
    expect(page.text).toContain('<title>LibConnect</title>');

    const registrationPage = await request(app).get('/register');
    expect(registrationPage.status).toBe(200);
    expect(registrationPage.text).toContain('<title>LibConnect</title>');

    const login = await request(app).post('/api/auth/login').send({
      email: 'unknown@example.test', password: 'synthetic-password', accountType: 'MEMBER',
    });
    expect(login.status).toBe(401);
    expect(login.body).toEqual({ message: 'Unable to sign in with those details.' });
    expect(login.headers['set-cookie']).toBeUndefined();
  } finally {
    fs.rmSync(buildDirectory, { recursive: true, force: true });
  }
});
