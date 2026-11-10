import React, { useCallback, useEffect, useRef, useState } from 'react';
import DashboardLogout from '../DashboardLogout';
import { StudentTicketCard, StudentTicketSummary } from './StudentTicketCard';
import './MyTicketsPage.css';

type TicketView = 'open' | 'closed';
type LoadState = 'loading' | 'loaded' | 'error';
type TicketPage = { tickets: StudentTicketSummary[]; nextCursor?: string };

const TERMINAL_STATUSES = new Set(['CLOSED', 'RESOLVED']);
const ACTIVE_STATUSES = new Set(['OPEN', 'CLAIMED']);
const MAX_CURSOR_LENGTH = 4096;

function validSummary(value: unknown): value is StudentTicketSummary {
  if (!value || typeof value !== 'object') return false;
  const ticket = value as Record<string, unknown>;
  const statuses = typeof ticket.status === 'string' && ['OPEN', 'CLAIMED', 'CLOSED', 'RESOLVED'].includes(ticket.status);
  const updatedAt = typeof ticket.updatedAt === 'string' || Boolean(ticket.updatedAt && typeof ticket.updatedAt === 'object');
  return typeof ticket.ticketId === 'string' && ticket.ticketId.length > 0 && ticket.ticketId.length <= 200 &&
    typeof ticket.title === 'string' && ticket.title.length <= 200 &&
    typeof ticket.language === 'string' && ticket.language.length <= 100 &&
    Array.isArray(ticket.conceptTags) && ticket.conceptTags.length <= 5 &&
    ticket.conceptTags.every((tag) => typeof tag === 'string' && tag.length <= 80) &&
    statuses && updatedAt;
}

function parsePage(body: unknown, view: TicketView): TicketPage | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const result = body as Record<string, unknown>;
  if (!Array.isArray(result.tickets) || !result.tickets.every(validSummary)) return null;
  const expectedStatuses = view === 'open' ? ACTIVE_STATUSES : TERMINAL_STATUSES;
  if (result.tickets.some((ticket) => !expectedStatuses.has(ticket.status))) return null;
  if (new Set(result.tickets.map((ticket) => ticket.ticketId)).size !== result.tickets.length) return null;
  if (result.nextCursor !== undefined && (typeof result.nextCursor !== 'string' ||
      result.nextCursor.length === 0 || result.nextCursor.length > MAX_CURSOR_LENGTH)) return null;
  return { tickets: result.tickets, nextCursor: result.nextCursor as string | undefined };
}

async function requestPage(view: TicketView, cursor?: string): Promise<TicketPage> {
  const query = new URLSearchParams({ view });
  if (cursor) query.set('cursor', cursor);
  const response = await fetch(`/api/tickets?${query.toString()}`, { method: 'GET', credentials: 'same-origin' });
  if (!response.ok) throw new Error('Ticket request failed.');
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error('Invalid ticket response.');
  }
  const page = parsePage(body, view);
  if (!page) throw new Error('Invalid ticket response.');
  return page;
}

