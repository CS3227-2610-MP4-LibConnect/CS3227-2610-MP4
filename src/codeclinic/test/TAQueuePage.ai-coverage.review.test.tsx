// REVIEW-ONLY (ai-ta-assist improvement rounds 1-2 review, 2026-11-09): T19 edge cases. fetch is mocked; no network. Left uncommitted.
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import TAQueuePage from '../src/TAQueuePage';

const response = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const COVERAGE = /^Grouped \d+ of \d+ active tickets\.$/;
const group = (label: string, ids: string[], title = 'T') => ({
  label, kind: 'CONCEPT', summary: 'S.', tickets: ids.map((id) => ({ ticketId: id, title: `${title} ${id}` })),
});

function mockApi(insightsBody: unknown) {
  global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost');
    const method = (init?.method || 'GET').toUpperCase();
    if (url.pathname === '/api/ta/tickets' && method === 'GET') {
      return Promise.resolve(response({ tickets: [{
        ticketId: 'q-1', title: 'Queue title q-1', language: 'Python', conceptTags: [], status: 'OPEN',
        claimedByMe: false, claimed: false, createdAt: '2026-11-09T09:00:00.000Z',
      }], nextCursor: null }));
    }
    if (url.pathname === '/api/auth/csrf') return Promise.resolve(response({ csrfToken: 'csrf-token-value' }));
    if (url.pathname === '/api/ta/tickets/insights' && method === 'POST') return Promise.resolve(response(insightsBody));
    if (url.pathname === '/api/auth/session') return Promise.resolve(response({ accountType: 'TA' }));
    return Promise.resolve(response({ unreadCount: 0 }));
  }) as jest.Mock;
}

async function run(body: unknown) {
  mockApi(body);
  const view = render(<TAQueuePage />);
  await screen.findByRole('link', { name: /Queue title q-1/ });
  fireEvent.click(screen.getByRole('button', { name: /generate insights/i }));
  return view;
}

describe('review: T19 coverage edge cases', () => {
  afterEach(() => jest.restoreAllMocks());

  test('a duplicate id inside one group counts once', async () => {
    await run({ groups: [group('A', ['t1', 't1', 't2'])], ticketCount: 4, truncated: false, cached: false });
    expect(await screen.findByText('Grouped 2 of 4 active tickets.')).toBeInTheDocument();
  });

  test('entries without a ticketId are not counted', async () => {
    await run({ groups: [{ label: 'A', kind: 'CONCEPT', summary: 'S.', tickets: [{ ticketId: 't1', title: 'x' }, { title: 'no id' }, { ticketId: 7 }] }], ticketCount: 3, truncated: false, cached: false });
    expect(await screen.findByText('Grouped 1 of 3 active tickets.')).toBeInTheDocument();
  });

  test('more grouped than ticketCount (malformed server data) hides the note', async () => {
    await run({ groups: [group('A', ['t1', 't2', 't3'])], ticketCount: 2, truncated: false, cached: false });
    await screen.findByText('A');
    expect(screen.queryByText(COVERAGE)).not.toBeInTheDocument();
  });

  test('non-integer or negative ticketCount hides the note', async () => {
    await run({ groups: [group('A', ['t1'])], ticketCount: 2.5, truncated: false, cached: false });
    await screen.findByText('A');
    expect(screen.queryByText(COVERAGE)).not.toBeInTheDocument();
  });

  test('shows alongside the truncation and cached notes, once, as plain text', async () => {
    const { container } = await run({ groups: [group('A', ['t1'], '<img src=x onerror=alert(1)>')], ticketCount: 60, truncated: true, cached: true });
    expect(await screen.findByText('Grouped 1 of 60 active tickets.')).toBeInTheDocument();
    expect(screen.getByText(/Based on the oldest 60 active tickets/)).toBeInTheDocument();
    expect(screen.getByText('Cached result.')).toBeInTheDocument();
    expect(screen.getAllByText(COVERAGE)).toHaveLength(1);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.queryByText('No common patterns found.')).not.toBeInTheDocument();
  });

  test('empty queue shows only the empty-queue text, no coverage note', async () => {
    await run({ groups: [], ticketCount: 0, truncated: false, cached: false });
    expect(await screen.findByText('No insights: there are no active tickets to group.')).toBeInTheDocument();
    expect(screen.queryByText(COVERAGE)).not.toBeInTheDocument();
  });
});
