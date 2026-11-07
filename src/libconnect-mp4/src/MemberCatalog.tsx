import React, { FormEvent, useEffect, useRef, useState } from 'react';
import './MemberCatalog.css';

export interface CatalogBook {
  isbn: string;
  title: string;
  author: string;
  synopsis: string;
}

type SearchFields = {
  q: string;
  title: string;
  author: string;
  publisher: string;
  category: string;
  isbn: string;
  synopsis: string;
  minYear: string;
  maxYear: string;
};

type CatalogFilters = Omit<SearchFields, 'minYear' | 'maxYear'> & {
  minYear: number | null;
  maxYear: number | null;
};

type ViewState = 'initial-loading' | 'search-loading' | 'page-loading' | 'results' |
  'invalid' | 'error' | 'forbidden' | 'data-error';

type CatalogModel = {
  books: CatalogBook[];
  nextCursor: string | null;
  scanComplete: boolean;
  scannedAnyDocument: boolean;
  scannedValidBooks: boolean;
  state: ViewState;
};

const emptyFields: SearchFields = {
  q: '', title: '', author: '', publisher: '', category: '', isbn: '', synopsis: '', minYear: '', maxYear: '',
};

const emptyModel: CatalogModel = {
  books: [], nextCursor: null, scanComplete: false, scannedAnyDocument: false,
  scannedValidBooks: false, state: 'initial-loading',
};

const textFields: Array<[keyof SearchFields, string]> = [
  ['title', 'Title'], ['author', 'Author'], ['publisher', 'Publisher'], ['category', 'Category'],
  ['isbn', 'ISBN'], ['synopsis', 'Synopsis'],
];

function activeFilters(fields: SearchFields, includeAdvanced = true): CatalogFilters {
  return {
    q: fields.q.trim(), title: includeAdvanced ? fields.title.trim() : '', author: includeAdvanced ? fields.author.trim() : '',
    publisher: includeAdvanced ? fields.publisher.trim() : '', category: includeAdvanced ? fields.category.trim() : '',
    isbn: includeAdvanced ? fields.isbn.trim() : '', synopsis: includeAdvanced ? fields.synopsis.trim() : '',
    minYear: includeAdvanced && fields.minYear ? Number(fields.minYear) : null,
    maxYear: includeAdvanced && fields.maxYear ? Number(fields.maxYear) : null,
  };
}

function hasFilters(filters: CatalogFilters): boolean {
  return Object.entries(filters).some(([, value]) => value !== '' && value !== null);
}

function validYear(value: string): boolean {
  return value === '' || (/^[0-9]{4}$/.test(value) && Number(value) >= 1450 && Number(value) <= 2100);
}

