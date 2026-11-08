import React, { useEffect, useState } from 'react';
import DashboardLogout from './DashboardLogout';
import { NotificationInbox } from './notifications/Notifications';

type AccountType = 'STUDENT' | 'TA';
type RouteState = 'checking' | 'ready' | 'retry';
type ManagerState = 'checking' | 'ready' | 'retry';

export default function NotificationsRoute() {
  const [state, setState] = useState<RouteState>('checking');
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [managerState, setManagerState] = useState<ManagerState>('checking');
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const [managerAttempt, setManagerAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    const verify = async () => {
      setState('checking');
      setAccountType(null);
      setManagerState('checking');
      setIsManager(false);
      try {
        const response = await fetch('/api/auth/session', { credentials: 'same-origin' });
        if (!active) return;
        if (response.status === 401) { window.location.assign('/'); return; }
        if (!response.ok) { setState('retry'); return; }

        const session = await response.json() as { mustChangePassword?: unknown; accountType?: unknown };
        if (!active) return;
        if (session.mustChangePassword === true) { window.location.assign('/account/password-change'); return; }
        if (session.accountType !== 'STUDENT' && session.accountType !== 'TA') {
          setState('retry');
          return;
        }

        const role = session.accountType as AccountType;
        setAccountType(role);
        if (role === 'STUDENT') setManagerState('ready');
        if (active) setState('ready');
      } catch {
        if (active) setState('retry');
      }
    };

    void verify();
    return () => { active = false; };
  }, [sessionAttempt]);

  useEffect(() => {
    if (accountType !== 'TA') return;
    let active = true;
    setManagerState('checking');
    setIsManager(false);
    const resolveManager = async () => {
      try {
        const response = await fetch('/api/account', { credentials: 'same-origin' });
        if (!active) return;
        if (!response.ok) throw new Error('Manager status unavailable.');
        const account = await response.json() as { accountType?: unknown; isManager?: unknown };
        if (!active) return;
        if (account.accountType !== 'TA' || typeof account.isManager !== 'boolean') {
          throw new Error('Manager status unavailable.');
        }
        setIsManager(account.isManager);
        setManagerState('ready');
      } catch {
        if (active) {
          setIsManager(false);
          setManagerState('retry');
        }
      }
    };
    void resolveManager();
    return () => { active = false; };
  }, [accountType, managerAttempt]);

  if (state === 'checking' || (state === 'ready' && !accountType)) {
    return <main aria-busy="true">Checking your session…</main>;
  }
  if (state === 'retry' || !accountType) {
    return <main><p role="alert">Could not load notifications.</p><a href="/">Return to sign in</a><button type="button" onClick={() => setSessionAttempt((attempt) => attempt + 1)}>Retry</button></main>;
  }

  return <DashboardLogout
    onConfirmed={() => undefined}
    studentNavigation={accountType === 'STUDENT'}
    isManager={isManager}
  >
    {accountType === 'TA' && managerState === 'retry' && <section role="alert" aria-label="Coordinator navigation status">
      <p>Could not verify coordinator access. You can still use your account and notifications.</p>
      <button type="button" onClick={() => {
        setManagerAttempt((attempt) => attempt + 1);
      }}>Retry coordinator access</button>
    </section>}
    <NotificationInbox />
  </DashboardLogout>;
}
