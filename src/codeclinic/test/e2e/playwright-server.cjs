const { spawn } = require('node:child_process');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');

const port = 3100;
const emulatorHost = '127.0.0.1';
const emulatorPort = 8080;
const appRoot = path.resolve(__dirname, '../..');

function pause(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function request(host, requestPort, pathname) {
  return new Promise((resolve, reject) => {
    const call = http.get({ host, port: requestPort, path: pathname, timeout: 2000 }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body = (body + chunk).slice(0, 32); });
      response.on('end', () => resolve({ status: response.statusCode, body }));
    });
    call.on('timeout', () => call.destroy(new Error('Local service timed out.')));
    call.on('error', reject);
  });
}

function checkFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', () => reject(new Error('E2E port 3100 is already in use.')));
    server.listen(port, '0.0.0.0', () => server.close(resolve));
  });
}

async function stopChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise((resolve) => child.once('exit', resolve));
  child.kill();
  await Promise.race([exited, pause(5000)]);
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGKILL');
    await Promise.race([exited, pause(5000)]);
  }
  if (child.exitCode === null && child.signalCode === null) {
    throw new Error('The E2E Express child did not stop.');
  }
}

module.exports = async () => {
  const env = process.env;
  if (env.CODECLINIC_FIRESTORE_MODE !== 'local-emulator' ||
      env.CODECLINIC_FIRESTORE_PROJECT_ID !== 'demo-codeclinic' ||
      env.FIRESTORE_EMULATOR_HOST !== `${emulatorHost}:${emulatorPort}` ||
      (env.GOOGLE_CLOUD_PROJECT && env.GOOGLE_CLOUD_PROJECT !== 'demo-codeclinic')) {
    throw new Error('E2E server requires the pinned local Firestore emulator.');
  }

  const emulator = await request(emulatorHost, emulatorPort, '/').catch(() => null);
  if (!emulator || emulator.status !== 200 || emulator.body.trim() !== 'Ok') {
    throw new Error('Local Firestore emulator is unavailable.');
  }
  await checkFreePort();

  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: appRoot,
    env: {
      ...env,
      PORT: String(port),
      CODECLINIC_FIRESTORE_MODE: 'local-emulator',
      CODECLINIC_FIRESTORE_PROJECT_ID: 'demo-codeclinic',
      FIRESTORE_EMULATOR_HOST: `${emulatorHost}:${emulatorPort}`,
    },
    stdio: 'ignore',
    windowsHide: true,
  });

  try {
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      if (child.exitCode !== null || child.signalCode !== null) {
        throw new Error('Local E2E Express server exited before readiness.');
      }
      const response = await request('127.0.0.1', port, '/').catch(() => null);
      if (response && response.status === 200) return () => stopChild(child);
      await pause(250);
    }
    throw new Error('Local E2E Express server did not become ready.');
  } catch (error) {
    await stopChild(child);
    throw error;
  }
};
