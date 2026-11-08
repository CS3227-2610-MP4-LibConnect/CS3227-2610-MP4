const { canonicalizeEmail, emailKeyFor } = require('../auth/email');
const { isVersionedArgon2idHash } = require('../auth/login');
const { createFirestoreAuthStore } = require('../auth/firestore-store');

const MAX_PAGE_SIZE = 50;
const ACCOUNT_TYPES = ['STUDENT', 'TA'];
const ACCOUNT_STATUSES = ['ACTIVE', 'INACTIVE'];
const USER_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const SESSION_HASH_PATTERN = /^[a-f0-9]{64}$/;

function storeError(code, message) {
  return Object.assign(new Error(message), { code });
}

function isUserId(value) {
  return typeof value === 'string' && USER_ID_PATTERN.test(value);
}

function toIsoString(value) {
  let millis = NaN;
  if (value instanceof Date) millis = value.getTime();
  else if (value && typeof value.toMillis === 'function') millis = value.toMillis();
  return Number.isFinite(millis) ? new Date(millis).toISOString() : null;
}

/** The only account fields a support list may return (spec R1). */
function toListEntry(record) {
  return {
    userId: record.userId,
    name: typeof record.name === 'string' ? record.name : '',
    email: typeof record.email === 'string' ? record.email : '',
    accountType: record.accountType,
    accountStatus: record.accountStatus,
    registrationDateTime: toIsoString(record.registrationDateTime),
  };
}

