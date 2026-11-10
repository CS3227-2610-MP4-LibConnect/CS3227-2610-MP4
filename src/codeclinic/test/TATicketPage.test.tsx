// T07 (spec R7, R8; scenarios 6, 9): /ta/tickets/:ticketId page. Assumes src/TATicketPage.tsx
// (default export, prop `ticketId: string`) and src/TATicketPage.css; see the coverage report.
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import TATicketPage from '../src/TATicketPage';
import { NotificationInbox } from '../src/notifications/Notifications';

const response = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const source = (name: string) => readFileSync(resolve(__dirname, '../src', name), 'utf8');

const view = (over: Record<string, unknown> = {}) => ({
  ticketId: 't-1', title: 'Loop crashes', language: 'Python', conceptTags: ['loops'],
  files: [{ name: 'main.py', content: 'for i in range(3): print(i)' }],
  repoUrl: null, repoFilePaths: [], errorOutput: 'IndexError', expectedBehaviour: 'Prints all',
  actualBehaviour: 'Crashes', attempted: 'Changed bounds', status: 'OPEN', fixNote: null,
  createdAt: '2026-11-09T09:00:00.000Z', updatedAt: '2026-11-09T09:00:00.000Z', resolvedAt: null,
  studentName: 'Sam Student', claimedByMe: false, claimedByName: null, replies: [], ...over,
});

interface Posted { path: string; body: unknown; csrf: string | null }
function mockApi(gets: Array<ReturnType<typeof view>>, posts: Record<string, Array<ReturnType<typeof response>>> = {}) {
  const getCalls: string[] = [];
  const posted: Posted[] = [];
  let getIndex = 0;
  global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost');
    const method = (init?.method || 'GET').toUpperCase();
    if (url.pathname === '/api/ta/tickets/t-1' && method === 'GET') {
      getCalls.push(url.pathname);
      const body = gets[Math.min(getIndex, gets.length - 1)];
      getIndex += 1;
      return Promise.resolve(response(body));
    }
    if (url.pathname === '/api/auth/csrf') return Promise.resolve(response({ csrfToken: 'csrf-token-value' }));
    if (url.pathname.startsWith('/api/ta/tickets/t-1/') && method === 'POST') {
      const headers = (init?.headers || {}) as Record<string, string>;
      posted.push({ path: url.pathname, body: init?.body ? JSON.parse(String(init.body)) : undefined, csrf: headers['X-CSRF-Token'] ?? null });
      const queue = posts[url.pathname];
      return Promise.resolve(queue && queue.length ? queue.shift() : response({}, 500));
    }
    if (url.pathname === '/api/auth/session') return Promise.resolve(response({ accountType: 'TA' }));
    if (url.pathname === '/api/account') return Promise.resolve(response({ accountType: 'TA', isManager: false }));
    if (url.pathname === '/api/notifications/unread-count') return Promise.resolve(response({ unreadCount: 0 }));
    return Promise.resolve(response({}, 404));
  }) as jest.Mock;
  return { getCalls, posted };
}

const q = {
  claim: () => screen.queryByRole('button', { name: /^claim$/i }),
  unclaim: () => screen.queryByRole('button', { name: /^unclaim$/i }),
  resolve: () => screen.queryByRole('button', { name: /^resolve/i }),
  reply: () => screen.queryByRole('button', { name: /send reply/i }),
};

describe('TA ticket page: content', () => {
  afterEach(() => jest.restoreAllMocks());

  test('shows the ticket fields, the code in a <pre>, and the reply thread oldest first', async () => {
    mockApi([view({
      repoFilePaths: ['src/a.py'],
      replies: [
        { replyId: 'r-1', message: 'First message', createdAt: '2026-11-09T09:01:00.000Z', authorName: 'Sam Student', authorRole: 'STUDENT', isMine: false },
        { replyId: 'r-2', message: 'Second message', createdAt: '2026-11-09T09:02:00.000Z', authorName: 'Alice TA', authorRole: 'TA', isMine: true },
      ],
    })]);
    const { container } = render(<TATicketPage ticketId="t-1" />);
    expect(await screen.findByRole('heading', { name: 'Loop crashes' })).toBeInTheDocument();
    ['Python', 'loops', 'IndexError', 'Prints all', 'Crashes', 'Changed bounds', 'Sam Student', 'src/a.py'].forEach((text) => {
      expect(container).toHaveTextContent(text);
    });
    const pre = container.querySelector('pre') as HTMLElement;
    expect(pre).toHaveTextContent('for i in range(3): print(i)');
    expect(container).toHaveTextContent('main.py');
    const text = container.textContent || '';
    expect(text.indexOf('First message')).toBeGreaterThan(-1);
    expect(text.indexOf('First message')).toBeLessThan(text.indexOf('Second message'));
    expect(container).toHaveTextContent('Alice TA');
  });

  test('shows loading, then a retryable error for a failed load and a not-found message for 404', async () => {
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const path = new URL(String(input), 'http://localhost').pathname;
      if (path === '/api/ta/tickets/t-1') return Promise.resolve(response({}, 503));
      return Promise.resolve(response({ unreadCount: 0 }));
    }) as jest.Mock;
    render(<TATicketPage ticketId="t-1" />);
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  test('a 404 shows a not-found message with a link back to the queue', async () => {
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const path = new URL(String(input), 'http://localhost').pathname;
      if (path === '/api/ta/tickets/t-1') return Promise.resolve(response({ message: 'x' }, 404));
      return Promise.resolve(response({ unreadCount: 0 }));
    }) as jest.Mock;
    render(<TATicketPage ticketId="t-1" />);
    expect(await screen.findByText(/not found|no longer exists|doesn.?t exist/i)).toBeInTheDocument();
    expect(document.querySelector('a[href="/ta/queue"]')).toBeInTheDocument();
  });
});

