const crypto = require('crypto');
const { canonicalizeEmail, emailKeyFor } = require('../server/auth/email');
const login = require('../server/auth/login');

describe('email helpers', () => {
  test('canonicalizeEmail trims surrounding whitespace and lowercases the whole address', () => {
    expect(canonicalizeEmail('  Student.One@Example.TEST \t\n')).toBe('student.one@example.test');
    expect(canonicalizeEmail('ta@example.test')).toBe('ta@example.test');
  });

  test('canonicalizeEmail keeps inner characters other than case', () => {
    expect(canonicalizeEmail(' A+B.C@Sub.Example.Test ')).toBe('a+b.c@sub.example.test');
  });

  test('emailKeyFor returns the lowercase hex sha256 of the UTF-8 canonical email', () => {
    const key = emailKeyFor('student@example.test');
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key).toBe(crypto.createHash('sha256').update('student@example.test', 'utf8').digest('hex'));
    expect(emailKeyFor('student@example.test')).toBe(key);
    expect(emailKeyFor('other@example.test')).not.toBe(key);
  });

  test('emailKeyFor of differently formatted inputs matches once canonicalized', () => {
    expect(emailKeyFor(canonicalizeEmail(' Student@Example.Test '))).toBe(emailKeyFor('student@example.test'));
  });

  test('login.js re-exports the same helper functions', () => {
    expect(login.canonicalizeEmail).toBe(canonicalizeEmail);
    expect(login.emailKeyFor).toBe(emailKeyFor);
  });
});
