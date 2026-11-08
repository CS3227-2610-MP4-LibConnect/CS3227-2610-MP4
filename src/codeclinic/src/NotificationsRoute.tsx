import React, { useEffect, useState } from 'react';
import { NotificationInbox } from './notifications/Notifications';

export default function NotificationsRoute() {
  const [state, setState] = useState<'checking' | 'ready' | 'retry'>('checking');
  useEffect(() => {
    let active = true;
    fetch('/api/auth/session', { credentials: 'same-origin' }).then(async (response) => {
      if (!active) return;
      if (response.status === 401) { window.location.assign('/'); return; }
      if (!response.ok) { setState('retry'); return; }
      const session = await response.json() as { mustChangePassword?: boolean; accountType?: string };
      if (session.mustChangePassword) { window.location.assign('/account/password-change'); return; }
      if (session.accountType !== 'STUDENT' && session.accountType !== 'TA') { setState('retry'); return; }
      setState('ready');
    }).catch(() => { if (active) setState('retry'); });
    return () => { active = false; };
  }, []);
  if (state === 'checking') return <main aria-busy="true">Checking your session…</main>;
  if (state === 'retry') return <main><p role="alert">Could not load notifications.</p><a href="/">Return to sign in</a></main>;
  return <NotificationInbox />;
}
