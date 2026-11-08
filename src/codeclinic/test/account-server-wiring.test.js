const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.setImmediate = require('timers').setImmediate;
global.clearImmediate = require('timers').clearImmediate;
const request = require('supertest');
const { createServerApp } = require('../server');

test('mounted account router preserves downstream unauthenticated and missing-route responses', async () => {
  const db = { collection() { throw new Error('synthetic unexpected storage access'); },
    runTransaction() { throw new Error('synthetic unexpected account write'); } };
  const authStore = {
    reserveRateSlot: async () => true, releaseRateSlot: async () => {}, createSession: async () => {},
    getSession: async () => null, touchSession: async () => false, rotateCsrfToken: async () => {},
    deleteSession: async () => {}, deleteSessionIfCsrfMatches: async () => false,
    deleteSessionsForUser: async () => 0,
  };
  const app = createServerApp(db, '/private/tmp/no-shared-build', authStore, { createAccount: async () => {} });
  const notification = await request(app).get('/api/notifications/unread-count');
  expect({ status: notification.status, body: notification.body }).toEqual({ status: 401, body: { message: 'Authentication required.' } });
  const missing = await request(app).get('/api/member/catalog');
  expect(missing.status).toBe(404);
});
