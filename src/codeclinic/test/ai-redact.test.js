const {
  REDACTED,
  AI_INPUT_TOO_LARGE,
  redact,
  checkInputCap,
  redactAndCap,
} = require('../server/ai/redact');

// Every fake secret below is built by concatenation so that no literal
// secret-shaped string appears in the repository. None is a real credential.
const awsKeyId = () => 'AK' + 'IA' + 'ABCDEFGHIJ012345';
const githubToken = (prefix) => prefix + '_' + 'a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8';
const githubPat = () => 'github' + '_pat_' + '11ABCDEFG0123456789_abcdefghijklmnopqrstuvwxyz';
const googleKey = () => 'AI' + 'za' + 'SyA-1234567890abcdefghijklmnopqrstu';
const keyBlock = (label, body) =>
  '-----BEGIN ' + label + 'PRIVATE KEY-----\n' + body + '\n-----END ' + label + 'PRIVATE KEY-----';

describe('ai redact: constants', () => {
  test('exports the marker and error code', () => {
    expect(REDACTED).toBe('[REDACTED]');
    expect(AI_INPUT_TOO_LARGE).toBe('AI_INPUT_TOO_LARGE');
  });
});

describe('ai redact: private key blocks', () => {
  test('redacts a multi-line block from BEGIN line through END line', () => {
    const body = 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASC\nBKcwggSjAgEAAoIBAQC7\nabc+/=';
    const input = 'before\n' + keyBlock('', body) + '\nafter';
    expect(redact(input)).toBe('before\n[REDACTED]\nafter');
  });

  test('redacts labelled blocks such as RSA, EC, and OPENSSH', () => {
    for (const label of ['RSA ', 'EC ', 'OPENSSH ', 'ENCRYPTED ']) {
      const out = redact('x ' + keyBlock(label, 'line1\nline2') + ' y');
      expect(out).toBe('x [REDACTED] y');
    }
  });

  test('redacts two separate blocks independently and keeps text between them', () => {
    const input = keyBlock('', 'one') + '\nkeep me\n' + keyBlock('RSA ', 'two');
    expect(redact(input)).toBe('[REDACTED]\nkeep me\n[REDACTED]');
  });

  test('redacts an unterminated block to the end of the content', () => {
    const input = 'intro\n-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg\npartial';
    expect(redact(input)).toBe('intro\n[REDACTED]');
  });

  test('does not redact public keys or certificates', () => {
    const pub = '-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYI\n-----END PUBLIC KEY-----';
    const cert = '-----BEGIN CERTIFICATE-----\nMIIBszCCAVmgAwIBAgIU\n-----END CERTIFICATE-----';
    expect(redact(pub)).toBe(pub);
    expect(redact(cert)).toBe(cert);
  });
});

describe('ai redact: AWS access key IDs', () => {
  test('redacts AKIA followed by 16 uppercase letters or digits', () => {
    expect(redact('key ' + awsKeyId() + ' end')).toBe('key [REDACTED] end');
    expect(redact('(' + awsKeyId() + ')')).toBe('([REDACTED])');
  });

  test('near misses are kept', () => {
    const short = 'AK' + 'IA' + 'ABCDEFGHIJ01234'; // 15 characters
    const long = 'AK' + 'IA' + 'ABCDEFGHIJ0123456'; // 17 characters
    const lower = 'AK' + 'IA' + 'abcdefghij012345';
    const embedded = 'X' + awsKeyId();
    for (const text of [short, long, lower, embedded, 'AKIA']) {
      expect(redact(text)).toBe(text);
    }
  });
});

