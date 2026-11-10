import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudentDashboard } from '../src/StudentDashboard';

let appTree: React.ReactNode;
beforeAll(() => {
  document.body.innerHTML = '<div id="root"></div>';
  jest.doMock('react-dom/client', () => ({ createRoot: () => ({ render: (tree: React.ReactNode) => { appTree = tree; } }) }));
  require('../src/index');
  jest.dontMock('react-dom/client');
});

const response = (status: number, body: unknown = {}) => ({ status, ok: status >= 200 && status < 300, json: async () => body });

describe('Student ticket activity pages', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    window.history.replaceState({}, '', '/');
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  test('dashboard shows the latest five active summaries and provides My Tickets navigation', async () => {
    const tickets = Array.from({ length: 6 }, (_, index) => ({
      ticketId: `ticket-${index}`, title: `Ticket ${index}`, language: 'TypeScript',
      conceptTags: index === 0 ? ['loops', 'arrays'] : [], status: index === 1 ? 'CLAIMED' : 'OPEN',
    }));
    global.fetch = jest.fn().mockImplementation((url: RequestInfo | URL) => {
      if (url === '/api/auth/session') return Promise.resolve(response(200, { accountType: 'STUDENT' }));
      if (url === '/api/tickets/active') return Promise.resolve(response(200, { tickets: tickets.slice(0, 5) }));
      if (url === '/api/notifications/unread-count') return Promise.resolve(response(200, { unreadCount: 0 }));
      return Promise.resolve(response(404));
    }) as typeof fetch;
    window.history.replaceState({}, '', '/student/dashboard');
    render(appTree as React.ReactElement);
    expect(await screen.findByRole('region', { name: /active tickets/i })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /ticket 0/i })).toHaveAttribute('href', '/student/tickets/ticket-0');
    expect(screen.getByText('loops, arrays')).toBeInTheDocument();
    expect(screen.getAllByText('No concept tags')).toHaveLength(4);
    expect(screen.getByText(/Claimed/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /load all/i })).toHaveAttribute('href', '/student/tickets');
    expect(screen.queryByRole('link', { name: /ticket 5/i })).not.toBeInTheDocument();
  });

  test('dashboard shows a loading state before active tickets arrive and a distinct empty state', async () => {
    let resolveTickets!: (value: ReturnType<typeof response>) => void;
    const pending = new Promise<ReturnType<typeof response>>((resolve) => { resolveTickets = resolve; });
    global.fetch = jest.fn().mockImplementation((url: RequestInfo | URL) => {
      if (url === '/api/auth/session') return Promise.resolve(response(200, { accountType: 'STUDENT' }));
      if (url === '/api/notifications/unread-count') return Promise.resolve(response(200, { unreadCount: 0 }));
      if (url === '/api/tickets/active') return pending;
      return Promise.resolve(response(404));
    }) as typeof fetch;
    window.history.replaceState({}, '', '/student/dashboard');
    render(appTree as React.ReactElement);
    expect(await screen.findByText(/loading active tickets/i)).toBeInTheDocument();
    await act(async () => { resolveTickets(response(200, { tickets: [] })); });
    expect(await screen.findByText(/no active tickets yet/i)).toBeInTheDocument();
  });

  test('My Tickets direct visits verify Student access before showing the protected placeholder', async () => {
    let resolveSession!: (value: ReturnType<typeof response>) => void;
    const pending = new Promise<ReturnType<typeof response>>((resolve) => { resolveSession = resolve; });
    const fetchMock = jest.fn().mockImplementation((url: RequestInfo | URL) => {
      if (url === '/api/auth/session') return pending;
      if (url === '/api/notifications/unread-count') return Promise.resolve(response(200, { unreadCount: 0 }));
      return Promise.resolve(response(404));
    });
    global.fetch = fetchMock as typeof fetch;
    window.history.replaceState({}, '', '/student/tickets');
    render(appTree as React.ReactElement);
    expect(screen.getByText(/checking your session/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /my tickets/i })).not.toBeInTheDocument();
    await act(async () => { resolveSession(response(200, { accountType: 'STUDENT' })); });
    expect(await screen.findByRole('heading', { name: /my tickets/i })).toBeInTheDocument();
    expect(screen.getByText(/full ticket list coming later/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to student dashboard/i })).toHaveAttribute('href', '/student/dashboard');
    expect(fetchMock).not.toHaveBeenCalledWith('/api/tickets/active', expect.anything());
  });

  test('does not show My Tickets to a visitor', async () => {
    global.fetch = jest.fn().mockResolvedValue(response(401)) as typeof fetch;
    window.history.replaceState({}, '', '/student/tickets');
    render(appTree as React.ReactElement);
    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(screen.queryByRole('heading', { name: /my tickets/i })).not.toBeInTheDocument();
  });

  test('does not show My Tickets to a TA', async () => {
    global.fetch = jest.fn().mockResolvedValue(response(200, { accountType: 'TA' })) as typeof fetch;
    window.history.replaceState({}, '', '/student/tickets');
    render(appTree as React.ReactElement);
    expect(await screen.findByRole('heading', { name: /access denied/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /my tickets/i })).not.toBeInTheDocument();
  });

  test('dashboard distinguishes failed active-ticket loads from an empty state and can retry', async () => {
    let activeRequestCount = 0;
    const fetchMock = jest.fn().mockImplementation((url: RequestInfo | URL) => {
      if (url === '/api/auth/session') return Promise.resolve(response(200, { accountType: 'STUDENT' }));
      if (url === '/api/notifications/unread-count') return Promise.resolve(response(200, { unreadCount: 0 }));
      if (url === '/api/tickets/active') {
        activeRequestCount += 1;
        return Promise.resolve(activeRequestCount === 1 ? response(503) : response(200, { tickets: [] }));
      }
      return Promise.resolve(response(404));
    });
    global.fetch = fetchMock as typeof fetch;
    window.history.replaceState({}, '', '/student/dashboard');
    render(appTree as React.ReactElement);
    const retry = await screen.findByRole('button', { name: /retry/i });
    expect(screen.queryByText(/no active tickets/i)).not.toBeInTheDocument();
    fireEvent.click(retry);
    expect(await screen.findByText(/no active tickets/i)).toBeInTheDocument();
  });

  test('deep-linked ticket detail waits for Student verification and renders reply text literally', async () => {
    global.fetch = jest.fn().mockImplementation((url: RequestInfo | URL) => {
      if (url === '/api/auth/session') return Promise.resolve(response(200, { accountType: 'STUDENT' }));
      if (url === '/api/notifications/unread-count') return Promise.resolve(response(200, { unreadCount: 0 }));
      if (url === '/api/tickets/ticket-1') return Promise.resolve(response(200, {
        ticket: { ticketId: 'ticket-1', title: '<script>literal</script>', status: 'OPEN', language: 'Python', conceptTags: [], expectedBehaviour: 'Expected', actualBehaviour: 'Actual', attempted: 'Tried', repoUrl: 'javascript:alert(1)', createdAt: '2026-11-09T00:00:00Z', updatedAt: '2026-11-09T00:00:00Z' },
        replies: [{ replyId: 'r1', author: { name: 'Student', role: 'STUDENT' }, createdAt: '2026-11-09T00:00:00Z', message: '<img src=x onerror=alert(1)>' }],
      }));
      return Promise.resolve(response(404));
    }) as typeof fetch;
    window.history.replaceState({}, '', '/student/tickets/ticket-1');
    render(appTree as React.ReactElement);
    expect(await screen.findByRole('heading', { name: '<script>literal</script>' })).toBeInTheDocument();
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(screen.getByText('javascript:alert(1)')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'javascript:alert(1)' })).not.toBeInTheDocument();
    const renderedApp = document.body.lastElementChild as HTMLElement;
    expect(renderedApp.querySelector('script')).toBeNull();
  });

  test('loads the next reply block and keeps a missing owner author labeled as a Student', async () => {
    const fetchMock = jest.fn().mockImplementation((url: RequestInfo | URL) => {
      if (url === '/api/auth/session') return Promise.resolve(response(200, { accountType: 'STUDENT' }));
      if (url === '/api/notifications/unread-count') return Promise.resolve(response(200, { unreadCount: 0 }));
      if (String(url).startsWith('/api/tickets/ticket-1')) {
        return Promise.resolve(!String(url).includes('cursor=')
          ? response(200, { ticket: { ticketId: 'ticket-1', title: 'Issue', status: 'OPEN', language: 'Python', conceptTags: [], expectedBehaviour: '', actualBehaviour: '', attempted: '' }, replies: [
            { replyId: 'r50', author: { name: '[deleted account]', role: 'STUDENT' }, message: 'last in block', createdAt: '2026-11-09T00:00:00Z' },
          ], nextCursor: 'opaque-cursor' })
          : response(200, { ticket: { ticketId: 'ticket-1', title: 'Issue', status: 'OPEN', language: 'Python', conceptTags: [], expectedBehaviour: '', actualBehaviour: '', attempted: '' }, replies: [
            { replyId: 'r51', author: { name: 'TA', role: 'TA' }, message: 'next block', createdAt: '2026-11-09T00:00:00Z' },
          ] }));
      }
      return Promise.resolve(response(404));
    });
    global.fetch = fetchMock as typeof fetch;
    window.history.replaceState({}, '', '/student/tickets/ticket-1');
    render(appTree as React.ReactElement);
    expect(await screen.findByText('last in block')).toBeInTheDocument();
    expect(screen.getByText('[deleted account]')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: /load more replies/i }));
    expect(await screen.findByText('next block')).toBeInTheDocument();
    expect(screen.getByText('last in block')).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('cursor=')).length).toBe(1);
  });

  test('reply submit is single-flight and retains text after a failed response', async () => {
    let resolveReply!: (value: ReturnType<typeof response>) => void;
    const pending = new Promise<ReturnType<typeof response>>((resolve) => { resolveReply = resolve; });
    const fetchMock = jest.fn().mockImplementation((url: RequestInfo | URL) => {
      if (url === '/api/auth/session') return Promise.resolve(response(200, { accountType: 'STUDENT' }));
      if (url === '/api/auth/csrf') return Promise.resolve(response(200, { csrfToken: 'synthetic-csrf' }));
      if (url === '/api/notifications/unread-count') return Promise.resolve(response(200, { unreadCount: 0 }));
      if (url === '/api/tickets/ticket-1') return Promise.resolve(response(200, { ticket: { ticketId: 'ticket-1', title: 'Issue', status: 'OPEN', language: 'Python', conceptTags: [], expectedBehaviour: '', actualBehaviour: '', attempted: '' }, replies: [] }));
      if (String(url).endsWith('/replies')) return pending;
      return Promise.resolve(response(404));
    });
    global.fetch = fetchMock as typeof fetch;
    window.history.replaceState({}, '', '/student/tickets/ticket-1');
    render(appTree as React.ReactElement);
    const input = await screen.findByRole('textbox', { name: /reply/i });
    fireEvent.change(input, { target: { value: 'I tried this.' } });
    const submit = screen.getByRole('button', { name: /send reply/i });
    fireEvent.click(submit);
    await waitFor(() => expect(submit).toBeDisabled());
    fireEvent.click(submit);
    await act(async () => { resolveReply(response(503)); });
    expect(input).toHaveValue('I tried this.');
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  test('closing confirms terminal state and disables reply and close controls', async () => {
    const fetchMock = jest.fn().mockImplementation((url: RequestInfo | URL, init?: RequestInit) => {
      if (url === '/api/auth/session') return Promise.resolve(response(200, { accountType: 'STUDENT' }));
      if (url === '/api/auth/csrf') return Promise.resolve(response(200, { csrfToken: 'synthetic-csrf' }));
      if (url === '/api/notifications/unread-count') return Promise.resolve(response(200, { unreadCount: 0 }));
      if (url === '/api/tickets/ticket-1') return Promise.resolve(response(200, { ticket: { ticketId: 'ticket-1', title: 'Issue', status: 'OPEN', language: 'Python', conceptTags: [], expectedBehaviour: '', actualBehaviour: '', attempted: '' }, replies: [] }));
      if (String(url).endsWith('/close') && init?.method === 'POST') return Promise.resolve(response(200, { status: 'CLOSED', updatedAt: '2026-11-10T00:00:00Z' }));
      return Promise.resolve(response(404));
    });
    global.fetch = fetchMock as typeof fetch;
    window.history.replaceState({}, '', '/student/tickets/ticket-1');
    render(appTree as React.ReactElement);
    fireEvent.click(await screen.findByRole('button', { name: 'Close Ticket' }));
    expect(await screen.findByRole('status')).toHaveTextContent(/closed without a resolution/i);
    expect(screen.getByText('CLOSED')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ticket closed/i })).toBeDisabled();
    expect(screen.queryByRole('textbox', { name: 'Reply' })).not.toBeInTheDocument();
  });

  test('a close conflict refreshes the ticket and reports the changed state', async () => {
    let detailCalls = 0;
    const fetchMock = jest.fn().mockImplementation((url: RequestInfo | URL, init?: RequestInit) => {
      if (url === '/api/auth/session') return Promise.resolve(response(200, { accountType: 'STUDENT' }));
      if (url === '/api/auth/csrf') return Promise.resolve(response(200, { csrfToken: 'synthetic-csrf' }));
      if (url === '/api/notifications/unread-count') return Promise.resolve(response(200, { unreadCount: 0 }));
      if (url === '/api/tickets/ticket-1') {
        detailCalls += 1;
        const status = detailCalls <= 2 ? 'CLAIMED' : 'RESOLVED';
        return Promise.resolve(response(200, { ticket: { ticketId: 'ticket-1', title: 'Issue', status, language: 'Python', conceptTags: [], expectedBehaviour: '', actualBehaviour: '', attempted: '', fixNote: 'Solved' }, replies: [] }));
      }
      if (String(url).endsWith('/close') && init?.method === 'POST') return Promise.resolve(response(409));
      return Promise.resolve(response(404));
    });
    global.fetch = fetchMock as typeof fetch;
    window.history.replaceState({}, '', '/student/tickets/ticket-1');
    render(appTree as React.ReactElement);
    fireEvent.click(await screen.findByRole('button', { name: 'Close Ticket' }));
    expect(await screen.findByText('RESOLVED')).toBeInTheDocument();
    expect(await screen.findByRole('status')).toHaveTextContent(/changed before it could be closed/i);
    expect(screen.getByText('Solved')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close Ticket' })).not.toBeInTheDocument();
  });

  test('a failed refresh after a close conflict keeps close disabled until a successful refresh', async () => {
    let closeAttempted = false;
    let refreshCalls = 0;
    const fetchMock = jest.fn().mockImplementation((url: RequestInfo | URL, init?: RequestInit) => {
      if (url === '/api/auth/session') return Promise.resolve(response(200, { accountType: 'STUDENT' }));
      if (url === '/api/auth/csrf') return Promise.resolve(response(200, { csrfToken: 'synthetic-csrf' }));
      if (url === '/api/notifications/unread-count') return Promise.resolve(response(200, { unreadCount: 0 }));
      if (url === '/api/tickets/ticket-1') {
        if (!closeAttempted) return Promise.resolve(response(200, { ticket: { ticketId: 'ticket-1', title: 'Issue', status: 'CLAIMED', language: 'Python', conceptTags: [], expectedBehaviour: '', actualBehaviour: '', attempted: '' }, replies: [] }));
        refreshCalls += 1;
        if (refreshCalls === 1) return Promise.resolve(response(503));
        return Promise.resolve(response(200, { ticket: { ticketId: 'ticket-1', title: 'Issue', status: 'OPEN', language: 'Python', conceptTags: [], expectedBehaviour: '', actualBehaviour: '', attempted: '' }, replies: [] }));
      }
      if (String(url).endsWith('/close') && init?.method === 'POST') {
        closeAttempted = true;
        return Promise.resolve(response(409));
      }
      return Promise.resolve(response(404));
    });
    global.fetch = fetchMock as typeof fetch;
    window.history.replaceState({}, '', '/student/tickets/ticket-1');
    render(appTree as React.ReactElement);
    fireEvent.click(await screen.findByRole('button', { name: 'Close Ticket' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t load this ticket/i);
    const close = screen.getByRole('button', { name: 'Close Ticket' });
    expect(close).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /refresh ticket status/i }));
    expect(await screen.findByText('OPEN')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Close Ticket' })).toBeEnabled());
  });

  test('a lost close response is unconfirmed and offers a status refresh', async () => {
    let closeAttempted = false;
    let refreshCalls = 0;
    const fetchMock = jest.fn().mockImplementation((url: RequestInfo | URL, init?: RequestInit) => {
      if (url === '/api/auth/session') return Promise.resolve(response(200, { accountType: 'STUDENT' }));
      if (url === '/api/auth/csrf') return Promise.resolve(response(200, { csrfToken: 'synthetic-csrf' }));
      if (url === '/api/notifications/unread-count') return Promise.resolve(response(200, { unreadCount: 0 }));
      if (url === '/api/tickets/ticket-1') {
        if (!closeAttempted) return Promise.resolve(response(200, { ticket: { ticketId: 'ticket-1', title: 'Issue', status: 'OPEN', language: 'Python', conceptTags: [], expectedBehaviour: '', actualBehaviour: '', attempted: '' }, replies: [] }));
        refreshCalls += 1;
        if (refreshCalls === 1) return Promise.resolve(response(503));
        const status = 'CLOSED';
        return Promise.resolve(response(200, { ticket: { ticketId: 'ticket-1', title: 'Issue', status, language: 'Python', conceptTags: [], expectedBehaviour: '', actualBehaviour: '', attempted: '' }, replies: [] }));
      }
      if (String(url).endsWith('/close') && init?.method === 'POST') {
        closeAttempted = true;
        return Promise.reject(new Error('connection lost after server commit'));
      }
      return Promise.resolve(response(404));
    });
    global.fetch = fetchMock as typeof fetch;
    window.history.replaceState({}, '', '/student/tickets/ticket-1');
    render(appTree as React.ReactElement);
    fireEvent.click(await screen.findByRole('button', { name: 'Close Ticket' }));
    expect(await screen.findByRole('status')).toHaveTextContent(/couldn’t confirm whether this ticket was closed/i);
    expect(screen.queryByText(/current state is unchanged/i)).not.toBeInTheDocument();
    const close = screen.getByRole('button', { name: 'Close Ticket' });
    expect(close).toBeDisabled();
    fireEvent.click(close);
    expect(fetchMock.mock.calls.filter(([url, init]) => String(url).endsWith('/close') && init?.method === 'POST')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /refresh ticket status/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t load this ticket/i);
    expect(close).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /refresh ticket status/i }));
    expect(await screen.findByText('CLOSED')).toBeInTheDocument();
    expect(await screen.findByRole('status')).toHaveTextContent(/status has been refreshed/i);
    expect(screen.getByRole('button', { name: /ticket closed/i })).toBeDisabled();
  });

  test('a successful active status refresh restores the close action after a lost response', async () => {
    let closeAttempted = false;
    let refreshCalls = 0;
    const fetchMock = jest.fn().mockImplementation((url: RequestInfo | URL, init?: RequestInit) => {
      if (url === '/api/auth/session') return Promise.resolve(response(200, { accountType: 'STUDENT' }));
      if (url === '/api/auth/csrf') return Promise.resolve(response(200, { csrfToken: 'synthetic-csrf' }));
      if (url === '/api/notifications/unread-count') return Promise.resolve(response(200, { unreadCount: 0 }));
      if (url === '/api/tickets/ticket-1') {
        if (!closeAttempted) return Promise.resolve(response(200, { ticket: { ticketId: 'ticket-1', title: 'Issue', status: 'OPEN', language: 'Python', conceptTags: [], expectedBehaviour: '', actualBehaviour: '', attempted: '' }, replies: [] }));
        refreshCalls += 1;
        const status = refreshCalls > 0 ? 'CLAIMED' : 'OPEN';
        return Promise.resolve(response(200, { ticket: { ticketId: 'ticket-1', title: 'Issue', status, language: 'Python', conceptTags: [], expectedBehaviour: '', actualBehaviour: '', attempted: '' }, replies: [] }));
      }
      if (String(url).endsWith('/close') && init?.method === 'POST') {
        closeAttempted = true;
        return Promise.reject(new Error('connection lost'));
      }
      return Promise.resolve(response(404));
    });
    global.fetch = fetchMock as typeof fetch;
    window.history.replaceState({}, '', '/student/tickets/ticket-1');
    render(appTree as React.ReactElement);
    fireEvent.click(await screen.findByRole('button', { name: 'Close Ticket' }));
    expect(await screen.findByRole('status')).toHaveTextContent(/couldn’t confirm/i);
    expect(screen.getByRole('button', { name: 'Close Ticket' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /refresh ticket status/i }));
    expect(await screen.findByText('CLAIMED')).toBeInTheDocument();
    expect(await screen.findByRole('status')).toHaveTextContent(/status has been refreshed/i);
    expect(screen.getByRole('button', { name: 'Close Ticket' })).toBeEnabled();
    expect(closeAttempted).toBe(true);
  });

  test('a failed reply block keeps loaded content and retries that block', async () => {
    let cursorCalls = 0;
    const fetchMock = jest.fn().mockImplementation((url: RequestInfo | URL) => {
      if (url === '/api/auth/session') return Promise.resolve(response(200, { accountType: 'STUDENT' }));
      if (url === '/api/notifications/unread-count') return Promise.resolve(response(200, { unreadCount: 0 }));
      if (String(url).startsWith('/api/tickets/ticket-1')) {
        if (!String(url).includes('cursor=')) return Promise.resolve(response(200, { ticket: { ticketId: 'ticket-1', title: 'Issue', status: 'OPEN', language: 'Python', conceptTags: [], expectedBehaviour: '', actualBehaviour: '', attempted: '' }, replies: [
          { replyId: 'r1', author: { name: 'Student', role: 'STUDENT' }, message: 'already loaded', createdAt: '2026-11-09T00:00:00Z' },
        ], nextCursor: 'next-block' }));
        cursorCalls += 1;
        if (cursorCalls === 1) return Promise.resolve(response(503));
        return Promise.resolve(response(200, { ticket: { ticketId: 'ticket-1', title: 'Issue', status: 'OPEN', language: 'Python', conceptTags: [], expectedBehaviour: '', actualBehaviour: '', attempted: '' }, replies: [
          { replyId: 'r2', author: { name: 'TA', role: 'TA' }, message: 'retried reply', createdAt: '2026-11-09T00:01:00Z' },
        ] }));
      }
      return Promise.resolve(response(404));
    });
    global.fetch = fetchMock as typeof fetch;
    window.history.replaceState({}, '', '/student/tickets/ticket-1');
    render(appTree as React.ReactElement);
    expect(await screen.findByText('already loaded')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: /load more replies/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/loaded replies are still here/i);
    expect(screen.getByText('already loaded')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('retried reply')).toBeInTheDocument();
    expect(screen.getByText('already loaded')).toBeInTheDocument();
    expect(cursorCalls).toBe(2);
  });

  test('keyboard tab order can reach the reply and close actions', async () => {
    global.fetch = jest.fn().mockImplementation((url: RequestInfo | URL) => {
      if (url === '/api/auth/session') return Promise.resolve(response(200, { accountType: 'STUDENT' }));
      if (url === '/api/notifications/unread-count') return Promise.resolve(response(200, { unreadCount: 0 }));
      if (url === '/api/tickets/ticket-1') return Promise.resolve(response(200, { ticket: { ticketId: 'ticket-1', title: 'Issue', status: 'OPEN', language: 'Python', conceptTags: [], expectedBehaviour: '', actualBehaviour: '', attempted: '' }, replies: [] }));
      return Promise.resolve(response(404));
    }) as typeof fetch;
    window.history.replaceState({}, '', '/student/tickets/ticket-1');
    render(appTree as React.ReactElement);
    const reply = await screen.findByRole('textbox', { name: 'Reply' });
    const close = screen.getByRole('button', { name: 'Close Ticket' });
    let reachedReply = false;
    let reachedClose = false;
    for (let index = 0; index < 20 && !reachedClose; index += 1) {
      await userEvent.tab();
      reachedReply ||= document.activeElement === reply;
      reachedClose ||= document.activeElement === close;
    }
    expect(reachedReply).toBe(true);
    expect(reachedClose).toBe(true);
  });
});
