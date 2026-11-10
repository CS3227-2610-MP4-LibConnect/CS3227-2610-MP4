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

interface InsightTicket { ticketId: string; title: string }
interface InsightGroup { label: string; kind: string; summary: string; tickets: InsightTicket[] }
interface InsightsResult { groups: InsightGroup[]; ticketCount: number | null; truncated: boolean; cached: boolean }
type InsightsState = 'idle' | 'loading' | 'ready' | 'error';

const INSIGHTS_ERRORS: Record<string, string> = {
  AI_UNAVAILABLE: 'Queue insights are unavailable right now.',
  AI_RATE_LIMITED: 'AI limit reached. Please try again in a minute.',
  AI_INPUT_TOO_LARGE: 'The queue is too large to summarise.',
  AI_INVALID_OUTPUT: 'The AI reply could not be used. Please try again.',
};
const INSIGHTS_FALLBACK_ERROR = 'Queue insights are unavailable right now.';
const KIND_LABEL: Record<string, string> = { CONCEPT: 'Concept', MISCONCEPTION: 'Misconception' };

const str = (value: unknown): string => (typeof value === 'string' ? value : '');

function parseInsights(body: unknown): InsightsResult {
  const data = body as { groups?: unknown; ticketCount?: unknown; truncated?: unknown; cached?: unknown } | null;
  if (!data || !Array.isArray(data.groups)) throw new Error('Unexpected response.');
  const groups = data.groups.map((raw): InsightGroup => {
    const g = (raw ?? {}) as { label?: unknown; kind?: unknown; summary?: unknown; tickets?: unknown };
    const tickets = Array.isArray(g.tickets) ? g.tickets.map((t) => {
      const row = (t ?? {}) as { ticketId?: unknown; title?: unknown };
      return { ticketId: str(row.ticketId), title: str(row.title) };
    }).filter((t) => t.ticketId) : [];
    return { label: str(g.label), kind: str(g.kind), summary: str(g.summary), tickets };
  });
  const ticketCount = typeof data.ticketCount === 'number' && Number.isInteger(data.ticketCount) && data.ticketCount >= 0 ? data.ticketCount : null;
  return { groups, ticketCount, truncated: data.truncated === true, cached: data.cached === true };
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
  const [insightsState, setInsightsState] = useState<InsightsState>('idle');
  const [insights, setInsights] = useState<InsightsResult | null>(null);
  const [insightsError, setInsightsError] = useState('');
  const insightsBusy = useRef(false);

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

  const generateInsights = async () => {
    if (insightsBusy.current) return;
    insightsBusy.current = true;
    setInsightsState('loading');
    setInsightsError('');
    try {
      const csrfResponse = await fetch('/api/auth/csrf', { method: 'GET', credentials: 'same-origin' });
      if (csrfResponse.status === 401) { window.location.assign('/'); return; }
      const csrfBody = csrfResponse.ok ? await csrfResponse.json() : null;
      const csrfToken = (csrfBody as { csrfToken?: unknown } | null)?.csrfToken;
      if (typeof csrfToken !== 'string' || !csrfToken) throw new Error('No CSRF token.');
      const response = await fetch('/api/ta/tickets/insights', {
        method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': csrfToken },
      });
      if (response.status === 401) { window.location.assign('/'); return; }
      if (!response.ok) {
        let code = '';
        try { code = str(((await response.json()) as { code?: unknown } | null)?.code); } catch { /* fixed message below */ }
        setInsightsError(INSIGHTS_ERRORS[code] ?? INSIGHTS_FALLBACK_ERROR);
        setInsightsState('error');
        return;
      }
      setInsights(parseInsights(await response.json()));
      setInsightsState('ready');
    } catch {
      setInsightsError(INSIGHTS_FALLBACK_ERROR);
      setInsightsState('error');
    } finally {
      insightsBusy.current = false;
    }
  };

  const groupedCount = insights ? new Set(insights.groups.flatMap((group) => group.tickets.map((ticket) => ticket.ticketId))).size : 0;
  const coverage = insights && insights.groups.length > 0 && insights.ticketCount !== null && insights.ticketCount > 0 && groupedCount < insights.ticketCount
    ? { grouped: groupedCount, total: insights.ticketCount } : null;

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
      <label>Concept tag
        <input type="text" value={conceptInput} maxLength={30} placeholder="e.g. recursion" onChange={(event) => setConceptInput(event.target.value)} />
      </label>
    </form>

    <section className="ta-queue__insights" aria-labelledby="ta-queue-insights-heading">
      <div className="ta-queue__insights-head">
        <h2 id="ta-queue-insights-heading">Queue insights</h2>
        <span className="ta-queue__badge">AI suggestion</span>
      </div>
      <p className="ta-queue__insights-help">Groups the active queue into common concepts and misconceptions. Advisory only.</p>
      <button type="button" disabled={insightsState === 'loading'} onClick={() => void generateInsights()}>
        Generate insights
      </button>
      {insightsState === 'loading' && <p role="status">Analysing the queue…</p>}
      {insightsState === 'error' && <p role="alert">{insightsError}</p>}
      {insightsState === 'ready' && insights && <div className="ta-queue__insights-result">
        {insights.truncated && <p className="ta-queue__note">Based on the oldest 60 active tickets.</p>}
        {insights.cached && <p className="ta-queue__note">Cached result.</p>}
        {insights.groups.length === 0 && <p className="ta-queue__empty">{insights.ticketCount === 0 ? 'No insights: there are no active tickets to group.' : 'No common patterns found.'}</p>}
        {coverage && <p className="ta-queue__note">Grouped {coverage.grouped} of {coverage.total} active tickets.</p>}
        {insights.groups.map((group, index) => <article key={index} className="ta-queue__group">
          <div className="ta-queue__group-head">
            <h3>{group.label}</h3>
            <span className="ta-queue__badge">{KIND_LABEL[group.kind] ?? ''}</span>
          </div>
          <p>{group.summary}</p>
          <ul className="ta-queue__group-tickets">
            {group.tickets.map((ticket) => <li key={ticket.ticketId}>
              <a href={`/ta/tickets/${encodeURIComponent(ticket.ticketId)}`}>{ticket.title}</a>
            </li>)}
          </ul>
        </article>)}
      </div>}
    </section>

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
          {ticket.claimed ? (ticket.claimedByMe
            ? <span className="ta-queue__badge ta-queue__badge--mine">Claimed by you</span>
            : <span className="ta-queue__badge">Claimed</span>) : null}
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
