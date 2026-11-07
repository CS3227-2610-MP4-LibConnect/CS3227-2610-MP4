import React from 'react';
import DashboardLogout from './DashboardLogout';
import './DashboardViews.css';

export function LibrarianDashboard({ onLogoutConfirmed }: { onLogoutConfirmed: () => void }) {
  return (
    <DashboardLogout onConfirmed={onLogoutConfirmed}>
      <main className="dashboard-page librarian-dashboard">
        <h1>Librarian Dashboard</h1>
        <section className="dashboard-panel" aria-labelledby="librarian-dashboard-intro">
          <h2 id="librarian-dashboard-intro">Library staff workspace</h2>
          <p>Welcome to your librarian landing page.</p>
        </section>
      </main>
    </DashboardLogout>
  );
}
