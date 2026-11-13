import React, { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import './StudentBugFaq.css';

type FaqSummary = {
  title: string;
  conceptTags: string[];
  faqRef: string;
};

type FaqReply = {
  speaker: 'Student' | 'TA';
  message: string;
  createdAt: string;
};

type FaqDetail = {
  title: string;
  conceptTags: string[];
  fixNote: string;
  replies: FaqReply[];
};

type SearchRequest = {
  query: string;
  field: 'title' | 'tags';
  cursor?: string;
  append: boolean;
};

type DetailRequest = {
  faqRef: string;
  cursor?: string;
};

type FaqState = 'idle' | 'loading' | 'ready' | 'error';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{1,512}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isFaqSummary(value: unknown): value is FaqSummary {
  if (!isRecord(value)) return false;
  return typeof value.title === 'string' && Array.isArray(value.conceptTags) &&
    value.conceptTags.length <= 5 && value.conceptTags.every((tag) => typeof tag === 'string' && tag.length <= 32) &&
    typeof value.faqRef === 'string' && TOKEN_PATTERN.test(value.faqRef);
}

function isFaqReply(value: unknown): value is FaqReply {
  if (!isRecord(value)) return false;
  return (value.speaker === 'Student' || value.speaker === 'TA') && typeof value.message === 'string' &&
    value.message.length <= 5000 && typeof value.createdAt === 'string';
}

function isFaqDetail(value: unknown): value is FaqDetail & { nextCursor?: string } {
  if (!isRecord(value) || typeof value.title !== 'string' || typeof value.fixNote !== 'string' ||
      !Array.isArray(value.conceptTags) || value.conceptTags.length > 5 ||
      !value.conceptTags.every((tag) => typeof tag === 'string' && tag.length <= 32) ||
      !Array.isArray(value.replies) || value.replies.length > 50 || !value.replies.every(isFaqReply)) return false;
  return value.nextCursor === undefined || value.nextCursor === null ||
    (typeof value.nextCursor === 'string' && TOKEN_PATTERN.test(value.nextCursor));
}

function isFaqSearch(value: unknown): value is { tickets: FaqSummary[]; nextCursor?: string } {
  if (!isRecord(value) || !Array.isArray(value.tickets) || value.tickets.length > 20 ||
      !value.tickets.every(isFaqSummary)) return false;
  return value.nextCursor === undefined || value.nextCursor === null ||
    (typeof value.nextCursor === 'string' && TOKEN_PATTERN.test(value.nextCursor));
}

async function readJson(response: Response): Promise<unknown> {
  if (!response.ok) throw new Error('The Bug FAQ request failed.');
  return response.json();
}

export function StudentBugFaq() {
  const [query, setQuery] = useState('');
  const [field, setField] = useState<'title' | 'tags'>('title');
  const [validationMessage, setValidationMessage] = useState('');
  const [searchState, setSearchState] = useState<FaqState>('idle');
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<FaqSummary[]>([]);
  const [nextSearchCursor, setNextSearchCursor] = useState<string | null>(null);
  const [searchError, setSearchError] = useState(false);
  const [detailState, setDetailState] = useState<FaqState>('idle');
  const [selectedFaq, setSelectedFaq] = useState<FaqSummary | null>(null);
  const [detail, setDetail] = useState<FaqDetail | null>(null);
  const [nextReplyCursor, setNextReplyCursor] = useState<string | null>(null);
  const [detailError, setDetailError] = useState(false);
  const generation = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);
  const lastSearchRequest = useRef<SearchRequest | null>(null);
  const lastDetailRequest = useRef<DetailRequest | null>(null);

  const beginRequest = useCallback(() => {
    activeRequest.current?.abort();
    activeRequest.current = new AbortController();
    generation.current += 1;
    return { controller: activeRequest.current, requestGeneration: generation.current };
  }, []);

  const resetResults = useCallback(() => {
    activeRequest.current?.abort();
    generation.current += 1;
    setResults([]);
    setNextSearchCursor(null);
    setSearchState('idle');
    setHasSearched(false);
    setSearchError(false);
    setSelectedFaq(null);
    setDetail(null);
    setNextReplyCursor(null);
    setDetailState('idle');
    setDetailError(false);
    lastSearchRequest.current = null;
    lastDetailRequest.current = null;
  }, []);

  const runSearch = useCallback(async (request: SearchRequest) => {
    const normalizedQuery = request.query.trim();
    if (!normalizedQuery) {
      setValidationMessage('Enter a search term to find resolved tickets.');
      return;
    }
    if (Array.from(normalizedQuery).length > 100) {
      setValidationMessage('Search terms must contain 100 characters or fewer.');
      return;
    }
    setValidationMessage('');
    const { controller, requestGeneration } = beginRequest();
    lastSearchRequest.current = { ...request, query: normalizedQuery };
    setSearchState('loading');
    setSearchError(false);
    if (!request.append) {
      setResults([]);
      setNextSearchCursor(null);
      setHasSearched(true);
      setSelectedFaq(null);
      setDetail(null);
      setNextReplyCursor(null);
      setDetailState('idle');
    }

    const params = new URLSearchParams({ q: normalizedQuery, field: request.field });
    if (request.cursor) params.set('cursor', request.cursor);
    try {
      const response = await fetch(`/api/tickets/faq?${params.toString()}`, {
        method: 'GET', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
      });
      const body = await readJson(response);
      if (!isFaqSearch(body)) throw new Error('Invalid Bug FAQ response.');
      if (generation.current !== requestGeneration) return;
      setResults((previous) => request.append ? [...previous, ...body.tickets] : body.tickets);
      setNextSearchCursor(typeof body.nextCursor === 'string' ? body.nextCursor : null);
      setSearchState('ready');
    } catch (error) {
      if (generation.current !== requestGeneration || (error instanceof Error && error.name === 'AbortError')) return;
      setSearchState('error');
      setSearchError(true);
    }
  }, [beginRequest]);

  const loadDetail = useCallback(async (request: DetailRequest, append: boolean) => {
    const { controller, requestGeneration } = beginRequest();
    lastDetailRequest.current = request;
    setDetailState('loading');
    setDetailError(false);
    try {
      const cursorQuery = request.cursor ? `?cursor=${encodeURIComponent(request.cursor)}` : '';
      const response = await fetch(`/api/tickets/faq/${encodeURIComponent(request.faqRef)}${cursorQuery}`, {
        method: 'GET', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
      });
      const body = await readJson(response);
      if (!isFaqDetail(body)) throw new Error('Invalid FAQ detail response.');
      if (generation.current !== requestGeneration) return;
      setDetail((previous) => append && previous
        ? { ...body, replies: [...previous.replies, ...body.replies] }
        : { title: body.title, conceptTags: body.conceptTags, fixNote: body.fixNote, replies: body.replies });
      setNextReplyCursor(typeof body.nextCursor === 'string' ? body.nextCursor : null);
      setDetailState('ready');
    } catch (error) {
      if (generation.current !== requestGeneration || (error instanceof Error && error.name === 'AbortError')) return;
      setDetailState('error');
      setDetailError(true);
    }
  }, [beginRequest]);

  useEffect(() => () => activeRequest.current?.abort(), []);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetResults();
    void runSearch({ query, field, append: false });
  };

  const changeQuery = (value: string) => {
    setQuery(value);
    setValidationMessage('');
    resetResults();
  };

  const changeField = (value: 'title' | 'tags') => {
    setField(value);
    setValidationMessage('');
    resetResults();
  };

  const openFaq = (faq: FaqSummary) => {
    setSelectedFaq(faq);
    setDetail(null);
    setNextReplyCursor(null);
    void loadDetail({ faqRef: faq.faqRef }, false);
  };

  const retrySearch = () => {
    if (lastSearchRequest.current) void runSearch(lastSearchRequest.current);
  };

  const retryDetail = () => {
    if (lastDetailRequest.current) void loadDetail(lastDetailRequest.current, !!lastDetailRequest.current.cursor);
  };

  const backToResults = () => {
    activeRequest.current?.abort();
    generation.current += 1;
    setSelectedFaq(null);
    setDetail(null);
    setDetailState('idle');
    setDetailError(false);
    setNextReplyCursor(null);
  };

  const searchMore = () => {
    if (nextSearchCursor && searchState !== 'loading') {
      void runSearch({ query, field, cursor: nextSearchCursor, append: true });
    }
  };

  const loadMoreReplies = () => {
    if (selectedFaq && nextReplyCursor && detailState !== 'loading') {
      void loadDetail({ faqRef: selectedFaq.faqRef, cursor: nextReplyCursor }, true);
    }
  };

  return (
    <section className="dashboard-panel student-bug-faq" aria-labelledby="student-bug-faq-heading">
      <h2 id="student-bug-faq-heading">Bug FAQ</h2>
      {!selectedFaq && <>
        <p className="student-bug-faq-description">Search resolved tickets for titles or concept tags, then open a result to read its fix note and conversation.</p>
        <form className="student-bug-faq-search" onSubmit={submitSearch}>
          <label htmlFor="student-bug-faq-query">Search Bug FAQ</label>
          <input
            id="student-bug-faq-query"
            type="search"
            value={query}
            onChange={(event) => changeQuery(event.target.value)}
            aria-describedby={validationMessage ? 'student-bug-faq-validation' : undefined}
          />
          <label htmlFor="student-bug-faq-field">Search field</label>
          <select id="student-bug-faq-field" value={field} onChange={(event) => changeField(event.target.value as 'title' | 'tags')}>
            <option value="title">Title</option>
            <option value="tags">Tags</option>
          </select>
          <button type="submit" disabled={searchState === 'loading' && !nextSearchCursor}>Search</button>
        </form>
        {validationMessage && <p id="student-bug-faq-validation" className="student-bug-faq-validation" role="alert">{validationMessage}</p>}
        {searchState === 'idle' && !hasSearched && <p className="student-bug-faq-hint">Search titles or tags from resolved tickets.</p>}
        {searchState === 'loading' && <p role="status" aria-live="polite">Searching resolved tickets…</p>}
        {searchError && <div className="student-bug-faq-error" role="alert">
          <p>Bug FAQ results couldn’t be loaded. Try again.</p>
          <button type="button" onClick={retrySearch}>{lastSearchRequest.current?.cursor ? 'Retry Search more' : 'Retry'}</button>
        </div>}
        {searchState === 'ready' && hasSearched && results.length === 0 && nextSearchCursor &&
          <p role="status" aria-live="polite">No matches in this batch. More resolved tickets may match.</p>}
        {searchState === 'ready' && hasSearched && results.length === 0 && !nextSearchCursor &&
          <p role="status" aria-live="polite">No matching resolved tickets.</p>}
        {results.length > 0 && <>
          <ul className="student-bug-faq-results" aria-label="Bug FAQ results">
            {results.map((faq, index) => <li key={`${faq.faqRef}-${index}`}>
              <button type="button" className="student-bug-faq-result" onClick={() => openFaq(faq)}>
                <span className="student-bug-faq-result-title">{faq.title}</span>
                <span className="student-bug-faq-result-tags">{faq.conceptTags.length ? faq.conceptTags.join(', ') : 'No concept tags'}</span>
              </button>
            </li>)}
          </ul>
          {nextSearchCursor
            ? <button type="button" className="student-bug-faq-more" onClick={searchMore} disabled={searchState === 'loading'}>Search more</button>
            : searchState === 'ready' && <p role="status" aria-live="polite">No more resolved tickets to scan.</p>}
        </>}
      </>}
      {selectedFaq && <div className="student-bug-faq-detail" aria-busy={detailState === 'loading'}>
        <button type="button" className="student-bug-faq-back" onClick={backToResults}>Back to FAQ results</button>
        {detailState === 'loading' && <p role="status" aria-live="polite">Loading FAQ details…</p>}
        {detailError && <div role="alert" className="student-bug-faq-error">
          <p>FAQ details couldn’t be loaded. Try again.</p>
          <button type="button" onClick={retryDetail}>{lastDetailRequest.current?.cursor ? 'Retry more replies' : 'Retry'}</button>
        </div>}
        {detail && <>
          <h3>{detail.title}</h3>
          <p className="student-bug-faq-detail-tags">{detail.conceptTags.length ? detail.conceptTags.join(', ') : 'No concept tags'}</p>
          <section className="student-bug-faq-fix" aria-labelledby="student-bug-faq-fix-heading">
            <h4 id="student-bug-faq-fix-heading">Fix note</h4>
            <p>{detail.fixNote}</p>
          </section>
          <section className="student-bug-faq-conversation" aria-labelledby="student-bug-faq-conversation-heading">
            <h4 id="student-bug-faq-conversation-heading">Conversation</h4>
            {detail.replies.length === 0 && <p>No conversation messages.</p>}
            <ol className="student-bug-faq-replies">
              {detail.replies.map((reply, index) => <li key={`${index}-${reply.createdAt}`}>
                <p className="student-bug-faq-speaker">{reply.speaker}</p>
                <p className="student-bug-faq-message">{reply.message}</p>
              </li>)}
            </ol>
            {nextReplyCursor && <button type="button" className="student-bug-faq-more" onClick={loadMoreReplies} disabled={detailState === 'loading'}>Load more replies</button>}
          </section>
        </>}
      </div>}
    </section>
  );
}

export default StudentBugFaq;
