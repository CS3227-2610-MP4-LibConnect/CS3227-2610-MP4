// T11 (spec ai-ta-assist R4, R6; review F2): the empty insights message depends on ticketCount.
// fetch is mocked; no network.
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import TAQueuePage from '../src/TAQueuePage';

const response = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const EMPTY_QUEUE = 'No insights: there are no active tickets to group.';
const NO_PATTERNS = 'No common patterns found.';

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

describe('Queue insights: empty states', () => {
  afterEach(() => jest.restoreAllMocks());

  test('ticketCount 0 and no groups shows the empty-queue message', async () => {
    await run({ groups: [], ticketCount: 0, truncated: false, cached: false });
    expect(await screen.findByText(EMPTY_QUEUE)).toBeInTheDocument();
    expect(screen.queryByText(NO_PATTERNS)).not.toBeInTheDocument();
  });

  test('tickets but no groups shows "No common patterns found." and not the empty-queue text', async () => {
    await run({ groups: [], ticketCount: 5, truncated: false, cached: false });
    expect(await screen.findByText(NO_PATTERNS)).toBeInTheDocument();
    expect(screen.queryByText(EMPTY_QUEUE)).not.toBeInTheDocument();
  });

  test('a missing ticketCount is unknown and does not claim the queue is empty', async () => {
    await run({ groups: [], truncated: false, cached: false });
    expect(await screen.findByText(NO_PATTERNS)).toBeInTheDocument();
    expect(screen.queryByText(EMPTY_QUEUE)).not.toBeInTheDocument();
  });
});
