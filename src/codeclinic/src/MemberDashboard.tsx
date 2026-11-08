import React from 'react';
import DashboardLogout from './DashboardLogout';
import MemberCatalog from './MemberCatalog';
import './DashboardViews.css';

export function MemberDashboard({ onLogoutConfirmed, name }: { onLogoutConfirmed: () => void; name?: string | null }) {
  return (
    <DashboardLogout onConfirmed={onLogoutConfirmed} memberNavigation>
      <main className="dashboard-page member-dashboard">
        <h1>Member Dashboard</h1>
        <h2 id="member-dashboard-intro">Welcome back{name ? `, ${name}` : ''}</h2>
        <MemberCatalog />
      </main>
    </DashboardLogout>
  );
}
