const crypto = require('crypto');
const argon2 = require('argon2');
const { canonicalizeEmail, emailKeyFor } = require('./login');

function createFirestoreRegistrationPersistence(db) {
  if (!db || typeof db.collection !== 'function' || typeof db.runTransaction !== 'function') {
    throw new TypeError('A Firestore database is required for registration.');
  }

  return {
    async createAccount(input) {
      // The endpoint validates person-entered fields. Re-derive authorization
      // fields here so an alternate caller cannot make a manager or active librarian.
      const librarian = input.accountType === 'LIBRARIAN';
      if (!librarian && input.accountType !== 'MEMBER') throw new TypeError('Invalid account type.');
      const userId = crypto.randomUUID();
      const canonicalEmail = canonicalizeEmail(input.email);
      const emailKey = emailKeyFor(canonicalEmail);
      const passwordHash = await argon2.hash(input.password, {
        type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1,
      });
      const userRef = db.collection('users').doc(userId);
      const keyRef = db.collection('emailKeys').doc(emailKey);
      const user = {
        userId,
        name: input.name,
        email: input.email,
        canonicalEmailKey: canonicalEmail,
        passwordHash,
        accountType: librarian ? 'LIBRARIAN' : 'MEMBER',
        accountStatus: librarian ? 'INACTIVE' : 'ACTIVE',
        registrationDateTime: new Date(),
        ...(librarian ? { employeeId: input.employeeId, isManager: false } : { memberId: userId }),
      };

      try {
        await db.runTransaction(async (transaction) => {
          const existing = await transaction.get(keyRef);
          if (existing.exists) throw Object.assign(new Error('Registration collision.'), { code: 'ALREADY_EXISTS' });
          transaction.create(userRef, user);
          transaction.create(keyRef, { userId });
        });
      } catch (error) {
        // Firestore may report a create precondition failure as a numeric
        // gRPC code, including when two registrations race for the same key.
        if (error && (error.code === 6 || error.code === 'already-exists')) {
          throw Object.assign(new Error('Registration collision.'), { code: 'ALREADY_EXISTS' });
        }
        throw error;
      }
    },
  };
}

module.exports = { createFirestoreRegistrationPersistence };
