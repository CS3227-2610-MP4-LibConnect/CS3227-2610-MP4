'use strict';

const { parseArgs, connectProductionSeed, seedProductionBooks, main } = require('../scripts/seed-production-books');
const { seedDocuments } = require('../scripts/seed-local-books');

function fakeDb(existing = new Set()) {
  const created = [];
  let commits = 0;
  return {
    created,
    get commits() { return commits; },
    collection(name) { return { doc(id) { return { name, id }; } }; },
    async getAll(...refs) {
      return refs.map(({ name, id }) => ({ exists: existing.has(`${name}/${id}`) }));
    },
    batch() {
      return {
        create(ref, value) { created.push({ ref, value }); },
        async commit() { commits += 1; },
      };
    },
  };
}

test('production seed creates the same 120 books and 360 copies with stable IDs', async () => {
  const db = fakeDb();
  expect(await seedProductionBooks(db)).toEqual({
    bookCount: 120, copyCount: 360, booksCreated: 120, copiesCreated: 360,
  });
  expect(db.commits).toBe(1);
  expect(db.created).toHaveLength(480);
  expect(db.created.filter(({ ref }) => ref.name === 'books')).toHaveLength(120);
  expect(db.created.filter(({ ref }) => ref.name === 'bookCopies')).toHaveLength(360);
  expect(db.created.every(({ ref, value }) => ref.id === (value.copyId || value.isbn))).toBe(true);
});

test('production rerun preserves existing documents and writes nothing when complete', async () => {
  const { books, copies } = seedDocuments();
  const existing = new Set([
    ...books.map(({ isbn }) => `books/${isbn}`),
    ...copies.map(({ copyId }) => `bookCopies/${copyId}`),
  ]);
  const db = fakeDb(existing);
  expect(await seedProductionBooks(db)).toEqual({
    bookCount: 120, copyCount: 360, booksCreated: 0, copiesCreated: 0,
  });
  expect(db.commits).toBe(0);
  expect(db.created).toHaveLength(0);
});

test('production seed creates only missing IDs when part of the catalog exists', async () => {
  const { books, copies } = seedDocuments();
  const existingBooks = new Set(books.slice(0, 30).map(({ isbn }) => isbn));
  const existing = new Set([...existingBooks].map((isbn) => `books/${isbn}`));
  for (const { copyId, isbn } of copies) {
    if (existingBooks.has(isbn)) existing.add(`bookCopies/${copyId}`);
  }
  const db = fakeDb(existing);
  expect(await seedProductionBooks(db)).toEqual({
    bookCount: 120, copyCount: 360, booksCreated: 90, copiesCreated: 270,
  });
  expect(db.commits).toBe(1);
  expect(db.created).toHaveLength(360);
  expect(db.created.every(({ ref }) => !existing.has(`${ref.name}/${ref.id}`))).toBe(true);
});

test('production seed requires an explicit apply command and project ID', () => {
  expect(parseArgs(['--dry-run'])).toEqual({ dryRun: true });
  expect(parseArgs(['--apply', 'production-project'])).toEqual({ dryRun: false, projectId: 'production-project' });
  for (const args of [[], ['--apply'], ['--apply', ''], ['--apply', 'production-project', 'extra']]) {
    expect(() => parseArgs(args)).toThrow('Usage:');
  }
});

test('dry run does not require or contact a Firestore target', async () => {
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  try {
    await main(['--dry-run'], {});
    expect(log).toHaveBeenCalledWith(expect.stringContaining('120 books and 360 copies'));
  } finally {
    log.mockRestore();
  }
});

test('standalone production connection uses explicit project and application default credentials', () => {
  const credential = { synthetic: true };
  const app = { synthetic: true };
  const db = fakeDb();
  const deps = {
    app: {
      applicationDefault: jest.fn(() => credential),
      initializeApp: jest.fn(() => app),
    },
    firestore: { getFirestore: jest.fn(() => db) },
  };
  expect(connectProductionSeed('production-project', {}, deps)).toBe(db);
  expect(deps.app.initializeApp).toHaveBeenCalledWith({ projectId: 'production-project', credential });
  expect(deps.firestore.getFirestore).toHaveBeenCalledWith(app);
});

test.each([
  { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' },
  { LIBCONNECT_FIRESTORE_MODE: 'local-emulator' },
  { LIBCONNECT_FIRESTORE_PROJECT_ID: 'other-project' },
  { GOOGLE_CLOUD_PROJECT: 'other-project' },
])('standalone production connection rejects conflicting environment before credentials', (env) => {
  const deps = {
    app: { applicationDefault: jest.fn(), initializeApp: jest.fn() },
    firestore: { getFirestore: jest.fn() },
  };
  expect(() => connectProductionSeed('production-project', env, deps)).toThrow('conflicts');
  expect(deps.app.applicationDefault).not.toHaveBeenCalled();
  expect(deps.app.initializeApp).not.toHaveBeenCalled();
  expect(deps.firestore.getFirestore).not.toHaveBeenCalled();
});
