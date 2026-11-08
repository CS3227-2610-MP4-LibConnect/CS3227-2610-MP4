const crypto = require('crypto');

// Application-wide canonical login key: trim surrounding whitespace and
// lowercase the whole address (role-aware-login R4). The original email is
// stored separately for display.
function canonicalizeEmail(email) {
  return email.trim().toLowerCase();
}

// Document ID for `emailKeys/{sha256(canonicalEmail)}`, as lowercase hex.
function emailKeyFor(canonicalEmail) {
  return crypto.createHash('sha256').update(canonicalEmail, 'utf8').digest('hex');
}

module.exports = { canonicalizeEmail, emailKeyFor };
