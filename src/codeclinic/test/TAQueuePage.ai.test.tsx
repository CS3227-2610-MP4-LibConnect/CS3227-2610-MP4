// T07 (spec ai-ta-assist R5, R6; scenarios 8, 10): the "Queue insights" panel on /ta/queue.
// fetch is mocked; no network. Assumed UI contracts are listed in the coverage report.
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import TAQueuePage from '../src/TAQueuePage';

const response = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const source = (name: string) => readFileSync(resolve(__dirname, '../src', name), 'utf8');
const INSIGHTS_PATH = '/api/ta/tickets/insights';

const listItem = (id: string) => ({
  ticketId: id, title: `Queue title ${id}`, language: 'Python', conceptTags: ['loops'], status: 'OPEN',
  claimedByMe: false, claimed: false, createdAt: '2026-11-09T09:00:00.000Z',
});
const insights = (over: Record<string, unknown> = {}) => ({
  groups: [
    { label: 'Off-by-one errors', kind: 'MISCONCEPTION', summary: 'Re-teach range bounds.', tickets: [{ ticketId: 'ins-1', title: 'Insight ticket A' }, { ticketId: 'ins/2', title: 'Insight ticket B' }] },
    { label: 'Recursion base cases', kind: 'CONCEPT', summary: 'Revisit stopping conditions.', tickets: [{ ticketId: 'ins-3', title: 'Insight ticket C' }] },
  ],
  ticketCount: 3, truncated: false, cached: false, ...over,
});

interface Posted { path: string; body: unknown; csrf: string | null }
function mockApi(insightsReply: () => ReturnType<typeof response> | Promise<ReturnType<typeof response>>) {
  const posted: Posted[] = [];
  global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost');
    const method = (init?.method || 'GET').toUpperCase();
    if (url.pathname === '/api/ta/tickets' && method === 'GET') return Promise.resolve(response({ tickets: [listItem('q-1')], nextCursor: null }));
    if (url.pathname === '/api/auth/csrf') return Promise.resolve(response({ csrfToken: 'csrf-token-value' }));
    if (url.pathname === INSIGHTS_PATH && method === 'POST') {
      const headers = (init?.headers || {}) as Record<string, string>;
      posted.push({ path: url.pathname, body: init?.body ? JSON.parse(String(init.body)) : undefined, csrf: headers['X-CSRF-Token'] ?? null });
      return Promise.resolve(insightsReply());
    }
    if (url.pathname === '/api/auth/session') return Promise.resolve(response({ accountType: 'TA' }));
    return Promise.resolve(response({ unreadCount: 0 }));
  }) as jest.Mock;
  return posted;
}

const generate = () => screen.getByRole('button', { name: /generate insights/i });
async function open() {
  render(<TAQueuePage />);
  await screen.findByRole('link', { name: /Queue title q-1/ });
}

describe('Queue insights panel: idle and request', () => {
  afterEach(() => jest.restoreAllMocks());

  test('shows a Queue insights panel labelled "AI suggestion" and makes no AI call until clicked', async () => {
    const posted = mockApi(() => response(insights()));
    await open();
    expect(screen.getByRole('heading', { name: /queue insights/i })).toBeInTheDocument();
    expect(screen.getAllByText(/AI suggestion/i).length).toBeGreaterThan(0);
    expect(generate()).toBeEnabled();
    expect(posted).toHaveLength(0);
  });

  test('Generate insights posts once to the insights endpoint with the CSRF token and no body', async () => {
    const posted = mockApi(() => response(insights()));
    await open();
    fireEvent.click(generate());
    await screen.findByText('Off-by-one errors');
    expect(posted).toEqual([{ path: INSIGHTS_PATH, body: undefined, csrf: 'csrf-token-value' }]);
  });

  test('shows a loading state while the request is pending', async () => {
    let release: (value: ReturnType<typeof response>) => void = () => undefined;
    mockApi(() => new Promise((res) => { release = res; }));
    await open();
    fireEvent.click(generate());
    await waitFor(() => expect((generate() as HTMLButtonElement).disabled || !!screen.queryByText(/generating|analy[sz]ing|loading/i)).toBe(true));
    release(response(insights()));
    await screen.findByText('Off-by-one errors');
  });
});

