const { TextDecoder } = require('util');
const { normalizeFilters, filterHash } = require('./adapter');

const TEXT_FIELDS = ['q', 'title', 'author', 'publisher', 'category', 'isbn', 'synopsis'];
const ALLOWED = new Set([...TEXT_FIELDS, 'minYear', 'maxYear', 'pageSize', 'cursor']);
const CURSOR_KEYS = ['after', 'filterHash', 'pageSize', 'v'];

function validDocumentId(id) {
  return typeof id === 'string' && id.length > 0 && Buffer.byteLength(id, 'utf8') <= 1500 &&
    !id.includes('/') && !id.includes('\0') && id !== '.' && id !== '..' && !/^__.*__$/.test(id);
}

function decodeCursor(cursor, filters, pageSize) {
  if (!/^[A-Za-z0-9_-]{1,4096}$/.test(cursor)) return null;
  const bytes = Buffer.from(cursor, 'base64url');
  if (bytes.toString('base64url') !== cursor) return null;
  let value;
  try {
    value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch (_) { return null; }
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).sort().join(',') !== CURSOR_KEYS.join(',') ||
      value.v !== 1 || !validDocumentId(value.after) ||
      value.pageSize !== pageSize || typeof value.filterHash !== 'string' ||
      !/^[0-9a-f]{64}$/.test(value.filterHash) || value.filterHash !== filterHash(filters)) return null;
  return value.after;
}

function parseCatalogQuery(originalUrl) {
  if (typeof originalUrl !== 'string' || Buffer.byteLength(originalUrl, 'utf8') > 8192) return null;
  const separator = originalUrl.indexOf('?');
  const raw = separator < 0 ? '' : originalUrl.slice(separator + 1);
  try {
    for (const piece of raw.split('&')) {
      if (!piece) continue;
      for (const component of piece.split('=')) decodeURIComponent(component.replace(/\+/g, ' '));
    }
  } catch (_) { return null; }
  const params = new URLSearchParams(raw);
  const input = {};
  for (const [key, value] of params) {
    if (!ALLOWED.has(key) || Object.hasOwn(input, key)) return null;
    input[key] = value;
  }
  for (const field of TEXT_FIELDS) {
    if (input[field] === undefined) continue;
    if ([...input[field]].length > 256 || [...input[field].trim()].length > 100) return null;
  }
  for (const field of ['minYear', 'maxYear']) {
    if (input[field] === undefined || !input[field].trim()) { input[field] = null; continue; }
    if (!/^\d{4}$/.test(input[field]) || Number(input[field]) < 1450 || Number(input[field]) > 2100) return null;
    input[field] = Number(input[field]);
  }
  if (input.minYear !== null && input.maxYear !== null && input.minYear > input.maxYear) return null;
  const pageSize = input.pageSize === undefined ? 100 : Number(input.pageSize);
  if (input.pageSize !== undefined && !/^[1-9][0-9]*$/.test(input.pageSize)) return null;
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) return null;
  const filters = normalizeFilters(input);
  let after = null;
  if (input.cursor !== undefined) {
    after = decodeCursor(input.cursor, filters, pageSize);
    if (after === null) return null;
  }
  return { filters, pageSize, after };
}

module.exports = { parseCatalogQuery, decodeCursor, validDocumentId };
