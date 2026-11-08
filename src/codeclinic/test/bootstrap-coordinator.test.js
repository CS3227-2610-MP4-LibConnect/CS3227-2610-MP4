const { parseArgs, bootstrapCoordinator } = require('../scripts/bootstrap-coordinator');
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
