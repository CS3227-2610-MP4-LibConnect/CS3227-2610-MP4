import React, { useCallback, useEffect, useRef, useState } from 'react';
import './TATicketPage.css';

interface TicketFile { name: string; content: string }
interface TicketReply {
  replyId: string; message: string; createdAt: string | null;
  authorName: string; authorRole: string; isMine: boolean;
}
interface TicketView {
  ticketId: string; title: string; language: string; conceptTags: string[];
  files: TicketFile[]; repoUrl: string | null; repoFilePaths: string[];
  errorOutput: string; expectedBehaviour: string; actualBehaviour: string; attempted: string;
  status: string; fixNote: string | null; createdAt: string | null; updatedAt: string | null;
  resolvedAt: string | null; studentName: string; claimedByMe: boolean; claimedByName: string | null;
  replies: TicketReply[];
}

type LoadState = 'loading' | 'ready' | 'error' | 'notfound';

const MAX_REPLY = 4000;
const MAX_FIX_NOTE = 2000;
const STALE_MESSAGE = 'This ticket changed. The latest version is shown.';
const STATUS_LABEL: Record<string, string> = { OPEN: 'Open', CLAIMED: 'Claimed', RESOLVED: 'Resolved', CLOSED: 'Closed' };
const AI_NOTE = 'AI draft. Review and edit before resolving.';
const AI_REPLACE_PROMPT = 'Replace the text in the fix note with the AI draft?';
const AI_MESSAGES: Record<string, string> = {
  AI_UNAVAILABLE: 'AI help is unavailable right now. You can still write the note yourself.',
  AI_RATE_LIMITED: 'AI limit reached. Please try again in a minute.',
  AI_INPUT_TOO_LARGE: 'This ticket is too long for an AI draft.',
  AI_INVALID_OUTPUT: 'The AI reply could not be used. Please try again or write the note yourself.',
};
const AI_STATUS_CODES: Record<number, string> = { 503: 'AI_UNAVAILABLE', 429: 'AI_RATE_LIMITED', 422: 'AI_INPUT_TOO_LARGE', 502: 'AI_INVALID_OUTPUT' };
const AI_GENERIC_ERROR = 'The AI draft could not be created. You can still write the note yourself.';
const GITHUB_URL = /^https:\/\/github\.com\/[^\s]+$/;

function formatDate(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}

function asTicket(body: unknown): TicketView | null {
  const data = body as Partial<TicketView> | null;
  if (!data || typeof data.ticketId !== 'string' || typeof data.status !== 'string') return null;
  return {
    ...(data as TicketView),
    conceptTags: Array.isArray(data.conceptTags) ? data.conceptTags : [],
    files: Array.isArray(data.files) ? data.files : [],
    repoFilePaths: Array.isArray(data.repoFilePaths) ? data.repoFilePaths : [],
    replies: Array.isArray(data.replies) ? data.replies : [],
  };
}

async function fetchCsrfToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
    if (!response.ok) return null;
    const body = await response.json() as { csrfToken?: unknown };
    return typeof body.csrfToken === 'string' && body.csrfToken ? body.csrfToken : null;
  } catch {
    return null;
  }
}