function createFirestoreAccountStore(db, authStore = createFirestoreAuthStore(db)) {
  if (!db || typeof db.collection !== 'function' || typeof db.runTransaction !== 'function') {
    throw new TypeError('A Firestore database is required for account management.');
  }
  if (!authStore || typeof authStore.deleteSessionsForUser !== 'function') {
    throw new TypeError('An authentication store with session deletion is required.');
  }

  function userRef(userId) {
    return db.collection('users').doc(userId);
  }

  function emailKeyRef(key) {
    return db.collection('emailKeys').doc(key);
  }

  async function readUser(transaction, userId) {
    const snapshot = await transaction.get(userRef(userId));
    const record = snapshot.exists ? snapshot.data() : null;
    if (!record || record.userId !== userId) throw storeError('NOT_FOUND', 'Account not found.');
    return record;
  }

  return {
    /** Returns the stored account record, or `null` when absent or malformed. */
    async getAccount(userId) {
      if (!isUserId(userId)) return null;
      const snapshot = await userRef(userId).get();
      const record = snapshot.exists ? snapshot.data() : null;
      if (!record || record.userId !== userId || !ACCOUNT_TYPES.includes(record.accountType) ||
          !ACCOUNT_STATUSES.includes(record.accountStatus)) return null;
      return record;
    },

    /** Lists one account type in user ID order; `cursor` is the last user ID of the previous page. */
    async listAccountsByType(accountType, { pageSize = MAX_PAGE_SIZE, cursor } = {}) {
      if (!ACCOUNT_TYPES.includes(accountType)) throw storeError('INVALID', 'Invalid account type.');
      if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
        throw storeError('INVALID', 'Invalid page size.');
      }
      if (cursor !== undefined && cursor !== null && !isUserId(cursor)) {
        throw storeError('INVALID', 'Invalid page cursor.');
      }
      let query = db.collection('users').where('accountType', '==', accountType).orderBy('__name__');
      if (cursor) query = query.startAfter(cursor);
      const snapshot = await query.limit(pageSize + 1).get();
      const records = snapshot.docs.map((doc) => doc.data())
        .filter((record) => record && record.accountType === accountType && isUserId(record.userId));
      const hasMore = snapshot.docs.length > pageSize;
      const page = records.slice(0, pageSize);
      return {
        accounts: page.map(toListEntry),
        nextCursor: hasMore ? snapshot.docs[pageSize - 1].id : null,
      };
    },

    /**
     * Updates the name and/or email in one transaction. An email change moves
     * the `emailKeys` entry; a key owned by another account is `ALREADY_EXISTS`.
     */
    async updateProfile(userId, { name, email } = {}) {
      if (!isUserId(userId)) throw storeError('INVALID', 'Invalid user ID.');
      if (name === undefined && email === undefined) throw storeError('INVALID', 'No profile change.');
      if (name !== undefined && (typeof name !== 'string' || !name.trim())) throw storeError('INVALID', 'Invalid name.');
      if (email !== undefined && (typeof email !== 'string' || !email.trim())) throw storeError('INVALID', 'Invalid email.');
      try {
        return await db.runTransaction(async (transaction) => {
          const record = await readUser(transaction, userId);
          const changes = {};
          if (name !== undefined) changes.name = name.trim();
          let newKeyRef = null;
          let oldKeyRef = null;
          if (email !== undefined) {
            const displayEmail = email.trim();
            const canonical = canonicalizeEmail(displayEmail);
            changes.email = displayEmail;
            if (canonical !== record.canonicalEmailKey) {
              newKeyRef = emailKeyRef(emailKeyFor(canonical));
              const existing = await transaction.get(newKeyRef);
              if (existing.exists) throw storeError('ALREADY_EXISTS', 'Email is unavailable.');
              if (typeof record.canonicalEmailKey === 'string' && record.canonicalEmailKey) {
                oldKeyRef = emailKeyRef(emailKeyFor(record.canonicalEmailKey));
                const oldKey = await transaction.get(oldKeyRef);
                if (!oldKey.exists || oldKey.data().userId !== userId) oldKeyRef = null;
              }
              changes.canonicalEmailKey = canonical;
            }
          }
          if (newKeyRef) transaction.create(newKeyRef, { userId });
          if (oldKeyRef) transaction.delete(oldKeyRef);
          transaction.update(userRef(userId), changes);
          return { emailKeyMoved: Boolean(newKeyRef) };
        });
      } catch (error) {
        if (error && (error.code === 6 || error.code === 'already-exists')) {
          throw storeError('ALREADY_EXISTS', 'Email is unavailable.');
        }
        throw error;
      }
    },

    /** Sets `ACTIVE` or `INACTIVE`; deactivation deletes all sessions in the same transaction (R5). */
    async setAccountStatus(userId, accountStatus) {
      if (!isUserId(userId)) throw storeError('INVALID', 'Invalid user ID.');
      if (!ACCOUNT_STATUSES.includes(accountStatus)) throw storeError('INVALID', 'Invalid account status.');
      return db.runTransaction(async (transaction) => {
        const record = await readUser(transaction, userId);
        if (record.accountStatus === accountStatus) return { changed: false, sessionsDeleted: 0 };
        const sessionsDeleted = accountStatus === 'INACTIVE'
          ? await authStore.deleteSessionsForUser(userId, { transaction })
          : 0;
        transaction.update(userRef(userId), { accountStatus });
        return { changed: true, sessionsDeleted };
      });
    },

    /**
     * Stores a new Argon2id hash and `mustChangePassword` flag, deleting the
     * user's sessions in the same transaction. `keepSessionIdHash` keeps the
     * caller's own session (R3); omit it to delete every session (R6).
     */
    async setPasswordHash(userId, passwordHash, { mustChangePassword, keepSessionIdHash } = {}) {
      if (!isUserId(userId)) throw storeError('INVALID', 'Invalid user ID.');
      if (!isVersionedArgon2idHash(passwordHash)) throw storeError('INVALID', 'Invalid password hash.');
      if (typeof mustChangePassword !== 'boolean') throw storeError('INVALID', 'Invalid password-change flag.');
      if (keepSessionIdHash !== undefined && !(typeof keepSessionIdHash === 'string' && SESSION_HASH_PATTERN.test(keepSessionIdHash))) {
        throw storeError('INVALID', 'Invalid session.');
      }
      return db.runTransaction(async (transaction) => {
        await readUser(transaction, userId);
        const sessionsDeleted = await authStore.deleteSessionsForUser(userId, {
          transaction, exceptIdHash: keepSessionIdHash,
        });
        transaction.update(userRef(userId), { passwordHash, mustChangePassword });
        return { sessionsDeleted };
      });
    },

    /** Deletes all sessions of a user, optionally keeping one session hash. */
    async deleteSessionsForUser(userId, { exceptIdHash } = {}) {
      if (!isUserId(userId)) throw storeError('INVALID', 'Invalid user ID.');
      return authStore.deleteSessionsForUser(userId, { exceptIdHash });
    },
  };
}

module.exports = { MAX_PAGE_SIZE, createFirestoreAccountStore, toListEntry };
