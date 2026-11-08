import React from 'react';
import DashboardLogout from './DashboardLogout';
import MemberCatalog from './MemberCatalog';
import './DashboardViews.css';

export function StudentDashboard({ onLogoutConfirmed, name }: { onLogoutConfirmed: () => void; name?: string | null }) {
  return (
    <DashboardLogout onConfirmed={onLogoutConfirmed} studentNavigation>
      <main className="dashboard-page student-dashboard">
        <h1>Student Dashboard</h1>
        <h2 id="student-dashboard-intro">Welcome back{name ? `, ${name}` : ''}</h2>
        <MemberCatalog />
      </main>
    </DashboardLogout>
  );
}
