/** @jest-environment node */
const { normalizeFilters, parseBook, matchesBook, readCatalogPage } = require('../server/catalog/adapter');

const book = (isbn, overrides = {}) => ({ id: isbn, data: () => ({
  isbn, title: 'Synthetic title', author: 'Synthetic author', publicationYear: 2000,
  ...overrides,
}) });

function fakeDb(docs) {
  const calls = [];
  return {
    calls,
    collection(name) {
      expect(name).toBe('books');
      let limit;
      let after;
      return {
        select(...fields) { expect(fields).toEqual(['isbn', 'title', 'author', 'publicationYear', 'publisher', 'category', 'synopsis']); return this; },
        orderBy(field) { expect(field).toBe('__name__'); return this; },
        limit(value) { limit = value; return this; },
        startAfter(value) { after = value; return this; },
        async get() {
          calls.push({ limit, after });
          return { docs: docs.filter((doc) => after === undefined || doc.id > after).slice(0, limit) };
        },
      };
    },
  };
}

test('parses required fields, exact ISBN IDs, and optional fields safely', () => {
  expect(parseBook(book('001')).synopsis).toBe('');
  for (const invalid of [
    book('001', { isbn: '002' }), book('001', { isbn: ' 001' }),
    book('001', { title: ' ' }), book('001', { author: null }),
    book('001', { publicationYear: 2000.5 }), book('001', { publisher: 5 }),
    book('001', { synopsis: {} }),
  ]) expect(parseBook(invalid)).toBeNull();
});

test('matches basic title or author substrings with case and surrounding whitespace', () => {
  const docs = ['tomcat', 'tom', 'bottom', 'tom and jerry', 'unrelated'].map((title, i) =>
    parseBook(book(String(i), { title })));
  expect(docs.filter((entry) => matchesBook(entry, normalizeFilters({ q: ' ToM ' }))).map((entry) => entry.title))
    .toEqual(['tomcat', 'tom', 'bottom', 'tom and jerry']);
  expect(matchesBook(parseBook(book('x', { author: 'ATOMIST' })), normalizeFilters({ q: 'tom' }))).toBe(true);
});

test('combines all advanced substrings, basic term, Unicode case, and inclusive years', () => {
  const record = parseBook(book('ISBN-Ü', {
    title: 'TÖM and Jerry', author: 'Ada Lovelace', publicationYear: 1980,
    publisher: 'Library Press', category: 'Science', synopsis: 'A Synthetic story',
  }));
  const criteria = { q: ' tÖm ', title: 'ÖM', author: 'LOVE', publisher: 'PRESS',
    category: 'SCI', isbn: 'Ü', synopsis: 'story', minYear: 1980, maxYear: 1980 };
  expect(matchesBook(record, normalizeFilters(criteria))).toBe(true);
  expect(matchesBook(record, normalizeFilters({ ...criteria, maxYear: 1979 }))).toBe(false);
  expect(matchesBook(record, normalizeFilters({ ...criteria, author: 'wrong' }))).toBe(false);
  expect(matchesBook(parseBook(book('old', { publicationYear: 1400 })), normalizeFilters())).toBe(true);
});

test('visits every raw chunk once, including sparse last-page matches and terminal empty chunk', async () => {
  const docs = Array.from({ length: 1000 }, (_, i) => book(String(i).padStart(4, '0'),
    { title: i === 999 ? 'Needle' : 'Haystack' }));
  const db = fakeDb(docs);
  const filters = normalizeFilters({ q: 'needle' });
  let after = null;
  let seen = [];
  let count = 0;
  do {
    const page = await readCatalogPage(db, { filters, pageSize: 100, after });
    seen = seen.concat(page.books);
    count += 1;
    after = page.nextCursor ? JSON.parse(Buffer.from(page.nextCursor, 'base64url').toString('utf8')).after : null;
    if (page.scanComplete) break;
  } while (true);
  expect(seen.map((entry) => entry.isbn)).toEqual(['0999']);
  expect(db.calls).toHaveLength(11);
  expect(count).toBe(11);
});

test('distinguishes empty storage, all-invalid storage, and nonmatching valid books', async () => {
  const empty = await readCatalogPage(fakeDb([]), { pageSize: 3 });
  expect(empty).toEqual({ books: [], nextCursor: null, scannedAnyDocument: false, scannedValidBooks: false, scanComplete: true });
  const invalid = await readCatalogPage(fakeDb([book('1', { title: '' })]), { pageSize: 3 });
  expect(invalid.scannedAnyDocument).toBe(true);
  expect(invalid.scannedValidBooks).toBe(false);
  const noMatch = await readCatalogPage(fakeDb([book('1')]), { filters: normalizeFilters({ q: 'absent' }), pageSize: 3 });
  expect(noMatch.scannedValidBooks).toBe(true);
  expect(noMatch.books).toEqual([]);
});
