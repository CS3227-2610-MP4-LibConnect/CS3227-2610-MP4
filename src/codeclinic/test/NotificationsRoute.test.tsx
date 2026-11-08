import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NotificationsRoute from '../src/NotificationsRoute';

const jsonResponse = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

describe('notifications route session and persistent header', () => {
  beforeEach(() => { window.history.replaceState({}, '', '/notifications'); });
  afterEach(() => jest.restoreAllMocks());

  test.each([
    ['STUDENT', '/student/dashboard', ['/student/account', '/notifications']],
    ['TA', '/ta/dashboard', ['/ta/account', '/ta/students', '/notifications']],
  ])('renders verified %s navigation above the inbox', async (role, dashboard, links) => {
    const fetchMock = jest.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/auth/session') return Promise.resolve(jsonResponse({ accountType: role }));
      if (url === '/api/account') return Promise.resolve(jsonResponse({ accountType: role, isManager: false }));
      if (url === '/api/notifications/unread-count') return Promise.resolve(jsonResponse({ unreadCount: 0 }));
      if (url === '/api/notifications') return Promise.resolve(jsonResponse({ notifications: [], nextCursor: null }));
      return Promise.resolve(jsonResponse({}, 500));
    });
    global.fetch = fetchMock as typeof fetch;
    render(<NotificationsRoute />);
    expect(await screen.findByRole('link', { name: 'CodeClinic' })).toHaveAttribute('href', dashboard);
    expect(screen.getByRole('link', { name: /^Notifications(?:,.*)?$/ })).toHaveAttribute('aria-current', 'page');
    links.forEach((href) => expect(document.querySelector(`a[href="${href}"]`)).toBeInTheDocument());
    expect(await screen.findByText(/all caught up/i)).toBeInTheDocument();
  });

  test('does not request account or inbox data before session verification', async () => {
    let resolveSession!: (value: ReturnType<typeof jsonResponse>) => void;
    const pending = new Promise<ReturnType<typeof jsonResponse>>((resolve) => { resolveSession = resolve; });
    const fetchMock = jest.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/auth/session') return pending;
      if (url === '/api/notifications/unread-count') return Promise.resolve(jsonResponse({ unreadCount: 0 }));
      if (url === '/api/notifications') return Promise.resolve(jsonResponse({ notifications: [], nextCursor: null }));
      return Promise.resolve(jsonResponse({}, 500));
    });
    global.fetch = fetchMock as typeof fetch;
    render(<NotificationsRoute />);
    expect(screen.getByText(/checking your session/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/session', { credentials: 'same-origin' });
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual(['/api/auth/session']);
    resolveSession(jsonResponse({ accountType: 'STUDENT' }));
    await waitFor(() => expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual(expect.arrayContaining(['/api/notifications/unread-count', '/api/notifications'])));
  });

  test('fails closed on an unknown role without requesting inbox data', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse({ accountType: 'COORDINATOR' }));
    global.fetch = fetchMock as typeof fetch;
    render(<NotificationsRoute />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load notifications/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('link', { name: /notifications/i })).not.toBeInTheDocument();
  });

  test('TA manager lookup failure preserves ordinary links and hides coordinator link', async () => {
    const fetchMock = jest.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/auth/session') return Promise.resolve(jsonResponse({ accountType: 'TA' }));
      if (url === '/api/account') return Promise.resolve(jsonResponse({}, 503));
      if (url === '/api/notifications/unread-count') return Promise.resolve(jsonResponse({ unreadCount: 0 }));
      if (url === '/api/notifications') return Promise.resolve(jsonResponse({ notifications: [], nextCursor: null }));
      return Promise.resolve(jsonResponse({}, 500));
    });
    global.fetch = fetchMock as typeof fetch;
    render(<NotificationsRoute />);
    expect(await screen.findByRole('link', { name: 'CodeClinic' })).toHaveAttribute('href', '/ta/dashboard');
    expect(document.querySelector('a[href="/ta/account"]')).toBeInTheDocument();
    expect(document.querySelector('a[href="/ta/students"]')).toBeInTheDocument();
    expect(document.querySelector('a[href="/ta/tas"]')).not.toBeInTheDocument();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  test('shows coordinator navigation only after a matching TA account confirms manager status', async () => {
    const fetchMock = jest.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/auth/session') return Promise.resolve(jsonResponse({ accountType: 'TA' }));
      if (url === '/api/account') return Promise.resolve(jsonResponse({ accountType: 'TA', isManager: true }));
      if (url === '/api/notifications/unread-count') return Promise.resolve(jsonResponse({ unreadCount: 0 }));
      if (url === '/api/notifications') return Promise.resolve(jsonResponse({ notifications: [], nextCursor: null }));
      return Promise.resolve(jsonResponse({}, 500));
    });
    global.fetch = fetchMock as typeof fetch;
    render(<NotificationsRoute />);
    expect(await screen.findByRole('link', { name: 'TAs' })).toHaveAttribute('href', '/ta/tas');
  });

  test('manager retry keeps verified header and inbox mounted while lookup is pending', async () => {
    let resolveRetry!: (response: ReturnType<typeof jsonResponse>) => void;
    let accountCalls = 0;
    const fetchMock = jest.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/auth/session') return Promise.resolve(jsonResponse({ accountType: 'TA' }));
      if (url === '/api/account') {
        accountCalls += 1;
        if (accountCalls === 1) return Promise.resolve(jsonResponse({}, 503));
        return new Promise<ReturnType<typeof jsonResponse>>((resolve) => { resolveRetry = resolve; });
      }
      if (url === '/api/notifications/unread-count') return Promise.resolve(jsonResponse({ unreadCount: 0 }));
      if (url === '/api/notifications') return Promise.resolve(jsonResponse({ notifications: [], nextCursor: null }));
      return Promise.resolve(jsonResponse({}, 500));
    });
    global.fetch = fetchMock as typeof fetch;
    render(<NotificationsRoute />);
    expect(await screen.findByText(/all caught up/i)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: /retry coordinator access/i }));
    await waitFor(() => expect(accountCalls).toBe(2));
    expect(screen.getByRole('link', { name: 'CodeClinic' })).toHaveAttribute('href', '/ta/dashboard');
    expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'TAs' })).not.toBeInTheDocument();
    resolveRetry(jsonResponse({ accountType: 'TA', isManager: true }));
    expect(await screen.findByRole('link', { name: 'TAs' })).toBeInTheDocument();
  });

  test('retains the header during inbox loading and a failed mark-read action', async () => {
    let resolveInbox!: (response: ReturnType<typeof jsonResponse>) => void;
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/auth/session') return Promise.resolve(jsonResponse({ accountType: 'STUDENT' }));
      if (url === '/api/notifications/unread-count') return Promise.resolve(jsonResponse({ unreadCount: 1 }));
      if (url === '/api/notifications') return new Promise<ReturnType<typeof jsonResponse>>((resolve) => { resolveInbox = resolve; });
      if (url === '/api/auth/csrf') return Promise.resolve(jsonResponse({ csrfToken: 'test-token' }));
      if (url === '/api/notifications/item-1/read' && init?.method === 'POST') return Promise.resolve(jsonResponse({}, 503));
      return Promise.resolve(jsonResponse({}, 500));
    });
    global.fetch = fetchMock as typeof fetch;
    render(<NotificationsRoute />);
    expect(await screen.findByRole('link', { name: 'CodeClinic' })).toHaveAttribute('href', '/student/dashboard');
    expect(screen.getByText(/loading notifications/i)).toBeInTheDocument();
    resolveInbox(jsonResponse({ notifications: [{ notificationId: 'item-1', notificationType: 'TICKET_REPLY', ticketId: 'ticket-1', message: 'A reply arrived', createdAt: null, read: false }], nextCursor: null }));
    fireEvent.click(await screen.findByRole('button', { name: /mark as read/i }));
    expect(await screen.findByText(/could not mark this notification as read/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'CodeClinic' })).toHaveAttribute('href', '/student/dashboard');
    expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument();
  });

  test('hides inbox content while logout is pending and keeps it hidden after unconfirmed logout', async () => {
    let resolveCsrf!: (response: ReturnType<typeof jsonResponse>) => void;
    const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/auth/session') return Promise.resolve(jsonResponse({ accountType: 'STUDENT' }));
      if (url === '/api/notifications/unread-count') return Promise.resolve(jsonResponse({ unreadCount: 0 }));
      if (url === '/api/notifications') return Promise.resolve(jsonResponse({ notifications: [], nextCursor: null }));
      if (url === '/api/auth/csrf' && init?.method === 'GET') return new Promise<ReturnType<typeof jsonResponse>>((resolve) => { resolveCsrf = resolve; });
      if (url === '/api/auth/logout') return Promise.resolve(jsonResponse({}, 503));
      return Promise.resolve(jsonResponse({}, 500));
    });
    global.fetch = fetchMock as typeof fetch;
    render(<NotificationsRoute />);
    expect(await screen.findByText(/all caught up/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /log out/i }));
    expect(await screen.findByText(/signing out/i)).toBeInTheDocument();
    expect(screen.queryByText(/all caught up/i)).not.toBeInTheDocument();
    resolveCsrf(jsonResponse({ csrfToken: 'test-token' }));
    expect(await screen.findByRole('button', { name: /retry logout/i })).toBeInTheDocument();
    expect(screen.queryByText(/all caught up/i)).not.toBeInTheDocument();
    expect(window.location.pathname).toBe('/notifications');
  });

  test('keeps the header visible when the inbox request fails', async () => {
    const fetchMock = jest.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/auth/session') return Promise.resolve(jsonResponse({ accountType: 'STUDENT' }));
      if (url === '/api/notifications/unread-count') return Promise.resolve(jsonResponse({ unreadCount: 0 }));
      if (url === '/api/notifications') return Promise.reject(new Error('offline'));
      return Promise.resolve(jsonResponse({}, 500));
    });
    global.fetch = fetchMock as typeof fetch;
    render(<NotificationsRoute />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t load/i);
    expect(screen.getByRole('link', { name: 'CodeClinic' })).toHaveAttribute('href', '/student/dashboard');
  });

  test.each([
    ['unauthenticated', jsonResponse({}, 401)],
    ['forced-password', jsonResponse({ accountType: 'STUDENT', mustChangePassword: true })],
  ])('%s session cannot trigger account, unread-count, or inbox requests', async (_label, sessionResponse) => {
    const fetchMock = jest.fn((input: RequestInfo | URL) => {
      if (String(input) === '/api/auth/session') return Promise.resolve(sessionResponse);
      return Promise.resolve(jsonResponse({}, 500));
    });
    global.fetch = fetchMock as typeof fetch;
    const navigationError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<NotificationsRoute />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/auth/session', { credentials: 'same-origin' }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    const requestedUrls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(requestedUrls).toEqual(['/api/auth/session']);
    expect(requestedUrls).not.toContain('/api/account');
    expect(requestedUrls).not.toContain('/api/notifications/unread-count');
    expect(requestedUrls).not.toContain('/api/notifications');
    navigationError.mockRestore();
  });
});
