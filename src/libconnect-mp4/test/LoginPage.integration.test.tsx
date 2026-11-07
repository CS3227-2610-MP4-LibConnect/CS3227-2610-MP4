const React = require('react');
const { fireEvent, render, screen, waitFor } = require('@testing-library/react');
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
const argon2 = require('argon2');
const request = require('supertest');
const LoginPage = require('../src/LoginPage').default;
const { createLoginApp, emailKeyFor } = require('../server/auth/login');

const memberEmail = 'member@example.test';
const memberPassword = 'synthetic member passphrase';
const librarianEmail = 'librarian@example.test';
const librarianPassword = 'synthetic librarian passphrase';

type SyntheticUser = {
  userId: string;
  email: string;
  canonicalEmailKey: string;
  passwordHash: string;
  accountType: 'MEMBER' | 'LIBRARIAN';
  accountStatus: 'ACTIVE' | 'INACTIVE';
  isManager: boolean;
};

function createSyntheticSystem(users: SyntheticUser[], options: { repositoryUnavailable?: boolean } = {}) {
  const byEmailKey = new Map(users.map((user) => [emailKeyFor(user.canonicalEmailKey), user]));
  const sessions = new Map<string, Record<string, unknown>>();
  const counters = new Map<string, { started: number; count: number }>();
  const repository = {
    async findEmailKeyMatches(key: string) {
      if (options.repositoryUnavailable) throw new Error('synthetic repository unavailable');
      const user = byEmailKey.get(key);
      return user ? [{ userId: user.userId }] : [];
    },
    async getUserById(userId: string) {
      if (options.repositoryUnavailable) throw new Error('synthetic repository unavailable');
      return users.find((user) => user.userId === userId) ?? null;
    },
  };
  const authStore = {
    async reserveRateSlot(kind: string, identifier: string, limit: number, now: number, windowMs: number) {
      const key = `${kind}:${identifier}`;
      let state = counters.get(key);
      if (!state || now >= state.started + windowMs) {
        state = { started: now, count: 0 };
        counters.set(key, state);
      }
      if (state.count >= limit) return false;
      state.count += 1;
      return true;
    },
    async releaseRateSlot(kind: string, identifier: string) {
      const state = counters.get(`${kind}:${identifier}`);
      if (state) state.count = Math.max(0, state.count - 1);
    },
    async createSession(id: string, record: Record<string, unknown>) { sessions.set(id, record); },
    async getSession(id: string) { return sessions.get(id) ?? null; },
    async touchSession(id: string, operationClock: () => number) {
      const session = sessions.get(id);
      if (!session) return false;
      const now = operationClock();
      const issuedAt = session.issuedAt as number;
      const lastSeenAt = session.lastSeenAt as number;
      const expiresAt = session.expiresAt as number;
      if (now - lastSeenAt >= 30 * 60 * 1000 || now - issuedAt >= 8 * 60 * 60 * 1000 || now >= expiresAt) {
        sessions.delete(id);
        return false;
      }
      sessions.set(id, { ...session, lastSeenAt: now });
      return true;
    },
    async rotateCsrfToken(id: string, csrfTokenHash: string) {
      const session = sessions.get(id);
      if (session) sessions.set(id, { ...session, csrfTokenHash });
    },
    async deleteSession(id: string) { sessions.delete(id); },
    async deleteSessionIfCsrfMatches(id: string, submittedHash: string) {
      const session = sessions.get(id);
      if (!session || session.csrfTokenHash !== submittedHash) return false;
      sessions.delete(id);
      return true;
    },
  };
  return { app: createLoginApp(repository, authStore), sessions, counters, users };
}

function connectReactFetchToExpress(app: unknown) {
  const originalFetch = global.fetch;
  const agent = request.agent(app);
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  const responses: Array<{ url: string; status: number; headers: Record<string, unknown>; body: unknown }> = [];
  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method || 'GET').toUpperCase();
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    calls.push({ url, method, body });
    let pending: any = agent[method.toLowerCase() as 'get' | 'post'](url);
    const headers = init?.headers as Record<string, string> | undefined;
    for (const [name, value] of Object.entries(headers || {})) pending = pending.set(name, value);
    if (body !== undefined) pending = pending.send(body);
    const response = await pending;
    responses.push({ url, status: response.status, headers: response.headers, body: response.body });
    return {
      status: response.status,
      ok: response.status >= 200 && response.status < 300,
      json: async () => response.body,
    } as Response;
  }) as typeof fetch;
  return { calls, responses, agent, restore: () => { global.fetch = originalFetch; } };
}

