// N1: badges show only while the ticket is currently claimed (spec R1 amendment).
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import TAQueuePage from '../src/TAQueuePage';

test('a RESOLVED ticket the viewer claimed earlier shows no claimed badge', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({
    tickets: [{ ticketId: 'r-1', title: 'Resolved one', language: 'Python', conceptTags: [], status: 'RESOLVED',
      claimedByMe: true, claimed: false, createdAt: '2026-11-09T09:00:00.000Z' }],
    nextCursor: null,
  }) }) as jest.Mock;
  render(<TAQueuePage />);
  const row = (await screen.findByRole('link', { name: /Resolved one/ })).closest('li') as HTMLElement;
  expect(within(row).queryByText('Claimed by you')).not.toBeInTheDocument();
  expect(within(row).queryByText('Claimed')).not.toBeInTheDocument();
});
