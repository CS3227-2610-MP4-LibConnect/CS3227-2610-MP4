import React from 'react';
import DashboardLogout from './DashboardLogout';
import './DashboardViews.css';

export function MemberDashboard({ onLogoutConfirmed }: { onLogoutConfirmed: () => void }) {
  return (
    <DashboardLogout onConfirmed={onLogoutConfirmed}>
      <main className="dashboard-page member-dashboard">
        <h1>Member Dashboard</h1>
        <section className="dashboard-panel" aria-labelledby="member-dashboard-intro">
          <h2 id="member-dashboard-intro">Your library account</h2>
          <p>Welcome to your member landing page.</p>
        </section>
      </main>
    </DashboardLogout>
  );
}
