// REVIEW-ONLY tests (independent reviewer, ta-ticket-queue spec v0.1, R8 repoUrl rule,
// scenario 9). Adds look-alike-host and userinfo cases to the approved TATicketPage tests.
import React from 'react';
import { render, screen } from '@testing-library/react';
import TATicketPage from '../src/TATicketPage';

const view = (repoUrl: string) => ({
  ticketId: 't-1', title: 'Loop crashes', language: 'Python', conceptTags: [], files: [],
  repoUrl, repoFilePaths: [], errorOutput: '', expectedBehaviour: '', actualBehaviour: '', attempted: '',
  status: 'OPEN', fixNote: null, createdAt: null, updatedAt: null, resolvedAt: null,
  studentName: 'Sam Student', claimedByMe: false, claimedByName: null, replies: [],
});

function mockTicket(repoUrl: string) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: async () => view(repoUrl) })) as jest.Mock;
}

describe('review: repoUrl look-alike hosts are never links', () => {
  afterEach(() => jest.restoreAllMocks());

  test.each([
    ['https://github.com@evil.example/x'],
    ['https://github.com:443@evil.example/x'],
    ['https://github.comevil.example/x'],
    ['https://github.com.evil.example'],
    ['HTTPS://GITHUB.COM/org/repo'],
    ['https://github.com/x\njavascript:alert(1)'],
    [' https://github.com/org/repo'],
  ])('%j is shown as plain text', async (repoUrl) => {
    mockTicket(repoUrl);
    const { container } = render(<TATicketPage ticketId="t-1" />);
    await screen.findByRole('heading', { name: 'Loop crashes' });
    expect(container.querySelectorAll('a[target="_blank"]')).toHaveLength(0);
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/ta/queue']);
  });

  test('a genuine github.com URL with a path is a safe external link', async () => {
    mockTicket('https://github.com/org/repo/blob/main/a.py');
    const { container } = render(<TATicketPage ticketId="t-1" />);
    await screen.findByRole('heading', { name: 'Loop crashes' });
    const external = container.querySelector('a[target="_blank"]');
    expect(external).toHaveAttribute('href', 'https://github.com/org/repo/blob/main/a.py');
    expect(external).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
