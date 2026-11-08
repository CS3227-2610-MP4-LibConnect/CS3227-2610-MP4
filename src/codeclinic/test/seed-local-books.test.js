'use strict';

const { seedDocuments, seedLocalBooks } = require('../scripts/seed-local-books');

test('local seed has 120 ISBN-keyed books and three available copies per book', () => {
  const { books, copies } = seedDocuments();
  expect(books).toHaveLength(120);
  expect(copies).toHaveLength(360);
  expect(new Set(books.map((book) => book.isbn)).size).toBe(120);
  expect(new Set(books.map((book) => book.title)).size).toBe(120);
  expect(new Set(copies.map((copy) => copy.copyId)).size).toBe(360);
  for (const book of books) {
    expect(book.isbn).toMatch(/^\d{13}$/);
    expect(typeof book.title).toBe('string');
    expect(typeof book.author).toBe('string');
    expect(Number.isInteger(book.publicationYear)).toBe(true);
    expect(copies.filter((copy) => copy.isbn === book.isbn)).toHaveLength(3);
  }
  for (const copy of copies) {
    expect(copy.status).toBe('AVAILABLE');
    expect(copy.copyId.startsWith(`${copy.isbn}-`)).toBe(true);
  }
});

function fakeDb(existing = new Set()) {
  const staged = [];
  const commits = [];
  const db = {
    collection(name) { return { doc(id) { return { collection: name, id }; } }; },
    async getAll(...refs) {
      return refs.map((ref) => ({ exists: existing.has(`${ref.collection}/${ref.id}`) }));
    },
    batch() {
      return {
        create(ref, value) { staged.push({ ref, value }); },
        async commit() { commits.push(staged.slice()); },
      };
    },
  };
  return { db, staged, commits };
}

test('local seed creates all missing documents in one create-only batch', async () => {
  const { db, staged, commits } = fakeDb();
  expect(await seedLocalBooks(db)).toEqual({ bookCount: 120, copyCount: 360, booksCreated: 120, copiesCreated: 360 });
  expect(commits).toHaveLength(1);
  expect(staged).toHaveLength(480);
  expect(staged.filter(({ ref }) => ref.collection === 'books')).toHaveLength(120);
  expect(staged.filter(({ ref }) => ref.collection === 'bookCopies')).toHaveLength(360);
  expect(staged.every(({ ref, value }) => ref.id === (value.copyId || value.isbn))).toBe(true);
});

test('rerun preserves the first thirty books and their copies, creating only the other ninety', async () => {
  const { books, copies } = seedDocuments();
  const firstThirty = new Set(books.slice(0, 30).map((book) => `books/${book.isbn}`));
  for (const copy of copies.filter((item) => firstThirty.has(`books/${item.isbn}`))) firstThirty.add(`bookCopies/${copy.copyId}`);
  const { db, staged, commits } = fakeDb(firstThirty);
  expect(await seedLocalBooks(db)).toEqual({ bookCount: 120, copyCount: 360, booksCreated: 90, copiesCreated: 270 });
  expect(commits).toHaveLength(1);
  expect(staged).toHaveLength(360);
  expect(staged.every(({ ref }) => !firstThirty.has(`${ref.collection}/${ref.id}`))).toBe(true);
});

test('fully seeded emulator causes no write batch', async () => {
  const { books, copies } = seedDocuments();
  const existing = new Set([
    ...books.map((book) => `books/${book.isbn}`),
    ...copies.map((copy) => `bookCopies/${copy.copyId}`),
  ]);
  const { db, staged, commits } = fakeDb(existing);
  expect(await seedLocalBooks(db)).toEqual({ bookCount: 120, copyCount: 360, booksCreated: 0, copiesCreated: 0 });
  expect(staged).toHaveLength(0);
  expect(commits).toHaveLength(0);
});
