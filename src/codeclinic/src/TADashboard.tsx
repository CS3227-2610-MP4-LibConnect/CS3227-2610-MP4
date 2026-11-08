import React from 'react';
import DashboardLogout from './DashboardLogout';
import './DashboardViews.css';

export function TADashboard({ onLogoutConfirmed, isManager = false }: { onLogoutConfirmed: () => void; isManager?: boolean }) {
  return (
    <DashboardLogout onConfirmed={onLogoutConfirmed} isManager={isManager}>
      <main className="dashboard-page ta-dashboard">
        <h1>TA Dashboard</h1>
        <section className="dashboard-panel" aria-labelledby="ta-dashboard-intro">
          <h2 id="ta-dashboard-intro">TA workspace</h2>
          <p>Welcome to your TA landing page.</p>
        </section>
      </main>
    </DashboardLogout>
  );
}
