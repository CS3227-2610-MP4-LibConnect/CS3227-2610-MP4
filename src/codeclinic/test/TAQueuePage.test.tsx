// T06 (spec R8; scenarios 1, 9): /ta/queue page. Assumes src/TAQueuePage.tsx (default export,
// no props) and src/TAQueuePage.css; see the coverage report for all assumed UI contracts.
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import TAQueuePage from '../src/TAQueuePage';

const response = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const source = (name: string) => readFileSync(resolve(__dirname, '../src', name), 'utf8');
const item = (id: string, over: Record<string, unknown> = {}) => ({
  ticketId: id, title: `Title ${id}`, language: 'Python', conceptTags: ['loops'], status: 'OPEN',
  claimedByMe: false, claimed: false, createdAt: '2026-11-09T09:00:00.000Z', ...over,
});

type Handler = (params: URLSearchParams) => ReturnType<typeof response> | Promise<ReturnType<typeof response>>;

function mockApi(handler: Handler) {
  const queueCalls: URLSearchParams[] = [];
  global.fetch = jest.fn((input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://localhost');
    if (url.pathname === '/api/ta/tickets') {
      queueCalls.push(url.searchParams);
      return Promise.resolve(handler(url.searchParams));
    }
    if (url.pathname === '/api/auth/session') return Promise.resolve(response({ accountType: 'TA' }));
    if (url.pathname === '/api/account') return Promise.resolve(response({ accountType: 'TA', isManager: false }));
    if (url.pathname === '/api/notifications/unread-count') return Promise.resolve(response({ unreadCount: 0 }));
    return Promise.resolve(response({}, 404));
  }) as jest.Mock;
  return queueCalls;
}

