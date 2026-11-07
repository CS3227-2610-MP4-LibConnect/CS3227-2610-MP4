import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../src/LoginPage';
import RegistrationPage from '../src/RegistrationPage';

const syntheticPassword = '  synthetic passphrase  ';

function fillCommonFields() {
  fireEvent.change(screen.getByRole('textbox', { name: /name/i }), { target: { value: 'Test Reader' } });
  fireEvent.change(screen.getByRole('textbox', { name: /email/i }), { target: { value: 'Reader@Example.Test' } });
  fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: syntheticPassword } });
  fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: syntheticPassword } });
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: /register|create account/i }));
}

describe('registration page', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
    window.history.replaceState({}, '', '/');
    window.sessionStorage.clear();
  });

  test('login provides a keyboard-accessible Register route', () => {
    render(<LoginPage />);
    const register = screen.getByRole('link', { name: /register/i });
    expect(register).toHaveAttribute('href', '/register');
    register.focus();
    expect(register).toHaveFocus();
  });

  test('shows common fields, explicit type choice, and a route to login', () => {
    render(<RegistrationPage />);
    expect(screen.getByRole('radio', { name: /member/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /librarian/i })).not.toBeChecked();
    for (const label of [/name/i, /email/i, /^password$/i, /confirm password/i]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.queryByLabelText(/employee id/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /log in|sign in|back to login/i })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('radio', { name: /manager/i })).not.toBeInTheDocument();
  });

  test('librarian choice reveals employee ID and activation notice; switching back omits stale ID', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ status: 409, json: async () => ({ message: 'Registration could not be completed.' }) });
    global.fetch = fetchMock as typeof fetch;
    render(<RegistrationPage />);
    fireEvent.click(screen.getByRole('radio', { name: /librarian/i }));
    expect(screen.getByRole('radio', { name: /librarian/i })).toBeChecked();
    expect(screen.getByText(/manager.*activat|activat.*manager/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/employee id/i), { target: { value: 'EMP-123' } });
    fireEvent.click(screen.getByRole('radio', { name: /member/i }));
    fillCommonFields();
    submit();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/auth/register');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ accountType: 'MEMBER', name: 'Test Reader', email: 'Reader@Example.Test', password: syntheticPassword });
  });

  test('sends librarian employee ID and never sends confirmation or system-controlled fields', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ status: 409, json: async () => ({ message: 'Registration could not be completed.' }) });
    global.fetch = fetchMock as typeof fetch;
    render(<RegistrationPage />);
    fireEvent.click(screen.getByRole('radio', { name: /librarian/i }));
    fillCommonFields();
    fireEvent.change(screen.getByLabelText(/employee id/i), { target: { value: 'EMP-123' } });
    submit();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      accountType: 'LIBRARIAN', name: 'Test Reader', email: 'Reader@Example.Test', password: syntheticPassword, employeeId: 'EMP-123',
    });
  });

  test('blank and mismatched fields have accessible errors and cause no request', () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as typeof fetch;
    render(<RegistrationPage />);
    submit();
    expect(screen.getAllByRole('alert').some((node) => /name|email|password/i.test(node.textContent || ''))).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    fillCommonFields();
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'different' } });
    submit();
    expect(screen.getAllByRole('alert').some((node) => /match/i.test(node.textContent || ''))).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('whitespace-only librarian ID and password are rejected without a request', () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as typeof fetch;
    render(<RegistrationPage />);
    fireEvent.click(screen.getByRole('radio', { name: /librarian/i }));
    fillCommonFields();
    fireEvent.change(screen.getByLabelText(/employee id/i), { target: { value: '   ' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: '        ' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: '        ' } });
    submit();
    expect(screen.getByLabelText(/employee id/i)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test.each(['MEMBER', 'LIBRARIAN'] as const)('%s accepts minimal, dotted-local, and subdomain emails after trimming', async (accountType) => {
    const fetchMock = jest.fn().mockResolvedValue({ status: 409, json: async () => ({ message: 'Registration could not be completed.' }) });
    global.fetch = fetchMock as typeof fetch;
    render(<RegistrationPage />);
    if (accountType === 'LIBRARIAN') {
      fireEvent.click(screen.getByRole('radio', { name: /librarian/i }));
      fireEvent.change(screen.getByLabelText(/employee id/i), { target: { value: 'EMP-123' } });
    }
    fillCommonFields();
    for (const [index, [email, expected]] of ([
      ['a@b.c', 'a@b.c'],
      ['a.b@sub.example.com', 'a.b@sub.example.com'],
      ['  A.B@Sub.Example.Com  ', 'A.B@Sub.Example.Com'],
    ] as const).entries()) {
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: email } });
      submit();
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(index + 1));
      expect(JSON.parse(fetchMock.mock.calls[index][1].body).email).toBe(expected);
    }
  });

  test.each(['MEMBER', 'LIBRARIAN'] as const)('%s rejects invalid email format with a linked accessible error and no request', (accountType) => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as typeof fetch;
    render(<RegistrationPage />);
    if (accountType === 'LIBRARIAN') {
      fireEvent.click(screen.getByRole('radio', { name: /librarian/i }));
      fireEvent.change(screen.getByLabelText(/employee id/i), { target: { value: 'EMP-123' } });
    }
    fillCommonFields();
    for (const email of [
      'ab.c', '@b.c', 'a@', 'a@b', 'a@@b.c', 'a@b@c.d',
      '.a@b.c', 'a.@b.c', 'a..b@c.d', 'a@.b.c', 'a@b.c.', 'a@b..c',
      'a b@c.d', 'a@b c.d', 'a@b. c',
    ]) {
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: email } });
      submit();
      const emailField = screen.getByLabelText(/email/i);
      expect(emailField).toHaveAttribute('aria-invalid', 'true');
      const errorId = emailField.getAttribute('aria-describedby');
      expect(errorId).toBeTruthy();
      expect(document.getElementById(errorId!)).toHaveAttribute('role', 'alert');
      expect(document.getElementById(errorId!)).toHaveTextContent(/email/i);
      expect(fetchMock).not.toHaveBeenCalled();
    }
  });

  test.each([
    ['name', /name/i, 'é'.repeat(101)],
    ['email', /email/i, 'é'.repeat(128)],
    ['password', /^password$/i, 'é'.repeat(513)],
    ['employee ID', /employee id/i, 'é'.repeat(33)],
  ])('rejects over-limit UTF-8 bytes in %s', (_field, label, value) => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as typeof fetch;
    render(<RegistrationPage />);
    fillCommonFields();
    if (_field === 'employee ID') fireEvent.click(screen.getByRole('radio', { name: /librarian/i }));
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
    submit();
    expect(screen.getByLabelText(label)).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('one request stays pending despite repeated submit; recoverable failure preserves non-password values', async () => {
    let resolveRequest!: (response: unknown) => void;
    const fetchMock = jest.fn(() => new Promise((resolve) => { resolveRequest = resolve; }));
    global.fetch = fetchMock as typeof fetch;
    render(<RegistrationPage />);
    fillCommonFields();
    submit();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: /register|create account|creating/i })).toBeDisabled();
    fireEvent.submit(screen.getByRole('button', { name: /register|create account|creating/i }).closest('form')!);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => resolveRequest({ status: 503, json: async () => ({ message: 'Please try again.' }) }));
    expect(screen.getByRole('textbox', { name: /name/i })).toHaveValue('Test Reader');
    expect(screen.getByRole('textbox', { name: /email/i })).toHaveValue('Reader@Example.Test');
    expect(screen.getAllByRole('alert').some((node) => /try again|unavailable/i.test(node.textContent || ''))).toBe(true);
  });

  test.each([
    ['bad response', { status: 201, json: async () => ({ accountType: 'MEMBER' }) }],
    ['unexpected success field', { status: 201, json: async () => ({ accountType: 'MEMBER', accountStatus: 'ACTIVE', sessionId: 'forged' }) }],
    ['network failure', null],
  ])('%s does not announce success or return to login', async (_label, response) => {
    const fetchMock = response ? jest.fn().mockResolvedValue(response) : jest.fn().mockRejectedValue(new Error('synthetic outage'));
    global.fetch = fetchMock as typeof fetch;
    window.history.replaceState({}, '', '/register');
    render(<RegistrationPage />);
    fillCommonFields();
    submit();
    await waitFor(() => expect(screen.getAllByRole('alert').some((node) => Boolean(node.textContent?.trim()))).toBe(true));
    expect(window.location.pathname).toBe('/register');
    expect(screen.queryByRole('status', { name: /success/i })).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem('libconnect.registrationNotice')).toBeNull();
  });

  test.each([
    ['MEMBER', 'ACTIVE', /member registration complete/i],
    ['LIBRARIAN', 'INACTIVE', /librarian registration complete/i],
  ] as const)('valid %s success is announced, counts down, and retains a login notice', async (type, status, message) => {
    global.fetch = jest.fn().mockResolvedValue({ status: 201, json: async () => ({ accountType: type, accountStatus: status }) }) as typeof fetch;
    const page = render(<RegistrationPage />);
    if (type === 'LIBRARIAN') {
      fireEvent.click(screen.getByRole('radio', { name: /librarian/i }));
      fireEvent.change(screen.getByLabelText(/employee id/i), { target: { value: 'EMP-123' } });
    }
    fillCommonFields();
    jest.useFakeTimers();
    await act(async () => { submit(); });
    expect(screen.getByRole('status')).toHaveTextContent(message);
    expect(screen.getByRole('status')).toHaveTextContent(/returning to login in 5 seconds/i);
    expect(screen.getByRole('link', { name: /go to login now/i })).toHaveAttribute('href', '/');
    if (type === 'LIBRARIAN') expect(screen.getByRole('status')).toHaveTextContent(/manager librarian must activate/i);
    expect(window.sessionStorage.getItem('libconnect.registrationNotice')).toBe(type);
    for (let second = 0; second < 4; second += 1) {
      await act(async () => { jest.advanceTimersByTime(1000); });
    }
    expect(screen.getByRole('status')).toHaveTextContent(/returning to login in 1 seconds/i);
    page.unmount();
    render(<LoginPage />);
    expect(screen.getByRole('status')).toHaveTextContent(message);
    expect(window.sessionStorage.getItem('libconnect.registrationNotice')).toBeNull();
  });

  test('redirects to login after five seconds, and not before', async () => {
    const originalLocation = Object.getOwnPropertyDescriptor(window, 'location')!;
    const assign = jest.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, assign },
    });
    try {
      global.fetch = jest.fn().mockResolvedValue({
        status: 201, json: async () => ({ accountType: 'MEMBER', accountStatus: 'ACTIVE' }),
      }) as typeof fetch;
      jest.useFakeTimers();
      render(<RegistrationPage />);
      fillCommonFields();
      await act(async () => { submit(); });
      for (let second = 0; second < 4; second += 1) {
        await act(async () => { jest.advanceTimersByTime(1000); });
      }
      expect(assign).not.toHaveBeenCalled();
      await act(async () => { jest.advanceTimersByTime(1000); });
      expect(assign).toHaveBeenCalledTimes(1);
      expect(assign).toHaveBeenCalledWith('/');
    } finally {
      Object.defineProperty(window, 'location', originalLocation);
    }
  });
});
