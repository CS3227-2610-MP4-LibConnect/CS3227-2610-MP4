import React from 'react';
import DashboardLogout from './DashboardLogout';
import TAQueuePage from './TAQueuePage';
import './DashboardViews.css';

export function TADashboard({ onLogoutConfirmed, isManager = false }: { onLogoutConfirmed: () => void; isManager?: boolean }) {
  // DashboardRouteGuard renders this component for every TA path it has no dedicated view for.
  if (window.location.pathname === '/ta/queue') {
    return <DashboardLogout onConfirmed={onLogoutConfirmed} isManager={isManager}><TAQueuePage /></DashboardLogout>;
  }
  return (
    <DashboardLogout onConfirmed={onLogoutConfirmed} isManager={isManager}>
      <main className="dashboard-page ta-dashboard">
        <h1>TA Dashboard</h1>
        <section className="dashboard-panel" aria-labelledby="ta-dashboard-intro">
          <h2 id="ta-dashboard-intro">TA workspace</h2>
          <p>Welcome to your TA landing page.</p>
          <p><a href="/ta/queue">Open the ticket queue</a></p>
        </section>
      </main>
    </DashboardLogout>
  );
}