export default function TATicketPage({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<TicketView | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [replyText, setReplyText] = useState('');
  const [fixNote, setFixNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [aiNote, setAiNote] = useState(false);
  const mounted = useRef(true);
  const fixNoteRef = useRef('');
  fixNoteRef.current = fixNote;
  const base = `/api/ta/tickets/${encodeURIComponent(ticketId)}`;

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  // Returns true when the ticket was loaded.
  const load = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(base, { credentials: 'same-origin' });
      if (!mounted.current) return false;
      if (response.status === 401) { window.location.assign('/'); return false; }
      if (response.status === 404) { setState('notfound'); return false; }
      if (!response.ok) { setState('error'); return false; }
      const next = asTicket(await response.json());
      if (!mounted.current) return false;
      if (!next) { setState('error'); return false; }
      setTicket(next);
      setState('ready');
      return true;
    } catch {
      if (mounted.current) setState('error');
      return false;
    }
  }, [base]);

  useEffect(() => {
    setState('loading');
    void load();
  }, [load, attempt]);

  // Runs one POST; `onOk` receives the parsed body. A 409 refetches and shows the stale message.
  const post = async (action: string, body: unknown, onOk: (data: unknown) => Promise<void> | void) => {
    if (busy) return;
    setBusy(true);
    setActionError('');
    setNotice('');
    try {
      const token = await fetchCsrfToken();
      if (!token) { setActionError('Something went wrong. Please try again.'); return; }
      const headers: Record<string, string> = { 'X-CSRF-Token': token };
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      const response = await fetch(`${base}/${action}`, {
        method: 'POST', credentials: 'same-origin', headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!mounted.current) return;
      if (response.status === 401) { window.location.assign('/'); return; }
      if (response.status === 409) {
        setConfirming(false);
        await load();
        if (mounted.current) setNotice(STALE_MESSAGE);
        return;
      }
      if (!response.ok) { setActionError('The action could not be completed. Please try again.'); return; }
      await onOk(await response.json().catch(() => null));
    } catch {
      if (mounted.current) setActionError('The action could not be completed. Please try again.');
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const applyView = async (data: unknown) => {
    const next = asTicket(data);
    if (next) { setTicket(next); setState('ready'); } else { await load(); }
  };

  const claim = () => post('claim', undefined, applyView);
  const unclaim = () => post('unclaim', undefined, applyView);
  const sendReply = () => {
    const message = replyText.trim();
    if (!message || message.length > MAX_REPLY) return;
    void post('replies', { message }, async () => { setReplyText(''); await load(); });
  };
  const resolve = () => {
    const note = fixNote.trim();
    if (!note || note.length > MAX_FIX_NOTE) return;
    void post('resolve', { fixNote: note }, async (data) => { setConfirming(false); setFixNote(''); await applyView(data); });
  };

  // Asks the server for a draft and puts it in the text area. It never submits the resolve form.
  // The AI text is only ever set as the value of the text area (plain text).
  const draftWithAi = async () => {
    if (drafting || busy) return;
    setDrafting(true);
    setDraftError('');
    try {
      const token = await fetchCsrfToken();
      if (!token) { setDraftError(AI_GENERIC_ERROR); return; }
      const response = await fetch(`${base}/fix-note-draft`, {
        method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': token },
      });
      if (!mounted.current) return;
      if (response.status === 401) { window.location.assign('/'); return; }
      if (response.status === 409) {
        setConfirming(false);
        await load();
        if (mounted.current) setNotice(STALE_MESSAGE);
        return;
      }
      if (!response.ok) { setDraftError(AI_MESSAGES[AI_STATUS_CODES[response.status]] ?? AI_GENERIC_ERROR); return; }
      const body = await response.json().catch(() => null) as { draft?: unknown } | null;
      if (!mounted.current) return;
      const draft = body && typeof body.draft === 'string' ? body.draft : '';
      if (!draft.trim()) { setDraftError(AI_MESSAGES.AI_INVALID_OUTPUT); return; }
      if (fixNoteRef.current.trim() && !window.confirm(AI_REPLACE_PROMPT)) return;
      setFixNote(draft);
      setConfirming(false);
      setAiNote(true);
    } catch {
      if (mounted.current) setDraftError(AI_GENERIC_ERROR);
    } finally {
      if (mounted.current) setDrafting(false);
    }
  };

  if (state === 'loading') return <main className="ta-ticket"><p role="status">Loading ticket…</p></main>;
  if (state === 'notfound') {
    return <main className="ta-ticket">
      <p>This ticket was not found. It may no longer exist.</p>
      <a href="/ta/queue">Back to the queue</a>
    </main>;
  }
  if (state === 'error' || !ticket) {
    return <main className="ta-ticket">
      <p role="alert">We couldn’t load this ticket. Please try again.</p>
      <button type="button" onClick={() => setAttempt((n) => n + 1)}>Retry</button>
      <a href="/ta/queue">Back to the queue</a>
    </main>;
  }

  const active = ticket.status === 'OPEN' || ticket.status === 'CLAIMED';
  const canClaim = ticket.status === 'OPEN';
  const canUnclaim = ticket.status === 'CLAIMED' && ticket.claimedByMe;
  const canResolve = canUnclaim;
  const repoIsLink = !!ticket.repoUrl && GITHUB_URL.test(ticket.repoUrl);
  const trimmedNote = fixNote.trim().length;
  const noteValid = trimmedNote > 0 && fixNote.length <= MAX_FIX_NOTE;
  const replyValid = replyText.trim().length > 0 && replyText.length <= MAX_REPLY;

  return <main className="ta-ticket">
    <p><a href="/ta/queue">Back to the queue</a></p>
    <h1>{ticket.title}</h1>
    {notice && <p role="status" className="ta-ticket__notice">{notice}</p>}
    {actionError && <p role="alert">{actionError}</p>}

    <section className="ta-ticket__panel" aria-label="Ticket details">
      <dl className="ta-ticket__meta">
        <div><dt>Student</dt><dd>{ticket.studentName}</dd></div>
        <div><dt>Status</dt><dd>{STATUS_LABEL[ticket.status] ?? ticket.status}</dd></div>
        {ticket.claimedByName && <div><dt>Claimed by</dt><dd>{ticket.claimedByMe ? `${ticket.claimedByName} (you)` : ticket.claimedByName}</dd></div>}
        <div><dt>Language</dt><dd>{ticket.language}</dd></div>
        {formatDate(ticket.createdAt) && <div><dt>Created</dt><dd>{formatDate(ticket.createdAt)}</dd></div>}
        {ticket.resolvedAt && formatDate(ticket.resolvedAt) && <div><dt>Resolved</dt><dd>{formatDate(ticket.resolvedAt)}</dd></div>}
        {ticket.repoUrl && <div><dt>Repository</dt><dd>{repoIsLink
          ? <a href={ticket.repoUrl} target="_blank" rel="noopener noreferrer">{ticket.repoUrl}</a>
          : ticket.repoUrl}</dd></div>}
      </dl>
      {ticket.conceptTags.length > 0 && <ul className="ta-ticket__tags" aria-label="Concept tags">
        {ticket.conceptTags.map((tag, index) => <li key={`${tag}-${index}`}>{tag}</li>)}
      </ul>}
      {ticket.repoFilePaths.length > 0 && <>
        <h2>Repository files</h2>
        <ul className="ta-ticket__paths">{ticket.repoFilePaths.map((path, index) => <li key={`${path}-${index}`}>{path}</li>)}</ul>
      </>}
    </section>

    {ticket.files.length > 0 && <section className="ta-ticket__panel" aria-label="Code">
      <h2>Code</h2>
      {ticket.files.map((file, index) => <div key={`${file.name}-${index}`}>
        <h3>{file.name}</h3>
        <pre>{file.content}</pre>
      </div>)}
    </section>}

    <section className="ta-ticket__panel" aria-label="Problem description">
      <h2>Error output</h2><pre>{ticket.errorOutput}</pre>
      <h2>Expected behaviour</h2><p className="ta-ticket__text">{ticket.expectedBehaviour}</p>
      <h2>Actual behaviour</h2><p className="ta-ticket__text">{ticket.actualBehaviour}</p>
      <h2>What the student tried</h2><p className="ta-ticket__text">{ticket.attempted}</p>
    </section>

    {ticket.status === 'RESOLVED' && ticket.fixNote && <section className="ta-ticket__panel" aria-label="Resolution">
      <h2>Resolution</h2>
      <p className="ta-ticket__text">{ticket.fixNote}</p>
    </section>}

    <section className="ta-ticket__panel" aria-label="Replies">
      <h2>Replies</h2>
      {ticket.replies.length === 0 ? <p className="ta-ticket__muted">No replies yet.</p> : <ol className="ta-ticket__replies">
        {ticket.replies.map((reply) => <li key={reply.replyId}>
          <p className="ta-ticket__byline"><strong>{reply.authorName}</strong> ({reply.authorRole === 'TA' ? 'TA' : 'Student'}) {formatDate(reply.createdAt)}</p>
          <p className="ta-ticket__text">{reply.message}</p>
        </li>)}
      </ol>}
    </section>

    {(canClaim || canUnclaim) && <div className="ta-ticket__actions">
      {canClaim && <button type="button" disabled={busy} onClick={() => void claim()}>Claim</button>}
      {canUnclaim && <button type="button" disabled={busy} onClick={() => void unclaim()}>Unclaim</button>}
    </div>}

    {active && <form className="ta-ticket__panel" onSubmit={(event) => { event.preventDefault(); sendReply(); }}>
      <label>Reply
        <textarea value={replyText} rows={4} maxLength={MAX_REPLY} onChange={(event) => setReplyText(event.target.value)} />
      </label>
      <span className="ta-ticket__count">{replyText.length} / {MAX_REPLY}</span>
      <button type="submit" disabled={busy || !replyValid}>Send reply</button>
    </form>}

    {canResolve && <form className="ta-ticket__panel" onSubmit={(event) => { event.preventDefault(); setConfirming(true); }}>
      <label>Fix note
        <textarea value={fixNote} rows={4} onChange={(event) => { setFixNote(event.target.value); setConfirming(false); }} />
      </label>
      <span className={`ta-ticket__count${fixNote.length > MAX_FIX_NOTE ? ' ta-ticket__count--over' : ''}`}>{fixNote.length} / {MAX_FIX_NOTE}</span>
      <div className="ta-ticket__ai">
        <span className="ta-ticket__ai-label">AI suggestion</span>
        <button type="button" disabled={busy || drafting} onClick={() => void draftWithAi()}>Draft with AI</button>
        {drafting && <span role="status" className="ta-ticket__muted">Drafting…</span>}
        {aiNote && <p className="ta-ticket__ai-note">{AI_NOTE}</p>}
        {draftError && <p role="alert">{draftError}</p>}
      </div>
      <button type="submit" disabled={busy}>Resolve…</button>
      {confirming && <div className="ta-ticket__confirm">
        <p>Resolving closes this ticket to further replies and cannot be undone.</p>
        <button type="button" disabled={busy || !noteValid} onClick={resolve}>Confirm resolve</button>
        <button type="button" onClick={() => setConfirming(false)}>Cancel</button>
      </div>}
    </form>}
  </main>;
}
