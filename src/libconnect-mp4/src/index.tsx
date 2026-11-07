import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import LoginPage from './LoginPage';
import RegistrationPage from './RegistrationPage';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    {window.location.pathname === '/register' ? <RegistrationPage /> : <LoginPage />}
  </React.StrictMode>
);
