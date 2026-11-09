// T19 (spec ai-ta-assist R4, R6): show how many active tickets the insight groups cover.
// fetch is mocked; no network.
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import TAQueuePage from '../src/TAQueuePage';

const response = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const COVERAGE = /^Grouped \d+ of \d+ active tickets\.$/;

const group = (label: string, ids: string[]) => ({
  label, kind: 'CONCEPT', summary: 'Re-teach the concept.', tickets: ids.map((id) => ({ ticketId: id, title: `Title ${id}` })),
});

function mockApi(insightsBody: unknown) {
  global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost');
    const method = (init?.method || 'GET').toUpperCase();
    if (url.pathname === '/api/ta/tickets' && method === 'GET') {
      return Promise.resolve(response({ tickets: [{
        ticketId: 'q-1', title: 'Queue title q-1', language: 'Python', conceptTags: ['loops'], status: 'OPEN',
        claimedByMe: false, claimed: false, createdAt: '2026-11-09T09:00:00.000Z',
      }], nextCursor: null }));
    }
    if (url.pathname === '/api/auth/csrf') return Promise.resolve(response({ csrfToken: 'csrf-token-value' }));
    if (url.pathname === '/api/ta/tickets/insights' && method === 'POST') return Promise.resolve(response(insightsBody));
    if (url.pathname === '/api/auth/session') return Promise.resolve(response({ accountType: 'TA' }));
    return Promise.resolve(response({ unreadCount: 0 }));
  }) as jest.Mock;
}

async function run(insightsBody: unknown) {
  mockApi(insightsBody);
  render(<TAQueuePage />);
  await screen.findByRole('link', { name: /Queue title q-1/ });
  fireEvent.click(screen.getByRole('button', { name: /generate insights/i }));
}

describe('Queue insights: grouping coverage', () => {
  afterEach(() => jest.restoreAllMocks());

  test('shows "Grouped X of Y" when fewer distinct tickets are grouped than ticketCount', async () => {
    await run({ groups: [group('A', ['t1', 't2']), group('B', ['t2', 't3'])], ticketCount: 5, truncated: false, cached: false });
    const note = await screen.findByText('Grouped 3 of 5 active tickets.');
    expect(note).toHaveClass('ta-queue__note');
  });

  test('is hidden when every ticket is grouped', async () => {
    await run({ groups: [group('A', ['t1', 't2'])], ticketCount: 2, truncated: false, cached: false });
    await screen.findByText('A');
    expect(screen.queryByText(COVERAGE)).not.toBeInTheDocument();
  });

  test('is hidden when ticketCount is unknown', async () => {
    await run({ groups: [group('A', ['t1'])], truncated: false, cached: false });
    await screen.findByText('A');
    expect(screen.queryByText(COVERAGE)).not.toBeInTheDocument();
  });

  test('is hidden when ticketCount is 0', async () => {
    await run({ groups: [group('A', ['t1'])], ticketCount: 0, truncated: false, cached: false });
    await screen.findByText('A');
    expect(screen.queryByText(COVERAGE)).not.toBeInTheDocument();
  });

  test('is hidden when there are no groups and "No common patterns found." shows', async () => {
    await run({ groups: [], ticketCount: 4, truncated: false, cached: false });
    expect(await screen.findByText('No common patterns found.')).toBeInTheDocument();
    expect(screen.queryByText(COVERAGE)).not.toBeInTheDocument();
  });
});
