const http = require('http');
const fs = require('fs');
const path = require('path');

const LOCAL_PROJECT_ID = 'libconnect-mp4';
const LOCAL_EMULATOR_HOST = '127.0.0.1:8080';

function nonempty(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function resolveFirestoreTarget(env) {
  const mode = env.LIBCONNECT_FIRESTORE_MODE;
  const projectId = env.LIBCONNECT_FIRESTORE_PROJECT_ID;
  if (mode === 'local-emulator') {
    if (projectId !== LOCAL_PROJECT_ID || env.FIRESTORE_EMULATOR_HOST !== LOCAL_EMULATOR_HOST ||
        (nonempty(env.GOOGLE_CLOUD_PROJECT) && env.GOOGLE_CLOUD_PROJECT !== LOCAL_PROJECT_ID)) {
      throw new Error('Local Firestore requires project libconnect-mp4 and emulator 127.0.0.1:8080.');
    }
    return Object.freeze({ mode, projectId, emulatorHost: LOCAL_EMULATOR_HOST });
  }
  if (mode === 'production') {
    if (!nonempty(projectId) || projectId !== projectId.trim() ||
        env.GOOGLE_CLOUD_PROJECT !== projectId || !nonempty(env.K_SERVICE) ||
        env.FIRESTORE_EMULATOR_HOST !== undefined || env.GOOGLE_APPLICATION_CREDENTIALS !== undefined) {
      throw new Error('Production Firestore requires matching explicit project and deployment runtime configuration.');
    }
    return Object.freeze({ mode, projectId });
  }
  throw new Error('LIBCONNECT_FIRESTORE_MODE must be local-emulator or production.');
}

function probeEmulator(host, port) {
  return new Promise((resolve, reject) => {
    const request = http.get({
      host, port,
      path: '/',
      timeout: 2000,
    }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body = (body + chunk).slice(0, 16); });
      response.on('end', () => {
        if (response.statusCode === 200 && body.trim() === 'Ok') resolve(true);
        else reject(new Error('Local Firestore emulator is unavailable.'));
      });
    });
    request.on('timeout', () => request.destroy(new Error('Local Firestore emulator is unavailable.')));
    request.on('error', () => reject(new Error('Local Firestore emulator is unavailable.')));
  });
}

function hasWellKnownAdc(env = process.env, platform = process.platform) {
  let configDir = env.CLOUDSDK_CONFIG;
  if (!configDir) {
    if (platform === 'win32' && env.APPDATA) configDir = path.join(env.APPDATA, 'gcloud');
    if (platform !== 'win32' && env.HOME) configDir = path.join(env.HOME, '.config', 'gcloud');
  }
  // Only check presence. Never open or log credential material.
  return !!configDir && fs.existsSync(path.join(configDir, 'application_default_credentials.json'));
}

function getMetadataProjectId() {
  return new Promise((resolve, reject) => {
    const request = http.get({
      host: '169.254.169.254',
      path: '/computeMetadata/v1/project/project-id',
      headers: { 'Metadata-Flavor': 'Google' },
      timeout: 2000,
    }, (response) => {
      let projectId = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { projectId = (projectId + chunk).slice(0, 256); });
      response.on('end', () => {
        if (response.statusCode === 200 && response.headers['metadata-flavor'] === 'Google' &&
            nonempty(projectId)) resolve(projectId.trim());
        else reject(new Error('Production runtime metadata is unavailable.'));
      });
    });
    request.on('timeout', () => request.destroy(new Error('Production runtime metadata is unavailable.')));
    request.on('error', () => reject(new Error('Production runtime metadata is unavailable.')));
  });
}

async function connectFirestoreTarget(target, deps = {}) {
  if (!target || !['local-emulator', 'production'].includes(target.mode)) {
    throw new Error('Invalid Firestore target.');
  }
  const initializeApp = deps.initializeApp || require('firebase-admin/app').initializeApp;
  const getFirestore = deps.getFirestore || require('firebase-admin/firestore').getFirestore;
  if (target.mode === 'local-emulator') {
    if (target.projectId !== LOCAL_PROJECT_ID || target.emulatorHost !== LOCAL_EMULATOR_HOST) {
      throw new Error('Invalid local Firestore target.');
    }
    await (deps.probeEmulator || probeEmulator)('127.0.0.1', 8080);
    // The Admin Firestore client reads this variable when it is constructed.
    if (!deps.getFirestore) process.env.FIRESTORE_EMULATOR_HOST = LOCAL_EMULATOR_HOST;
    // The emulator uses the pinned host and project ID without credentials.
    // Supplying a synthetic credential triggers deprecated GoogleAuth options.
    const app = initializeApp({ projectId: LOCAL_PROJECT_ID });
    return getFirestore(app);
  }
  if (!nonempty(target.projectId) || target.emulatorHost !== undefined ||
      process.env.FIRESTORE_EMULATOR_HOST !== undefined ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS !== undefined) {
    throw new Error('Invalid production Firestore target.');
  }
  if ((deps.hasWellKnownAdc || hasWellKnownAdc)()) {
    throw new Error('Production Firestore cannot use local application-default credentials.');
  }
  const runtimeProjectId = await (deps.getMetadataProjectId || getMetadataProjectId)();
  if (runtimeProjectId !== target.projectId) {
    throw new Error('Production Firestore project does not match deployment runtime.');
  }
  const applicationDefault = deps.applicationDefault || require('firebase-admin/app').applicationDefault;
  const app = initializeApp({ projectId: target.projectId, credential: applicationDefault() });
  return getFirestore(app);
}

module.exports = { resolveFirestoreTarget, connectFirestoreTarget, probeEmulator, hasWellKnownAdc, getMetadataProjectId };
