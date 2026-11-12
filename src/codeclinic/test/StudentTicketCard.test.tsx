import React from 'react';
import { render, screen, within } from '@testing-library/react';
import StudentTicketCard from '../src/tickets/StudentTicketCard';

describe('shared Student ticket card', () => {
  test.each([
    ['OPEN', 'Open'],
    ['CLAIMED', 'Claimed'],
    ['CLOSED', 'Closed'],
    ['RESOLVED', 'Resolved'],
  ] as const)('preserves dashboard content order and labels %s', (status, label) => {
    render(<StudentTicketCard ticket={{
      ticketId: 'ticket/one', title: 'Array bounds issue', language: 'TypeScript', conceptTags: ['arrays', 'loops'], status,
    }} />);
    const card = screen.getByRole('link', { name: /Array bounds issue/ });
    expect(card).toHaveAttribute('href', '/student/tickets/ticket%2Fone');
    expect(within(card).getAllByText(/./).map((node) => node.textContent)).toEqual([
      'Array bounds issue', `TypeScript · ${label}`, 'arrays, loops',
    ]);
    expect(card).toHaveClass('student-active-ticket-card');
  });

  test('uses the exact empty-tag copy and keeps muted cards focusable', () => {
    render(<StudentTicketCard muted ticket={{
      ticketId: 'closed-1', title: 'Resolved issue', language: 'Python', conceptTags: [], status: 'RESOLVED',
    }} />);
    const card = screen.getByRole('link', { name: /Resolved issue/ });
    expect(within(card).getByText('No concept tags')).toBeInTheDocument();
    expect(card).toHaveClass('student-ticket-card--muted');
    card.focus();
    expect(card).toHaveFocus();
  });
});
