const { canonicalizeEmail } = require('./login');

const RATE_WINDOW_MS = 15 * 60 * 1000;
const INVALID_MESSAGE = 'Enter valid registration details.';
const CONFLICT_MESSAGE = 'Unable to register with those details.';
const LIMITED_MESSAGE = 'Registration is temporarily unavailable. Please try again later.';
const RETRY_MESSAGE = 'Registration is temporarily unavailable. Please try again.';
const REGISTRATION_EMAIL_FORMAT = /^[^\s@.]+(\.[^\s@.]+)*@[^\s@.]+(\.[^\s@.]+)+$/;

function boundedString(value, maxBytes) {
  return typeof value === 'string' && value.trim().length > 0 &&
    Buffer.byteLength(value, 'utf8') <= maxBytes;
}

function validateRegistrationBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const isTa = body.accountType === 'TA';
  if (!isTa && body.accountType !== 'STUDENT') return null;
  const allowed = isTa
    ? ['accountType', 'name', 'email', 'password', 'employeeId']
    : ['accountType', 'name', 'email', 'password'];
  if (Object.keys(body).length !== allowed.length ||
      Object.keys(body).some((key) => !allowed.includes(key))) return null;
  if (!boundedString(body.name, 200) || !boundedString(body.email, 254) ||
      !boundedString(body.password, 1024) || body.password.length < 8 ||
      (isTa && !boundedString(body.employeeId, 64))) return null;
  const email = body.email.trim();
  if (!REGISTRATION_EMAIL_FORMAT.test(email) || Buffer.byteLength(email, 'utf8') > 254) return null;
  return {
    accountType: body.accountType,
    accountStatus: isTa ? 'INACTIVE' : 'ACTIVE',
    name: body.name.trim(),
    email,
    canonicalEmail: canonicalizeEmail(body.email),
    password: body.password,
    ...(isTa ? { employeeId: body.employeeId.trim(), isManager: false } : {}),
  };
}

// The persistence adapter must resolve only after an atomic commit. It owns ID,
// timestamp and hash creation; the endpoint never accepts them from the client.
function createRegistrationHandler(persistence, authStore, options = {}) {
  if (!persistence || typeof persistence.createAccount !== 'function') {
    throw new TypeError('A registration persistence adapter is required.');
  }
  if (!authStore || typeof authStore.reserveRateSlot !== 'function') {
    throw new TypeError('A durable authentication rate-limit store is required.');
  }
  const now = options.now || Date.now;
  return async (req, res) => {
    const input = validateRegistrationBody(req.body);
    if (!input) return res.status(400).json({ message: INVALID_MESSAGE });
    const source = req.socket && typeof req.socket.remoteAddress === 'string'
      ? req.socket.remoteAddress : 'unknown';
    try {
      const reserved = await authStore.reserveRateSlot('registration-source', source, 5, now(), RATE_WINDOW_MS);
      if (!reserved) return res.status(429).json({ message: LIMITED_MESSAGE });
      await persistence.createAccount(input);
      return res.status(201).json({ accountType: input.accountType, accountStatus: input.accountStatus });
    } catch (error) {
      if (error && error.code === 'ALREADY_EXISTS') {
        return res.status(409).json({ message: CONFLICT_MESSAGE });
      }
      return res.status(503).json({ message: RETRY_MESSAGE });
    }
  };
}

module.exports = { validateRegistrationBody, createRegistrationHandler };