describe('ai redact: GitHub tokens', () => {
  test.each(['ghp', 'gho', 'ghu', 'ghs', 'ghr'])('redacts %s_ tokens', (prefix) => {
    expect(redact('use ' + githubToken(prefix) + ' now')).toBe('use [REDACTED] now');
  });

  test('redacts github_pat_ tokens', () => {
    expect(redact('pat=' + githubPat())).toBe('pat=[REDACTED]');
  });

  test('near misses are kept', () => {
    const tooShort = 'ghp' + '_' + 'abc123';
    const otherPrefix = 'ghx' + '_' + 'a1B2c3D4e5F6g7H8i9J0k1L2m3N4';
    const embedded = 'xghp' + '_' + 'a1B2c3D4e5F6g7H8i9J0k1L2m3N4';
    for (const text of ['ghp_', tooShort, otherPrefix, embedded, 'see the github_pat_ docs']) {
      expect(redact(text)).toBe(text);
    }
  });
});

describe('ai redact: Google API keys', () => {
  test('redacts AIza followed by 35 key characters', () => {
    expect(redact('k: ' + googleKey())).toBe('k: [REDACTED]');
    expect(redact('"' + googleKey() + '"')).toBe('"[REDACTED]"');
  });

  test('near misses are kept', () => {
    const short = 'AI' + 'za' + 'SyA-1234567890abcdefghijklmnopqrst'; // 34
    const long = googleKey() + 'v'; // 36
    for (const text of [short, long, 'AIza']) {
      expect(redact(text)).toBe(text);
    }
  });
});

describe('ai redact: Bearer tokens', () => {
  test('replaces only the token after Bearer', () => {
    const tok = 'eyJhbGci' + 'OiJIUzI1NiJ9.payload.sig_-~+/==';
    expect(redact('Authorization: Bearer ' + tok)).toBe('Authorization: Bearer [REDACTED]');
    expect(redact('bearer\t' + 'abcdefgh12345678')).toBe('bearer\t[REDACTED]');
  });

  test('prose and short words after bearer are kept', () => {
    for (const text of ['the bearer of bad news', 'Bearer token', 'Bearer abc', 'Bearer\nabcdefghijkl']) {
      expect(redact(text)).toBe(text);
    }
  });
});

describe('ai redact: secret assignments', () => {
  test.each([
    ['password = hunter2pass', 'password = [REDACTED]'],
    ['DB_PASSWORD=s3cr3tValue', 'DB_PASSWORD=[REDACTED]'],
    ['client_secret: abc123', 'client_secret: [REDACTED]'],
    ['accessToken := xyz789', 'accessToken := [REDACTED]'],
    ["'api_key' => 'abcdef'", "'api_key' => '[REDACTED]'"],
    ['"apiKey": "abcdef123"', '"apiKey": "[REDACTED]"'],
    ['APIKEY=`abc def`', 'APIKEY=`[REDACTED]`'],
    ['const myToken = "a b c";', 'const myToken = "[REDACTED]";'],
    ['f(secret=abc, other=1)', 'f(secret=[REDACTED], other=1)'],
  ])('%s', (input, expected) => {
    expect(redact(input)).toBe(expected);
  });

  test('a value already replaced by another pattern yields a single marker', () => {
    expect(redact('token = ' + githubToken('ghp'))).toBe('token = [REDACTED]');
    expect(redact('api_key: ' + googleKey())).toBe('api_key: [REDACTED]');
    expect(redact('secret=' + awsKeyId() + ';')).toBe('secret=[REDACTED];');
  });

  test('redacts assignments on each line of multi-line content', () => {
    const input = 'user = alice\npassword = one\nTOKEN: two\nname = bob';
    expect(redact(input)).toBe('user = alice\npassword = [REDACTED]\nTOKEN: [REDACTED]\nname = bob');
  });

  test('the value does not extend past the end of the line', () => {
    expect(redact('password =\nnext line')).toBe('password =\nnext line');
    expect(redact('password = "open\nquote"')).toBe('password = "open\nquote"');
  });

  test('near misses are kept', () => {
    for (const text of [
      'if (password === input) {',
      'password == other',
      'the token is valid',
      'reset your password here',
      'username = alice',
      'key = value',
    ]) {
      expect(redact(text)).toBe(text);
    }
  });
});

