import React from 'react';
import DashboardLogout from './DashboardLogout';
import TAQueuePage from './TAQueuePage';
import TATicketPage from './TATicketPage';
import './DashboardViews.css';

export function TADashboard({ onLogoutConfirmed, isManager = false }: { onLogoutConfirmed: () => void; isManager?: boolean }) {
  // DashboardRouteGuard renders this component for every TA path it has no dedicated view for.
  if (window.location.pathname === '/ta/queue') {
    return <DashboardLogout onConfirmed={onLogoutConfirmed} isManager={isManager}><TAQueuePage /></DashboardLogout>;
  }
  const ticketMatch = /^\/ta\/tickets\/([A-Za-z0-9_-]{1,128})$/.exec(window.location.pathname);
  if (ticketMatch) {
    return <DashboardLogout onConfirmed={onLogoutConfirmed} isManager={isManager}><TATicketPage ticketId={ticketMatch[1]} /></DashboardLogout>;
  }
  return (
    <DashboardLogout onConfirmed={onLogoutConfirmed} isManager={isManager}>
      <main className="dashboard-page ta-dashboard">
        <h1>TA Dashboard</h1>
        <section className="dashboard-panel" aria-labelledby="ta-dashboard-intro">
          <h2 id="ta-dashboard-intro">TA workspace</h2>
          <p>Welcome to your TA landing page. Claim, answer, and resolve student tickets from the queue.</p>
          <a className="dashboard-action" href="/ta/queue">
            Open the ticket queue <span aria-hidden="true">→</span>
          </a>
        </section>
      </main>
    </DashboardLogout>
  );
}
