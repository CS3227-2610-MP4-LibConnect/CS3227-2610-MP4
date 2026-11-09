import React, { useEffect, useState } from 'react';
import DashboardLogout from './DashboardLogout';
import './DashboardViews.css';

export function StudentDashboard({ onLogoutConfirmed, name }: { onLogoutConfirmed: () => void; name?: string | null }) {
  const [ticketSuccess, setTicketSuccess] = useState(false);
  useEffect(() => {
    if (window.history.state?.ticketCreated !== true) return;
    window.history.replaceState({}, '', window.location.href);
    setTicketSuccess(true);
    const timeout = window.setTimeout(() => setTicketSuccess(false), 6000);
    return () => window.clearTimeout(timeout);
  }, []);
  return (
    <DashboardLogout onConfirmed={onLogoutConfirmed} studentNavigation>
      <main className="dashboard-page student-dashboard">
        <h1>Student Dashboard</h1>
        {ticketSuccess && <p role="status" aria-live="polite">Ticket created successfully.</p>}
        <section className="dashboard-panel" aria-labelledby="student-dashboard-intro">
          <h2 id="student-dashboard-intro">Welcome back{name ? `, ${name}` : ''}</h2>
          <p>Welcome to your Student landing page.</p>
        </section>
        <section className="dashboard-panel" aria-labelledby="student-ask-for-help">
          <h2 id="student-ask-for-help">Ask for Help</h2>
          <p>Need help with your work? Tell us what you’re working on.</p>
          <a className="submit-button student-create-ticket" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }} href="/student/tickets/new">Create Ticket</a>
        </section>
      </main>
    </DashboardLogout>
  );
}