describe('ai redact: email addresses', () => {
  test('redacts email addresses', () => {
    expect(redact('mail student.one+tag@example.test now')).toBe('mail [REDACTED] now');
    expect(redact('<ta@sub.example.co.uk>')).toBe('<[REDACTED]>');
    expect(redact('a@b.co, c@d.io')).toBe('[REDACTED], [REDACTED]');
  });

  test('near misses are kept', () => {
    for (const text of ['@decorator', 'user@localhost', 'name@', '@example.test', 'a@b.c', 'x @ y.com']) {
      expect(redact(text)).toBe(text);
    }
  });
});

describe('ai redact: general behavior', () => {
  test('content without secrets is returned unchanged', () => {
    const code = 'function add(a, b) {\n  return a + b;\n}\n// TODO: tests\n';
    expect(redact(code)).toBe(code);
    expect(redact('')).toBe('');
  });

  test('mixed content redacts each secret and keeps surrounding text', () => {
    const input = [
      'Hi, I am alice@example.test.',
      'export AWS_ID=' + awsKeyId(),
      'curl -H "Authorization: Bearer abcdefghijklmnop" url',
      keyBlock('RSA ', 'body'),
      'done',
    ].join('\n');
    const out = redact(input);
    expect(out).toBe(
      [
        'Hi, I am [REDACTED].',
        'export AWS_ID=[REDACTED]',
        'curl -H "Authorization: Bearer [REDACTED]" url',
        '[REDACTED]',
        'done',
      ].join('\n'),
    );
  });

  test('is idempotent', () => {
    const input = 'password = x\n' + githubToken('ghs') + '\nbob@example.test';
    const once = redact(input);
    expect(redact(once)).toBe(once);
  });

  test('rejects non-string input', () => {
    for (const value of [undefined, null, 42, {}, ['a']]) {
      expect(() => redact(value)).toThrow(TypeError);
    }
  });

  test('large inputs are processed in bounded time', () => {
    const chunks = [
      'a'.repeat(50000),
      'password'.repeat(5000),
      '-'.repeat(20000) + 'BEGIN ',
      'x@'.repeat(20000),
      'Bearer '.repeat(5000),
      'AKIA'.repeat(10000),
      'ghp_'.repeat(10000),
      'tok=en=='.repeat(5000),
      ('word '.repeat(50) + '\n').repeat(2000),
    ];
    const input = chunks.join('\n');
    expect(input.length).toBeGreaterThan(750000);
    const start = Date.now();
    redact(input);
    expect(Date.now() - start).toBeLessThan(2000);
  });
});

describe('ai redact: input cap', () => {
  test('content at the cap is accepted unchanged', () => {
    expect(checkInputCap('abcde', 5)).toEqual({ ok: true, content: 'abcde' });
  });

  test('content one over the cap is rejected without truncation', () => {
    const result = checkInputCap('abcdef', 5);
    expect(result).toEqual({ ok: false, code: AI_INPUT_TOO_LARGE });
    expect(result).not.toHaveProperty('content');
  });

  test('length is measured in UTF-16 code units', () => {
    expect(checkInputCap('\u{1F600}', 2).ok).toBe(true);
    expect(checkInputCap('\u{1F600}', 1)).toEqual({ ok: false, code: AI_INPUT_TOO_LARGE });
  });

  test('rejects invalid caps and non-string content', () => {
    for (const cap of [0, -1, 1.5, NaN, Infinity, '10', undefined]) {
      expect(() => checkInputCap('a', cap)).toThrow(TypeError);
      expect(() => redactAndCap('a', cap)).toThrow(TypeError);
    }
    expect(() => checkInputCap(null, 5)).toThrow(TypeError);
  });

  test('redactAndCap applies the cap to the redacted content', () => {
    const block = keyBlock('', 'x'.repeat(500));
    const input = 'k ' + block;
    expect(input.length).toBeGreaterThan(20);
    // Long before redaction, short after: accepted.
    expect(redactAndCap(input, 20)).toEqual({ ok: true, content: 'k [REDACTED]' });
  });

  test('redactAndCap rejects content that grows past the cap after redaction', () => {
    // "a@b.co" is 6 characters; "[REDACTED]" is 10.
    expect(redactAndCap('a@b.co', 8)).toEqual({ ok: false, code: AI_INPUT_TOO_LARGE });
    expect(redactAndCap('a@b.co', 10)).toEqual({ ok: true, content: REDACTED });
  });

  test('redactAndCap returns plain content within the cap unchanged', () => {
    expect(redactAndCap('hello world', 11)).toEqual({ ok: true, content: 'hello world' });
    expect(redactAndCap('hello world!', 11)).toEqual({ ok: false, code: AI_INPUT_TOO_LARGE });
  });
});

