'use strict';

const { seedDocuments } = require('./seed-local-books');

function connectProductionSeed(projectId, env = process.env, deps = {}) {
  if (env.FIRESTORE_EMULATOR_HOST !== undefined ||
      (env.LIBCONNECT_FIRESTORE_MODE !== undefined && env.LIBCONNECT_FIRESTORE_MODE !== 'production') ||
      (env.LIBCONNECT_FIRESTORE_PROJECT_ID !== undefined && env.LIBCONNECT_FIRESTORE_PROJECT_ID !== projectId) ||
      (env.GOOGLE_CLOUD_PROJECT !== undefined && env.GOOGLE_CLOUD_PROJECT !== projectId)) {
    throw new Error('Production seed target conflicts with the configured Firestore environment.');
  }
  const { applicationDefault, initializeApp } = deps.app || require('firebase-admin/app');
  const { getFirestore } = deps.firestore || require('firebase-admin/firestore');
  const app = initializeApp({ projectId, credential: applicationDefault() });
  return getFirestore(app);
}

async function seedProductionBooks(db) {
  const { books, copies } = seedDocuments();
  const entries = [
    ...books.map((book) => ({ ref: db.collection('books').doc(book.isbn), value: book, kind: 'book' })),
    ...copies.map((copy) => ({ ref: db.collection('bookCopies').doc(copy.copyId), value: copy, kind: 'copy' })),
  ];
  const snapshots = await db.getAll(...entries.map(({ ref }) => ref));
  if (snapshots.length !== entries.length) throw new Error('Production seed preflight returned an incomplete result.');
  const missing = entries.filter((_, index) => !snapshots[index].exists);
  if (missing.length > 0) {
    const batch = db.batch();
    for (const { ref, value } of missing) batch.create(ref, value);
    await batch.commit();
  }
  return {
    bookCount: books.length, copyCount: copies.length,
    booksCreated: missing.filter(({ kind }) => kind === 'book').length,
    copiesCreated: missing.filter(({ kind }) => kind === 'copy').length,
  };
}

function parseArgs(args) {
  if (args.length === 1 && args[0] === '--dry-run') return { dryRun: true };
  if (args.length === 2 && args[0] === '--apply' && args[1].trim()) {
    return { dryRun: false, projectId: args[1] };
  }
  throw new Error('Usage: node scripts/seed-production-books.js --dry-run | --apply <production-project-id>');
}

async function main(args = process.argv.slice(2), env = process.env) {
  const options = parseArgs(args);
  const { books, copies } = seedDocuments();
  if (options.dryRun) {
    console.log(`Production seed plan: ${books.length} books and ${copies.length} copies; only missing IDs will be created.`);
    return;
  }

  const db = connectProductionSeed(options.projectId, env);
  try {
    const result = await seedProductionBooks(db);
    console.log(`Production seed for ${options.projectId}: created ${result.booksCreated} of ${result.bookCount} books and ${result.copiesCreated} of ${result.copyCount} copies; existing IDs were preserved.`);
  } finally {
    await db.terminate();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Production seed failed: ${error.code === 6 || error.code === 'already-exists'
      ? 'A target document appeared during seeding; the create-only batch was rejected.'
      : error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { parseArgs, connectProductionSeed, seedProductionBooks, main };
