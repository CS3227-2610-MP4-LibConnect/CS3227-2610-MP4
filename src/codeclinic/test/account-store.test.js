const { createFirestoreAuthStore } = require('../server/auth/firestore-store');
const { createFirestoreAccountStore, MAX_PAGE_SIZE } = require('../server/account/store');
const { emailKeyFor } = require('../server/auth/email');

// Synthetic, well-formed Argon2id strings; no real password material.
const HASH_A = `$argon2id$v=19$m=19456,t=2,p=1$${'A'.repeat(22)}$${'B'.repeat(43)}`;
const HASH_B = `$argon2id$v=19$m=19456,t=2,p=1$${'C'.repeat(22)}$${'D'.repeat(43)}`;

function clone(value) {
  if (value instanceof Date) return new Date(value.getTime());
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clone(v)]));
  return value;
}

function makeDb(initial = {}) {
  const documents = new Map(Object.entries(initial).map(([key, value]) => [key, clone(value)]));
  const state = { beforeCommit: null, transactions: 0 };

  function docRef(collection, id) {
    return { key: `${collection}/${id}`, id, async get() { return snap(this.key, id); } };
  }
  function snap(key, id) {
    const value = documents.get(key);
    return { exists: value !== undefined, id, data: () => clone(value) };
  }
  function makeQuery(collection, filters = [], after = null, max = Infinity) {
    return {
      isQuery: true,
      where(field, op, value) {
        if (op !== '==') throw new Error('unsupported');
        return makeQuery(collection, [...filters, [field, value]], after, max);
      },
      orderBy(field) {
        if (field !== '__name__') throw new Error('unsupported');
        return makeQuery(collection, filters, after, max);
      },
      startAfter(id) { return makeQuery(collection, filters, id, max); },
      limit(n) { return makeQuery(collection, filters, after, n); },
      run() {
        const prefix = `${collection}/`;
        const docs = [...documents.keys()]
          .filter((key) => key.startsWith(prefix))
          .map((key) => key.slice(prefix.length))
          .sort()
          .filter((id) => after === null || id > after)
          .filter((id) => filters.every(([field, value]) => documents.get(prefix + id)[field] === value))
          .slice(0, max)
          .map((id) => ({ ...snap(prefix + id, id), ref: docRef(collection, id) }));
        return { docs };
      },
      async get() { return this.run(); },
    };
  }

  return {
    documents,
    state,
    collection(name) {
      return { doc: (id) => docRef(name, id), where: (...args) => makeQuery(name).where(...args) };
    },
    async runTransaction(callback) {
      state.transactions += 1;
      const writes = [];
      let wrote = false;
      const transaction = {
        async get(target) {
          if (wrote) throw new Error('Firestore transactions require all reads before writes.');
          return target.isQuery ? target.run() : snap(target.key, target.id);
        },
        create(ref, value) {
          wrote = true;
          writes.push(() => {
            if (documents.has(ref.key)) throw Object.assign(new Error('exists'), { code: 6 });
            documents.set(ref.key, clone(value));
          });
        },
        update(ref, value) {
          wrote = true;
          writes.push(() => documents.set(ref.key, { ...documents.get(ref.key), ...clone(value) }));
        },
        set(ref, value) { wrote = true; writes.push(() => documents.set(ref.key, clone(value))); },
        delete(ref) { wrote = true; writes.push(() => documents.delete(ref.key)); },
      };
      const result = await callback(transaction);
      if (state.beforeCommit) { const hook = state.beforeCommit; state.beforeCommit = null; hook(documents); }
      const snapshot = new Map(documents);
      try {
        writes.forEach((write) => write());
      } catch (error) {
        documents.clear();
        snapshot.forEach((value, key) => documents.set(key, value));
        throw error;
      }
      return result;
    },
  };
}

function user(userId, overrides = {}) {
  const email = overrides.email || `${userId}@example.test`;
  return {
    userId, name: `Name ${userId}`, email, canonicalEmailKey: email.toLowerCase(), passwordHash: HASH_A,
    accountType: 'STUDENT', accountStatus: 'ACTIVE', registrationDateTime: new Date(Date.UTC(2026, 0, 2)),
    studentId: userId, ...overrides,
  };
}