export function MyTicketsPage({ onLogoutConfirmed }: { onLogoutConfirmed: () => void }) {
  const [view, setView] = useState<TicketView>('open');
  const [tickets, setTickets] = useState<StudentTicketSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const generation = useRef(0);
  const pending = useRef(false);
  const initialPendingGeneration = useRef<number | null>(null);

  const loadFirstPage = useCallback(async (selectedView: TicketView, requestGeneration: number) => {
    if (initialPendingGeneration.current === requestGeneration) return;
    initialPendingGeneration.current = requestGeneration;
    setLoadState('loading');
    try {
      const page = await requestPage(selectedView);
      if (generation.current !== requestGeneration) return;
      setTickets(page.tickets);
      setNextCursor(page.nextCursor);
      setLoadState('loaded');
    } catch {
      if (generation.current === requestGeneration) setLoadState('error');
    } finally {
      if (initialPendingGeneration.current === requestGeneration) initialPendingGeneration.current = null;
    }
  }, []);

  useEffect(() => {
    const requestGeneration = ++generation.current;
    pending.current = false;
    setTickets([]);
    setNextCursor(undefined);
    setMoreError(false);
    setLoadingMore(false);
    void loadFirstPage(view, requestGeneration);
    return () => {
      if (generation.current === requestGeneration) generation.current += 1;
    };
  }, [view, loadFirstPage]);

  const switchView = (selectedView: TicketView) => {
    if (selectedView === view) return;
    generation.current += 1;
    pending.current = false;
    setTickets([]);
    setNextCursor(undefined);
    setMoreError(false);
    setLoadingMore(false);
    setLoadState('loading');
    setView(selectedView);
  };

  const loadMore = async () => {
    if (!nextCursor || pending.current || loadState !== 'loaded') return;
    const requestGeneration = generation.current;
    const requestedView = view;
    const requestedCursor = nextCursor;
    pending.current = true;
    setLoadingMore(true);
    setMoreError(false);
    try {
      const page = await requestPage(requestedView, requestedCursor);
      if (generation.current !== requestGeneration) return;
      setTickets((current) => {
        const knownIds = new Set(current.map((ticket) => ticket.ticketId));
        return [...current, ...page.tickets.filter((ticket) => !knownIds.has(ticket.ticketId))];
      });
      setNextCursor(page.nextCursor);
    } catch {
      if (generation.current === requestGeneration) setMoreError(true);
    } finally {
      if (generation.current === requestGeneration) {
        pending.current = false;
        setLoadingMore(false);
      }
    }
  };

  const retry = () => {
    const requestGeneration = generation.current;
    void loadFirstPage(view, requestGeneration);
  };

  const retryMore = () => { void loadMore(); };

  return (
    <DashboardLogout onConfirmed={onLogoutConfirmed} studentNavigation>
      <main className="dashboard-page student-dashboard my-tickets-page">
        <h1>My Tickets</h1>
        <section className="dashboard-panel my-tickets-panel" aria-labelledby="my-tickets-heading">
          <div className="my-tickets-heading-row">
            <h2 id="my-tickets-heading">Your tickets</h2>
            <div className="my-tickets-toggle" role="group" aria-label="Ticket status view">
              <button type="button" aria-pressed={view === 'open'} onClick={() => switchView('open')}>Open</button>
              <button type="button" aria-pressed={view === 'closed'} onClick={() => switchView('closed')}>Closed</button>
            </div>
          </div>

          {loadState === 'loading' && <p role="status" aria-live="polite">Loading {view} tickets…</p>}
          {loadState === 'error' && <div className="my-tickets-feedback" role="alert">
            <p>We couldn’t load your tickets. Please try again.</p>
            <button type="button" onClick={retry}>Retry</button>
          </div>}
          {loadState === 'loaded' && tickets.length === 0 && <p role="status">No {view} tickets yet.</p>}

          {tickets.length > 0 && <ul className="student-active-ticket-list my-tickets-list" aria-label={`${view} tickets`}>
            {tickets.map((ticket) => <li key={ticket.ticketId}>
              <StudentTicketCard ticket={ticket} muted={view === 'closed'} />
            </li>)}
          </ul>}

          {loadState === 'loaded' && moreError && <div className="my-tickets-feedback" role="alert">
            <p>We couldn’t load more tickets. Your loaded tickets are still here.</p>
            <button type="button" onClick={retryMore}>Retry</button>
          </div>}
          {loadState === 'loaded' && nextCursor && <button className="my-tickets-load-more" type="button" onClick={() => { void loadMore(); }} disabled={loadingMore}>
            {loadingMore ? 'Loading more tickets…' : 'Load more'}
          </button>}
        </section>
      </main>
    </DashboardLogout>
  );
}

export default MyTicketsPage;
