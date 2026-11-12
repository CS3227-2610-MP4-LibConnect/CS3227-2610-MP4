import React, { useCallback, useEffect, useRef, useState } from 'react';
import DashboardLogout from './DashboardLogout';
import StudentTicketCard from './tickets/StudentTicketCard';
import StudentBugFaq from './tickets/StudentBugFaq';
import './DashboardViews.css';

type ActiveTicket = {
  ticketId: string;
  title: string;
  language: string;
  conceptTags: string[];
  status: 'OPEN' | 'CLAIMED';
};

export function StudentDashboard({ onLogoutConfirmed, name }: { onLogoutConfirmed: () => void; name?: string | null }) {
  const [ticketSuccess, setTicketSuccess] = useState(false);
  const [activeTickets, setActiveTickets] = useState<ActiveTicket[]>([]);
  const [ticketsState, setTicketsState] = useState<'loading' | 'ready' | 'error'>('loading');
  const activeTicketRequest = useRef<Promise<void> | null>(null);
  const loadActiveTickets = useCallback(async () => {
    if (activeTicketRequest.current) return activeTicketRequest.current;
    setTicketsState('loading');
    const request = (async () => {
      try {
        const response = await fetch('/api/tickets/active', { method: 'GET', credentials: 'same-origin' });
        if (!response.ok) throw new Error('Ticket request failed.');
        const body = await response.json() as { tickets?: unknown };
        if (!Array.isArray(body?.tickets) || body.tickets.length > 5 || body.tickets.some((ticket) => {
          const item = ticket as Partial<ActiveTicket> | null;
          return !item || typeof item.ticketId !== 'string' || typeof item.title !== 'string' ||
            typeof item.language !== 'string' || !Array.isArray(item.conceptTags) ||
            item.conceptTags.some((tag) => typeof tag !== 'string') || (item.status !== 'OPEN' && item.status !== 'CLAIMED');
        })) throw new Error('Invalid ticket response.');
        setActiveTickets(body.tickets as ActiveTicket[]);
        setTicketsState('ready');
      } catch {
        setTicketsState('error');
      } finally {
        activeTicketRequest.current = null;
      }
    })();
    activeTicketRequest.current = request;
    return request;
  }, []);
  useEffect(() => { void loadActiveTickets(); }, [loadActiveTickets]);
  useEffect(() => {
    if (window.history.state?.ticketCreated !== true) return;
    window.history.replaceState({}, '', window.location.href);
    setTicketSuccess(true);
    const timeout = window.setTimeout(() => setTicketSuccess(false), 6000);
    return () => window.clearTimeout(timeout);
  }, []);
  return (
    <DashboardLogout onConfirmed={onLogoutConfirmed} studentNavigation>
      <main className="dashboard-page student-dashboard">
        <h1>Student Dashboard</h1>
        {ticketSuccess && <p role="status" aria-live="polite">Ticket created successfully.</p>}
        <section className="dashboard-panel" aria-labelledby="student-dashboard-intro">
          <h2 id="student-dashboard-intro">Welcome back{name ? `, ${name}` : ''}</h2>
        </section>
        <section className="dashboard-panel student-active-tickets" aria-labelledby="student-active-tickets-heading" aria-busy={ticketsState === 'loading'}>
          <div className="student-active-tickets-heading">
            <h2 id="student-active-tickets-heading">Active Tickets</h2>
            <a className="student-load-all" href="/student/tickets">View all tickets</a>
          </div>
          {ticketsState === 'loading' && <p role="status" aria-live="polite">Loading active tickets…</p>}
          {ticketsState === 'error' && <div role="alert"><p>Active tickets couldn’t be loaded.</p><button type="button" onClick={() => { void loadActiveTickets(); }}>Retry</button></div>}
          {ticketsState === 'ready' && activeTickets.length === 0 && <p>No active tickets yet.</p>}
          {ticketsState === 'ready' && activeTickets.length > 0 && <ul className="student-active-ticket-list">
            {activeTickets.map((ticket) => <li key={ticket.ticketId}><StudentTicketCard ticket={ticket} /></li>)}
          </ul>}
        </section>
        <section className="dashboard-panel" aria-labelledby="student-ask-for-help">
          <h2 id="student-ask-for-help">Ask for Help</h2>
          <p>Need help with your work? Tell us what you’re working on.</p>
          <a className="submit-button student-create-ticket" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }} href="/student/tickets/new">Create Ticket</a>
        </section>
        <StudentBugFaq />
      </main>
    </DashboardLogout>
  );
}