function seed(users, sessions = {}) {
  const initial = {};
  for (const record of users) {
    initial[`users/${record.userId}`] = record;
    initial[`emailKeys/${emailKeyFor(record.canonicalEmailKey)}`] = { userId: record.userId };
  }
  for (const [id, userId] of Object.entries(sessions)) {
    initial[`loginSessions/${id}`] = { userId, accountTypeAtIssue: 'STUDENT', csrfTokenHash: 'f'.repeat(64) };
  }
  const db = makeDb(initial);
  return { db, store: createFirestoreAccountStore(db) };
}

const sid = (c) => c.repeat(64);

describe('account store construction', () => {
  test('requires a Firestore-like database and session deletion', () => {
    expect(() => createFirestoreAccountStore(null)).toThrow(TypeError);
    expect(() => createFirestoreAccountStore(makeDb(), {})).toThrow(TypeError);
  });
});

describe('getAccount', () => {
  test('returns the stored record and null for missing, malformed, or invalid IDs', async () => {
    const { store, db } = seed([user('u1')]);
    db.documents.set('users/bad', { userId: 'other', accountType: 'STUDENT', accountStatus: 'ACTIVE' });
    expect((await store.getAccount('u1')).userId).toBe('u1');
    expect(await store.getAccount('missing')).toBeNull();
    expect(await store.getAccount('bad')).toBeNull();
    expect(await store.getAccount('../users/u1')).toBeNull();
    expect(await store.getAccount({ userId: 'u1' })).toBeNull();
  });
});

describe('listAccountsByType', () => {
  test('returns only the allowed fields for one type', async () => {
    const { store } = seed([user('s1'), user('t1', { accountType: 'TA', isManager: true, employeeId: 'E1' })]);
    const page = await store.listAccountsByType('STUDENT');
    expect(page).toEqual({
      accounts: [{
        userId: 's1', name: 'Name s1', email: 's1@example.test', accountType: 'STUDENT',
        accountStatus: 'ACTIVE', registrationDateTime: '2026-01-02T00:00:00.000Z',
      }],
      nextCursor: null,
    });
    const tas = await store.listAccountsByType('TA');
    expect(tas.accounts.map((a) => a.userId)).toEqual(['t1']);
    expect(tas.accounts[0]).not.toHaveProperty('passwordHash');
    expect(tas.accounts[0]).not.toHaveProperty('isManager');
    expect(tas.accounts[0]).not.toHaveProperty('employeeId');
  });

  test('paginates at most 50 per page with a cursor', async () => {
    const ids = Array.from({ length: 53 }, (_, i) => `s${String(i).padStart(3, '0')}`);
    const { store } = seed(ids.map((id) => user(id)));
    const first = await store.listAccountsByType('STUDENT');
    expect(first.accounts).toHaveLength(MAX_PAGE_SIZE);
    expect(first.nextCursor).toBe('s049');
    const second = await store.listAccountsByType('STUDENT', { cursor: first.nextCursor });
    expect(second.accounts.map((a) => a.userId)).toEqual(['s050', 's051', 's052']);
    expect(second.nextCursor).toBeNull();
    const small = await store.listAccountsByType('STUDENT', { pageSize: 2 });
    expect(small.accounts).toHaveLength(2);
    expect(small.nextCursor).toBe('s001');
  });

  test('rejects invalid type, page size, and cursor', async () => {
    const { store } = seed([]);
    await expect(store.listAccountsByType('ADMIN')).rejects.toMatchObject({ code: 'INVALID' });
    await expect(store.listAccountsByType('STUDENT', { pageSize: 51 })).rejects.toMatchObject({ code: 'INVALID' });
    await expect(store.listAccountsByType('STUDENT', { pageSize: 0 })).rejects.toMatchObject({ code: 'INVALID' });
    await expect(store.listAccountsByType('STUDENT', { cursor: 'a/b' })).rejects.toMatchObject({ code: 'INVALID' });
  });
});