async function makeUsers(): Promise<SyntheticUser[]> {
  const hashOptions = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 };
  return [
    {
      userId: 'synthetic-member', email: memberEmail, canonicalEmailKey: memberEmail,
      passwordHash: await argon2.hash(memberPassword, hashOptions), accountType: 'MEMBER', accountStatus: 'ACTIVE', isManager: false,
    },
    {
      userId: 'synthetic-librarian', email: librarianEmail, canonicalEmailKey: librarianEmail,
      passwordHash: await argon2.hash(librarianPassword, hashOptions), accountType: 'LIBRARIAN', accountStatus: 'ACTIVE', isManager: false,
    },
  ];
}

function fill(email: string, password: string) {
  fireEvent.change(screen.getByRole('textbox', { name: /email/i }), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: password } });
}

function submit() { fireEvent.click(screen.getByRole('button', { name: /sign in/i })); }

describe('T05 React to Express login integration', () => {
  test('uses server success, protected cookie session, CSRF logout, and then denies the invalidated session', async () => {
    const users = await makeUsers();
    const system = createSyntheticSystem(users);
    const bridge = connectReactFetchToExpress(system.app);
    const originalLocation = window.location;
    const assign = jest.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, pathname: '/', assign },
    });
    try {
      render(<LoginPage />);
      fireEvent.click(screen.getByRole('radio', { name: /librarian/i }));
      fill(` ${librarianEmail.toUpperCase()} `, librarianPassword);
      submit();

      await waitFor(() => expect(assign).toHaveBeenCalledWith('/librarian/dashboard'));
      expect(screen.queryByText(/signed in as/i)).not.toBeInTheDocument();
      expect(bridge.calls[0]).toEqual(expect.objectContaining({
        url: '/api/auth/login', method: 'POST',
        body: { email: librarianEmail.toUpperCase(), password: librarianPassword, accountType: 'LIBRARIAN' },
      }));
      expect(system.sessions.size).toBe(1);
      const sessionRecord = [...system.sessions.values()][0];
      expect(Object.keys(sessionRecord).sort()).toEqual(['accountTypeAtIssue', 'csrfTokenHash', 'expiresAt', 'issuedAt', 'lastSeenAt', 'userId']);
      expect(JSON.stringify(sessionRecord)).not.toContain(librarianEmail);
      expect(JSON.stringify(sessionRecord)).not.toContain(users[1].passwordHash);

      const loginResponse = bridge.responses[0];
      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toEqual({ accountType: 'LIBRARIAN' });
      const cookieHeader = (loginResponse.headers['set-cookie'] as string[])[0];
      expect(cookieHeader).toContain('__Host-libconnect_session=');
      expect(cookieHeader).toContain('Secure');
      expect(cookieHeader).toContain('HttpOnly');
      expect(cookieHeader).toContain('SameSite=Lax');
      expect(cookieHeader).toContain('Path=/');
      expect(cookieHeader).not.toMatch(/Domain=/i);
      const cookie = cookieHeader.split(';')[0];

      const check = await bridge.agent.get('/api/auth/session').set('Cookie', cookie);
      expect(check.status).toBe(200);
      expect(check.body).toEqual({ accountType: 'LIBRARIAN' });
      const csrf = await bridge.agent.get('/api/auth/csrf').set('Cookie', cookie);
      expect(csrf.status).toBe(200);
      expect(typeof csrf.body.csrfToken).toBe('string');
      const missingCsrf = await bridge.agent.post('/api/auth/logout').set('Cookie', cookie);
      expect(missingCsrf.status).toBe(403);
      expect(system.sessions.size).toBe(1);
      const logout = await bridge.agent.post('/api/auth/logout').set('Cookie', cookie).set('X-CSRF-Token', csrf.body.csrfToken);
      expect(logout.status).toBe(204);
      expect(system.sessions.size).toBe(0);
      expect(logout.headers['set-cookie'][0]).toContain('Max-Age=0');
      expect((await bridge.agent.get('/api/auth/session').set('Cookie', cookie)).status).toBe(401);
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
      bridge.restore();
    }
  });

  test.each([
    ['unknown account', 'absent@example.test', 'synthetic password'],
    ['wrong password', memberEmail, 'incorrect synthetic password'],
    ['wrong selected type', memberEmail, memberPassword],
  ])('renders the same real-server denial for %s', async (caseName, email, password) => {
    const users = await makeUsers();
    const system = createSyntheticSystem(users);
    const bridge = connectReactFetchToExpress(system.app);
    try {
      render(<LoginPage />);
      if (caseName === 'wrong selected type') fireEvent.click(screen.getByRole('radio', { name: /librarian/i }));
      fill(email, password);
      submit();
      expect(await screen.findByText('Unable to sign in with those details.')).toBeInTheDocument();
      expect(screen.queryByText(/signed in as/i)).not.toBeInTheDocument();
      expect(system.sessions.size).toBe(0);
    } finally { bridge.restore(); }
  });

  test('renders the real server 429 after five failed attempts for one canonical email', async () => {
    const users = await makeUsers();
    const system = createSyntheticSystem(users);
    const bridge = connectReactFetchToExpress(system.app);
    try {
      for (let index = 0; index < 5; index += 1) {
        const response = await request(system.app).post('/api/auth/login')
          .send({ email: ` ${memberEmail.toUpperCase()} `, password: 'incorrect synthetic password', accountType: 'MEMBER' });
        expect(response.status).toBe(401);
      }
      render(<LoginPage />);
      fill(memberEmail, memberPassword);
      submit();
      expect(await screen.findByText(/complete sign in/i)).toBeInTheDocument();
      expect(bridge.calls).toHaveLength(1);
      const response = await request(system.app).post('/api/auth/login')
        .send({ email: memberEmail, password: memberPassword, accountType: 'MEMBER' });
      expect(response.status).toBe(429);
      expect(response.body).toEqual({ message: 'Unable to sign in right now. Please try again later.' });
      expect(system.sessions.size).toBe(0);
      expect(users[0].accountStatus).toBe('ACTIVE');
    } finally { bridge.restore(); }
  });

  test('enforces the thirty-failure direct-source threshold despite forwarded-header changes', async () => {
    const system = createSyntheticSystem([]);
    for (let index = 0; index < 30; index += 1) {
      const response = await request(system.app).post('/api/auth/login')
        .set('X-Forwarded-For', `203.0.113.${index + 1}`)
        .send({ email: `absent${index}@example.test`, password: 'synthetic password', accountType: 'MEMBER' });
      expect(response.status).toBe(401);
    }
    const limited = await request(system.app).post('/api/auth/login')
      .send({ email: 'another-absent@example.test', password: 'synthetic password', accountType: 'MEMBER' });
    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({ message: 'Unable to sign in right now. Please try again later.' });
    expect(system.sessions.size).toBe(0);
  });

  test('renders a generic 503 on repository failure and emits no authentication log data', async () => {
    const users = await makeUsers();
    const system = createSyntheticSystem(users, { repositoryUnavailable: true });
    const bridge = connectReactFetchToExpress(system.app);
    const consoleSpies = [jest.spyOn(console, 'log'), jest.spyOn(console, 'info'), jest.spyOn(console, 'warn'), jest.spyOn(console, 'error')];
    try {
      render(<LoginPage />);
      fill(memberEmail, memberPassword);
      submit();
      expect(await screen.findByText(/temporarily unavailable/i)).toBeInTheDocument();
      expect(screen.queryByText(/signed in as/i)).not.toBeInTheDocument();
      expect(system.sessions.size).toBe(0);
      expect(bridge.calls).toHaveLength(1);
      expect(consoleSpies.every((spy) => spy.mock.calls.length === 0)).toBe(true);
    } finally {
      consoleSpies.forEach((spy) => spy.mockRestore());
      bridge.restore();
    }
  });
});
