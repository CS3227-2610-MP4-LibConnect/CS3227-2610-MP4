import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import './TicketDetailPage.css';
import StudentHelpChat from './StudentHelpChat';

type Reply = { replyId: string; author: { name: string; role: 'STUDENT' | 'TA' }; message: string; createdAt: unknown };
type Ticket = {
  ticketId: string; title: string; status: 'OPEN' | 'CLAIMED' | 'CLOSED' | 'RESOLVED'; language: string;
  conceptTags: string[]; files?: { filename: string; content: string }[]; repoUrl?: string; repoFilePaths?: string[];
  errorOutput?: string; expectedBehaviour?: string; actualBehaviour?: string; attempted?: string;
  claimedByTaId?: string | null; fixNote?: string | null; createdAt?: unknown; updatedAt?: unknown; resolvedAt?: unknown;
};
type DetailResponse = { ticket?: unknown; replies?: unknown; nextCursor?: unknown };
const dateTime = (value: unknown) => {
  let date: Date | null = null;
  if (typeof value === 'string' || typeof value === 'number') date = new Date(value);
  else if (value && typeof value === 'object') {
    const item = value as { seconds?: unknown; _seconds?: unknown; toDate?: () => Date };
    if (typeof item.toDate === 'function') date = item.toDate();
    else {
      const seconds = typeof item.seconds === 'number' ? item.seconds : item._seconds;
      if (typeof seconds === 'number') date = new Date(seconds * 1000);
    }
  }
  return date && Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
    : 'Date unavailable';
};
const isReply = (value: unknown): value is Reply => {
  if (!value || typeof value !== 'object') return false;
  const reply = value as Reply;
  return typeof reply.replyId === 'string' && typeof reply.message === 'string' &&
    Boolean(reply.author && typeof reply.author.name === 'string' &&
      (reply.author.role === 'STUDENT' || reply.author.role === 'TA'));
};
const isTicket = (value: unknown): value is Ticket => {
  if (!value || typeof value !== 'object') return false;
  const ticket = value as Ticket;
  return typeof ticket.ticketId === 'string' && typeof ticket.title === 'string' &&
    ['OPEN', 'CLAIMED', 'CLOSED', 'RESOLVED'].includes(ticket.status) &&
    typeof ticket.language === 'string' && Array.isArray(ticket.conceptTags) &&
    ticket.conceptTags.every((tag) => typeof tag === 'string');
};

