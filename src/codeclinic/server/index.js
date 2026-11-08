const fs = require('fs');
const path = require('path');
const express = require('express');
const { createFirestoreLoginRepository, createLoginApp } = require('./auth/login');
const { createFirestoreAuthStore } = require('./auth/firestore-store');
const { createRegistrationHandler } = require('./auth/register');
const { createFirestoreRegistrationPersistence } = require('./auth/firestore-registration');
const { resolveFirestoreTarget, connectFirestoreTarget } = require('./firestore-target');
const { configureNotify } = require('./notifications/notify');
const { createNotificationsRouter, createFirestoreNotificationStore } = require('./notifications/route');
const { createAiGateway } = require('./ai/gateway');
const { createFirestoreAccountStore } = require('./account/store');
const { createAccountRouter } = require('./account/routes');

function createServerApp(db, buildDirectory = path.join(__dirname, '..', 'build'), authStore = createFirestoreAuthStore(db), registrationPersistence = createFirestoreRegistrationPersistence(db)) {
  const app = createLoginApp(createFirestoreLoginRepository(db), authStore);
  app.post('/api/auth/register', createRegistrationHandler(registrationPersistence, authStore));
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
  if (fs.existsSync(path.join(buildDirectory, 'index.html'))) {
    app.use(express.static(buildDirectory));
    app.get('/register', (_request, response) => {
      response.sendFile(path.join(buildDirectory, 'index.html'));
    });
    app.get(['/student/dashboard', '/ta/dashboard'], (_request, response) => {
      response.sendFile(path.join(buildDirectory, 'index.html'));
    });
    app.get(['/student/account', '/ta/account', '/ta/students', '/ta/tas',
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