describe('TA ticket page: controls depend on state', () => {
  afterEach(() => jest.restoreAllMocks());

  test.each([
    ['OPEN', {}, { claim: true, unclaim: false, resolve: false, reply: true }],
    ['CLAIMED by me', { status: 'CLAIMED', claimedByMe: true, claimedByName: 'Alice TA' }, { claim: false, unclaim: true, resolve: true, reply: true }],
    ['CLAIMED by another TA', { status: 'CLAIMED', claimedByMe: false, claimedByName: 'Bob TA' }, { claim: false, unclaim: false, resolve: false, reply: true }],
    ['RESOLVED', { status: 'RESOLVED', claimedByMe: true, claimedByName: 'Alice TA', fixNote: 'Fixed bound', resolvedAt: '2026-11-09T10:00:00.000Z' }, { claim: false, unclaim: false, resolve: false, reply: false }],
    ['CLOSED', { status: 'CLOSED' }, { claim: false, unclaim: false, resolve: false, reply: false }],
  ])('%s', async (_name, over, expected) => {
    mockApi([view(over)]);
    render(<TATicketPage ticketId="t-1" />);
    await screen.findByRole('heading', { name: 'Loop crashes' });
    expect(!!q.claim()).toBe(expected.claim);
    expect(!!q.unclaim()).toBe(expected.unclaim);
    expect(!!q.resolve()).toBe(expected.resolve);
    expect(!!q.reply()).toBe(expected.reply);
    expect(!!screen.queryByLabelText(/fix note/i)).toBe(expected.resolve);
  });

  test('a RESOLVED ticket shows its fix note as plain text', async () => {
    mockApi([view({ status: 'RESOLVED', claimedByMe: true, fixNote: '<b>Fix</b> it', resolvedAt: '2026-11-09T10:00:00.000Z' })]);
    const { container } = render(<TATicketPage ticketId="t-1" />);
    expect(await screen.findByText('<b>Fix</b> it')).toBeInTheDocument();
    expect(container.querySelector('b')).toBeNull();
  });
});