describe('ai redact: typed assignments (review-G1 M1)', () => {
  test.each([
    ['Python annotated', 'password: str = "hunter2"', 'password: str = "[REDACTED]"'],
    ['Python Optional', "api_key: Optional[str] = 'sk-live-1'", "api_key: Optional[str] = '[REDACTED]'"],
    ['Python union', 'db_secret: str | None = "s3cr3t"', 'db_secret: str | None = "[REDACTED]"'],
    ['Python unquoted', 'TOKEN: Final = abc123', 'TOKEN: Final = [REDACTED]'],
    ['TypeScript const', 'const token: string = "abc.def.ghi";', 'const token: string = "[REDACTED]";'],
    ['TypeScript let union', 'let apiKey: string | undefined = `k-1`;', 'let apiKey: string | undefined = `[REDACTED]`;'],
    ['TypeScript generic', 'const secretMap: Map<string> = "x";', 'const secretMap: Map<string> = "[REDACTED]";'],
    ['TypeScript array type', 'const tokens: string[] = abc;', 'const tokens: string[] = [REDACTED];'],
    ['Kotlin val', 'val apiKey: String = "k-123"', 'val apiKey: String = "[REDACTED]"'],
    ['Kotlin nullable', 'private var password: String? = "pw"', 'private var password: String? = "[REDACTED]"'],
    ['Scala qualified type', 'val clientSecret: java.lang.String = "cs"', 'val clientSecret: java.lang.String = "[REDACTED]"'],
    ['no spaces', 'password:str="hunter2"', 'password:str="[REDACTED]"'],
  ])('%s', (_label, input, expected) => {
    expect(redact(input)).toBe(expected);
  });

  test('a value already redacted by an earlier pattern yields one marker', () => {
    expect(redact(`const token: string = ${githubToken('ghp')};`)).toBe('const token: string = [REDACTED];');
  });

  test('untyped colon forms keep their existing behaviour', () => {
    expect(redact('password: hunter2')).toBe('password: [REDACTED]');
    expect(redact('{"token": "abc"}')).toBe('{"token": "[REDACTED]"}');
    expect(redact('password: hunter2, retries = 3')).toBe('password: [REDACTED], retries = 3');
    expect(redact('password := "x"')).toBe('password := "[REDACTED]"');
  });

  test.each([
    'username: str = "alice"',
    'const count: number = 42;',
    'val host: String = "server01"',
    'let user: string | undefined = `bob`;',
    'if (password == "x") {',
    'token_count === 3',
  ])('near miss is not redacted: %j', (input) => {
    expect(redact(input)).toBe(input);
  });

  test('a comparison or arrow after a type annotation is not treated as the value', () => {
    expect(redact('password: str == "guess"')).not.toContain('"[REDACTED]"');
    expect(redact('token: T => fn(token)')).not.toContain('fn([REDACTED]');
  });

  test('adversarial annotation-like input is processed in bounded time', () => {
    const input = ('password: ' + 'a '.repeat(40) + '|').repeat(20000) + ('token:' + 'x'.repeat(70)).repeat(5000);
    expect(input.length).toBeGreaterThan(750000);
    const start = Date.now();
    redact(input);
    expect(Date.now() - start).toBeLessThan(2000);
  });
});
