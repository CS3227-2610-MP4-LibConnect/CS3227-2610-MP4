import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

let mockAppTree: React.ReactNode;

beforeAll(() => {
  document.body.innerHTML = '<div id="root"></div>';
  jest.doMock('react-dom/client', () => ({
    createRoot: () => ({ render: (tree: React.ReactNode) => { mockAppTree = tree; } }),
  }));
  require('../src/index');
  jest.dontMock('react-dom/client');
});

function renderAppAt(path: string, fetchMock: jest.Mock) {
  window.history.replaceState({}, '', path);
  global.fetch = fetchMock as typeof fetch;
  return render(mockAppTree as React.ReactElement);
}

function sessionResponse(status: number, accountType?: string) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => accountType ? { accountType } : {},
  };
}

describe('dashboard route session guard and logout', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    window.history.replaceState({}, '', '/');
    window.localStorage.clear();
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  test.each([
    ['/member/dashboard', 'MEMBER'],
    ['/librarian/dashboard', 'LIBRARIAN'],
  ])('revalidates the server session before rendering %s', async (path, accountType) => {
    const fetchMock = jest.fn().mockResolvedValue(sessionResponse(200, accountType));
    renderAppAt(path, fetchMock);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/auth/session', expect.anything()));
    expect(await screen.findByRole('heading', { name: new RegExp(`${accountType} Dashboard`, 'i') })).toBeInTheDocument();
  });

  test('rechecks the session after a member-to-librarian route transition and hides content while checking', async () => {
    let resolveTransition!: (response: ReturnType<typeof sessionResponse>) => void;
    const transitionResponse = new Promise<ReturnType<typeof sessionResponse>>((resolve) => {
      resolveTransition = resolve;
    });
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(sessionResponse(200, 'MEMBER'))
      .mockReturnValueOnce(transitionResponse);
    renderAppAt('/member/dashboard', fetchMock);

    expect(await screen.findByRole('heading', { name: /member dashboard/i })).toBeInTheDocument();
    act(() => {
      window.history.pushState({}, '', '/librarian/dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.getByText(/checking your session/i)).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('heading', { name: /librarian dashboard/i })).not.toBeInTheDocument();

    await act(async () => { resolveTransition(sessionResponse(200, 'LIBRARIAN')); });
    expect(await screen.findByRole('heading', { name: /librarian dashboard/i })).toBeInTheDocument();
  });

  test('ignores an older member response after the librarian route check succeeds', async () => {
    let resolveMember!: (response: ReturnType<typeof sessionResponse>) => void;
    const memberResponse = new Promise<ReturnType<typeof sessionResponse>>((resolve) => {
      resolveMember = resolve;
    });
    const fetchMock = jest.fn()
      .mockReturnValueOnce(memberResponse)
      .mockResolvedValueOnce(sessionResponse(200, 'LIBRARIAN'));
    renderAppAt('/member/dashboard', fetchMock);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    act(() => {
      window.history.pushState({}, '', '/librarian/dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(await screen.findByRole('heading', { name: /librarian dashboard/i })).toBeInTheDocument();

    await act(async () => { resolveMember(sessionResponse(200, 'MEMBER')); });
    expect(screen.getByRole('heading', { name: /librarian dashboard/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /access denied/i })).not.toBeInTheDocument();
  });

  test('ignores an older 401 after the current route check succeeds', async () => {
    let resolveMember!: (response: ReturnType<typeof sessionResponse>) => void;
    const memberResponse = new Promise<ReturnType<typeof sessionResponse>>((resolve) => {
      resolveMember = resolve;
    });
    const fetchMock = jest.fn()
      .mockReturnValueOnce(memberResponse)
      .mockResolvedValueOnce(sessionResponse(200, 'LIBRARIAN'));
    renderAppAt('/member/dashboard', fetchMock);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    act(() => {
      window.history.pushState({}, '', '/librarian/dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(await screen.findByRole('heading', { name: /librarian dashboard/i })).toBeInTheDocument();

    await act(async () => { resolveMember(sessionResponse(401)); });
    expect(window.location.pathname).toBe('/librarian/dashboard');
    expect(screen.getByRole('heading', { name: /librarian dashboard/i })).toBeInTheDocument();
  });

  test('invalidates a pending check when leaving and revisiting the same dashboard route', async () => {
    let resolveFirstVisit!: (response: ReturnType<typeof sessionResponse>) => void;
    const firstVisitResponse = new Promise<ReturnType<typeof sessionResponse>>((resolve) => {
      resolveFirstVisit = resolve;
    });
    const fetchMock = jest.fn()
      .mockReturnValueOnce(firstVisitResponse)
      .mockResolvedValueOnce(sessionResponse(200, 'MEMBER'));
    renderAppAt('/member/dashboard', fetchMock);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    act(() => {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();

    act(() => {
      window.history.pushState({}, '', '/member/dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(await screen.findByRole('heading', { name: /member dashboard/i })).toBeInTheDocument();

    await act(async () => { resolveFirstVisit(sessionResponse(401)); });
    expect(window.location.pathname).toBe('/member/dashboard');
    expect(screen.getByRole('heading', { name: /member dashboard/i })).toBeInTheDocument();
  });

  test.each(['/member/dashboard', '/librarian/dashboard'])(
    'redirects an unauthenticated direct visit from %s without rendering its dashboard', async (path) => {
      const fetchMock = jest.fn().mockResolvedValue(sessionResponse(401));
      renderAppAt(path, fetchMock);

      await waitFor(() => expect(window.location.pathname).toBe('/'));
      expect(screen.queryByText(/member dashboard|librarian dashboard/i)).not.toBeInTheDocument();
    }
  );

  test.each([
    ['/librarian/dashboard', 'MEMBER', '/member/dashboard', /member dashboard/i, /librarian dashboard/i],
    ['/member/dashboard', 'LIBRARIAN', '/librarian/dashboard', /librarian dashboard/i, /member dashboard/i],
  ] as const)(
    'denies %s when the server verifies %s and links to that verified role route',
    async (requestedPath, verifiedRole, ownPath, ownLinkName, deniedHeading) => {
      const fetchMock = jest.fn().mockResolvedValue(sessionResponse(200, verifiedRole));
      renderAppAt(requestedPath, fetchMock);

      expect(await screen.findByRole('heading', { name: /access denied/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: ownLinkName })).toHaveAttribute('href', ownPath);
      expect(screen.queryByRole('heading', { name: deniedHeading })).not.toBeInTheDocument();
    }
  );

  test('does not let a client-selected or query-string role authorize a dashboard', async () => {
    window.localStorage.setItem('accountType', 'LIBRARIAN');
    const fetchMock = jest.fn().mockResolvedValue(sessionResponse(200, 'MEMBER'));
    renderAppAt('/member/dashboard?accountType=LIBRARIAN', fetchMock);

    expect(await screen.findByRole('heading', { name: /member dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /your library account/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /librarian dashboard/i })).not.toBeInTheDocument();
  });

  test.each([
    ['service failure', sessionResponse(503)],
    ['malformed session', { status: 200, ok: true, json: async () => ({}) }],
  ])('fails closed with retry on %s', async (_label, response) => {
    const fetchMock = jest.fn().mockResolvedValue(response);
    renderAppAt('/member/dashboard', fetchMock);

    expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.queryByText(/member dashboard/i)).not.toBeInTheDocument();
  });

  test('fails closed with retry when session validation rejects over the network', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    renderAppAt('/member/dashboard', fetchMock);

    expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /member dashboard/i })).not.toBeInTheDocument();
  });

  test('posts CSRF logout and navigates only after 204 confirmation', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(sessionResponse(200, 'MEMBER'))
      .mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({ csrfToken: 'synthetic-csrf' }) })
      .mockResolvedValueOnce({ status: 204, ok: true, json: async () => ({}) });
    renderAppAt('/member/dashboard', fetchMock);

    fireEvent.click(await screen.findByRole('button', { name: /log out|sign out/i }));
    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/auth/csrf', expect.objectContaining({ method: 'GET', credentials: 'same-origin' }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/auth/logout', expect.objectContaining({
      method: 'POST',
      credentials: 'same-origin',
      headers: expect.objectContaining({ 'X-CSRF-Token': 'synthetic-csrf' }),
    }));
  });

  test.each([
    ['/member/dashboard', 'MEMBER'],
    ['/librarian/dashboard', 'LIBRARIAN'],
  ])('shows an accessible logout control on %s', async (path, accountType) => {
    const fetchMock = jest.fn().mockResolvedValue(sessionResponse(200, accountType));
    renderAppAt(path, fetchMock);
    expect(await screen.findByRole('button', { name: /log out/i })).toBeVisible();
  });

  test('treats confirmed 401 during logout as logged out', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(sessionResponse(200, 'LIBRARIAN'))
      .mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({ csrfToken: 'synthetic-csrf' }) })
      .mockResolvedValueOnce({ status: 401, ok: false, json: async () => ({}) });
    renderAppAt('/librarian/dashboard', fetchMock);

    fireEvent.click(await screen.findByRole('button', { name: /log out|sign out/i }));
    await waitFor(() => expect(window.location.pathname).toBe('/'));
  });

  test.each([
    ['CSRF rejection', 403],
    ['service failure', 503],
  ])('keeps protected content hidden with a retryable error after %s', async (_label, status) => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(sessionResponse(200, 'MEMBER'))
      .mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({ csrfToken: 'synthetic-csrf' }) })
      .mockResolvedValueOnce({ status, ok: false, json: async () => ({}) });
    renderAppAt('/member/dashboard', fetchMock);

    fireEvent.click(await screen.findByRole('button', { name: /log out|sign out/i }));
    expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.queryByText(/member dashboard/i)).not.toBeInTheDocument();
    expect(window.location.pathname).toBe('/member/dashboard');
  });

  test.each([
    ['missing CSRF token', { status: 200, json: async () => ({}) }],
    ['CSRF service failure', { status: 503, json: async () => ({}) }],
  ])('keeps dashboard hidden and permits retry after %s', async (_label, csrfResponse) => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(sessionResponse(200, 'MEMBER'))
      .mockResolvedValueOnce(csrfResponse);
    renderAppAt('/member/dashboard', fetchMock);
    fireEvent.click(await screen.findByRole('button', { name: /log out/i }));
    expect(await screen.findByRole('button', { name: /retry logout/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /member dashboard/i })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('keeps dashboard hidden when logout fails over the network', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(sessionResponse(200, 'LIBRARIAN'))
      .mockResolvedValueOnce({ status: 200, json: async () => ({ csrfToken: 'synthetic-csrf' }) })
      .mockRejectedValueOnce(new TypeError('Network request failed'));
    renderAppAt('/librarian/dashboard', fetchMock);
    fireEvent.click(await screen.findByRole('button', { name: /log out/i }));
    expect(await screen.findByRole('button', { name: /retry logout/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /librarian dashboard/i })).not.toBeInTheDocument();
    expect(window.location.pathname).toBe('/librarian/dashboard');
  });

  test('keeps dashboard hidden when CSRF retrieval fails over the network', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(sessionResponse(200, 'MEMBER'))
      .mockRejectedValueOnce(new TypeError('Network request failed'));
    renderAppAt('/member/dashboard', fetchMock);
    fireEvent.click(await screen.findByRole('button', { name: /log out/i }));
    expect(await screen.findByRole('button', { name: /retry logout/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /member dashboard/i })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('a later dashboard visit is denied after confirmed logout', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(sessionResponse(200, 'MEMBER'))
      .mockResolvedValueOnce({ status: 200, json: async () => ({ csrfToken: 'synthetic-csrf' }) })
      .mockResolvedValueOnce({ status: 204 })
      .mockResolvedValueOnce(sessionResponse(401));
    const { unmount } = renderAppAt('/member/dashboard', fetchMock);
    fireEvent.click(await screen.findByRole('button', { name: /log out/i }));
    await waitFor(() => expect(window.location.pathname).toBe('/'));
    unmount();
    renderAppAt('/member/dashboard', fetchMock);
    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(screen.queryByRole('heading', { name: /member dashboard/i })).not.toBeInTheDocument();
  });
});
