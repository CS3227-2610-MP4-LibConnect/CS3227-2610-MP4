import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TADashboard } from './TADashboard';
import { StudentDashboard } from './StudentDashboard';

type AccountType = 'STUDENT' | 'TA';
type GuardState = 'checking' | 'ready' | 'denied' | 'retry';

function DashboardRouteGuard({ accountType }: { accountType: AccountType }) {
  const [state, setState] = useState<GuardState>('checking');
  const [verifiedAccountType, setVerifiedAccountType] = useState<AccountType | null>(null);
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
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
    setVerifiedName(null);
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
      const returnedName = (body as { name?: unknown } | null)?.name;
      if (returnedType !== 'STUDENT' && returnedType !== 'TA') {
        setState('retry');
        return;
      }
      if (returnedType === accountType) {
        setVerifiedAccountType(returnedType);
        setVerifiedName(returnedType === 'STUDENT' && typeof returnedName === 'string' &&
          returnedName.trim().length > 0 && returnedName.length <= 200 ? returnedName.trim() : null);
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
    const verifiedRoute = verifiedAccountType === 'STUDENT' ? '/student/dashboard' : '/ta/dashboard';
    const verifiedLabel = verifiedAccountType === 'STUDENT' ? 'Student' : 'TA';
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
    setVerifiedName(null);
    setState('checking');
  };
  return accountType === 'STUDENT'
    ? <StudentDashboard onLogoutConfirmed={clearVerifiedAccount} name={verifiedName} />
    : <TADashboard onLogoutConfirmed={clearVerifiedAccount} />;
}

export default DashboardRouteGuard;
