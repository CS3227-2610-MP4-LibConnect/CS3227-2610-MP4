import React from 'react';
import DashboardLogout from './DashboardLogout';
import './DashboardViews.css';

export function StudentDashboard({ onLogoutConfirmed, name }: { onLogoutConfirmed: () => void; name?: string | null }) {
  return (
    <DashboardLogout onConfirmed={onLogoutConfirmed} studentNavigation>
      <main className="dashboard-page student-dashboard">
        <h1>Student Dashboard</h1>
        <section className="dashboard-panel" aria-labelledby="student-dashboard-intro">
          <h2 id="student-dashboard-intro">Welcome back{name ? `, ${name}` : ''}</h2>
          <p>Welcome to your Student landing page.</p>
        </section>
      </main>
    </DashboardLogout>
  );
}
