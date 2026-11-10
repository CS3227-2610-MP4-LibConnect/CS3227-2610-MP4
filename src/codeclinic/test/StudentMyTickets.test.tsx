import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyTicketsPage from '../src/tickets/MyTicketsPage';
import AppHeader from '../src/AppHeader';
import { StudentDashboard } from '../src/StudentDashboard';

const response = (body: unknown, status = 200) => ({ status, ok: status >= 200 && status < 300, json: async () => body });
const respondToPage = (handler: (input: RequestInfo | URL, init?: RequestInit) => ReturnType<typeof response> | Promise<ReturnType<typeof response>>) =>
  jest.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) =>
    String(input) === '/api/notifications/unread-count'
      ? Promise.resolve(response({ unreadCount: 0 }))
      : Promise.resolve(handler(input, init)),
  );
const ticket = (ticketId: string, status: string, extra: Record<string, unknown> = {}) => ({
  ticketId, title: `Title ${ticketId}`, language: 'TypeScript', conceptTags: ['loops'], status,
  updatedAt: '2026-11-10T00:00:00Z', ...extra,
});

describe('Student My Tickets page', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; window.history.replaceState({}, '', '/'); });

  test('shows Open by default, renders exact statuses and links each card to ticket detail', async () => {
    global.fetch = jest.fn().mockResolvedValue(response({ tickets: [ticket('open-1', 'OPEN'), ticket('claimed-1', 'CLAIMED')] })) as typeof fetch;
    render(<MyTicketsPage onLogoutConfirmed={jest.fn()} />);
    expect(await screen.findByRole('heading', { name: 'My Tickets' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Closed' })).toHaveAttribute('aria-pressed', 'false');
    expect(await screen.findByRole('link', { name: /Title open-1/ })).toHaveAttribute('href', '/student/tickets/open-1');
    expect(screen.getByText(/Claimed/)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith('/api/tickets?view=open', expect.anything());
  });

  test('switches to Closed and renders CLOSED and RESOLVED cards with their detail links', async () => {
    global.fetch = respondToPage((input) => Promise.resolve(
      String(input).includes('view=closed')
        ? response({ tickets: [ticket('closed-1', 'CLOSED'), ticket('resolved-1', 'RESOLVED')] })
        : response({ tickets: [ticket('open-1', 'OPEN')] }),
    )) as typeof fetch;
    render(<MyTicketsPage onLogoutConfirmed={jest.fn()} />);
    await screen.findByRole('link', { name: /Title open-1/ });
    fireEvent.click(screen.getByRole('button', { name: 'Closed' }));
    expect(await screen.findByRole('link', { name: /Title closed-1/ })).toHaveAttribute('href', '/student/tickets/closed-1');
    expect(await screen.findByRole('link', { name: /Title resolved-1/ })).toHaveAttribute('href', '/student/tickets/resolved-1');
    expect(screen.getAllByText('Closed').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Resolved/)).toBeInTheDocument();
  });

  test('keeps existing cards after a failed next page and retries that page once', async () => {
    let pageCalls = 0;
    const fetchMock = respondToPage(() => {
      pageCalls += 1;
      if (pageCalls === 1) return response({ tickets: [ticket('first', 'OPEN')], nextCursor: 'cursor-open-1' });
      if (pageCalls === 2) throw new TypeError('synthetic network failure');
      return response({ tickets: [ticket('second', 'OPEN')] });
    });
    global.fetch = fetchMock as typeof fetch;
    render(<MyTicketsPage onLogoutConfirmed={jest.fn()} />);
    await screen.findByRole('link', { name: /Title first/ });
    fireEvent.click(await screen.findByRole('button', { name: /load more/i }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Title first/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(await screen.findByRole('link', { name: /Title second/ })).toBeInTheDocument();
    expect(pageCalls).toBe(3);
  });

  test('does not issue duplicate requests when Load more is clicked while pending', async () => {
    let resolveNext!: (value: ReturnType<typeof response>) => void;
    let pageCalls = 0;
    const fetchMock = respondToPage(() => {
      pageCalls += 1;
      if (pageCalls === 1) return response({ tickets: [ticket('first', 'OPEN')], nextCursor: 'cursor-open-1' });
      return new Promise((resolve) => { resolveNext = resolve; });
    });
    global.fetch = fetchMock as typeof fetch;
    render(<MyTicketsPage onLogoutConfirmed={jest.fn()} />);
    await screen.findByRole('link', { name: /Title first/ });
    const loadMore = await screen.findByRole('button', { name: /load more/i });
    fireEvent.click(loadMore);
    fireEvent.click(loadMore);
    expect(pageCalls).toBe(2);
    await act(async () => resolveNext(response({ tickets: [ticket('second', 'OPEN')] })));
    expect(await screen.findByRole('link', { name: /Title second/ })).toBeInTheDocument();
    expect(within(screen.getByRole('main')).getAllByRole('link', { name: /Title second/ })).toHaveLength(1);
  });

  test('does not duplicate the initial Retry request when clicks share a React batch', async () => {
    let pageCalls = 0;
    let resolveRetry!: (value: ReturnType<typeof response>) => void;
    const fetchMock = respondToPage(() => {
      pageCalls += 1;
      if (pageCalls === 1) return response({ message: 'temporary failure' }, 503);
      return new Promise((resolve) => { resolveRetry = resolve; });
    });
    global.fetch = fetchMock as typeof fetch;
    render(<MyTicketsPage onLogoutConfirmed={jest.fn()} />);
    const retry = await screen.findByRole('button', { name: 'Retry' });
    act(() => {
      const click = () => retry.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      click();
      click();
    });
    expect(pageCalls).toBe(2);
    expect(await screen.findByText(/loading open tickets/i)).toBeInTheDocument();
    await act(async () => { resolveRetry(response({ tickets: [ticket('retried', 'OPEN')] })); });
    expect(await screen.findByRole('link', { name: /Title retried/ })).toBeInTheDocument();
  });

  test('ignores stale Open results when the student switches to Closed during a slow request', async () => {
    let resolveOpen!: (value: ReturnType<typeof response>) => void;
    const fetchMock = respondToPage((input) => {
      if (String(input).includes('view=closed')) return Promise.resolve(response({ tickets: [ticket('closed-current', 'CLOSED')] }));
      return new Promise((resolve) => { resolveOpen = resolve; });
    });
    global.fetch = fetchMock as typeof fetch;
    render(<MyTicketsPage onLogoutConfirmed={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Closed' }));
    expect(await screen.findByRole('link', { name: /Title closed-current/ })).toBeInTheDocument();
    await act(async () => { resolveOpen(response({ tickets: [ticket('stale-open', 'OPEN')] })); });
    expect(screen.queryByRole('link', { name: /Title stale-open/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Title closed-current/ })).toBeInTheDocument();
  });

  test('rejects malformed or wrong-view ticket responses and offers a working retry', async () => {
    let pageCalls = 0;
    const fetchMock = respondToPage(() => {
      pageCalls += 1;
      if (pageCalls === 1) return response({ tickets: [ticket('wrong-view', 'CLOSED')] });
      if (pageCalls === 2) return response({ tickets: [{ ...ticket('bad-shape', 'OPEN'), conceptTags: '<script>' }] });
      if (pageCalls === 3) return response({ tickets: [ticket('duplicate', 'OPEN'), ticket('duplicate', 'OPEN')] });
      return response({ tickets: [ticket('safe-retry', 'OPEN')] });
    });
    global.fetch = fetchMock as typeof fetch;
    render(<MyTicketsPage onLogoutConfirmed={jest.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t load your tickets/i);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(pageCalls).toBe(2));
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t load your tickets/i);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(pageCalls).toBe(3));
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t load your tickets/i);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('link', { name: /Title safe-retry/ })).toBeInTheDocument();
    expect(screen.queryByText('<script>')).not.toBeInTheDocument();
  });

  test('renders ticket text literally and exposes a keyboard selected toggle state', async () => {
    const literalTitle = '<script>alert(1)</script>';
    global.fetch = jest.fn().mockResolvedValue(response({ tickets: [ticket('literal', 'OPEN', { title: literalTitle })] })) as typeof fetch;
    render(<MyTicketsPage onLogoutConfirmed={jest.fn()} />);
    expect(await screen.findByText(literalTitle)).toBeInTheDocument();
    const open = screen.getByRole('button', { name: 'Open' });
    const closed = screen.getByRole('button', { name: 'Closed' });
    open.focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(closed);
    await userEvent.keyboard('{Enter}');
    expect(closed).toHaveAttribute('aria-pressed', 'true');
    expect(open).toHaveAttribute('aria-pressed', 'false');
  });

  test('shows a distinct empty state and narrow layouts use a single flexible card column', async () => {
    global.fetch = respondToPage(() => response({ tickets: [] })) as typeof fetch;
    const { container } = render(<MyTicketsPage onLogoutConfirmed={jest.fn()} />);
    expect(await screen.findByText(/no open tickets yet/i)).toBeInTheDocument();
    expect(container.querySelector('.my-tickets-list')).toBeNull();
    const page = container.querySelector('.my-tickets-page');
    expect(page).toHaveClass('student-dashboard');
    expect(container.querySelector('.my-tickets-toggle [aria-pressed="true"]')).toHaveTextContent('Open');
    expect(container.querySelector('.my-tickets-panel')).toBeInTheDocument();
  });

  test('header places My Tickets after Create Ticket for Students only; dashboard retains View all tickets', async () => {
    global.fetch = jest.fn().mockResolvedValue(response({ unreadCount: 0 })) as typeof fetch;
    const { unmount } = render(<AppHeader accountType="STUDENT" activePath="/student/tickets" onLogout={jest.fn()} />);
    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    const links = within(nav).getAllByRole('link');
    expect(links.findIndex((link) => link.textContent === 'My Tickets')).toBe(links.findIndex((link) => link.textContent === 'Create Ticket') + 1);
    expect(within(nav).getByRole('link', { name: 'My Tickets' })).toHaveAttribute('href', '/student/tickets');
    expect(within(nav).getByRole('link', { name: 'My Tickets' })).toHaveAttribute('aria-current', 'page');
    unmount();
    render(<AppHeader accountType="TA" activePath="/ta/queue" onLogout={jest.fn()} />);
    expect(screen.queryByRole('link', { name: 'My Tickets' })).not.toBeInTheDocument();
    const dashboard = render(<StudentDashboard onLogoutConfirmed={jest.fn()} />);
    expect(screen.getByRole('link', { name: 'View all tickets' })).toHaveAttribute('href', '/student/tickets');
    dashboard.unmount();
  });
});
