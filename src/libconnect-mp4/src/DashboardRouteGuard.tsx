import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LibrarianDashboard } from './LibrarianDashboard';
import { MemberDashboard } from './MemberDashboard';

type AccountType = 'MEMBER' | 'LIBRARIAN';
type GuardState = 'checking' | 'ready' | 'denied' | 'retry';

function DashboardRouteGuard({ accountType }: { accountType: AccountType }) {
  const [state, setState] = useState<GuardState>('checking');
  const [verifiedAccountType, setVerifiedAccountType] = useState<AccountType | null>(null);
  const lastAutoCheckFor = useRef<AccountType | null>(null);
  const requestGeneration = useRef(0);
  const lifecycleVersion = useRef(0);

  const validateSession = useCallback(async () => {
    const generation = ++requestGeneration.current;
    const isCurrentRequest = () =>
      requestGeneration.current === generation &&
      window.location.pathname === `/${accountType.toLowerCase()}/dashboard`;

    setState('checking');
    setVerifiedAccountType(null);
    try {
      const response = await fetch('/api/auth/session', { method: 'GET', credentials: 'same-origin' });
      if (!isCurrentRequest()) return;
      if (response.status === 401) {
        window.history.replaceState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
        return;
      }
      if (response.status !== 200) {
        setState('retry');
        return;
      }

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        if (isCurrentRequest()) setState('retry');
        return;
      }
      if (!isCurrentRequest()) return;
      const returnedType = (body as { accountType?: unknown } | null)?.accountType;
      if (returnedType !== 'MEMBER' && returnedType !== 'LIBRARIAN') {
        setState('retry');
        return;
      }
      if (returnedType === accountType) {
        setVerifiedAccountType(returnedType);
        setState('ready');
      } else {
        setVerifiedAccountType(returnedType);
        setState('denied');
      }
    } catch {
      if (isCurrentRequest()) setState('retry');
    }
  }, [accountType]);

  useEffect(() => {
    lifecycleVersion.current += 1;
    if (lastAutoCheckFor.current !== accountType) {
      lastAutoCheckFor.current = accountType;
      void validateSession();
    }
    return () => {
      const cleanupVersion = lifecycleVersion.current;
      queueMicrotask(() => {
        if (lifecycleVersion.current !== cleanupVersion) return;
        requestGeneration.current += 1;
        lastAutoCheckFor.current = null;
      });
    };
  }, [accountType, validateSession]);

  if (state === 'checking' || (state === 'ready' && verifiedAccountType !== accountType)) {
    return <main aria-busy="true">Checking your session…</main>;
  }
  if (state === 'retry') {
    return (
      <main>
        <p role="alert">We couldn’t verify your session. Please try again.</p>
        <button type="button" onClick={() => { void validateSession(); }}>Retry</button>
        <a href="/">Return to sign in</a>
      </main>
    );
  }

  if (state === 'denied' && verifiedAccountType && verifiedAccountType !== accountType) {
    const verifiedRoute = verifiedAccountType === 'MEMBER' ? '/member/dashboard' : '/librarian/dashboard';
    const verifiedLabel = verifiedAccountType === 'MEMBER' ? 'Member' : 'Librarian';
    return (
      <main>
        <h1>Access denied</h1>
        <p>You don’t have access to this dashboard.</p>
        <a href={verifiedRoute}>Go to your {verifiedLabel} dashboard</a>
      </main>
    );
  }

  if (state !== 'ready' || verifiedAccountType !== accountType) {
    return <main aria-busy="true">Checking your session…</main>;
  }

  const clearVerifiedAccount = () => {
    setVerifiedAccountType(null);
    setState('checking');
  };
  return accountType === 'MEMBER'
    ? <MemberDashboard onLogoutConfirmed={clearVerifiedAccount} />
    : <LibrarianDashboard onLogoutConfirmed={clearVerifiedAccount} />;
}

export default DashboardRouteGuard;
