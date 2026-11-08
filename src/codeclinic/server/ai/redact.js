'use strict';

// Secret redaction and input caps for the AI gateway (ai-gateway spec R6).
//
// Pure functions: no I/O, no logging, no clock. Redaction is a privacy
// safeguard, not a guarantee; patterns can miss secrets.
//
// Every pattern either starts at a fixed literal prefix, is anchored by a
// lookbehind so it can only start at the beginning of a character run, or
// uses bounded quantifiers. This keeps matching close to linear on large
// inputs, which matters because redaction runs before the cap check.

const REDACTED = '[REDACTED]';
const AI_INPUT_TOO_LARGE = 'AI_INPUT_TOO_LARGE';

// Private key blocks: BEGIN line through the END line with the same label.
// An unterminated block (for example a truncated paste) is redacted to the end
// of the content so partial key material is never forwarded.
const PRIVATE_KEY_BLOCK =
  /-----BEGIN ([A-Z0-9]+(?: [A-Z0-9]+)* )?PRIVATE KEY-----(?:[\s\S]*?-----END \1PRIVATE KEY-----|[\s\S]*$)/g;

// AWS access key ID: AKIA followed by exactly 16 uppercase letters or digits.
const AWS_ACCESS_KEY_ID = /(?<![A-Za-z0-9])AKIA[A-Z0-9]{16}(?![A-Za-z0-9])/g;

// GitHub tokens by prefix. A minimum body length keeps prose such as "ghp_"
// or "ghp_x" from matching.
const GITHUB_TOKEN =
  /(?<![A-Za-z0-9_])(?:gh[pousr]_[A-Za-z0-9]{20,255}|github_pat_[A-Za-z0-9_]{20,255})(?![A-Za-z0-9_])/g;

// Google API key: AIza followed by exactly 35 key characters.
const GOOGLE_API_KEY = /(?<![A-Za-z0-9_-])AIza[A-Za-z0-9_-]{35}(?![A-Za-z0-9_-])/g;

// "Bearer <token>": only the token is replaced. A minimum token length keeps
// phrases such as "the bearer of bad news" intact.
const BEARER_TOKEN = /\b(Bearer[ \t]+)[A-Za-z0-9\-._~+/]{8,}=*/gi;

// Assignments whose name contains password, secret, token, api_key, or apikey
// (case-insensitive). Supports `=`, `:`, `:=`, and `=>`, an optionally quoted
// name, and a quoted or unquoted value on the same line. Only the value is
// replaced; surrounding quotes are kept. `==` and `===` comparisons are not
// assignments. A value that an earlier pattern already replaced (for example
// `token = ghp_...` becoming `token = [REDACTED]`) is matched whole by the
// `\[REDACTED\]` alternative; otherwise the unquoted-value class would stop at
// the closing bracket and leave a stray `]` behind.
const ASSIGNMENT =
  /(?<![A-Za-z0-9_.-])(["']?[A-Za-z0-9_.-]{0,64}(?:password|secret|token|api_key|apikey)[A-Za-z0-9_.-]{0,64}["']?[ \t]*(?::=|=>|=(?!=)|:)[ \t]*)(?:\[REDACTED\]|"[^"\r\n]*"|'[^'\r\n]*'|`[^`\r\n]*`|[^\s"'`,;)}\]]+)/gi;

// Email addresses. The lookbehind limits match starts to the beginning of a
// local-part run; bounded label lengths follow RFC 5321 limits.
const EMAIL =
  /(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]{1,64}@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.){1,10}[A-Za-z]{2,63}(?![A-Za-z0-9-])/g;

function replaceAssignmentValue(match, prefix) {
  const value = match.slice(prefix.length);
  const quote = value[0];
  if (quote === '"' || quote === "'" || quote === '`') {
    return `${prefix}${quote}${REDACTED}${quote}`;
  }
  return `${prefix}${REDACTED}`;
}

// Returns `text` with every R6 pattern replaced by `[REDACTED]`. Order matters:
// whole-secret patterns run first so an assignment such as
// `token = ghp_...` still yields a single redaction marker for the value.
function redact(text) {
  if (typeof text !== 'string') {
    throw new TypeError('redact expects a string');
  }
  return text
    .replace(PRIVATE_KEY_BLOCK, REDACTED)
    .replace(AWS_ACCESS_KEY_ID, REDACTED)
    .replace(GITHUB_TOKEN, REDACTED)
    .replace(GOOGLE_API_KEY, REDACTED)
    .replace(BEARER_TOKEN, (match, prefix) => `${prefix}${REDACTED}`)
    .replace(ASSIGNMENT, replaceAssignmentValue)
    .replace(EMAIL, REDACTED);
}

function assertMaxInputChars(maxInputChars) {
  if (!Number.isSafeInteger(maxInputChars) || maxInputChars < 1) {
    throw new TypeError('maxInputChars must be a positive integer');
  }
}

// Checks already-redacted content against the feature cap. Length is the
// JavaScript string length (UTF-16 code units). Never truncates: content over
// the cap is rejected, content within the cap is returned unchanged.
function checkInputCap(redactedContent, maxInputChars) {
  if (typeof redactedContent !== 'string') {
    throw new TypeError('checkInputCap expects a string');
  }
  assertMaxInputChars(maxInputChars);
  if (redactedContent.length > maxInputChars) {
    return { ok: false, code: AI_INPUT_TOO_LARGE };
  }
  return { ok: true, content: redactedContent };
}

// R6 in order: redact, then apply the cap to the redacted content.
function redactAndCap(content, maxInputChars) {
  assertMaxInputChars(maxInputChars);
  return checkInputCap(redact(content), maxInputChars);
}

module.exports = {
  REDACTED,
  AI_INPUT_TOO_LARGE,
  redact,
  checkInputCap,
  redactAndCap,
};
