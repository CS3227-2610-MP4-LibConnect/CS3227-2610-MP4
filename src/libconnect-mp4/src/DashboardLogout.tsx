import React, { useState } from 'react';

type LogoutState = 'ready' | 'pending' | 'error';

interface DashboardLogoutProps {
  onConfirmed: () => void;
  children: React.ReactNode;
}

export default function DashboardLogout({ onConfirmed, children }: DashboardLogoutProps) {
  const [state, setState] = useState<LogoutState>('ready');

  const logout = async () => {
    setState('pending');
    try {
      const csrfResponse = await fetch('/api/auth/csrf', {
        method: 'GET',
        credentials: 'same-origin',
      });
      if (csrfResponse.status !== 200) {
        setState('error');
        return;
      }

      let body: unknown;
      try {
        body = await csrfResponse.json();
      } catch {
        setState('error');
        return;
      }
      const csrfToken = (body as { csrfToken?: unknown } | null)?.csrfToken;
      if (typeof csrfToken !== 'string' || csrfToken.length === 0) {
        setState('error');
        return;
      }

      const logoutResponse = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'X-CSRF-Token': csrfToken },
      });
      if (logoutResponse.status === 204 || logoutResponse.status === 401) {
        onConfirmed();
        window.history.replaceState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
        return;
      }

      setState('error');
    } catch {
      setState('error');
    }
  };

  if (state === 'pending') {
    return <main aria-busy="true">Signing out…</main>;
  }
  if (state === 'error') {
    return (
      <main>
        <p role="alert">We couldn’t confirm sign out. Your dashboard is hidden. Please retry.</p>
        <button type="button" onClick={() => { void logout(); }}>Retry logout</button>
      </main>
    );
  }

  return <>
    {children}
    <button type="button" onClick={() => { void logout(); }}>Log out</button>
  </>;
}
