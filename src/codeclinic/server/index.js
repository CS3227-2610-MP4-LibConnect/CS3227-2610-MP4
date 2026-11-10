const fs = require('fs');
const path = require('path');
const express = require('express');
const { MAX_BODY_BYTES: AUTH_BODY_BYTES, createFirestoreLoginRepository, createLoginApp, createForcedPasswordChangeGuard } = require('./auth/login');
const { createFirestoreAuthStore } = require('./auth/firestore-store');
const { createRegistrationHandler } = require('./auth/register');
const { createFirestoreRegistrationPersistence } = require('./auth/firestore-registration');
const { resolveFirestoreTarget, connectFirestoreTarget } = require('./firestore-target');
const { configureNotify } = require('./notifications/notify');
const { createNotificationsRouter, createFirestoreNotificationStore } = require('./notifications/route');
const { createAiGateway } = require('./ai/gateway');
const { registerTaAiFeatures } = require('./tickets/ta-ai-draft-route');
const { createFirestoreAccountStore } = require('./account/store');
const { createAccountRouter } = require('./account/routes');
const { createFirestoreTicketStore } = require('./tickets/store');
const { createTicketsRouter } = require('./tickets/route');
const { createTaTicketsRouter } = require('./tickets/ta-routes');
const { notify } = require('./notifications/notify');

// The Firestore ticket store loads `firebase-admin/firestore` when built, so build it on first
// use; this keeps `createServerApp` constructible with the fake databases used by unit tests.
function createLazyTicketStore(db) {
  let store = null;
  const resolve = () => {
    if (!store) store = createFirestoreTicketStore(db);
    return store;
  };
  return Object.fromEntries(['listTickets', 'getTicket', 'claimTicket', 'unclaimTicket', 'resolveTicket', 'addReply']
    .map((name) => [name, (...args) => resolve()[name](...args)]));
}

function createServerApp(db, buildDirectory = path.join(__dirname, '..', 'build'), authStore = createFirestoreAuthStore(db), registrationPersistence = createFirestoreRegistrationPersistence(db)) {
  const repository = createFirestoreLoginRepository(db);
  const loginApp = createLoginApp(repository, authStore);
  const app = express();
  app.disable('x-powered-by');
  // This endpoint has an approved 128 KiB request limit; mount it before the
  // login app's shared 8 KiB parser so auth and account limits stay unchanged.
  app.use('/api/tickets', createTicketsRouter({
    repository,
    authStore,
    store: createFirestoreTicketStore(db),
  }));
  // Keep registration outside the nested login app: its catch-all error
  // boundary must not turn registration failures into login-service 503s.
  app.post('/api/auth/register', express.json({ limit: AUTH_BODY_BYTES, strict: true }),
    createForcedPasswordChangeGuard(repository, authStore),
    createRegistrationHandler(registrationPersistence, authStore),
    (error, _request, response, _next) => {
      if (error && (error.type === 'entity.too.large' || error.type === 'entity.parse.failed' || error.status === 400)) {
        return response.status(400).json({ message: 'Enter valid registration details.' });
      }
      return response.status(503).json({ message: 'Registration is temporarily unavailable. Please try again.' });
    });
  app.use(loginApp);
  app.use('/api', createAccountRouter({
    accountStore: createFirestoreAccountStore(db, authStore),
    authStore,
    loginRepository: createFirestoreLoginRepository(db),
  }));
  configureNotify(db);
  app.use('/api/notifications', createNotificationsRouter({
    repository: createFirestoreLoginRepository(db),
    authStore,
    store: createFirestoreNotificationStore(db),
  }));
  app.use('/api/ta/tickets', createTaTicketsRouter({
    authStore,
    accountStore: createFirestoreAccountStore(db, authStore),
    ticketStore: createLazyTicketStore(db),
    notify,
  }));
  if (fs.existsSync(path.join(buildDirectory, 'index.html'))) {
    app.use(express.static(buildDirectory));
    app.get('/register', (_request, response) => {
      response.sendFile(path.join(buildDirectory, 'index.html'));
    });
    app.get(['/student/dashboard', '/ta/dashboard', '/student/tickets', '/student/tickets/new', /^\/student\/tickets\/[^/]+$/], (_request, response) => {
      response.sendFile(path.join(buildDirectory, 'index.html'));
    });
    app.get(['/student/account', '/ta/account', '/ta/students', '/ta/tas', '/ta/queue', '/ta/tickets/:ticketId',
      '/account/password-change', '/notifications'], (_request, response) => {
      response.sendFile(path.join(buildDirectory, 'index.html'));
    });
  }
  return app;
}

async function startServer() {
  const target = resolveFirestoreTarget(process.env);
  const rawPort = process.env.PORT || '3000';
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  const buildDirectory = path.join(__dirname, '..', 'build');
  if (!fs.existsSync(path.join(buildDirectory, 'index.html'))) {
    throw new Error('Build the frontend before starting the server.');
  }

  const db = await connectFirestoreTarget(target);
  const app = createServerApp(db, buildDirectory);
  app.locals.aiGateway = createAiGateway({ env: process.env, db });
  registerTaAiFeatures(app.locals.aiGateway);
  return app.listen(port, () => {
    console.info(`CodeClinic server listening on port ${port}.`);
  });
}

if (require.main === module) {
  startServer().catch(() => {
    console.error('CodeClinic server could not start. Check Firestore mode, project, runtime, emulator, and build configuration.');
    process.exitCode = 1;
  });
}

module.exports = { createServerApp, startServer };