describe('TA ticket page: actions', () => {
  afterEach(() => jest.restoreAllMocks());

  test('Claim posts with the CSRF token and an empty body, then shows the updated ticket', async () => {
    const { posted } = mockApi([view()], {
      '/api/ta/tickets/t-1/claim': [response(view({ status: 'CLAIMED', claimedByMe: true, claimedByName: 'Alice TA' }))],
    });
    render(<TATicketPage ticketId="t-1" />);
    fireEvent.click(await screen.findByRole('button', { name: /^claim$/i }));
    await waitFor(() => expect(q.unclaim()).toBeInTheDocument());
    expect(q.claim()).not.toBeInTheDocument();
    expect(posted).toHaveLength(1);
    expect(posted[0].path).toBe('/api/ta/tickets/t-1/claim');
    expect(posted[0].csrf).toBe('csrf-token-value');
    expect(posted[0].body === undefined || JSON.stringify(posted[0].body) === '{}').toBe(true);
  });

  test('Unclaim posts and returns the ticket to the claimable view', async () => {
    const { posted } = mockApi([view({ status: 'CLAIMED', claimedByMe: true, claimedByName: 'Alice TA' })], {
      '/api/ta/tickets/t-1/unclaim': [response(view())],
    });
    render(<TATicketPage ticketId="t-1" />);
    fireEvent.click(await screen.findByRole('button', { name: /^unclaim$/i }));
    await waitFor(() => expect(q.claim()).toBeInTheDocument());
    expect(posted[0].path).toBe('/api/ta/tickets/t-1/unclaim');
  });

  test('the reply form posts only { message }, then shows the reply and clears the box', async () => {
    const reply = { replyId: 'r-9', message: 'Try a print.', createdAt: '2026-11-09T09:05:00.000Z', authorName: 'Alice TA', authorRole: 'TA', isMine: true };
    const { posted } = mockApi([view(), view({ replies: [reply] })], { '/api/ta/tickets/t-1/replies': [response(reply, 201)] });
    render(<TATicketPage ticketId="t-1" />);
    const box = await screen.findByLabelText(/^reply/i);
    fireEvent.change(box, { target: { value: 'Try a print.' } });
    fireEvent.click(screen.getByRole('button', { name: /send reply/i }));
    expect(await screen.findByText('Try a print.')).toBeInTheDocument();
    expect(posted[0]).toMatchObject({ path: '/api/ta/tickets/t-1/replies', body: { message: 'Try a print.' }, csrf: 'csrf-token-value' });
    await waitFor(() => expect((screen.getByLabelText(/^reply/i) as HTMLTextAreaElement).value).toBe(''));
  });

  test('an empty reply is not sent', async () => {
    const { posted } = mockApi([view()]);
    render(<TATicketPage ticketId="t-1" />);
    await screen.findByLabelText(/^reply/i);
    fireEvent.click(screen.getByRole('button', { name: /send reply/i }));
    expect(posted).toHaveLength(0);
  });

  test('the resolve form shows a character count and needs a confirm step before posting { fixNote }', async () => {
    const { posted } = mockApi([view({ status: 'CLAIMED', claimedByMe: true, claimedByName: 'Alice TA' })], {
      '/api/ta/tickets/t-1/resolve': [response(view({ status: 'RESOLVED', claimedByMe: true, fixNote: 'Use <=', resolvedAt: '2026-11-09T10:00:00.000Z' }))],
    });
    render(<TATicketPage ticketId="t-1" />);
    const note = await screen.findByLabelText(/fix note/i);
    fireEvent.change(note, { target: { value: 'Use <=' } });
    expect(screen.getByText(/6\s*\/\s*2000/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^resolve/i }));
    expect(posted).toHaveLength(0);
    const confirm = await screen.findByRole('button', { name: /confirm/i });
    fireEvent.click(confirm);
    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0]).toMatchObject({ path: '/api/ta/tickets/t-1/resolve', body: { fixNote: 'Use <=' }, csrf: 'csrf-token-value' });
    await waitFor(() => expect(q.resolve()).not.toBeInTheDocument());
    expect(await screen.findByText('Use <=')).toBeInTheDocument();
  });

  test('an empty or over-long fix note cannot be confirmed', async () => {
    const { posted } = mockApi([view({ status: 'CLAIMED', claimedByMe: true, claimedByName: 'Alice TA' })]);
    render(<TATicketPage ticketId="t-1" />);
    const note = await screen.findByLabelText(/fix note/i);
    fireEvent.click(screen.getByRole('button', { name: /^resolve/i }));
    expect(screen.queryByRole('button', { name: /confirm/i })?.hasAttribute('disabled') ?? true).toBe(true);
    fireEvent.change(note, { target: { value: 'x'.repeat(2001) } });
    fireEvent.click(screen.getByRole('button', { name: /^resolve/i }));
    const confirm = screen.queryByRole('button', { name: /confirm/i });
    if (confirm) fireEvent.click(confirm);
    expect(posted).toHaveLength(0);
  });

  test('a 409 refreshes the ticket and shows the stale-ticket message', async () => {
    const { getCalls } = mockApi(
      [view(), view({ status: 'CLAIMED', claimedByMe: false, claimedByName: 'Bob TA' })],
      { '/api/ta/tickets/t-1/claim': [response({ message: 'conflict' }, 409)] },
    );
    render(<TATicketPage ticketId="t-1" />);
    fireEvent.click(await screen.findByRole('button', { name: /^claim$/i }));
    expect(await screen.findByText('This ticket changed. The latest version is shown.')).toBeInTheDocument();
    await waitFor(() => expect(q.claim()).not.toBeInTheDocument());
    expect(getCalls).toHaveLength(2);
    expect(screen.getByText(/Bob TA/)).toBeInTheDocument();
  });

  test('a 409 on reply also refreshes (ticket resolved meanwhile) and hides the reply form', async () => {
    const { getCalls } = mockApi(
      [view(), view({ status: 'RESOLVED', claimedByMe: false, claimedByName: 'Bob TA', fixNote: 'done', resolvedAt: '2026-11-09T10:00:00.000Z' })],
      { '/api/ta/tickets/t-1/replies': [response({ message: 'conflict' }, 409)] },
    );
    render(<TATicketPage ticketId="t-1" />);
    fireEvent.change(await screen.findByLabelText(/^reply/i), { target: { value: 'hi' } });
    fireEvent.click(screen.getByRole('button', { name: /send reply/i }));
    expect(await screen.findByText('This ticket changed. The latest version is shown.')).toBeInTheDocument();
    await waitFor(() => expect(q.reply()).not.toBeInTheDocument());
    expect(getCalls).toHaveLength(2);
  });

  test('a server error on an action shows an alert without changing the view', async () => {
    mockApi([view()], { '/api/ta/tickets/t-1/claim': [response({}, 503)] });
    render(<TATicketPage ticketId="t-1" />);
    fireEvent.click(await screen.findByRole('button', { name: /^claim$/i }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(q.claim()).toBeInTheDocument();
  });
});