export default function TicketDetailPage({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [replyError, setReplyError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [message, setMessage] = useState('');
  const [replyPending, setReplyPending] = useState(false);
  const [closePending, setClosePending] = useState(false);
  const [needsCloseRefresh, setNeedsCloseRefresh] = useState(false);

  const load = useCallback(async (cursor?: string, initial = false): Promise<boolean> => {
    if (initial) setLoading(true); else setLoadingMore(true);
    setError('');
    try {
      const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
      const response = await fetch(`/api/tickets/${encodeURIComponent(ticketId)}${query}`, { credentials: 'same-origin' });
      if (response.status !== 200) throw new Error('request');
      const body: DetailResponse = await response.json();
      if (!isTicket(body.ticket) || !Array.isArray(body.replies) || !body.replies.every(isReply) ||
          (body.nextCursor !== undefined && (typeof body.nextCursor !== 'string' || !body.nextCursor))) throw new Error('shape');
      setTicket(body.ticket);
      setReplies((current) => initial ? body.replies as Reply[] : [...current, ...(body.replies as Reply[])]);
      setNextCursor(typeof body.nextCursor === 'string' ? body.nextCursor : null);
      return true;
    } catch {
      setError(initial ? 'We couldn’t load this ticket. Check your connection and retry.' : 'We couldn’t load more replies. Your loaded replies are still here; retry when ready.');
      return false;
    } finally {
      if (initial) setLoading(false); else setLoadingMore(false);
    }
  }, [ticketId]);

  useEffect(() => { void load(undefined, true); }, [load]);

  const refresh = async () => load(undefined, true);
  const getCsrf = async () => {
    const response = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
    if (!response.ok) throw new Error('csrf');
    const body = await response.json() as { csrfToken?: unknown };
    if (typeof body.csrfToken !== 'string' || !body.csrfToken) throw new Error('csrf');
    return body.csrfToken;
  };

  const submitReply = async (event: FormEvent) => {
    event.preventDefault();
    if (!ticket || replyPending) return;
    const trimmed = message.trim();
    if (!trimmed || Array.from(trimmed).length > 5000) { setReplyError('Enter a reply of 1–5,000 characters.'); return; }
    setReplyError(''); setFeedback(''); setReplyPending(true);
    try {
      const csrfToken = await getCsrf();
      const response = await fetch(`/api/tickets/${encodeURIComponent(ticketId)}/replies`, {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ message: trimmed }),
      });
      if (response.status === 409) {
        const refreshed = await refresh();
        setFeedback(refreshed ? 'This ticket changed while you were replying. Review its current status.' : 'This ticket changed while you were replying, but its current state could not be loaded. Retry loading the ticket.');
        return;
      }
      if (response.status !== 201) throw new Error('request');
      const body = await response.json() as { reply?: unknown };
      if (!isReply(body.reply)) throw new Error('shape');
      setReplies((current) => [...current, body.reply as Reply]);
      setMessage(''); setFeedback('Reply sent.');
      await refresh();
    } catch { setReplyError('We couldn’t send your reply. Your text is saved here; please retry.'); }
    finally { setReplyPending(false); }
  };

  const closeTicket = async () => {
    if (!ticket || closePending || needsCloseRefresh || !['OPEN', 'CLAIMED'].includes(ticket.status)) return;
    setClosePending(true); setFeedback(''); setNeedsCloseRefresh(false);
    try {
      const csrfToken = await getCsrf();
      const response = await fetch(`/api/tickets/${encodeURIComponent(ticketId)}/close`, {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: '{}',
      });
      if (response.status === 409) {
        setNeedsCloseRefresh(true);
        const refreshed = await refresh();
        if (refreshed) setNeedsCloseRefresh(false);
        setFeedback(refreshed ? 'This ticket changed before it could be closed. Its current status has been refreshed.' : 'This ticket changed before it could be closed, but its current state could not be loaded. Retry loading the ticket.');
        return;
      }
      if (!response.ok) throw new Error('request');
      const body = await response.json() as { status?: unknown; updatedAt?: unknown };
      if (body.status !== 'CLOSED') throw new Error('shape');
      setTicket((current) => current ? { ...current, status: 'CLOSED', claimedByTaId: null, fixNote: null, resolvedAt: null, updatedAt: body.updatedAt } : current);
      setFeedback('Ticket closed without a resolution.');
    } catch {
      setFeedback('We couldn’t confirm whether this ticket was closed. Refresh its current status before trying again.');
      setNeedsCloseRefresh(true);
    }
    finally { setClosePending(false); }
  };

  const currentTicket = ticket?.ticketId === ticketId ? ticket : null;
  if (!currentTicket && loading) return <main className="ticket-detail-page" aria-busy="true"><p role="status">Loading ticket…</p></main>;
  if (error && !currentTicket) return <main className="ticket-detail-page"><p role="alert">{error}</p><button type="button" onClick={refresh}>Retry</button></main>;
  if (!currentTicket && !error) return <main className="ticket-detail-page" aria-busy="true"><p role="status">Loading ticket…</p></main>;
  if (!currentTicket) return <main className="ticket-detail-page"><p role="alert">This ticket is unavailable.</p><a href="/student/dashboard">Back to dashboard</a></main>;
  const terminal = currentTicket.status === 'CLOSED' || currentTicket.status === 'RESOLVED';
  return <main className="ticket-detail-page">
    <article className="ticket-detail-card" aria-labelledby="ticket-detail-title">
      <a className="ticket-detail-back" href="/student/dashboard">Back to dashboard</a>
      <div className="ticket-detail-title-row"><div><p className="ticket-detail-eyebrow">Ticket details</p><h1 id="ticket-detail-title">{currentTicket.title}</h1></div><span className={`ticket-status ticket-status--${currentTicket.status.toLowerCase()}`}>{currentTicket.status}</span></div>
      {error && <p role="alert">{error} <button type="button" onClick={() => nextCursor ? void load(nextCursor) : void refresh()}>Retry</button></p>}
      <dl className="ticket-detail-meta">
        <>
        <div><dt>Language</dt><dd>{currentTicket.language}</dd></div><div><dt>Concept tags</dt><dd>{currentTicket.conceptTags.length ? currentTicket.conceptTags.join(', ') : 'No concept tags'}</dd></div>
        <div><dt>Created</dt><dd>{dateTime(currentTicket.createdAt)}</dd></div><div><dt>Last updated</dt><dd>{dateTime(currentTicket.updatedAt)}</dd></div>
        {currentTicket.status === 'CLAIMED' && <div><dt>Claim</dt><dd>Claimed by a teaching assistant</dd></div>}
        {currentTicket.fixNote && <div><dt>Resolution note</dt><dd className="ticket-detail-preserve">{currentTicket.fixNote}</dd></div>}
        {currentTicket.resolvedAt && <div><dt>Resolved</dt><dd>{dateTime(currentTicket.resolvedAt)}</dd></div>}
        </>
      </dl>
      <section className="ticket-description" aria-label="Ticket description">
        <h2>Expected behaviour</h2><p className="ticket-detail-preserve">{currentTicket.expectedBehaviour || 'No details provided.'}</p>
        <h2>Actual behaviour</h2><p className="ticket-detail-preserve">{currentTicket.actualBehaviour || 'No details provided.'}</p>
        <h2>What I tried</h2><p className="ticket-detail-preserve">{currentTicket.attempted || 'No details provided.'}</p>
        {currentTicket.errorOutput && <><h2>Error output</h2><pre className="ticket-detail-preserve">{currentTicket.errorOutput}</pre></>}
      </section>
      {(currentTicket.files?.length || currentTicket.repoUrl) ? <section className="ticket-sources"><h2>Attached source context</h2>
        {currentTicket.files?.map((file, index) => <details key={`${file.filename}-${index}`}><summary>{file.filename}</summary><pre className="ticket-detail-preserve">{file.content}</pre></details>)}
        {currentTicket.repoUrl && <div><p>Repository reference</p><p className="ticket-detail-preserve">{currentTicket.repoUrl}</p><ul>{currentTicket.repoFilePaths?.map((item) => <li key={item}>{item}</li>)}</ul></div>}
      </section> : null}
      <section className="ticket-thread" aria-labelledby="ticket-thread-title">
        <h2 id="ticket-thread-title">Conversation</h2>
        {replies.length === 0 ? <p>No replies yet.</p> : <ol className="ticket-thread-list">{replies.map((reply) => <li className={`ticket-reply ticket-reply--${reply.author.role.toLowerCase()}`} key={reply.replyId}>
          <div className="ticket-reply-heading"><strong>{reply.author.name}</strong><span>{reply.author.role === 'STUDENT' ? 'Student' : 'Teaching assistant'}</span><time>{dateTime(reply.createdAt)}</time></div>
          <p className="ticket-detail-preserve">{reply.message}</p>
        </li>)}</ol>}
        {nextCursor && <button className="ticket-secondary" type="button" disabled={loadingMore} onClick={() => void load(nextCursor)}>{loadingMore ? 'Loading replies…' : 'Load more replies'}</button>}
      </section>
      {!terminal && <section className="ticket-reply-form" aria-labelledby="ticket-reply-title">
        <h2 id="ticket-reply-title">Add a reply</h2><form onSubmit={submitReply} noValidate>
          <label htmlFor="ticket-reply-message">Reply</label><textarea id="ticket-reply-message" maxLength={10000} value={message} onChange={(event) => { setMessage(event.target.value); setReplyError(''); }} aria-invalid={Boolean(replyError)} aria-describedby={replyError ? 'ticket-reply-error' : undefined} />
          {replyError && <p id="ticket-reply-error" role="alert">{replyError}</p>}<button type="submit" disabled={replyPending}>{replyPending ? 'Sending…' : 'Send reply'}</button>
        </form>
      </section>}
      {currentTicket.status !== 'RESOLVED' && <section className="ticket-close-section"><h2>Close ticket</h2><p>This closes the ticket without marking it as resolved.</p><button type="button" className="ticket-close-button" disabled={currentTicket.status === 'CLOSED' || closePending || needsCloseRefresh} onClick={() => void closeTicket()}>{closePending ? 'Closing…' : currentTicket.status === 'CLOSED' ? 'Ticket closed' : 'Close Ticket'}</button></section>}
      {needsCloseRefresh && <button type="button" className="ticket-secondary" onClick={async () => {
        const refreshed = await refresh();
        if (refreshed) {
          setNeedsCloseRefresh(false);
          setFeedback('The ticket status has been refreshed. Review its current state before taking another action.');
        } else {
          setFeedback('We still couldn’t confirm the ticket status. Retry refreshing before trying to close it again.');
        }
      }}>Refresh ticket status</button>}
      {feedback && <p className="ticket-feedback" role="status" aria-live="polite">{feedback}</p>}
    </article>
    <StudentHelpChat key={ticketId} endpoint={`/api/tickets/${encodeURIComponent(ticketId)}/help-chat`} introduction="I can help you understand this ticket's coding concepts and work through progressive hints." />
  </main>;
}
