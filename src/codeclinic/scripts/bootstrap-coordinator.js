#!/usr/bin/env node
const { canonicalizeEmail, emailKeyFor } = require('../server/auth/email');

function parseArgs(argv) {
  const options = { allowAdditional: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--project' && argv[i + 1]) options.project = argv[++i];
    else if (argv[i] === '--allow-additional') options.allowAdditional = true;
    else throw new Error('Invalid arguments.');
  }
  if (!options.project || !/^[A-Za-z0-9][A-Za-z0-9-]{4,28}[A-Za-z0-9]$/.test(options.project)) throw new Error('An explicit valid --project is required.');
  return options;
}

async function bootstrapCoordinator(db, email, { allowAdditional = false } = {}) {
  if (!db || typeof db.collection !== 'function' || typeof db.runTransaction !== 'function') throw new TypeError('A Firestore database is required.');
  if (typeof email !== 'string' || !email.trim()) return { outcome: 'invalid-email' };
  const canonical = canonicalizeEmail(email);
  const emailKeyRef = db.collection('emailKeys').doc(emailKeyFor(canonical));
  return db.runTransaction(async (transaction) => {
    const coordinators = db.collection('users').where('accountType', '==', 'TA').where('isManager', '==', true);
    const [keySnapshot, coordinatorSnapshot] = await Promise.all([transaction.get(emailKeyRef), transaction.get(coordinators)]);
    if (!allowAdditional && !coordinatorSnapshot.empty) return { outcome: 'coordinator-exists' };
    if (!keySnapshot.exists) return { outcome: 'account-not-found' };
    const userId = keySnapshot.data().userId;
    const userRef = db.collection('users').doc(userId);
    const userSnapshot = await transaction.get(userRef);
    if (!userSnapshot.exists || userSnapshot.data().userId !== userId) return { outcome: 'account-not-found' };
    const user = userSnapshot.data();
    if (user.accountType !== 'TA') return { outcome: 'not-ta' };
    if (canonicalizeEmail(user.email || '') !== canonical || user.canonicalEmailKey !== canonical) return { outcome: 'account-not-found' };
    transaction.update(userRef, { isManager: true, accountStatus: 'ACTIVE' });
    return { outcome: 'promoted' };
  });
}

async function main(argv = process.argv.slice(2)) {
  let options;
  try { options = parseArgs(argv); } catch { process.stderr.write('Usage: node scripts/bootstrap-coordinator.js --project <project-id> [--allow-additional]\n'); process.exitCode = 2; return; }
  try {
    // Use the modular Admin SDK entry points, as the server does; the
    // namespaced `app.firestore()` API is not available in this SDK version.
    const { initializeApp, deleteApp } = require('firebase-admin/app');
    const { getFirestore } = require('firebase-admin/firestore');
    const app = initializeApp({ projectId: options.project }, `codeclinic-bootstrap-${Date.now()}`);
    const email = process.env.CODECLINIC_COORDINATOR_EMAIL;
    const result = await bootstrapCoordinator(getFirestore(app), email, options);
    const messages = {
      promoted: 'TA Coordinator account activated.',
      'coordinator-exists': 'A TA Coordinator already exists; no changes made.',
      'account-not-found': 'No account matched; no changes made.',
      'not-ta': 'The matching account is not a TA; no changes made.',
      'invalid-email': 'A valid coordinator email is required; no changes made.',
    };
    process.stdout.write(`${messages[result.outcome]}\n`);
    await deleteApp(app);
    if (result.outcome !== 'promoted') process.exitCode = 1;
  } catch {
    process.stderr.write('Bootstrap failed; no sensitive details were printed.\n');
    process.exitCode = 1;
  }
}

if (require.main === module) main();
module.exports = { parseArgs, bootstrapCoordinator, main };
