import React from 'react';
import './StudentTicketCard.css';

export type StudentTicketSummary = {
  ticketId: string;
  title: string;
  language: string;
  conceptTags: string[];
  status: 'OPEN' | 'CLAIMED' | 'CLOSED' | 'RESOLVED';
};

const STATUS_LABELS: Record<StudentTicketSummary['status'], string> = {
  OPEN: 'Open',
  CLAIMED: 'Claimed',
  CLOSED: 'Closed',
  RESOLVED: 'Resolved',
};

export function StudentTicketCard({ ticket, muted = false }: { ticket: StudentTicketSummary; muted?: boolean }) {
  return (
    <a
      className={`student-active-ticket-card${muted ? ' student-ticket-card--muted' : ''}`}
      href={`/student/tickets/${encodeURIComponent(ticket.ticketId)}`}
    >
      <span className="student-active-ticket-title">{ticket.title}</span>
      <span className="student-active-ticket-meta">{ticket.language} · {STATUS_LABELS[ticket.status]}</span>
      <span className="student-active-ticket-tags">{ticket.conceptTags.length ? ticket.conceptTags.join(', ') : 'No concept tags'}</span>
    </a>
  );
}

export default StudentTicketCard;