describe('Queue insights panel: groups (R6)', () => {
  afterEach(() => jest.restoreAllMocks());

  test('each group shows label, kind (Concept or Misconception), summary, and ticket links', async () => {
    mockApi(() => response(insights()));
    await open();
    fireEvent.click(generate());
    expect(await screen.findByText('Off-by-one errors')).toBeInTheDocument();
    expect(screen.getByText('Recursion base cases')).toBeInTheDocument();
    expect(screen.getByText('Re-teach range bounds.')).toBeInTheDocument();
    expect(screen.getByText('Revisit stopping conditions.')).toBeInTheDocument();
    expect(screen.getByText('Misconception')).toBeInTheDocument();
    expect(screen.getByText('Concept')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Insight ticket A' })).toHaveAttribute('href', '/ta/tickets/ins-1');
    expect(screen.getByRole('link', { name: 'Insight ticket B' })).toHaveAttribute('href', `/ta/tickets/${encodeURIComponent('ins/2')}`);
    expect(screen.getByRole('link', { name: 'Insight ticket C' })).toHaveAttribute('href', '/ta/tickets/ins-3');
  });

  test('shows "Based on the oldest 60 active tickets" only when truncated', async () => {
    mockApi(() => response(insights({ truncated: true, ticketCount: 60 })));
    await open();
    fireEvent.click(generate());
    expect(await screen.findByText(/Based on the oldest 60 active tickets/i)).toBeInTheDocument();
    expect(screen.queryByText(/Cached result/i)).not.toBeInTheDocument();
  });

  test('shows "Cached result" only when cached, and neither note otherwise', async () => {
    mockApi(() => response(insights({ cached: true })));
    await open();
    fireEvent.click(generate());
    expect(await screen.findByText(/Cached result/i)).toBeInTheDocument();
    expect(screen.queryByText(/Based on the oldest 60/i)).not.toBeInTheDocument();
  });

  test('no notes for a fresh, complete result', async () => {
    mockApi(() => response(insights()));
    await open();
    fireEvent.click(generate());
    await screen.findByText('Off-by-one errors');
    expect(screen.queryByText(/Cached result/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Based on the oldest 60/i)).not.toBeInTheDocument();
  });

  test('an empty result shows an empty state instead of groups', async () => {
    mockApi(() => response({ groups: [], ticketCount: 0 }));
    await open();
    fireEvent.click(generate());
    expect(await screen.findByText(/no (insight|group|pattern|theme|active ticket)/i)).toBeInTheDocument();
  });
});

describe('Queue insights panel: errors (R5)', () => {
  afterEach(() => jest.restoreAllMocks());

  test.each([
    [503, 'AI_UNAVAILABLE', 'Queue insights are unavailable right now.'],
    [429, 'AI_RATE_LIMITED', 'AI limit reached. Please try again in a minute.'],
    [422, 'AI_INPUT_TOO_LARGE', 'The queue is too large to summarise.'],
    [502, 'AI_INVALID_OUTPUT', 'The AI reply could not be used. Please try again.'],
  ])('%i %s shows the fixed message inline and the queue still works', async (status, code, message) => {
    mockApi(() => response({ code, message: 'server text is not trusted' }, status));
    await open();
    fireEvent.click(generate());
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Queue title q-1/ })).toBeInTheDocument();
    expect(generate()).toBeEnabled();
  });

  test('a network failure shows an inline error rather than throwing', async () => {
    mockApi(() => Promise.reject(new Error('offline')) as never);
    await open();
    fireEvent.click(generate());
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});

describe('Queue insights panel: plain text (scenario 10) and layout', () => {
  afterEach(() => jest.restoreAllMocks());

  test('HTML, script, and javascript: text from the model is rendered literally', async () => {
    const label = '<img src=x onerror=alert(1)>';
    const summary = '<script>alert(1)</script> <b>bold</b> javascript:alert(1) [x](javascript:alert(1))';
    mockApi(() => response(insights({
      groups: [{ label, kind: 'CONCEPT', summary, tickets: [{ ticketId: 'ins-1', title: '<i>title</i>' }] }],
    })));
    await open();
    const { container } = { container: document.body };
    fireEvent.click(generate());
    expect(await screen.findByText(label)).toBeInTheDocument();
    expect(screen.getByText(summary)).toBeInTheDocument();
    expect(screen.getByText('<i>title</i>')).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img[src="x"]')).toBeNull();
    expect(container.querySelector('main b, main i')).toBeNull();
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
    // The only links in the panel are the /ta/tickets/<id> ones.
    const aiLinks = Array.from(container.querySelectorAll('a')).filter((a) => /ins-/.test(a.getAttribute('href') || ''));
    expect(aiLinks.map((a) => a.getAttribute('href'))).toEqual(['/ta/tickets/ins-1']);
  });

  test('the page never uses innerHTML for AI text', () => {
    expect(source('TAQueuePage.tsx')).not.toMatch(/dangerouslySetInnerHTML|innerHTML/);
  });

  test('styles cover the insights panel with theme tokens and reflow at 320 CSS pixels', () => {
    const css = source('TAQueuePage.css');
    expect(css).toMatch(/insights/i);
    expect(css).toMatch(/var\(--lc-color-/);
    expect(css).toMatch(/@media\s*\(max-width:\s*\d+px\)/);
    expect(css).toMatch(/overflow-wrap:\s*anywhere/);
    expect(css).not.toMatch(/min-width:\s*(?:[4-9]\d{2}|\d{4,})px/);
  });
});