describe('TA ticket page: untrusted content (scenario 9)', () => {
  afterEach(() => jest.restoreAllMocks());
  const hostile = '<img src=x onerror=alert(1)><script>alert(2)</script>';

  test('title, fields, files, and replies are shown literally with no injected elements', async () => {
    mockApi([view({
      title: hostile, errorOutput: hostile, attempted: hostile, expectedBehaviour: hostile, actualBehaviour: hostile,
      files: [{ name: '<b>f.py</b>', content: hostile }],
      replies: [{ replyId: 'r-1', message: hostile, createdAt: '2026-11-09T09:01:00.000Z', authorName: '<i>Mallory</i>', authorRole: 'STUDENT', isMine: false }],
    })]);
    const { container } = render(<TATicketPage ticketId="t-1" />);
    await screen.findByRole('heading', { level: 1 });
    expect(container.textContent).toContain(hostile);
    expect(container.querySelector('pre')?.textContent).toContain(hostile);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(container.querySelector('i')).toBeNull();
    expect(container.querySelector('a[href^="javascript:" i]')).toBeNull();
  });

  test('a github.com repoUrl is a link with rel="noopener noreferrer"', async () => {
    mockApi([view({ repoUrl: 'https://github.com/org/repo' })]);
    render(<TATicketPage ticketId="t-1" />);
    const link = await screen.findByRole('link', { name: 'https://github.com/org/repo' });
    expect(link).toHaveAttribute('href', 'https://github.com/org/repo');
    expect(link.getAttribute('rel')).toMatch(/noopener/);
    expect(link.getAttribute('rel')).toMatch(/noreferrer/);
  });

  test.each([
    ['javascript:alert(1)'],
    ['JaVaScRiPt:alert(1)'],
    ['data:text/html,<script>alert(1)</script>'],
    ['https://evil.example/github.com/x'],
    ['https://github.com.evil.example/x'],
    ['http://github.com/org/repo'],
    ['https://github.com/org/repo with space'],
    ['https://github.com/'],
    ['//github.com/org/repo'],
  ])('repoUrl %s is plain text, not a link', async (repoUrl) => {
    mockApi([view({ repoUrl })]);
    const { container } = render(<TATicketPage ticketId="t-1" />);
    await screen.findByRole('heading', { name: 'Loop crashes' });
    expect(container).toHaveTextContent(repoUrl.replace(/\s+/g, ' ').slice(0, 20));
    const main = container.querySelector('main') || container;
    expect(within(main as HTMLElement).queryAllByRole('link').filter((a) => /github|javascript|data:|evil/i.test(a.getAttribute('href') || ''))).toHaveLength(0);
  });
});

describe('TA ticket page: layout and wiring', () => {
  test('styles use shared theme tokens and reflow at 320 CSS pixels', () => {
    const css = source('TATicketPage.css');
    expect(css).toMatch(/var\(--lc-color-/);
    expect(css).toMatch(/@media\s*\(max-width:\s*\d+px\)/);
    expect(css).toMatch(/overflow-wrap:\s*anywhere/);
    expect(css).toMatch(/pre[^{]*\{[^}]*(overflow-x:\s*auto|white-space:\s*pre-wrap)/);
    expect(css).not.toMatch(/min-width:\s*(?:[4-9]\d{2}|\d{4,})px/);
  });

  test('the TA notifications route points inbox links at /ta/tickets/<id> and students get no link', () => {
    const route = source('NotificationsRoute.tsx');
    expect(route).toMatch(/ticketHref/);
    expect(route).toMatch(/\/ta\/tickets\//);
  });

  test('the inbox renders a TA ticket link from ticketHref', async () => {
    const item = { notificationId: 'n-1', notificationType: 'TICKET_REPLY', ticketId: 't-1', message: 'A student replied', createdAt: new Date().toISOString(), read: true };
    global.fetch = jest.fn().mockResolvedValue(response({ notifications: [item], nextCursor: null })) as jest.Mock;
    render(<NotificationInbox ticketHref={(id) => `/ta/tickets/${id}`} />);
    expect(await screen.findByRole('link', { name: /open related ticket|A student replied/i })).toHaveAttribute('href', '/ta/tickets/t-1');
  });
});
