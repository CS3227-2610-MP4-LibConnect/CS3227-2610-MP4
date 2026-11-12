const crypto = require('crypto');

const TOKEN_MODULE = '../server/tickets/faq-token';
const SESSION_A = 'a'.repeat(64);
const SESSION_B = 'b'.repeat(64);
const STUDENT = 'synthetic-student-one';
const OTHER_STUDENT = 'synthetic-student-two';

function loadCodec() {
  return require(TOKEN_MODULE);
}

function tokenContext(overrides = {}) {
  return {
    idHash: SESSION_A,
    studentId: STUDENT,
    purpose: 'faqRef',
    binding: {},
    ...overrides,
  };
}

const open = (openFaqToken, token, context) => Promise.resolve().then(() => openFaqToken(token, context));

describe('Bug FAQ session-bound authenticated-encryption tokens (T01/T02)', () => {
  afterEach(() => jest.restoreAllMocks());
  test('derives a 32-byte key with HKDF-SHA-256 from trusted idHash and fixed Bug FAQ domain context', async () => {
    const hkdfSync = jest.spyOn(crypto, 'hkdfSync');
    const hkdfAsync = jest.spyOn(crypto, 'hkdf');
    let deriveFaqTokenKey;
    jest.isolateModules(() => {
      ({ deriveFaqTokenKey } = require(TOKEN_MODULE));
    });

    const key = await deriveFaqTokenKey(SESSION_A);
    const repeatedKey = await deriveFaqTokenKey(SESSION_A);
    const otherSessionKey = await deriveFaqTokenKey(SESSION_B);

    const calls = [...hkdfSync.mock.calls, ...hkdfAsync.mock.calls];
    expect(calls).toHaveLength(3);
    expect(Buffer.from(repeatedKey)).toEqual(Buffer.from(key));
    expect(Buffer.from(otherSessionKey)).not.toEqual(Buffer.from(key));
    calls.forEach((args) => {
      expect(args[0].toLowerCase()).toBe('sha256');
      expect(Buffer.from(args[1]).toString('utf8')).toBe(args === calls[2] ? SESSION_B : SESSION_A);
      expect(args[4]).toBe(32);
      const domainContext = args.slice(2, 4).filter(Boolean).map((value) => Buffer.from(value).toString('utf8')).join(' ').toLowerCase();
      expect(domainContext).toContain('codeclinic');
      expect(domainContext).toMatch(/bug.?faq/);
      expect(args.slice(2, 4)).toEqual(calls[0].slice(2, 4));
    });
    expect(Buffer.from(key)).toHaveLength(32);
    hkdfSync.mockRestore();
    hkdfAsync.mockRestore();
  });

  test('creates opaque ciphertext with a fresh nonce and decrypts across independent module instances in the same session', async () => {
    const createCipheriv = jest.spyOn(crypto, 'createCipheriv');
    const createDecipheriv = jest.spyOn(crypto, 'createDecipheriv');
    let sealFaqToken;
    jest.isolateModules(() => { ({ sealFaqToken } = require(TOKEN_MODULE)); });
    const payload = { ticketId: 'raw-ticket-identifier-42', boundaryReplyId: 'raw-reply-identifier-19' };
    const context = tokenContext();
    const first = await sealFaqToken(payload, context);
    const second = await sealFaqToken(payload, context);

    expect(first).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(first).not.toContain(payload.ticketId);
    expect(first).not.toContain(payload.boundaryReplyId);
    const decodedCiphertext = Buffer.from(first, 'base64url').toString('utf8');
    expect(decodedCiphertext).not.toContain(payload.ticketId);
    expect(decodedCiphertext).not.toContain(payload.boundaryReplyId);
    expect(first).not.toBe(second);

    let openFaqToken;
    jest.isolateModules(() => { ({ openFaqToken } = require(TOKEN_MODULE)); });
    await expect(open(openFaqToken, first, context)).resolves.toEqual(payload);
    await expect(open(openFaqToken, second, context)).resolves.toEqual(payload);
    expect(createCipheriv).toHaveBeenCalled();
    expect(createCipheriv.mock.calls.every(([algorithm]) => algorithm.toLowerCase() === 'aes-256-gcm')).toBe(true);
    expect(createDecipheriv).toHaveBeenCalled();
    expect(createDecipheriv.mock.calls.every(([algorithm]) => algorithm.toLowerCase() === 'aes-256-gcm')).toBe(true);
  });

  test('rejects another session, including the same Student after session rotation', async () => {
    const { sealFaqToken, openFaqToken } = loadCodec();
    const token = await sealFaqToken({ ticketId: 'raw-ticket-1' }, tokenContext());

    await expect(open(openFaqToken, token, tokenContext({ idHash: SESSION_B }))).resolves.toBeNull();
    await expect(open(openFaqToken, token, tokenContext({ idHash: SESSION_B, studentId: STUDENT }))).resolves.toBeNull();
    await expect(open(openFaqToken, token, tokenContext({ studentId: OTHER_STUDENT }))).resolves.toBeNull();
  });

  test('binds token purpose and search query plus field', async () => {
    const { sealFaqToken, openFaqToken } = loadCodec();
    const payload = { createdAtMs: 1_800_000_000_000, ticketId: 'raw-ticket-boundary' };
    const titleContext = tokenContext({ purpose: 'searchCursor', binding: { query: 'linked list', field: 'title' } });
    const token = await sealFaqToken(payload, titleContext);

    await expect(open(openFaqToken, token, titleContext)).resolves.toEqual(payload);
    await expect(open(openFaqToken, token, tokenContext({ purpose: 'faqRef', binding: { query: 'linked list', field: 'title' } }))).resolves.toBeNull();
    await expect(open(openFaqToken, token, tokenContext({ purpose: 'searchCursor', binding: { query: 'other', field: 'title' } }))).resolves.toBeNull();
    await expect(open(openFaqToken, token, tokenContext({ purpose: 'searchCursor', binding: { query: 'linked list', field: 'tags' } }))).resolves.toBeNull();
  });

  test('binds reply cursors to their FAQ reference and rejects tampering', async () => {
    const { sealFaqToken, openFaqToken } = loadCodec();
    const payload = { replyCreatedAtMs: 1_800_000_000_000, replyId: 'raw-reply-boundary' };
    const replyContext = tokenContext({ purpose: 'replyCursor', binding: { faqRef: 'faq-reference-one' } });
    const token = await sealFaqToken(payload, replyContext);

    await expect(open(openFaqToken, token, replyContext)).resolves.toEqual(payload);
    await expect(open(openFaqToken, token, tokenContext({ purpose: 'replyCursor', binding: { faqRef: 'faq-reference-two' } }))).resolves.toBeNull();
    const changed = `${token.slice(0, Math.floor(token.length / 2))}${token[Math.floor(token.length / 2)] === 'A' ? 'B' : 'A'}${token.slice(Math.floor(token.length / 2) + 1)}`;
    await expect(open(openFaqToken, changed, replyContext)).resolves.toBeNull();
  });
});
