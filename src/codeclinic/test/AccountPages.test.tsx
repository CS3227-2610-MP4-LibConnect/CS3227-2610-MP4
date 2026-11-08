import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AccountPages from '../src/AccountPages';

const account = { name: 'Ada', email: 'ada@example.edu', accountType: 'TA', isManager: true };
const entry = { userId: 'u-1', name: 'Student Example', email: 'student@example.edu', accountType: 'STUDENT', accountStatus: 'ACTIVE', registrationDateTime: null };

beforeEach(() => { jest.restoreAllMocks(); });

test('Account page loads and submits profile fields with CSRF', async () => {
  const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === '/api/account' && !init?.method) return new Response(JSON.stringify(account), { status: 200 });
    if (url === '/api/auth/csrf') return new Response(JSON.stringify({ csrfToken: 'token' }), { status: 200 });
    if (url === '/api/account/profile') return new Response(JSON.stringify({ ...account, name: 'Ada Lovelace' }), { status: 200 });
    return new Response('{}', { status: 500 });
  });
  render(<AccountPages mode="account" />);
  const name = await screen.findByLabelText('Name');
  fireEvent.change(name, { target: { value: 'Ada Lovelace' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
  await screen.findByRole('status');
  expect(fetchMock).toHaveBeenCalledWith('/api/account/profile', expect.objectContaining({ method: 'PATCH', headers: expect.objectContaining({ 'X-CSRF-Token': 'token' }) }));
});

test('Students page confirms deactivation and shows a reset password only once', async () => {
  const confirm = jest.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true).mockReturnValueOnce(true);
  const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === '/api/account') return new Response(JSON.stringify(account), { status: 200 });
    if (url.startsWith('/api/support/accounts?')) return new Response(JSON.stringify({ accounts: [entry], nextCursor: null }), { status: 200 });
    if (url === '/api/auth/csrf') return new Response(JSON.stringify({ csrfToken: 'token' }), { status: 200 });
    if (url.endsWith('/status')) return new Response(null, { status: 204 });
    if (url.endsWith('/password-reset')) return new Response(JSON.stringify({ temporaryPassword: 'SafePass23456789' }), { status: 200 });
    return new Response('{}', { status: 500 });
  });
  render(<AccountPages mode="students" />);
  await screen.findByText('Student Example');
  fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/status'))).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
  await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/status'))).toBe(true));
  fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
  expect(await screen.findByText('SafePass23456789')).toBeInTheDocument();
  expect(screen.getAllByText(/will not be shown again/i)).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
  await waitFor(() => expect(screen.queryByText('SafePass23456789')).not.toBeInTheDocument());
});

test('TAs page is available to coordinator mode and forced password page presents the required change form', async () => {
  const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === '/api/account') return new Response(JSON.stringify(account), { status: 200 });
    if (url.startsWith('/api/support/accounts?')) return new Response(JSON.stringify({ accounts: [], nextCursor: null }), { status: 200 });
    if (url === '/api/auth/session') return new Response(JSON.stringify({ ...account, mustChangePassword: true }), { status: 200 });
    return new Response('{}', { status: 500 });
  });
  const first = render(<AccountPages mode="tas" />);
  expect(await screen.findByRole('heading', { name: 'TAs' })).toBeInTheDocument();
  first.unmount();
  render(<AccountPages mode="password-change" />);
  expect(await screen.findByLabelText('Temporary password')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Set new password' })).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalled();
});

test('TA list uses the TA endpoint, and cancelling reset never calls the reset action', async () => {
  jest.spyOn(window, 'confirm').mockReturnValue(false);
  const calls: string[] = [];
  jest.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input); calls.push(url);
    if (url === '/api/account') return new Response(JSON.stringify(account), { status: 200 });
    if (url.startsWith('/api/support/accounts?')) return new Response(JSON.stringify({ accounts: [{ ...entry, accountType: 'TA' }], nextCursor: null }), { status: 200 });
    return new Response('{}', { status: 500 });
  });
  render(<AccountPages mode="tas" />);
  await screen.findByText('Student Example');
  expect(calls.some((url) => url.includes('type=TA'))).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
  expect(calls.some((url) => url.endsWith('/password-reset'))).toBe(false);
});

test('support page reports load failures instead of showing an empty account list', async () => {
  jest.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === '/api/account') return new Response('{}', { status: 503 });
    if (url.startsWith('/api/support/accounts?')) return new Response(JSON.stringify({ message: 'Account service is temporarily unavailable.' }), { status: 503 });
    return new Response('{}', { status: 500 });
  });
  render(<AccountPages mode="students" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load your account.');
  expect(screen.queryByText('No accounts found.')).not.toBeInTheDocument();
});

test('forced password change reports rejected credentials without leaving the forced page', async () => {
  jest.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === '/api/auth/session') return new Response(JSON.stringify({ accountType: 'TA', mustChangePassword: true }), { status: 200 });
    if (url === '/api/auth/csrf') return new Response(JSON.stringify({ csrfToken: 'token' }), { status: 200 });
    if (url === '/api/account/password') return new Response(JSON.stringify({ message: 'Unable to verify those details.' }), { status: 401 });
    return new Response('{}', { status: 500 });
  });
  render(<AccountPages mode="password-change" />);
  fireEvent.change(await screen.findByLabelText('Temporary password'), { target: { value: 'wrong temporary' } });
  fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'new password with enough chars' } });
  fireEvent.click(screen.getByRole('button', { name: 'Set new password' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to verify those details.');
  expect(screen.getByRole('heading', { name: 'Change your password' })).toBeInTheDocument();
});
