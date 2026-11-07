const fs = require('fs');
const os = require('os');
const path = require('path');
const { resolveFirestoreTarget, connectFirestoreTarget } = require('../server/firestore-target');

const localEnv = {
  LIBCONNECT_FIRESTORE_MODE: 'local-emulator',
  LIBCONNECT_FIRESTORE_PROJECT_ID: 'libconnect-mp4',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
};
const productionEnv = {
  LIBCONNECT_FIRESTORE_MODE: 'production',
  LIBCONNECT_FIRESTORE_PROJECT_ID: 'production-project',
  GOOGLE_CLOUD_PROJECT: 'production-project',
  K_SERVICE: 'libconnect-api',
};

function adminDoubles() {
  const db = { collection: jest.fn() };
  return {
    db,
    initializeApp: jest.fn(() => ({ name: 'synthetic-app' })),
    getFirestore: jest.fn(() => db),
    cert: jest.fn(() => ({ syntheticEmulatorCredential: true })),
    applicationDefault: jest.fn(() => ({ syntheticRuntimeCredential: true })),
    probeEmulator: jest.fn(async () => true),
    hasWellKnownAdc: jest.fn(() => false),
    getMetadataProjectId: jest.fn(async () => 'production-project'),
  };
}

describe('explicit Firestore target selection', () => {
  const originalEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST;

  beforeEach(() => {
    // React Scripts may load a local emulator host from .env. Production
    // connector cases start from a clean runtime unless a case sets it.
    delete process.env.FIRESTORE_EMULATOR_HOST;
  });

  afterEach(() => {
    if (originalEmulatorHost === undefined) delete process.env.FIRESTORE_EMULATOR_HOST;
    else process.env.FIRESTORE_EMULATOR_HOST = originalEmulatorHost;
  });

  test('local mode pins loopback emulator and project even if developer ADC is present', async () => {
    const target = resolveFirestoreTarget({
      ...localEnv,
      GOOGLE_APPLICATION_CREDENTIALS: 'synthetic-developer-credentials',
    });
    expect(target).toMatchObject({ mode: 'local-emulator', projectId: 'libconnect-mp4', emulatorHost: '127.0.0.1:8080' });
    const deps = adminDoubles();
    const db = await connectFirestoreTarget(target, deps);
    expect(db).toBe(deps.db);
    expect(deps.probeEmulator).toHaveBeenCalledWith('127.0.0.1', 8080);
    expect(deps.applicationDefault).not.toHaveBeenCalled();
    expect(deps.cert).toHaveBeenCalledTimes(1);
    expect(deps.initializeApp).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'libconnect-mp4' }));
    expect(deps.getFirestore).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['missing mode', { ...localEnv, LIBCONNECT_FIRESTORE_MODE: undefined }],
    ['unknown mode', { ...localEnv, LIBCONNECT_FIRESTORE_MODE: 'auto' }],
    ['missing local project', { ...localEnv, LIBCONNECT_FIRESTORE_PROJECT_ID: undefined }],
    ['wrong local project', { ...localEnv, LIBCONNECT_FIRESTORE_PROJECT_ID: 'other-project' }],
    ['missing emulator', { ...localEnv, FIRESTORE_EMULATOR_HOST: undefined }],
    ['non-loopback emulator', { ...localEnv, FIRESTORE_EMULATOR_HOST: 'firestore.example:8080' }],
    ['wrong emulator port', { ...localEnv, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8081' }],
    ['URL instead of host', { ...localEnv, FIRESTORE_EMULATOR_HOST: 'http://127.0.0.1:8080' }],
    ['mismatched cloud project', { ...localEnv, GOOGLE_CLOUD_PROJECT: 'other-project' }],
    ['missing production project', { ...productionEnv, LIBCONNECT_FIRESTORE_PROJECT_ID: undefined }],
    ['mismatched production project', { ...productionEnv, GOOGLE_CLOUD_PROJECT: 'other-project' }],
    ['missing production runtime', { ...productionEnv, K_SERVICE: undefined }],
    ['production emulator variable', { ...productionEnv, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' }],
    ['production developer credentials file', { ...productionEnv, GOOGLE_APPLICATION_CREDENTIALS: 'synthetic-file' }],
  ])('rejects %s before constructing an Admin client', (_label, env) => {
    const deps = adminDoubles();
    expect(() => resolveFirestoreTarget(env)).toThrow();
    expect(deps.initializeApp).not.toHaveBeenCalled();
    expect(deps.getFirestore).not.toHaveBeenCalled();
    expect(deps.applicationDefault).not.toHaveBeenCalled();
  });

  test('unreachable local emulator fails without trying credentials or Firestore', async () => {
    const target = resolveFirestoreTarget({ ...localEnv, GOOGLE_APPLICATION_CREDENTIALS: 'synthetic-file' });
    const deps = adminDoubles();
    deps.probeEmulator.mockRejectedValue(new Error('synthetic connection refused'));
    await expect(connectFirestoreTarget(target, deps)).rejects.toThrow();
    expect(deps.initializeApp).not.toHaveBeenCalled();
    expect(deps.getFirestore).not.toHaveBeenCalled();
    expect(deps.applicationDefault).not.toHaveBeenCalled();
  });

  test('production mode uses only explicit project and deployment runtime credentials', async () => {
    const target = resolveFirestoreTarget(productionEnv);
    expect(target).toMatchObject({ mode: 'production', projectId: 'production-project' });
    expect(target.emulatorHost).toBeUndefined();
    const deps = adminDoubles();
    await expect(connectFirestoreTarget(target, deps)).resolves.toBe(deps.db);
    expect(deps.probeEmulator).not.toHaveBeenCalled();
    expect(deps.applicationDefault).toHaveBeenCalledTimes(1);
    expect(deps.initializeApp).toHaveBeenCalledWith(expect.objectContaining({
      projectId: 'production-project',
      credential: deps.applicationDefault.mock.results[0].value,
    }));
    expect(deps.getFirestore).toHaveBeenCalledTimes(1);
  });

  test('production credential initialization failure cannot switch to emulator', async () => {
    const deps = adminDoubles();
    deps.applicationDefault.mockImplementation(() => { throw new Error('synthetic missing runtime credentials'); });
    await expect(connectFirestoreTarget(resolveFirestoreTarget(productionEnv), deps)).rejects.toThrow();
    expect(deps.probeEmulator).not.toHaveBeenCalled();
    expect(deps.getFirestore).not.toHaveBeenCalled();
  });

  test('production connector rejects an ambient emulator host before credentials or SDK construction', async () => {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    const deps = adminDoubles();
    await expect(connectFirestoreTarget(resolveFirestoreTarget(productionEnv), deps)).rejects.toThrow();
    expect(deps.hasWellKnownAdc).not.toHaveBeenCalled();
    expect(deps.getMetadataProjectId).not.toHaveBeenCalled();
    expect(deps.applicationDefault).not.toHaveBeenCalled();
    expect(deps.initializeApp).not.toHaveBeenCalled();
    expect(deps.getFirestore).not.toHaveBeenCalled();
  });

  test('production rejects a synthetic well-known gcloud ADC file before credential or SDK construction', async () => {
    const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'libconnect-adc-test-'));
    const previousCloudSdkConfig = process.env.CLOUDSDK_CONFIG;
    try {
      // This marker has no credential content. Its presence alone must block
      // applicationDefault(), which prefers the well-known local ADC file.
      fs.writeFileSync(path.join(temporaryRoot, 'application_default_credentials.json'), '{}');
      process.env.CLOUDSDK_CONFIG = temporaryRoot;
      const deps = adminDoubles();
      delete deps.hasWellKnownAdc; // exercise the real path check, not a mock
      await expect(connectFirestoreTarget(resolveFirestoreTarget(productionEnv), deps)).rejects.toThrow();
      expect(deps.getMetadataProjectId).not.toHaveBeenCalled();
      expect(deps.applicationDefault).not.toHaveBeenCalled();
      expect(deps.initializeApp).not.toHaveBeenCalled();
      expect(deps.getFirestore).not.toHaveBeenCalled();
    } finally {
      if (previousCloudSdkConfig === undefined) delete process.env.CLOUDSDK_CONFIG;
      else process.env.CLOUDSDK_CONFIG = previousCloudSdkConfig;
      const resolved = path.resolve(temporaryRoot);
      if (!resolved.startsWith(`${path.resolve(os.tmpdir())}${path.sep}`)) throw new Error('Unsafe test cleanup path.');
      fs.rmSync(resolved, { recursive: true, force: true });
    }
  });

  test.each([
    ['mismatched', 'another-project'],
    ['unavailable', null],
  ])('production rejects %s metadata project before credential or SDK construction', async (_label, metadataProjectId) => {
    const deps = adminDoubles();
    deps.getMetadataProjectId.mockResolvedValue(metadataProjectId);
    await expect(connectFirestoreTarget(resolveFirestoreTarget(productionEnv), deps)).rejects.toThrow();
    expect(deps.getMetadataProjectId).toHaveBeenCalledTimes(1);
    expect(deps.applicationDefault).not.toHaveBeenCalled();
    expect(deps.initializeApp).not.toHaveBeenCalled();
    expect(deps.getFirestore).not.toHaveBeenCalled();
  });
});
