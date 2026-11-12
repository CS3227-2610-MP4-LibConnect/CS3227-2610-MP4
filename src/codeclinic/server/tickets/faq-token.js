const crypto = require('crypto');

const TOKEN_MAX_LENGTH = 512;
const NONCE_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const TOKEN_DOMAIN_SALT = Buffer.from('CodeClinic Bug FAQ token salt v1', 'utf8');
const TOKEN_DOMAIN_INFO = Buffer.from('CodeClinic Bug FAQ authenticated token key v1', 'utf8');
const TOKEN_PURPOSES = new Set(['faqRef', 'searchCursor', 'replyCursor']);
const BASE64URL = /^[A-Za-z0-9_-]+$/;

function isRecord(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

function tokenContext(context) {
  if (!isRecord(context) || typeof context.idHash !== 'string' || !/^[a-f0-9]{64}$/i.test(context.idHash) ||
      typeof context.studentId !== 'string' || context.studentId.length < 1 || context.studentId.length > 128 ||
      !TOKEN_PURPOSES.has(context.purpose) || !isRecord(context.binding)) return null;
  let serialized;
  try {
    serialized = JSON.stringify(canonicalize(context.binding));
  } catch (error) {
    return null;
  }
  if (typeof serialized !== 'string' || Buffer.byteLength(serialized, 'utf8') > 1024) return null;
  const aad = Buffer.from(JSON.stringify({
    v: 1,
    domain: 'CodeClinic Bug FAQ',
    studentId: context.studentId,
    purpose: context.purpose,
    binding: JSON.parse(serialized),
  }), 'utf8');
  return { idHash: context.idHash.toLowerCase(), aad };
}

async function deriveFaqTokenKey(idHash) {
  if (typeof idHash !== 'string' || !/^[a-f0-9]{64}$/i.test(idHash)) {
    throw new TypeError('A trusted session hash is required.');
  }
  return Buffer.from(crypto.hkdfSync(
    'sha256',
    Buffer.from(idHash.toLowerCase(), 'utf8'),
    TOKEN_DOMAIN_SALT,
    TOKEN_DOMAIN_INFO,
    KEY_LENGTH,
  ));
}

async function sealFaqToken(payload, context) {
  if (!isRecord(payload)) return null;
  const validated = tokenContext(context);
  if (!validated) return null;
  let plaintext;
  try {
    plaintext = Buffer.from(JSON.stringify(canonicalize(payload)), 'utf8');
  } catch (error) {
    return null;
  }
  if (plaintext.length === 0 || plaintext.length > 2048) return null;
  const nonce = crypto.randomBytes(NONCE_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', await deriveFaqTokenKey(validated.idHash), nonce);
  cipher.setAAD(validated.aad);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const packed = Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]);
  const token = packed.toString('base64url');
  return token.length <= TOKEN_MAX_LENGTH ? token : null;
}

async function openFaqToken(token, context) {
  if (typeof token !== 'string' || token.length < 1 || token.length > TOKEN_MAX_LENGTH || !BASE64URL.test(token)) return null;
  const packed = Buffer.from(token, 'base64url');
  if (packed.toString('base64url') !== token || packed.length < NONCE_LENGTH + TAG_LENGTH + 1) return null;
  const validated = tokenContext(context);
  if (!validated) return null;
  const nonce = packed.subarray(0, NONCE_LENGTH);
  const authTag = packed.subarray(NONCE_LENGTH, NONCE_LENGTH + TAG_LENGTH);
  const ciphertext = packed.subarray(NONCE_LENGTH + TAG_LENGTH);
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', await deriveFaqTokenKey(validated.idHash), nonce);
    decipher.setAAD(validated.aad);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    if (plaintext.length > 2048) return null;
    const parsed = JSON.parse(plaintext.toString('utf8'));
    return isRecord(parsed) ? parsed : null;
  } catch (error) {
    return null;
  }
}

module.exports = {
  TOKEN_MAX_LENGTH,
  deriveFaqTokenKey,
  sealFaqToken,
  openFaqToken,
};
