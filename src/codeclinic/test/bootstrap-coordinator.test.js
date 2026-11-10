jest.mock('firebase-admin/app', () => ({ initializeApp: jest.fn(() => ({ name: 'bootstrap-test' })), deleteApp: jest.fn(async () => {}) }), { virtual: true });
jest.mock('firebase-admin/firestore', () => ({ getFirestore: jest.fn() }), { virtual: true });
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { parseArgs, bootstrapCoordinator, main } = require('../scripts/bootstrap-coordinator');
const { emailKeyFor } = require('../server/auth/email');

function makeDb(initial = {}) {
  const docs = new Map(Object.entries(initial));
  function snap(path) { const value = docs.get(path); return { exists: value !== undefined, data: () => value, id: path.split('/').pop(), ref: { path } }; }
  function query(collection, filters = []) {
    return { collection, filters, where(field, op, value) { return query(collection, [...filters, [field, op, value]]); } };
  }
  const db = {
    collection(name) { return { doc(id) { const path = `${name}/${id}`; return { path, get: async () => snap(path) }; }, where(field, op, value) { return query(name, [[field, op, value]]); } }; },
    async runTransaction(callback) {
      const writes = [];
      const tx = {
        async get(target) {
          if (typeof target.path === 'string') return snap(target.path);
          const records = [...docs.entries()].filter(([path, value]) => path.startsWith(`${target.collection}/`) && target.filters.every(([field, op, expected]) => op === '==' && value[field] === expected));
          return { empty: records.length === 0, docs: records.map(([path]) => snap(path)) };
        },
        update(ref, value) { writes.push([ref.path, value]); },
      };
      const result = await callback(tx);
      writes.forEach(([path, change]) => docs.set(path, { ...docs.get(path), ...change }));
      return result;
    },
  };
  return { db, docs };
}

const key = emailKeyFor('ta@example.edu');

test('bootstrap requires explicit project and accepts optional additional flag', () => {
  expect(() => parseArgs([])).toThrow();
  expect(() => parseArgs(['--project', 'short'])).toThrow();
  expect(parseArgs(['--project', 'demo-codeclinic', '--allow-additional'])).toEqual({ project: 'demo-codeclinic', allowAdditional: true });
});

test('bootstrap promotes only a TA and activates it without returning the email', async () => {
  const { db, docs } = makeDb({ [`emailKeys/${key}`]: { userId: 'u1' }, 'users/u1': { userId: 'u1', email: 'ta@example.edu', canonicalEmailKey: 'ta@example.edu', accountType: 'TA', accountStatus: 'INACTIVE', isManager: false } });
  const result = await bootstrapCoordinator(db, 'TA@example.edu');
  expect(result).toEqual({ outcome: 'promoted' });
  expect(docs.get('users/u1')).toMatchObject({ isManager: true, accountStatus: 'ACTIVE' });
  expect(JSON.stringify(result)).not.toContain('example.edu');
});

test('bootstrap refuses an existing coordinator unless explicitly allowed', async () => {
  const { db, docs } = makeDb({ [`emailKeys/${key}`]: { userId: 'u1' }, 'users/u1': { userId: 'u1', email: 'ta@example.edu', canonicalEmailKey: 'ta@example.edu', accountType: 'TA', isManager: false, accountStatus: 'INACTIVE' }, 'users/u2': { userId: 'u2', accountType: 'TA', isManager: true, accountStatus: 'ACTIVE' } });
  expect(await bootstrapCoordinator(db, 'ta@example.edu')).toEqual({ outcome: 'coordinator-exists' });
  expect(docs.get('users/u1').isManager).toBe(false);
  expect(await bootstrapCoordinator(db, 'ta@example.edu', { allowAdditional: true })).toEqual({ outcome: 'promoted' });
});

test('bootstrap refuses a missing or non-TA account without changing it', async () => {
  const { db, docs } = makeDb({ [`emailKeys/${key}`]: { userId: 'student' }, 'users/student': { userId: 'student', email: 'ta@example.edu', canonicalEmailKey: 'ta@example.edu', accountType: 'STUDENT', isManager: false, accountStatus: 'ACTIVE' } });
  expect(await bootstrapCoordinator(db, 'missing@example.edu')).toEqual({ outcome: 'account-not-found' });
  expect(await bootstrapCoordinator(db, 'ta@example.edu')).toEqual({ outcome: 'not-ta' });
  expect(docs.get('users/student').accountType).toBe('STUDENT');
});

test('the CLI entry point connects through the modular Admin SDK and promotes the TA', async () => {
  const key = emailKeyFor('ta@example.edu');
  const { db, docs } = makeDb({ [`emailKeys/${key}`]: { userId: 'ta' }, 'users/ta': { userId: 'ta', email: 'ta@example.edu', canonicalEmailKey: 'ta@example.edu', accountType: 'TA', isManager: false, accountStatus: 'INACTIVE' } });
  initializeApp.mockReturnValue({ name: 'bootstrap-test' });
  deleteApp.mockResolvedValue(undefined);
  getFirestore.mockReturnValue(db);
  const stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  const originalEmail = process.env.CODECLINIC_COORDINATOR_EMAIL;
  const originalExitCode = process.exitCode;
  process.env.CODECLINIC_COORDINATOR_EMAIL = 'ta@example.edu';
  try {
    await main(['--project', 'demo-codeclinic']);
    expect(initializeApp).toHaveBeenCalledWith({ projectId: 'demo-codeclinic' }, expect.any(String));
    expect(getFirestore).toHaveBeenCalledWith({ name: 'bootstrap-test' });
    expect(deleteApp).toHaveBeenCalledWith({ name: 'bootstrap-test' });
    expect(stdout).toHaveBeenCalledWith('TA Coordinator account activated.\n');
    expect(stderr).not.toHaveBeenCalled();
    expect(docs.get('users/ta')).toMatchObject({ isManager: true, accountStatus: 'ACTIVE' });
  } finally {
    stdout.mockRestore();
    stderr.mockRestore();
    if (originalEmail === undefined) delete process.env.CODECLINIC_COORDINATOR_EMAIL;
    else process.env.CODECLINIC_COORDINATOR_EMAIL = originalEmail;
    process.exitCode = originalExitCode;
  }
});