function validText(value: string): boolean {
  const trimmed = value.trim();
  return Array.from(value).length <= 256 && Array.from(trimmed).length <= 100;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCatalogResponse(value: unknown): value is {
  books: CatalogBook[]; nextCursor: string | null; scannedAnyDocument: boolean;
  scannedValidBooks: boolean; scanComplete: boolean;
} {
  if (!isRecord(value) || Object.keys(value).sort().join(',') !==
      'books,nextCursor,scanComplete,scannedAnyDocument,scannedValidBooks' ||
      !Array.isArray(value.books) ||
      !(value.nextCursor === null || typeof value.nextCursor === 'string') ||
      typeof value.scannedAnyDocument !== 'boolean' || typeof value.scannedValidBooks !== 'boolean' ||
      typeof value.scanComplete !== 'boolean' || (value.scanComplete && value.nextCursor !== null) ||
      (!value.scanComplete && (value.nextCursor === null || value.nextCursor.length === 0)) ||
      (value.books.length > 0 && !value.scannedValidBooks) ||
      (value.scannedValidBooks && !value.scannedAnyDocument) ||
      (!value.scanComplete && !value.scannedAnyDocument)) return false;

  return value.books.every((book) => isRecord(book) &&
    Object.keys(book).sort().join(',') === 'author,isbn,synopsis,title' &&
    typeof book.isbn === 'string' && book.isbn.length > 0 &&
    typeof book.title === 'string' && book.title.trim().length > 0 &&
    typeof book.author === 'string' && book.author.trim().length > 0 &&
    typeof book.synopsis === 'string');
}

function queryUrl(filters: CatalogFilters, cursor: string | null): string {
  const params = new URLSearchParams();
  for (const field of ['q', 'title', 'author', 'publisher', 'category', 'isbn', 'synopsis'] as const) {
    if (filters[field]) params.set(field, filters[field]);
  }
  if (filters.minYear !== null) params.set('minYear', String(filters.minYear));
  if (filters.maxYear !== null) params.set('maxYear', String(filters.maxYear));
  params.set('pageSize', '100');
  if (cursor !== null) params.set('cursor', cursor);
  return `/api/member/catalog?${params.toString()}`;
}

export function MemberCatalogCards({ books }: { books: CatalogBook[] }) {
  return (
    <div className="catalog-grid" aria-label="Catalog books">
      {books.map((book) => <MemberCatalogCard key={book.isbn} book={book} />)}
    </div>
  );
}

function MemberCatalogCard({ book }: { book: CatalogBook }) {
  const synopsis = book.synopsis || 'No synopsis provided';

  return (
    <article className="catalog-card" aria-labelledby={`catalog-title-${book.isbn}`}>
      <h3 id={`catalog-title-${book.isbn}`}>{book.title}</h3>
      <p className="catalog-card__author">{book.author}</p>
      <p className="catalog-card__synopsis">
        <span className="catalog-card__synopsis-visible">{synopsis}</span>
      </p>
    </article>
  );
}

export default function MemberCatalog() {
  const [fields, setFields] = useState<SearchFields>(emptyFields);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [model, setModel] = useState<CatalogModel>(emptyModel);
  const [yearError, setYearError] = useState('');
  const [textError, setTextError] = useState('');
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const retryRef = useRef<{ filters: CatalogFilters; cursor: string | null } | null>(null);
  const activeFiltersRef = useRef<CatalogFilters>(activeFilters(emptyFields));

  useEffect(() => {
    void loadPage(activeFilters(emptyFields), null, false);
    return () => {
      generation.current += 1;
      controller.current?.abort();
    };
    // Initial full catalog load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPage(filters: CatalogFilters, cursor: string | null, append: boolean) {
    const requestGeneration = ++generation.current;
    controller.current?.abort();
    const requestController = new AbortController();
    controller.current = requestController;
    retryRef.current = { filters, cursor };
    if (!append) activeFiltersRef.current = filters;
    setModel((current) => ({
      ...current,
      ...(append ? {} : { books: [], nextCursor: null, scannedAnyDocument: false, scannedValidBooks: false }),
      state: append ? 'page-loading' : (hasFilters(filters) ? 'search-loading' : 'initial-loading'),
    }));

    try {
      const response = await fetch(queryUrl(filters, cursor), {
        method: 'GET', credentials: 'same-origin', signal: requestController.signal,
      });
      if (requestGeneration !== generation.current) return;
      if (response.status === 401) {
        setModel({ ...emptyModel, state: 'forbidden' });
        window.history.replaceState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
        return;
      }
      if (response.status === 403) {
        setModel({ ...emptyModel, state: 'forbidden' });
        return;
      }
      if (response.status === 400) {
        setModel({ ...emptyModel, state: 'invalid' });
        return;
      }
      if (response.status !== 200) {
        setModel((current) => ({ ...current, state: 'error' }));
        return;
      }

      let body: unknown;
      try { body = await response.json(); } catch { body = null; }
      if (requestGeneration !== generation.current) return;
      if (!isCatalogResponse(body)) {
        setModel({ ...emptyModel, state: 'error' });
        return;
      }
      const catalogResponse = body;

      setModel((current) => {
        const books = append ? [...current.books, ...catalogResponse.books] : catalogResponse.books;
        const scannedAnyDocument = current.scannedAnyDocument || catalogResponse.scannedAnyDocument;
        const scannedValidBooks = current.scannedValidBooks || catalogResponse.scannedValidBooks;
        const state: ViewState = catalogResponse.scanComplete && books.length === 0 && scannedAnyDocument && !scannedValidBooks
          ? 'data-error'
          : 'results';
        return {
          books, nextCursor: catalogResponse.nextCursor, scanComplete: catalogResponse.scanComplete,
          scannedAnyDocument, scannedValidBooks, state,
        };
      });
    } catch (error) {
      if (requestGeneration !== generation.current || (error instanceof DOMException && error.name === 'AbortError')) return;
      setModel((current) => ({ ...current, state: 'error' }));
    }
  }

  function updateField(field: keyof SearchFields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
    setYearError('');
    setTextError('');
  }

  function validateFields(includeAdvanced: boolean): boolean {
    if (includeAdvanced && (!validYear(fields.minYear) || !validYear(fields.maxYear))) {
      setYearError('Enter a whole year from 1450 to 2100.');
      return false;
    }
    if (includeAdvanced && fields.minYear && fields.maxYear && Number(fields.minYear) > Number(fields.maxYear)) {
      setYearError('Minimum year must be no later than maximum year.');
      return false;
    }
    const values = [fields.q, ...(includeAdvanced ? textFields.map(([field]) => fields[field]) : [])];
    if (values.some((value) => !validText(value))) {
      setTextError('Each search value must be at most 100 characters after trimming.');
      return false;
    }
    return true;
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateFields(advancedOpen)) {
      generation.current += 1;
      controller.current?.abort();
      setModel({ ...emptyModel, state: 'invalid' });
      return;
    }
    setYearError('');
    setTextError('');
    void loadPage(activeFilters(fields, advancedOpen), null, false);
  }

  function clearSearch() {
    setFields(emptyFields);
    setYearError('');
    setTextError('');
    void loadPage(activeFilters(emptyFields), null, false);
  }

  function toggleAdvanced() {
    if (advancedOpen) {
      setAdvancedOpen(false);
      setYearError('');
      setTextError('');
      void loadPage(activeFilters({ ...fields, title: '', author: '', publisher: '', category: '', isbn: '', synopsis: '', minYear: '', maxYear: '' }), null, false);
    } else {
      setAdvancedOpen(true);
    }
  }

  const filtered = hasFilters(activeFiltersRef.current);
  const retry = () => {
    const request = retryRef.current;
    if (request) {
      const restart = model.state === 'data-error';
      void loadPage(request.filters, restart ? null : request.cursor, !restart && request.cursor !== null);
    }
  };

  return (
    <section className="catalog-section" aria-labelledby="catalog-heading">
      <div className="catalog-heading-row">
        <div>
          <p className="eyebrow">MEMBER CATALOG</p>
          <h2 id="catalog-heading">Explore books</h2>
        </div>
      </div>

      <form className="catalog-search" role="search" onSubmit={submitSearch}>
        <label className="catalog-field catalog-field--basic" htmlFor="catalog-query">Search books</label>
        <div className="catalog-search__row">
          <input
            id="catalog-query"
            type="search"
            value={fields.q}
            onChange={(event) => updateField('q', event.target.value)}
            maxLength={256}
            aria-describedby={textError ? 'catalog-text-error' : undefined}
            aria-invalid={Boolean(textError)}
          />
          <button className="submit-button" type="submit">Search</button>
        </div>
        <div className="catalog-search__actions">
          <button
            className="catalog-search__advanced-toggle"
            type="button"
            aria-expanded={advancedOpen}
            aria-controls="catalog-advanced-fields"
            onClick={toggleAdvanced}
          >
            Advanced search
          </button>
          <button className="catalog-search__clear" type="button" onClick={clearSearch}>
            Clear search
          </button>
        </div>
        {advancedOpen && <div className="catalog-advanced" id="catalog-advanced-fields">
          {textFields.map(([field, label]) => (
            <label className="catalog-field" key={field} htmlFor={`catalog-${field}`}>
              {label}
              <input
                id={`catalog-${field}`}
                type="text"
                value={fields[field]}
                onChange={(event) => updateField(field, event.target.value)}
                aria-describedby={textError ? 'catalog-text-error' : undefined}
                aria-invalid={Boolean(textError)}
              />
            </label>
          ))}
          <label className="catalog-field" htmlFor="catalog-min-year">
            Minimum publication year
            <input id="catalog-min-year" type="text" inputMode="numeric" value={fields.minYear}
              onChange={(event) => updateField('minYear', event.target.value)} aria-invalid={Boolean(yearError)}
              aria-describedby={yearError ? 'catalog-year-error' : undefined} />
          </label>
          <label className="catalog-field" htmlFor="catalog-max-year">
            Maximum publication year
            <input id="catalog-max-year" type="text" inputMode="numeric" value={fields.maxYear}
              onChange={(event) => updateField('maxYear', event.target.value)} aria-invalid={Boolean(yearError)}
              aria-describedby={yearError ? 'catalog-year-error' : undefined} />
          </label>
        </div>}
        {yearError && <p className="catalog-search__error" id="catalog-year-error" role="alert">{yearError}</p>}
        {textError && <p className="catalog-search__error" id="catalog-text-error" role="alert">{textError}</p>}
      </form>

      <div className="catalog-results" aria-live="polite" aria-busy={model.state.endsWith('loading')}>
        {model.state === 'initial-loading' && <p>Loading catalog…</p>}
        {model.state === 'search-loading' && <p>Loading search results…</p>}
        {model.state === 'page-loading' && <p className="catalog-page-loading">Loading more books…</p>}
        {model.state === 'invalid' && <p className="catalog-search__error" role="alert">Check your search fields and try again.</p>}
        {model.state === 'forbidden' && <p className="catalog-search__error" role="alert">You don’t have access to this catalog.</p>}
        {(model.state === 'error' || model.state === 'data-error') && <div role="alert" className="catalog-error">
          <p>{model.state === 'data-error' ? 'Catalog data could not be loaded.' : 'We couldn’t load the catalog. Please try again.'}</p>
          <button type="button" onClick={retry}>Retry</button>
        </div>}
        {model.state === 'results' && model.scanComplete && model.books.length === 0 && !model.scannedAnyDocument &&
          <p>No books found.</p>}
        {model.state === 'results' && model.scanComplete && model.books.length === 0 && model.scannedValidBooks && filtered &&
          <p>No matching books.</p>}
        {model.books.length > 0 && <MemberCatalogCards books={model.books} />}
        {model.nextCursor && model.state !== 'error' && <button className="catalog-more" type="button" onClick={() => {
          const filters = activeFiltersRef.current;
          void loadPage(filters, model.nextCursor, true);
        }} disabled={model.state === 'page-loading'}>
          {model.state === 'page-loading' ? 'Loading more books…' : 'Load more books'}
        </button>}
      </div>
    </section>
  );
}
