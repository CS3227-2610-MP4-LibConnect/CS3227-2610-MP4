import React from 'react';
import { NotificationBell } from './notifications/Notifications';
import './AppHeader.css';

export interface AppHeaderProps {
  accountType: 'STUDENT' | 'TA';
  isManager?: boolean;
  activePath?: string;
  restricted?: boolean;
  onLogout: () => void;
}

export default function AppHeader({ accountType, isManager = false, activePath, restricted = false, onLogout }: AppHeaderProps) {
  const dashboard = accountType === 'STUDENT' ? '/student/dashboard' : '/ta/dashboard';
  const account = accountType === 'STUDENT' ? '/student/account' : '/ta/account';
  const active = activePath ?? window.location.pathname;

  return <header className="app-header">
    <a className="app-header__brand" href={dashboard}>CodeClinic</a>
    <div className="app-header__actions">
      {!restricted && <nav className="app-header__nav" aria-label="Main navigation">
        {accountType === 'STUDENT' && <a href="/student/tickets/new" aria-current={active === '/student/tickets/new' ? 'page' : undefined}>Create Ticket</a>}
        {accountType === 'TA' && <a href="/ta/students" aria-current={active === '/ta/students' ? 'page' : undefined}>Students</a>}
        {accountType === 'TA' && isManager && <a href="/ta/tas" aria-current={active === '/ta/tas' ? 'page' : undefined}>TAs</a>}
        <NotificationBell active={active === '/notifications'} />
        <a href={account} aria-current={active === account ? 'page' : undefined}>Account</a>
      </nav>}
      <button className="app-header__logout" type="button" onClick={onLogout}>Log out</button>
    </div>
  </header>;
}