describe('updateProfile', () => {
  test('changes the name only', async () => {
    const { store, db } = seed([user('u1')]);
    await expect(store.updateProfile('u1', { name: '  New Name ' })).resolves.toEqual({ emailKeyMoved: false });
    expect(db.documents.get('users/u1').name).toBe('New Name');
  });

  test('moves the email key atomically on an email change', async () => {
    const { store, db } = seed([user('u1')]);
    await expect(store.updateProfile('u1', { email: ' New@Example.test ' })).resolves.toEqual({ emailKeyMoved: true });
    const record = db.documents.get('users/u1');
    expect(record.email).toBe('New@Example.test');
    expect(record.canonicalEmailKey).toBe('new@example.test');
    expect(db.documents.get(`emailKeys/${emailKeyFor('new@example.test')}`)).toEqual({ userId: 'u1' });
    expect(db.documents.has(`emailKeys/${emailKeyFor('u1@example.test')}`)).toBe(false);
  });

  test('a case-only email change keeps the key', async () => {
    const { store, db } = seed([user('u1')]);
    await expect(store.updateProfile('u1', { email: 'U1@Example.test' })).resolves.toEqual({ emailKeyMoved: false });
    expect(db.documents.get('users/u1').email).toBe('U1@Example.test');
    expect(db.documents.get(`emailKeys/${emailKeyFor('u1@example.test')}`)).toEqual({ userId: 'u1' });
  });

  test('a collision with another account returns ALREADY_EXISTS and changes nothing', async () => {
    const { store, db } = seed([user('u1'), user('u2')]);
    const before = new Map(db.documents);
    await expect(store.updateProfile('u1', { name: 'X', email: 'U2@example.test' }))
      .rejects.toMatchObject({ code: 'ALREADY_EXISTS' });
    expect(db.documents).toEqual(before);
  });

  test('a registration racing for the new key fails with ALREADY_EXISTS and leaves no orphan key', async () => {
    const { store, db } = seed([user('u1')]);
    const newKey = `emailKeys/${emailKeyFor('race@example.test')}`;
    db.state.beforeCommit = (docs) => docs.set(newKey, { userId: 'racer' });
    await expect(store.updateProfile('u1', { email: 'race@example.test' })).rejects.toMatchObject({ code: 'ALREADY_EXISTS' });
    expect(db.documents.get(newKey)).toEqual({ userId: 'racer' });
    expect(db.documents.get(`emailKeys/${emailKeyFor('u1@example.test')}`)).toEqual({ userId: 'u1' });
    expect(db.documents.get('users/u1').canonicalEmailKey).toBe('u1@example.test');
  });

  test('does not delete an old key owned by someone else', async () => {
    const { store, db } = seed([user('u1')]);
    db.documents.set(`emailKeys/${emailKeyFor('u1@example.test')}`, { userId: 'other' });
    await store.updateProfile('u1', { email: 'fresh@example.test' });
    expect(db.documents.get(`emailKeys/${emailKeyFor('u1@example.test')}`)).toEqual({ userId: 'other' });
  });

  test('ignores fields other than name and email', async () => {
    const { store, db } = seed([user('u1')]);
    await store.updateProfile('u1', { name: 'N', accountType: 'TA', isManager: true, passwordHash: HASH_B });
    const record = db.documents.get('users/u1');
    expect(record).toMatchObject({ accountType: 'STUDENT', passwordHash: HASH_A });
    expect(record).not.toHaveProperty('isManager');
  });

  test('rejects invalid input and missing accounts', async () => {
    const { store } = seed([user('u1')]);
    await expect(store.updateProfile('u1', {})).rejects.toMatchObject({ code: 'INVALID' });
    await expect(store.updateProfile('u1', { name: ' ' })).rejects.toMatchObject({ code: 'INVALID' });
    await expect(store.updateProfile('u1', { email: 5 })).rejects.toMatchObject({ code: 'INVALID' });
    await expect(store.updateProfile('a/b', { name: 'N' })).rejects.toMatchObject({ code: 'INVALID' });
    await expect(store.updateProfile('nobody', { name: 'N' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('setAccountStatus', () => {
  test('deactivation deletes every session of the target in the same transaction', async () => {
    const { store, db } = seed([user('u1'), user('u2')], { [sid('a')]: 'u1', [sid('b')]: 'u1', [sid('c')]: 'u2' });
    const before = db.state.transactions;
    await expect(store.setAccountStatus('u1', 'INACTIVE')).resolves.toEqual({ changed: true, sessionsDeleted: 2 });
    expect(db.state.transactions - before).toBe(1);
    expect(db.documents.get('users/u1').accountStatus).toBe('INACTIVE');
    expect(db.documents.has(`loginSessions/${sid('a')}`)).toBe(false);
    expect(db.documents.has(`loginSessions/${sid('b')}`)).toBe(false);
    expect(db.documents.has(`loginSessions/${sid('c')}`)).toBe(true);
  });

  test('activation changes only the status and repeats are no-ops', async () => {
    const { store, db } = seed([user('u1', { accountStatus: 'INACTIVE' })], { [sid('a')]: 'u1' });
    await expect(store.setAccountStatus('u1', 'ACTIVE')).resolves.toEqual({ changed: true, sessionsDeleted: 0 });
    expect(db.documents.has(`loginSessions/${sid('a')}`)).toBe(true);
    await expect(store.setAccountStatus('u1', 'ACTIVE')).resolves.toEqual({ changed: false, sessionsDeleted: 0 });
    expect(db.documents.get('users/u1').accountStatus).toBe('ACTIVE');
  });

  test('rejects invalid status and missing accounts', async () => {
    const { store } = seed([user('u1')]);
    await expect(store.setAccountStatus('u1', 'DELETED')).rejects.toMatchObject({ code: 'INVALID' });
    await expect(store.setAccountStatus('nobody', 'INACTIVE')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('setPasswordHash', () => {
  test('keeps the caller session and deletes the others (self-service change)', async () => {
    const { store, db } = seed([user('u1', { mustChangePassword: true })], { [sid('a')]: 'u1', [sid('b')]: 'u1' });
    await expect(store.setPasswordHash('u1', HASH_B, { mustChangePassword: false, keepSessionIdHash: sid('a') }))
      .resolves.toEqual({ sessionsDeleted: 1 });
    expect(db.documents.get('users/u1')).toMatchObject({ passwordHash: HASH_B, mustChangePassword: false });
    expect(db.documents.has(`loginSessions/${sid('a')}`)).toBe(true);
    expect(db.documents.has(`loginSessions/${sid('b')}`)).toBe(false);
  });

  test('deletes every session for a reset and sets mustChangePassword', async () => {
    const { store, db } = seed([user('u1')], { [sid('a')]: 'u1', [sid('b')]: 'u1' });
    await expect(store.setPasswordHash('u1', HASH_B, { mustChangePassword: true })).resolves.toEqual({ sessionsDeleted: 2 });
    expect(db.documents.get('users/u1')).toMatchObject({ passwordHash: HASH_B, mustChangePassword: true });
    expect([...db.documents.keys()].some((k) => k.startsWith('loginSessions/'))).toBe(false);
  });

  test('rejects non-Argon2id hashes, missing flags, bad session hashes, and missing accounts', async () => {
    const { store, db } = seed([user('u1')]);
    await expect(store.setPasswordHash('u1', 'plain', { mustChangePassword: false })).rejects.toMatchObject({ code: 'INVALID' });
    await expect(store.setPasswordHash('u1', HASH_B, {})).rejects.toMatchObject({ code: 'INVALID' });
    await expect(store.setPasswordHash('u1', HASH_B, { mustChangePassword: false, keepSessionIdHash: 'x' }))
      .rejects.toMatchObject({ code: 'INVALID' });
    await expect(store.setPasswordHash('nobody', HASH_B, { mustChangePassword: false })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(db.documents.get('users/u1').passwordHash).toBe(HASH_A);
  });
});

describe('deleteSessionsForUser', () => {
  test('deletes all sessions of one user through the auth store session collection', async () => {
    const { store, db } = seed([user('u1')], { [sid('a')]: 'u1', [sid('b')]: 'u1', [sid('c')]: 'u2' });
    await expect(store.deleteSessionsForUser('u1', { exceptIdHash: sid('b') })).resolves.toBe(1);
    expect(db.documents.has(`loginSessions/${sid('b')}`)).toBe(true);
    await expect(store.deleteSessionsForUser('u1')).resolves.toBe(1);
    expect(db.documents.has(`loginSessions/${sid('c')}`)).toBe(true);
    await expect(store.deleteSessionsForUser('a/b')).rejects.toMatchObject({ code: 'INVALID' });
  });

  test('auth store operation validates the user ID', async () => {
    const authStore = createFirestoreAuthStore(makeDb());
    await expect(authStore.deleteSessionsForUser('')).rejects.toThrow(TypeError);
    await expect(authStore.deleteSessionsForUser('u1')).resolves.toBe(0);
  });
});