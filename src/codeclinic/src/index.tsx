import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './theme.css';
import LoginPage from './LoginPage';
import RegistrationPage from './RegistrationPage';
import DashboardRouteGuard from './DashboardRouteGuard';
import AccountPages from './AccountPages';
import NotificationsRoute from './NotificationsRoute';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

function App() {
  const [path, setPath] = React.useState(window.location.pathname);
  React.useEffect(() => {
    const updatePath = () => setPath(window.location.pathname);
    window.addEventListener('popstate', updatePath);
    return () => window.removeEventListener('popstate', updatePath);
  }, []);

  if (path === '/register') return <RegistrationPage />;
  if (path === '/student/dashboard') return <DashboardRouteGuard accountType="STUDENT" />;
  if (path === '/student/tickets') return <DashboardRouteGuard accountType="STUDENT" />;
  const ticketDetailPath = path.match(/^\/student\/tickets\/([^/]+)$/);
  if (ticketDetailPath && ticketDetailPath[1] !== 'new') return <DashboardRouteGuard accountType="STUDENT" ticketId={ticketDetailPath[1]} />;
  if (path === '/student/tickets/new') return <DashboardRouteGuard accountType="STUDENT" />;
  if (path === '/ta/dashboard') return <DashboardRouteGuard accountType="TA" />;
  if (path === '/student/account') return <DashboardRouteGuard accountType="STUDENT" />;
  if (path === '/ta/account' || path === '/ta/students' || path === '/ta/tas') return <DashboardRouteGuard accountType="TA" />;
  if (path === '/account/password-change') return <AccountPages mode="password-change" />;
  if (path === '/notifications') return <NotificationsRoute />;
  return <LoginPage />;
}

root.render(<React.StrictMode><App /></React.StrictMode>);
