import React from 'react';
import { render, screen } from '@testing-library/react';
import AppHeader from '../src/AppHeader';

const logout = jest.fn();
const bellResponse = { ok: true, status: 200, json: async () => ({ unreadCount: 124 }) };

describe('shared authenticated header contract', () => {
  beforeEach(() => { logout.mockClear(); global.fetch = jest.fn().mockResolvedValue(bellResponse) as typeof fetch; });

  test.each([
    ['STUDENT', false, ['/student/dashboard', '/student/account', '/notifications']],
    ['TA', false, ['/ta/dashboard', '/ta/account', '/ta/students', '/notifications']],
    ['TA', true, ['/ta/dashboard', '/ta/account', '/ta/students', '/ta/tas', '/notifications']],
  ] as const)('shows only verified %s navigation (manager=%s)', async (accountType, isManager, destinations) => {
    render(<AppHeader accountType={accountType} isManager={isManager} activePath="/notifications" onLogout={logout} />);
    expect(screen.getByRole('link', { name: 'CodeClinic' })).toHaveAttribute('href', destinations[0]);
    destinations.slice(1).forEach((href) => expect(document.querySelector(`a[href="${href}"]`)).toBeInTheDocument());
    expect(await screen.findByRole('link', { name: 'Notifications, 99 unread' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
    if (isManager) expect(screen.getByRole('link', { name: 'TAs' })).toHaveAttribute('href', '/ta/tas');
    else expect(screen.queryByRole('link', { name: 'TAs' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('99 unread')).toHaveTextContent('99');
    expect(document.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument();
  });

  test('restricted mode keeps dashboard brand and logout without navigation or unread request', () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as typeof fetch;
    render(<AppHeader accountType="STUDENT" isManager={false} activePath="/account/password-change" restricted onLogout={logout} />);
    expect(screen.getByRole('link', { name: 'CodeClinic' })).toHaveAttribute('href', '/student/dashboard');
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /notifications/i })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
