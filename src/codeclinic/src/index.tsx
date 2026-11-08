import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './theme.css';
import LoginPage from './LoginPage';
import RegistrationPage from './RegistrationPage';
import DashboardRouteGuard from './DashboardRouteGuard';

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
  if (path === '/ta/dashboard') return <DashboardRouteGuard accountType="TA" />;
  return <LoginPage />;
}

root.render(<React.StrictMode><App /></React.StrictMode>);
