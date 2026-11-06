const fs = require('fs');
const path = require('path');
const express = require('express');
const { createFirestoreLoginRepository, createLoginApp } = require('./auth/login');
const { createFirestoreAuthStore } = require('./auth/firestore-store');

function createServerApp(db, buildDirectory = path.join(__dirname, '..', 'build'), authStore = createFirestoreAuthStore(db)) {
  const app = createLoginApp(createFirestoreLoginRepository(db), authStore);
  if (fs.existsSync(path.join(buildDirectory, 'index.html'))) {
    app.use(express.static(buildDirectory));
  }
  return app;
}

function startServer() {
  const { initializeApp, getApps } = require('firebase-admin/app');
  const { getFirestore } = require('firebase-admin/firestore');
  const rawPort = process.env.PORT || '3000';
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  const buildDirectory = path.join(__dirname, '..', 'build');
  if (!fs.existsSync(path.join(buildDirectory, 'index.html'))) {
    throw new Error('Build the frontend before starting the server.');
  }

  if (getApps().length === 0) initializeApp();
  const app = createServerApp(getFirestore(), buildDirectory);
  return app.listen(port, () => {
    console.info(`LibConnect server listening on port ${port}.`);
  });
}

if (require.main === module) {
  try {
    startServer();
  } catch (error) {
    console.error('LibConnect server could not start.');
    process.exitCode = 1;
  }
}

module.exports = { createServerApp, startServer };
