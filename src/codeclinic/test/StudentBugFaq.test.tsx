import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { StudentDashboard } from '../src/StudentDashboard';

const response = (status: number, body: unknown = {}) => ({ status, ok: status >= 200 && status < 300, json: async () => body });

describe('Student dashboard Bug FAQ (T03)', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });

  test('places the FAQ after Ask for Help and defaults to a labelled Title search', async () => {
    global.fetch = jest.fn().mockImplementation((url: RequestInfo | URL) => {
      if (url === '/api/tickets/active') return Promise.resolve(response(200, { tickets: [] }));
      if (url === '/api/tickets/faq?q=loop&field=title') return Promise.resolve(response(200, { tickets: [] }));
      return Promise.resolve(response(404));
    }) as typeof fetch;
    render(<StudentDashboard onLogoutConfirmed={() => {}} />);

    const help = await screen.findByRole('heading', { name: /ask for help/i });
    const faqHeading = screen.getByRole('heading', { name: /bug faq/i });
    expect(help.compareDocumentPosition(faqHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const faqSection = faqHeading.closest('section');
    expect(faqSection).not.toBeNull();
    const search = within(faqSection as HTMLElement).getByRole('searchbox', { name: /search.*faq|faq.*search/i });
    const field = within(faqSection as HTMLElement).getByRole('combobox', { name: /search field/i });
    expect(field).toHaveValue('title');
    fireEvent.change(search, { target: { value: ' loop ' } });
    fireEvent.click(within(faqSection as HTMLElement).getByRole('button', { name: /^search$/i }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/tickets/faq?q=loop&field=title', expect.anything()));
  });

  test('rejects empty input locally and searches selected Tags field', async () => {
    const fetchMock = jest.fn().mockImplementation((url: RequestInfo | URL) => {
      if (url === '/api/tickets/active') return Promise.resolve(response(200, { tickets: [] }));
      if (url === '/api/tickets/faq?q=linked&field=tags') return Promise.resolve(response(200, { tickets: [] }));
      return Promise.resolve(response(404));
    });
    global.fetch = fetchMock as typeof fetch;
    render(<StudentDashboard onLogoutConfirmed={() => {}} />);

    const faqHeading = await screen.findByRole('heading', { name: /bug faq/i });
    const section = faqHeading.closest('section') as HTMLElement;
    const search = within(section).getByRole('searchbox', { name: /search.*faq|faq.*search/i });
    const field = within(section).getByRole('combobox', { name: /search field/i });
    const submit = within(section).getByRole('button', { name: /^search$/i });
    fireEvent.click(submit);
    expect(await within(section).findByText(/enter.*search|search term/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('/api/tickets/faq'), expect.anything());

    fireEvent.change(search, { target: { value: 'linked' } });
    fireEvent.change(field, { target: { value: 'tags' } });
    fireEvent.click(submit);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/tickets/faq?q=linked&field=tags', expect.anything()));
  });

  test('accepts 100 Unicode code points and rejects 101 without truncating or calling the API', async () => {
    const fetchMock = jest.fn().mockImplementation((url: RequestInfo | URL) => {
      if (url === '/api/tickets/active') return Promise.resolve(response(200, { tickets: [] }));
      return Promise.resolve(response(200, { tickets: [] }));
    });
    global.fetch = fetchMock as typeof fetch;
    render(<StudentDashboard onLogoutConfirmed={() => {}} />);

    const faqHeading = await screen.findByRole('heading', { name: /bug faq/i });
    const section = faqHeading.closest('section') as HTMLElement;
    const search = within(section).getByRole('searchbox', { name: /search.*faq|faq.*search/i });
    const submit = within(section).getByRole('button', { name: /^search$/i });
    const exactLimit = '😀'.repeat(100);
    fireEvent.change(search, { target: { value: exactLimit } });
    expect(search).toHaveValue(exactLimit);
    fireEvent.click(submit);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      `/api/tickets/faq?q=${encodeURIComponent(exactLimit)}&field=title`, expect.anything(),
    ));

    fetchMock.mockClear();
    fireEvent.change(search, { target: { value: '😀'.repeat(101) } });
    expect(search).toHaveValue('😀'.repeat(101));
    fireEvent.click(submit);
    expect(await within(section).findByText(/100 characters or fewer/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('/api/tickets/faq?'), expect.anything());
  });

  test('renders only literal title and tags, with no ticket detail link, and continues scanning', async () => {
    const fetchMock = jest.fn().mockImplementation((url: RequestInfo | URL) => {
      if (url === '/api/tickets/active') return Promise.resolve(response(200, { tickets: [] }));
      if (String(url).startsWith('/api/tickets/faq?')) return Promise.resolve(response(200, {
        tickets: [{ title: '<img src=x onerror=alert(1)>', conceptTags: ['<script>literal</script>'], faqRef: 'opaque-faq-ref' }], nextCursor: 'opaque-page-2',
      }));
      return Promise.resolve(response(404));
    });
    global.fetch = fetchMock as typeof fetch;
    render(<StudentDashboard onLogoutConfirmed={() => {}} />);

    const faqHeading = await screen.findByRole('heading', { name: /bug faq/i });
    const section = faqHeading.closest('section') as HTMLElement;
    fireEvent.change(within(section).getByRole('searchbox', { name: /search.*faq|faq.*search/i }), { target: { value: 'loop' } });
    fireEvent.click(within(section).getByRole('button', { name: /^search$/i }));
    expect(await within(section).findByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(within(section).getByText('<script>literal</script>')).toBeInTheDocument();
    expect(section.querySelector('img, script')).toBeNull();
    expect(within(section).queryByRole('link')).toBeNull();

    fireEvent.click(within(section).getByRole('button', { name: /search more/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('cursor=opaque-page-2'), expect.anything()));
  });

  test('keeps the latest search results when an older request finishes late', async () => {
    let resolveOld: ((value: ReturnType<typeof response>) => void) | undefined;
    const oldRequest = new Promise<ReturnType<typeof response>>((resolve) => { resolveOld = resolve; });
    const fetchMock = jest.fn().mockImplementation((url: RequestInfo | URL) => {
      if (url === '/api/tickets/active') return Promise.resolve(response(200, { tickets: [] }));
      if (String(url).includes('q=first')) return oldRequest;
      if (String(url).includes('q=second')) return Promise.resolve(response(200, { tickets: [{ title: 'Second result', conceptTags: [], faqRef: 'opaque-second-ref' }] }));
      return Promise.resolve(response(404));
    });
    global.fetch = fetchMock as typeof fetch;
    render(<StudentDashboard onLogoutConfirmed={() => {}} />);
    const faqHeading = await screen.findByRole('heading', { name: /bug faq/i });
    const section = faqHeading.closest('section') as HTMLElement;
    const search = within(section).getByRole('searchbox', { name: /search.*faq|faq.*search/i });
    const submit = within(section).getByRole('button', { name: /^search$/i });
    fireEvent.change(search, { target: { value: 'first' } }); fireEvent.click(submit);
    fireEvent.change(search, { target: { value: 'second' } }); fireEvent.click(submit);
    expect(await within(section).findByText('Second result')).toBeInTheDocument();
    if (resolveOld) resolveOld(response(200, { tickets: [{ title: 'Stale result', conceptTags: ['old'] }] }));
    await waitFor(() => expect(within(section).queryByText('Stale result')).not.toBeInTheDocument());
  });

  test('opens a read-only detail view with literal fix note and paginated Student/TA conversation', async () => {
    const fetchMock = jest.fn().mockImplementation((url: RequestInfo | URL) => {
      if (url === '/api/tickets/active') return Promise.resolve(response(200, { tickets: [] }));
      if (String(url).startsWith('/api/tickets/faq?')) return Promise.resolve(response(200, {
        tickets: [{ title: 'Loop issue', conceptTags: ['loops'], faqRef: 'opaque-faq-ref' }],
      }));
      if (url === '/api/tickets/faq/opaque-faq-ref') return Promise.resolve(response(200, {
        title: '<b>Loop issue</b>', conceptTags: ['<i>loops</i>'], fixNote: '<script>Fix note</script>',
        replies: [{ speaker: 'Student', message: 'Sam Student typed this <img src=x>', createdAt: 'time-1' }],
        nextCursor: 'opaque-reply-cursor',
      }));
      if (String(url).startsWith('/api/tickets/faq/opaque-faq-ref?cursor=')) return Promise.resolve(response(200, {
        title: '<b>Loop issue</b>', conceptTags: ['<i>loops</i>'], fixNote: '<script>Fix note</script>',
        replies: [{ speaker: 'TA', message: 'Alice TA replied <em>literally</em>', createdAt: 'time-2' }],
      }));
      return Promise.resolve(response(404));
    });
    global.fetch = fetchMock as typeof fetch;
    render(<StudentDashboard onLogoutConfirmed={() => {}} />);

    const faqHeading = await screen.findByRole('heading', { name: /bug faq/i });
    const section = faqHeading.closest('section') as HTMLElement;
    fireEvent.change(within(section).getByRole('searchbox', { name: /search.*faq|faq.*search/i }), { target: { value: 'loop' } });
    fireEvent.click(within(section).getByRole('button', { name: /^search$/i }));
    const result = await within(section).findByRole('button', { name: /loop issue/i });
    expect(within(section).queryByText('opaque-faq-ref')).toBeNull();
    fireEvent.click(result);

    expect(await screen.findByText('<script>Fix note</script>')).toBeInTheDocument();
    expect(screen.getByText('Sam Student typed this <img src=x>')).toBeInTheDocument();
    expect(screen.getByText('Student')).toBeInTheDocument();
    expect(section.querySelector('script, img, em')).toBeNull();
    expect(screen.queryByRole('button', { name: /post reply|send reply|edit ticket/i })).toBeNull();
    expect(within(section).queryByRole('link')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /more replies|load more replies/i }));
    expect(await screen.findByText('Alice TA replied <em>literally</em>')).toBeInTheDocument();
    expect(screen.getByText('TA')).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/tickets/faq/opaque-faq-ref?cursor=opaque-reply-cursor', expect.anything(),
    ));
    fireEvent.click(screen.getByRole('button', { name: /back to faq|back to results/i }));
    expect(await screen.findByRole('heading', { name: /bug faq/i })).toBeInTheDocument();
  });
});
