import React, { FormEvent, useEffect, useRef, useState } from 'react';
import './StudentHelpChat.css';

type Turn = { role: 'STUDENT' | 'BOT'; text: string };
type Reply =
  | { type: 'HINT'; concept: string; explanation: string; hints: string[] }
  | { type: 'REFINEMENT'; suggestions: { field: string; suggestion: string }[] }
  | { type: 'CLARIFICATION'; question: string }
  | { type: 'REFUSAL'; message: string };

const SAFE_ERRORS: Record<string, string> = {
  AI_RATE_LIMITED: 'The help bot is busy. Please wait a moment and try again.',
  AI_INPUT_TOO_LARGE: 'There is too much ticket context to review. Try a shorter question or fewer details.',
  AI_INVALID_OUTPUT: 'The help bot could not prepare a safe reply. Please try again.',
  AI_UNAVAILABLE: 'The help bot is temporarily unavailable. Please try again.',
  UNAUTHENTICATED: 'Your session has ended. Sign in again to continue.',
  FORBIDDEN: 'The help bot is not available for this request.',
  NOT_FOUND: 'This ticket is no longer available.',
  INVALID_REQUEST: 'Your question could not be sent. Please try again.',
  REQUEST_TOO_LARGE: 'Your request is too large. Shorten your question and try again.',
};

function replyText(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const item = value as Partial<Reply>;
  if (item.type === 'HINT' && typeof item.concept === 'string' && typeof item.explanation === 'string' && Array.isArray(item.hints) && item.hints.every((hint) => typeof hint === 'string')) {
    return `${item.concept}\n${item.explanation}\n${item.hints.map((hint, index) => `Hint ${index + 1}: ${hint}`).join('\n')}`;
  }
  if (item.type === 'REFINEMENT' && Array.isArray(item.suggestions) && item.suggestions.every((entry) => entry && typeof entry.field === 'string' && typeof entry.suggestion === 'string')) {
    return item.suggestions.map((entry) => `${entry.field}: ${entry.suggestion}`).join('\n');
  }
  if (item.type === 'CLARIFICATION' && typeof item.question === 'string') return item.question;
  if (item.type === 'REFUSAL' && typeof item.message === 'string') return item.message;
  return null;
}

type RequestBodyBuilder = (question: string, history: Turn[]) => Record<string, unknown>;

export default function StudentHelpChat({ endpoint, introduction = 'I can offer hints and explain concepts.', buildRequestBody, canSend }: { endpoint: string; introduction?: string; buildRequestBody?: RequestBodyBuilder; canSend?: () => boolean }) {
  const [history, setHistory] = useState<Turn[]>([]);
  const [question, setQuestion] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const pendingRef = useRef(false);
  const openerRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    setOpen(false);
    openerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (pendingRef.current || !question.trim() || (canSend && !canSend())) return;
    pendingRef.current = true;
    setPending(true);
    setError('');
    const currentQuestion = question.trim();
    const currentHistory = history.map((turn) => ({ ...turn }));
    const requestBody = buildRequestBody
      ? buildRequestBody(currentQuestion, currentHistory)
      : { question: currentQuestion, ...(currentHistory.length ? { history: currentHistory } : {}) };
    try {
      const csrfResponse = await fetch('/api/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
      if (!csrfResponse.ok) throw new Error('AI_UNAVAILABLE');
      const csrf = await csrfResponse.json() as { csrfToken?: unknown };
      if (typeof csrf.csrfToken !== 'string') throw new Error('AI_UNAVAILABLE');
      const response = await fetch(endpoint, {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf.csrfToken },
        body: JSON.stringify(requestBody),
      });
      const payload = await response.json() as { reply?: unknown; error?: { code?: unknown } };
      if (!response.ok) {
        const code = typeof payload?.error?.code === 'string' ? payload.error.code : 'AI_UNAVAILABLE';
        throw new Error(code);
      }
      const text = replyText(payload?.reply);
      if (!text) throw new Error('AI_INVALID_OUTPUT');
      setHistory((previous) => ([...previous, { role: 'STUDENT', text: currentQuestion }, { role: 'BOT', text }] as Turn[]).slice(-8));
      setQuestion('');
    } catch (caught) {
      const code = caught instanceof Error && SAFE_ERRORS[caught.message] ? caught.message : 'AI_UNAVAILABLE';
      setError(SAFE_ERRORS[code]);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  const clear = () => { setHistory([]); setQuestion(''); setError(''); };

  return <div className="student-help-chat-float">
    <button ref={openerRef} className="student-help-chat__opener" type="button" aria-expanded={open} aria-controls="student-help-chat-panel" onClick={() => open ? close() : setOpen(true)}>
      {open ? 'Close Ticket help bot' : 'Open Ticket help bot'}
    </button>
    <div id="student-help-chat-panel" className="student-help-chat__panel" hidden={!open}>
      <section className="student-help-chat" aria-labelledby="student-help-chat-title">
        <header className="student-help-chat__header">
          <h2 id="student-help-chat-title">Ticket help bot</h2>
          <div className="student-help-chat__header-actions">
            <button type="button" onClick={clear} disabled={pending}>Clear chat</button>
            <button type="button" onClick={close} aria-label="Close chat">×</button>
          </div>
        </header>
        <p className="student-help-chat__notice">I offer hints and explain concepts{buildRequestBody ? ' and can suggest clearer ticket wording here' : ''}. I do not change your ticket. Please do not share secrets. Only the most recent 4 exchanges are sent with a question. Chat is cleared when you leave this page.</p>
        <div className="student-help-chat__messages" role="log" aria-label="Ticket help conversation" aria-live="polite" aria-relevant="additions">
          <div className="student-help-chat__message student-help-chat__message--bot" role="group" aria-label="Ticket help bot message">
            <span className="student-help-chat__speaker">Ticket help bot</span><p>{introduction}</p>
          </div>
          {history.map((turn, index) => <div className={`student-help-chat__message student-help-chat__message--${turn.role.toLowerCase()}`} key={`${index}-${turn.role}`} role="group" aria-label={turn.role === 'STUDENT' ? 'Your message' : 'Ticket help bot message'}>
            <span className="student-help-chat__speaker">{turn.role === 'STUDENT' ? 'You' : 'Ticket help bot'}</span><p>{turn.text}</p>
          </div>)}
        </div>
        <form className="student-help-chat__composer" onSubmit={send}>
          <label htmlFor="student-help-chat-question">Your question</label>
          <textarea id="student-help-chat-question" value={question} onChange={(event) => setQuestion(event.target.value)} rows={3} maxLength={2000} disabled={pending} />
          <div className="student-help-chat__actions">
            <button type="submit" disabled={pending || !question.trim()}>{pending ? 'Sending…' : 'Send'}</button>
          </div>
          <p className="student-help-chat__status" role="status" aria-live="polite">{pending ? 'Waiting for the help bot…' : ''}</p>
          {error && <p className="student-help-chat__error" role="alert">{error} Your question is still here; you can retry.</p>}
        </form>
      </section>
    </div>
  </div>;
}
