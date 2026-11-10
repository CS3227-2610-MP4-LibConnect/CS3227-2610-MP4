import React from 'react';
import DashboardLogout from '../DashboardLogout';
import '../DashboardViews.css';

export function MyTicketsPage({ onLogoutConfirmed }: { onLogoutConfirmed: () => void }) {
  return (
    <DashboardLogout onConfirmed={onLogoutConfirmed} studentNavigation>
      <main className="dashboard-page student-dashboard">
        <h1>My Tickets</h1>
        <section className="dashboard-panel" aria-labelledby="my-tickets-placeholder">
          <h2 id="my-tickets-placeholder">Full ticket list coming later</h2>
          <p>This page will show your full ticket history in a future update.</p>
          <a href="/student/dashboard">Back to Student Dashboard</a>
        </section>
      </main>
    </DashboardLogout>
  );
}

export default MyTicketsPage;
