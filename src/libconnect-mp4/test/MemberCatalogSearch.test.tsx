import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemberDashboard } from '../src/MemberDashboard';

const emptyResponse = {
  books: [], nextCursor: null, scannedAnyDocument: false,
  scannedValidBooks: false, scanComplete: true,
};
const originalFetchDescriptor = Object.getOwnPropertyDescriptor(global, 'fetch');

function response(body: unknown, status = 200) {
  return { status, json: async () => body } as Response;
}

function book(isbn: string, title: string) {
  return { isbn, title, author: 'Synthetic author', synopsis: 'Synthetic synopsis' };
}

describe('member catalog dashboard presentation', () => {
  const onLogoutConfirmed = jest.fn();

  beforeEach(() => {
    onLogoutConfirmed.mockClear();
    window.history.replaceState({}, '', '/member/dashboard');
    Object.defineProperty(global, 'fetch', {
      configurable: true, writable: true, value: jest.fn().mockResolvedValue(response(emptyResponse)),
    });
  });

  afterEach(() => {
    if (originalFetchDescriptor) Object.defineProperty(global, 'fetch', originalFetchDescriptor);
    else delete (global as { fetch?: typeof fetch }).fetch;
  });

  test('provides dashboard navigation and keeps logout available', async () => {
    render(<MemberDashboard onLogoutConfirmed={onLogoutConfirmed} />);

    expect(screen.getByRole('link', { name: /libconnect/i })).toHaveAttribute('href', '/member/dashboard');
    expect(screen.getByRole('button', { name: /log out/i })).toBeVisible();
    await screen.findByText('No books found.');
  });

  test('starts with labelled basic search and advanced criteria collapsed', async () => {
    render(<MemberDashboard onLogoutConfirmed={onLogoutConfirmed} />);

    expect(screen.getByRole('searchbox', { name: /search/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /advanced search/i })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText(/publisher/i)).not.toBeInTheDocument();
    expect(await screen.findByText('No books found.')).toBeVisible();
  });

  test('hides advanced criteria when collapsed and restores their values when reopened', async () => {
    render(<MemberDashboard onLogoutConfirmed={onLogoutConfirmed} />);
    await screen.findByText('No books found.');

    const toggle = screen.getByRole('button', { name: /advanced search/i });
    fireEvent.click(toggle);

    const publisher = screen.getByRole('textbox', { name: /publisher/i });
    fireEvent.change(publisher, { target: { value: 'Northwind Press' } });
    fireEvent.click(toggle);

    expect(screen.queryByLabelText(/publisher/i)).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await screen.findByText('No books found.');

    fireEvent.click(toggle);
    expect(screen.getByRole('textbox', { name: /publisher/i })).toHaveValue('Northwind Press');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  test('submits the basic search and combines visible advanced fields with AND criteria', async () => {
    (global.fetch as jest.Mock).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('publisher=Northwind')) return response({
        ...emptyResponse, books: [book('synthetic-1', 'Synthetic match')], scannedAnyDocument: true,
        scannedValidBooks: true,
      });
      return response(emptyResponse);
    });
    render(<MemberDashboard onLogoutConfirmed={onLogoutConfirmed} />);
    const search = screen.getByRole('searchbox', { name: /search books/i });
    fireEvent.change(search, { target: { value: '  tom  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    expect(String((global.fetch as jest.Mock).mock.calls[1][0])).toContain('q=tom');

    fireEvent.click(screen.getByRole('button', { name: /advanced search/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /publisher/i }), { target: { value: 'Northwind' } });
    fireEvent.change(screen.getByRole('textbox', { name: /minimum publication year/i }), { target: { value: '1980' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
    await screen.findByRole('heading', { name: 'Synthetic match' });
    const requested = String((global.fetch as jest.Mock).mock.calls[2][0]);
    expect(requested).toContain('q=tom');
    expect(requested).toContain('publisher=Northwind');
    expect(requested).toContain('minYear=1980');
    expect(requested).toContain('pageSize=100');
  });

  test('collapsing advanced search deactivates its criteria and preserves values for reopening', async () => {
    render(<MemberDashboard onLogoutConfirmed={onLogoutConfirmed} />);
    await screen.findByText('No books found.');
    const toggle = screen.getByRole('button', { name: /advanced search/i });
    fireEvent.click(toggle);
    fireEvent.change(screen.getByRole('textbox', { name: /publisher/i }), { target: { value: 'Northwind' } });
    fireEvent.change(screen.getByRole('textbox', { name: /minimum publication year/i }), { target: { value: '1449' } });
    fireEvent.click(toggle);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    const collapsedQuery = String((global.fetch as jest.Mock).mock.calls[1][0]);
    expect(collapsedQuery).toContain('pageSize=100');
    expect(collapsedQuery).not.toContain('publisher=');
    expect(collapsedQuery).not.toContain('minYear=');
    fireEvent.change(screen.getByRole('searchbox', { name: /search books/i }), { target: { value: 'tom' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));
    await screen.findByText('No books found.');
    expect(String((global.fetch as jest.Mock).mock.calls[2][0])).toContain('q=tom');
    expect(String((global.fetch as jest.Mock).mock.calls[2][0])).not.toContain('minYear=');
    fireEvent.click(toggle);
    expect(screen.getByRole('textbox', { name: /publisher/i })).toHaveValue('Northwind');
    expect(screen.getByRole('textbox', { name: /minimum publication year/i })).toHaveValue('1449');
  });

  test('rejects invalid and reversed years before issuing a request', async () => {
    render(<MemberDashboard onLogoutConfirmed={onLogoutConfirmed} />);
    await screen.findByText('No books found.');
    fireEvent.click(screen.getByRole('button', { name: /advanced search/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /minimum publication year/i }), { target: { value: '1450.0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
    expect(await screen.findByText(/whole year from 1450 to 2100/i)).toBeVisible();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByRole('textbox', { name: /minimum publication year/i }), { target: { value: '2001' } });
    fireEvent.change(screen.getByRole('textbox', { name: /maximum publication year/i }), { target: { value: '2000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
    expect(await screen.findByText(/minimum year must be no later/i)).toBeVisible();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('textbox', { name: /minimum publication year/i })).toHaveAttribute('aria-invalid', 'true');
  });

  test('clear cancels stale responses, clears fields, and restores the full catalog', async () => {
    let resolveInitial: (result: Response) => void = () => undefined;
    let resolveSearch: (result: Response) => void = () => undefined;
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() => new Promise((resolve) => { resolveInitial = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSearch = resolve; }))
      .mockResolvedValueOnce(response({
        ...emptyResponse, books: [book('full', 'Full catalog result')], scannedAnyDocument: true,
        scannedValidBooks: true,
      }));
    render(<MemberDashboard onLogoutConfirmed={onLogoutConfirmed} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const search = screen.getByRole('searchbox', { name: /search books/i });
    fireEvent.change(search, { target: { value: 'stale query' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole('button', { name: /clear search/i }));
    await screen.findByRole('heading', { name: 'Full catalog result' });
    expect(search).toHaveValue('');

    await act(async () => {
      resolveInitial(response({ ...emptyResponse, books: [book('initial', 'Stale initial result')], scannedAnyDocument: true, scannedValidBooks: true }));
      resolveSearch(response({ ...emptyResponse, books: [book('stale', 'Stale search result')], scannedAnyDocument: true, scannedValidBooks: true }));
    });
    expect(screen.queryByRole('heading', { name: 'Stale initial result' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Stale search result' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Full catalog result' })).toBeVisible();
  });

  test('loads matching results through the explicit continuation button', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(response({
        books: [book('one', 'First page book')], nextCursor: 'synthetic-cursor', scannedAnyDocument: true,
        scannedValidBooks: true, scanComplete: false,
      }))
      .mockResolvedValueOnce(response({
        books: [book('two', 'Second page book')], nextCursor: null, scannedAnyDocument: true,
        scannedValidBooks: true, scanComplete: true,
      }));
    render(<MemberDashboard onLogoutConfirmed={onLogoutConfirmed} />);
    expect(await screen.findByRole('heading', { name: 'First page book' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /load more books/i }));
    expect(await screen.findByRole('heading', { name: 'Second page book' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'First page book' })).toBeVisible();
    expect(String((global.fetch as jest.Mock).mock.calls[1][0])).toContain('cursor=synthetic-cursor');
  });

  test('distinguishes no matches and offers retry for a service error', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(response(emptyResponse))
      .mockResolvedValueOnce(response({ ...emptyResponse, scannedAnyDocument: true, scannedValidBooks: true }))
      .mockResolvedValueOnce(response({ error: { code: 'CATALOG_UNAVAILABLE' } }, 503))
      .mockResolvedValueOnce(response({ ...emptyResponse, books: [book('retry', 'Retry result')], scannedAnyDocument: true, scannedValidBooks: true }));
    render(<MemberDashboard onLogoutConfirmed={onLogoutConfirmed} />);
    await screen.findByText('No books found.');
    fireEvent.change(screen.getByRole('searchbox', { name: /search books/i }), { target: { value: 'absent' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
    expect(await screen.findByText('No matching books.')).toBeVisible();
    fireEvent.change(screen.getByRole('searchbox', { name: /search books/i }), { target: { value: 'retry' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
    expect(await screen.findByRole('button', { name: 'Retry' })).toBeVisible();
    expect(screen.queryByText('No matching books.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { name: 'Retry result' })).toBeVisible();
  });

  test('continues sparse pages and reports all-invalid catalog data without claiming emptiness', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(response({
        books: [], nextCursor: 'sparse-next', scannedAnyDocument: true,
        scannedValidBooks: false, scanComplete: false,
      }))
      .mockResolvedValueOnce(response({
        books: [], nextCursor: null, scannedAnyDocument: true,
        scannedValidBooks: false, scanComplete: true,
      }));
    render(<MemberDashboard onLogoutConfirmed={onLogoutConfirmed} />);
    expect(await screen.findByRole('button', { name: /load more books/i })).toBeVisible();
    expect(screen.queryByText(/no books found|no matching books/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /load more books/i }));
    expect(await screen.findByText(/catalog data could not be loaded/i)).toBeVisible();
    expect(screen.queryByText(/no books found|no matching books/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeVisible();
  });

  test('fails closed on malformed success payload and authorization denial', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(response({ books: [{ title: 'Untrusted' }] }));
    const first = render(<MemberDashboard onLogoutConfirmed={onLogoutConfirmed} />);
    expect(await screen.findByRole('button', { name: 'Retry' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Untrusted' })).not.toBeInTheDocument();
    first.unmount();

    (global.fetch as jest.Mock).mockResolvedValueOnce(response({ error: { code: 'FORBIDDEN' } }, 403));
    render(<MemberDashboard onLogoutConfirmed={onLogoutConfirmed} />);
    expect(await screen.findByText(/don’t have access/i)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  test('accepts the valid empty-catalog response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(response(emptyResponse));
    render(<MemberDashboard onLogoutConfirmed={onLogoutConfirmed} />);

    expect(await screen.findByText('No books found.')).toBeVisible();
    expect(screen.queryByText('No matching books.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  test.each([
    ['books without a valid-book scan flag', {
      ...emptyResponse, books: [book('synthetic-invalid', 'Untrusted book')], scannedAnyDocument: true,
    }],
    ['valid books without any scanned documents', {
      ...emptyResponse, scannedAnyDocument: false, scannedValidBooks: true,
    }],
    ['an incomplete scan without scanned documents', {
      ...emptyResponse, nextCursor: 'synthetic-cursor', scanComplete: false,
    }],
  ])('fails closed on contradictory scan metadata: %s', async (_description, payload) => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(response(payload));
    render(<MemberDashboard onLogoutConfirmed={onLogoutConfirmed} />);

    expect(await screen.findByRole('button', { name: 'Retry' })).toBeVisible();
    expect(screen.queryByText('No books found.')).not.toBeInTheDocument();
    expect(screen.queryByText('No matching books.')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Untrusted book' })).not.toBeInTheDocument();
  });

  test('rejects an empty cursor when the server says more pages remain', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(response({
      books: [], nextCursor: '', scannedAnyDocument: true, scannedValidBooks: true, scanComplete: false,
    }));
    render(<MemberDashboard onLogoutConfirmed={onLogoutConfirmed} />);
    expect(await screen.findByRole('button', { name: 'Retry' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /load more books/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/no books found|no matching books/i)).not.toBeInTheDocument();
  });
});