describe('TA queue page', () => {
  afterEach(() => jest.restoreAllMocks());

  test('shows a loading state, then the tickets as links to the detail page with claimed badges', async () => {
    mockApi(() => response({
      tickets: [
        item('t-1'),
        item('t-2', { status: 'CLAIMED', claimed: true, claimedByMe: true }),
        item('t-3', { status: 'CLAIMED', claimed: true, claimedByMe: false }),
      ],
      nextCursor: null,
    }));
    render(<TAQueuePage />);
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
    expect(await screen.findByRole('link', { name: /Title t-1/ })).toHaveAttribute('href', '/ta/tickets/t-1');
    expect(screen.getByRole('link', { name: /Title t-2/ })).toHaveAttribute('href', '/ta/tickets/t-2');
    const rowOf = (id: string) => screen.getByRole('link', { name: new RegExp(`Title ${id}`) }).closest('li, tr') as HTMLElement;
    expect(within(rowOf('t-1')).queryByText(/claimed/i)).not.toBeInTheDocument();
    expect(within(rowOf('t-2')).getByText('Claimed by you')).toBeInTheDocument();
    expect(within(rowOf('t-3')).getByText('Claimed')).toBeInTheDocument();
    expect(within(rowOf('t-3')).queryByText('Claimed by you')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
  });

  test('the default request is the ACTIVE queue (no status override) and shows language, status, and tags', async () => {
    const calls = mockApi(() => response({ tickets: [item('t-1', { language: 'Java', conceptTags: ['arrays', 'loops'] })], nextCursor: null }));
    render(<TAQueuePage />);
    const link = await screen.findByRole('link', { name: /Title t-1/ });
    const row = link.closest('li, tr') as HTMLElement;
    expect(row).toHaveTextContent('Java');
    expect(row).toHaveTextContent('arrays');
    expect(row).toHaveTextContent(/open/i);
    expect(['ACTIVE', null]).toContain(calls[0].get('status'));
    expect(calls[0].get('cursor')).toBeNull();
  });

  test('status, language, and concept filters re-query the API with those values', async () => {
    const calls = mockApi(() => response({ tickets: [], nextCursor: null }));
    render(<TAQueuePage />);
    await screen.findByText(/no tickets/i);
    fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'RESOLVED' } });
    await waitFor(() => expect(calls.some((p) => p.get('status') === 'RESOLVED')).toBe(true));
    fireEvent.change(screen.getByLabelText(/language/i), { target: { value: 'C++' } });
    await waitFor(() => expect(calls.some((p) => p.get('language') === 'C++' && p.get('status') === 'RESOLVED')).toBe(true));
    fireEvent.change(screen.getByLabelText(/concept/i), { target: { value: 'Recursion' } });
    await waitFor(() => expect(calls.some((p) => p.get('concept')?.toLowerCase() === 'recursion')).toBe(true));
    const last = calls[calls.length - 1];
    expect(last.get('cursor')).toBeNull();
  });

  test('the language filter offers exactly the Q1 languages and the status filter offers the four statuses and Active', async () => {
    mockApi(() => response({ tickets: [], nextCursor: null }));
    render(<TAQueuePage />);
    await screen.findByText(/no tickets/i);
    const languages = within(screen.getByLabelText(/language/i)).getAllByRole('option').map((o) => (o as HTMLOptionElement).value).filter(Boolean);
    expect(languages).toEqual(['Python', 'Java', 'JavaScript', 'TypeScript', 'C', 'C++', 'Other']);
    const statuses = within(screen.getByLabelText(/status/i)).getAllByRole('option').map((o) => (o as HTMLOptionElement).value);
    expect(statuses).toEqual(expect.arrayContaining(['ACTIVE', 'OPEN', 'CLAIMED', 'RESOLVED', 'CLOSED']));
  });

  test('Load more appends the next page using the cursor and disappears on the last page', async () => {
    const calls = mockApi((params) => params.get('cursor') === 'CUR-2'
      ? response({ tickets: [item('t-21')], nextCursor: null })
      : response({ tickets: Array.from({ length: 20 }, (_, i) => item(`t-${i}`)), nextCursor: 'CUR-2' }));
    render(<TAQueuePage />);
    await screen.findByRole('link', { name: /Title t-0$/ });
    expect(screen.getAllByRole('link', { name: /^Title t-/ })).toHaveLength(20);
    fireEvent.click(screen.getByRole('button', { name: /load more/i }));
    expect(await screen.findByRole('link', { name: /Title t-21/ })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /^Title t-/ })).toHaveLength(21);
    expect(screen.getByRole('link', { name: /Title t-0$/ })).toBeInTheDocument();
    expect(calls[calls.length - 1].get('cursor')).toBe('CUR-2');
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
  });

  test('changing a filter discards the loaded pages and the cursor', async () => {
    const calls = mockApi((params) => params.get('language') === 'Java'
      ? response({ tickets: [item('j-1', { language: 'Java' })], nextCursor: null })
      : response({ tickets: [item('p-1')], nextCursor: 'CUR-2' }));
    render(<TAQueuePage />);
    await screen.findByRole('link', { name: /Title p-1/ });
    fireEvent.change(screen.getByLabelText(/language/i), { target: { value: 'Java' } });
    expect(await screen.findByRole('link', { name: /Title j-1/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Title p-1/ })).not.toBeInTheDocument();
    expect(calls[calls.length - 1].get('cursor')).toBeNull();
  });

  test('empty state', async () => {
    mockApi(() => response({ tickets: [], nextCursor: null }));
    render(<TAQueuePage />);
    expect(await screen.findByText(/no tickets/i)).toBeInTheDocument();
  });

  test('error state offers Retry, which refetches and recovers', async () => {
    let attempts = 0;
    mockApi(() => (++attempts === 1 ? response({ message: 'down' }, 503) : response({ tickets: [item('t-1')], nextCursor: null })));
    render(<TAQueuePage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.?t load|try again|unavailable/i);
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(await screen.findByRole('link', { name: /Title t-1/ })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('a network failure also shows the retryable error state', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('offline'))) as jest.Mock;
    render(<TAQueuePage />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  test('titles are rendered as plain text, never as markup or script links (scenario 9)', async () => {
    const hostile = '<img src=x onerror=alert(1)><script>alert(2)</script>';
    mockApi(() => response({ tickets: [item('t-1', { title: hostile, conceptTags: ['<b>bold</b>'] })], nextCursor: null }));
    const { container } = render(<TAQueuePage />);
    expect(await screen.findByText(hostile)).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
  });

  test('styles use shared theme tokens and reflow at 320 CSS pixels', () => {
    const css = source('TAQueuePage.css');
    expect(css).toMatch(/var\(--lc-color-/);
    expect(css).toMatch(/@media\s*\(max-width:\s*\d+px\)/);
    expect(css).toMatch(/overflow-wrap:\s*anywhere/);
    expect(css).not.toMatch(/min-width:\s*(?:[4-9]\d{2}|\d{4,})px/);
  });
});

describe('queue navigation wiring (T06)', () => {
  test('the TA dashboard and the TA header link to /ta/queue, the student header does not', async () => {
    global.fetch = jest.fn().mockResolvedValue(response({ unreadCount: 0 })) as jest.Mock;
    const { TADashboard } = require('../src/TADashboard');
    const AppHeader = require('../src/AppHeader').default;
    const { unmount } = render(<TADashboard onLogoutConfirmed={() => undefined} />);
    expect(document.querySelector('a[href="/ta/queue"]')).toBeInTheDocument();
    unmount();
    const ta = render(<AppHeader accountType="TA" activePath="/ta/queue" onLogout={() => undefined} />);
    expect(screen.getByRole('link', { name: 'Queue' })).toHaveAttribute('href', '/ta/queue');
    expect(screen.getByRole('link', { name: 'Queue' })).toHaveAttribute('aria-current', 'page');
    ta.unmount();
    render(<AppHeader accountType="STUDENT" onLogout={() => undefined} />);
    expect(screen.queryByRole('link', { name: 'Queue' })).not.toBeInTheDocument();
  });

  test('the entry point routes /ta/queue and /ta/tickets/:id behind the TA guard, and the server serves the SPA for both', () => {
    const entry = source('index.tsx');
    expect(entry).toMatch(/\/ta\/queue/);
    expect(entry).toMatch(/\/ta\/tickets\//);
    expect(entry).toMatch(/accountType="TA"/);
    const server = readFileSync(resolve(__dirname, '../server/index.js'), 'utf8');
    expect(server).toMatch(/\/ta\/queue/);
    expect(server).toMatch(/\/ta\/tickets\/:ticketId/);
  });
});
