const crypto = require('crypto');

const DISPLAY_FIELDS = ['isbn', 'title', 'author', 'publicationYear', 'publisher', 'category', 'synopsis'];
const FILTER_FIELDS = ['q', 'title', 'author', 'publisher', 'category', 'isbn', 'synopsis'];

function normalizeFilters(input = {}) {
  const filters = {};
  for (const field of FILTER_FIELDS) filters[field] = (input[field] || '').trim().toLowerCase();
  filters.minYear = input.minYear == null ? null : input.minYear;
  filters.maxYear = input.maxYear == null ? null : input.maxYear;
  return filters;
}

function filterHash(filters) {
  return crypto.createHash('sha256').update(JSON.stringify([
    ...FILTER_FIELDS.map((field) => filters[field]), filters.minYear, filters.maxYear,
  ])).digest('hex');
}

function parseBook(doc) {
  if (!doc || typeof doc.id !== 'string' || typeof doc.data !== 'function') return null;
  const data = doc.data();
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  if (typeof data.isbn !== 'string' || !data.isbn || data.isbn !== data.isbn.trim() || doc.id !== data.isbn ||
      typeof data.title !== 'string' || !data.title.trim() ||
      typeof data.author !== 'string' || !data.author.trim() ||
      !Number.isSafeInteger(data.publicationYear)) return null;
  for (const field of ['publisher', 'category', 'synopsis']) {
    if (data[field] !== undefined && typeof data[field] !== 'string') return null;
  }
  return {
    isbn: data.isbn, title: data.title, author: data.author,
    publicationYear: data.publicationYear,
    publisher: data.publisher || '', category: data.category || '', synopsis: data.synopsis || '',
  };
}

function matchesBook(book, filters) {
  if (filters.q && ![book.title, book.author].some((value) => value.toLowerCase().includes(filters.q))) return false;
  for (const field of FILTER_FIELDS.slice(1)) {
    if (filters[field] && !book[field].toLowerCase().includes(filters[field])) return false;
  }
  return (filters.minYear === null || book.publicationYear >= filters.minYear) &&
    (filters.maxYear === null || book.publicationYear <= filters.maxYear);
}

function encodeCursor(after, filters, pageSize) {
  return Buffer.from(JSON.stringify({ v: 1, after, filterHash: filterHash(filters), pageSize }), 'utf8').toString('base64url');
}

async function readCatalogPage(db, { filters = normalizeFilters(), pageSize = 100, after = null } = {}) {
  let query = db.collection('books').select(...DISPLAY_FIELDS).orderBy('__name__').limit(pageSize);
  if (after !== null) query = query.startAfter(after);
  const snapshot = await query.get();
  if (!snapshot || !Array.isArray(snapshot.docs) || snapshot.docs.length > pageSize) {
    throw new Error('Invalid Book query result.');
  }
  const books = [];
  let scannedValidBooks = false;
  for (const doc of snapshot.docs) {
    const book = parseBook(doc);
    if (!book) continue;
    scannedValidBooks = true;
    if (matchesBook(book, filters)) {
      books.push({ isbn: book.isbn, title: book.title, author: book.author, synopsis: book.synopsis });
    }
  }
  const scanComplete = snapshot.docs.length < pageSize;
  const last = snapshot.docs[snapshot.docs.length - 1];
  return {
    books,
    nextCursor: scanComplete ? null : encodeCursor(last.id, filters, pageSize),
    scannedAnyDocument: snapshot.docs.length > 0,
    scannedValidBooks,
    scanComplete,
  };
}

module.exports = { normalizeFilters, filterHash, parseBook, matchesBook, encodeCursor, readCatalogPage };
