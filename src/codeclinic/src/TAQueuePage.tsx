import React, { useCallback, useEffect, useRef, useState } from 'react';
import './TAQueuePage.css';

export interface QueueItem {
  ticketId: string;
  title: string;
  language: string;
  conceptTags: string[];
  status: string;
  claimedByMe: boolean;
  claimed: boolean;
  createdAt: string | null;
}

type QueueState = 'loading' | 'ready' | 'error';

const LANGUAGES = ['Python', 'Java', 'JavaScript', 'TypeScript', 'C', 'C++', 'Other'];
const STATUSES: Array<[string, string]> = [
  ['ACTIVE', 'Active (open and claimed)'], ['OPEN', 'Open'], ['CLAIMED', 'Claimed'],
  ['RESOLVED', 'Resolved'], ['CLOSED', 'Closed'],
];
const STATUS_LABEL: Record<string, string> = { OPEN: 'Open', CLAIMED: 'Claimed', RESOLVED: 'Resolved', CLOSED: 'Closed' };

function formatDate(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}

function parseItems(body: unknown): { tickets: QueueItem[]; nextCursor: string | null } {
  const data = body as { tickets?: unknown; nextCursor?: unknown } | null;
  if (!data || !Array.isArray(data.tickets)) throw new Error('Unexpected response.');
  return { tickets: data.tickets as QueueItem[], nextCursor: typeof data.nextCursor === 'string' ? data.nextCursor : null };
}

export default function TAQueuePage() {
  const [status, setStatus] = useState('ACTIVE');
  const [language, setLanguage] = useState('');
  const [conceptInput, setConceptInput] = useState('');
  const [concept, setConcept] = useState('');
  const [items, setItems] = useState<QueueItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState<QueueState>('loading');
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setConcept(conceptInput.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [conceptInput]);

  const fetchPage = useCallback(async (after: string | null) => {
    const current = generation.current;
    const params = new URLSearchParams({ status });
    if (language) params.set('language', language);
    if (concept) params.set('concept', concept);
    if (after) params.set('cursor', after);
    try {
      const response = await fetch(`/api/ta/tickets?${params.toString()}`, { credentials: 'same-origin' });
      if (current !== generation.current) return;
      if (response.status === 401) { window.location.assign('/'); return; }
      if (!response.ok) throw new Error('Request failed.');
      const page = parseItems(await response.json());
      if (current !== generation.current) return;
      setItems((existing) => (after ? [...existing, ...page.tickets] : page.tickets));
      setCursor(page.nextCursor);
      setState('ready');
      setMoreError(false);
    } catch {
      if (current !== generation.current) return;
      if (after) setMoreError(true); else setState('error');
    } finally {
      if (current === generation.current) setLoadingMore(false);
    }
  }, [status, language, concept]);

  // Filter changes (or Retry) discard loaded pages and the cursor, then reload the first page.
  useEffect(() => {
    generation.current += 1;
    setState('loading');
    setItems([]);
    setCursor(null);
    setMoreError(false);
    setLoadingMore(false);
    void fetchPage(null);
    return () => { generation.current += 1; };
  }, [fetchPage, attempt]);

  const loadMore = () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setMoreError(false);
    void fetchPage(cursor);
  };

  return <main className="ta-queue">
    <h1>Ticket queue</h1>
    <form className="ta-queue__filters" onSubmit={(event) => event.preventDefault()}>
      <label>Status
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          {STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label>Language
        <select value={language} onChange={(event) => setLanguage(event.target.value)}>
          <option value="">All languages</option>
          {LANGUAGES.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </label>
      <label>Concept
        <input type="text" value={conceptInput} maxLength={30} placeholder="e.g. recursion" onChange={(event) => setConceptInput(event.target.value)} />
      </label>
    </form>

    {state === 'loading' && <p role="status">Loading tickets…</p>}
    {state === 'error' && <div className="ta-queue__error">
      <p role="alert">We couldn’t load the queue. Please try again.</p>
      <button type="button" onClick={() => setAttempt((n) => n + 1)}>Retry</button>
    </div>}
    {state === 'ready' && items.length === 0 && <p className="ta-queue__empty">No tickets match these filters.</p>}
    {state === 'ready' && items.length > 0 && <ul className="ta-queue__list">
      {items.map((ticket) => <li key={ticket.ticketId} className="ta-queue__row">
        <div className="ta-queue__main">
          <a href={`/ta/tickets/${encodeURIComponent(ticket.ticketId)}`}>{ticket.title}</a>
          {ticket.claimedByMe ? <span className="ta-queue__badge ta-queue__badge--mine">Claimed by you</span>
            : ticket.claimed ? <span className="ta-queue__badge">Claimed</span> : null}
        </div>
        <div className="ta-queue__meta">
          <span>{ticket.language}</span>
          <span>Status: {STATUS_LABEL[ticket.status] ?? ticket.status}</span>
          {formatDate(ticket.createdAt) && <span>{formatDate(ticket.createdAt)}</span>}
        </div>
        {ticket.conceptTags.length > 0 && <ul className="ta-queue__tags" aria-label="Concept tags">
          {ticket.conceptTags.map((tag, index) => <li key={`${tag}-${index}`}>{tag}</li>)}
        </ul>}
      </li>)}
    </ul>}
    {state === 'ready' && moreError && <div className="ta-queue__error">
      <p role="alert">We couldn’t load more tickets. Please try again.</p>
    </div>}
    {state === 'ready' && cursor && <button className="ta-queue__more" type="button" disabled={loadingMore} onClick={loadMore}>
      {loadingMore ? 'Loading…' : 'Load more'}
    </button>}
  </main>;
}
