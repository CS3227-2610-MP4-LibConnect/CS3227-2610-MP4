import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../src/LoginPage';

function fillLogin(email: string, password: string) {
  fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText(/password/i), {
    target: { value: password },
  });
}

function chooseAccountType(type: 'STUDENT' | 'TA') {
  const name = new RegExp(type, 'i');
  const radio = screen.queryByRole('radio', { name });
  if (radio) {
    fireEvent.click(radio);
    expect(radio).toBeChecked();
    return;
  }
  const button = screen.queryByRole('button', { name });
  if (button) {
    fireEvent.click(button);
    return;
  }
  const selector = screen.getByRole('combobox');
  fireEvent.change(selector, { target: { value: type } });
  expect(selector).toHaveValue(type);
}

function submitLogin() {
  fireEvent.click(screen.getByRole('button', { name: /log\s*in|sign\s*in/i }));
}

function mockLoginResponse(status: number, body: unknown) {
  const originalFetch = global.fetch;
  const request = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => typeof body === 'string' ? body : JSON.stringify(body),
  } as Response);
  global.fetch = request as typeof fetch;
  return { request, restore: () => { global.fetch = originalFetch; } };
}

describe('role-aware login', () => {
  test('shows labelled credentials, both account types, and a submit action', () => {
    render(<LoginPage />);

    expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');
    expect(screen.getByText(/student/i)).toBeInTheDocument();
    expect(screen.getByText(/^ta$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log\s*in|sign\s*in/i })).toBeInTheDocument();
  });

  test('exposes an accessible radio group with a visible selected account type', () => {
    render(<LoginPage />);

    const studentOption = screen.getByRole('radio', { name: /student/i });
    const taOption = screen.getByRole('radio', { name: /^ta$/i });
    expect(studentOption).toBeChecked();
    expect(taOption).not.toBeChecked();
    expect(studentOption).toHaveAccessibleName('Student');
    expect(taOption).toHaveAccessibleName('TA');

    userEvent.tab();
    expect(studentOption).toHaveFocus();

    fireEvent.click(taOption);
    expect(taOption).toBeChecked();
    expect(studentOption).not.toBeChecked();
    expect(taOption.closest('label')).toHaveClass('is-selected');
  });

  test.each([
    { email: '', password: '', invalidFields: ['email', 'password'] },
    { email: '   ', password: 'synthetic-password', invalidFields: ['email'] },
    { email: 'person@example.test', password: '\t  ', invalidFields: ['password'] },
  ])('rejects blank fields without sending a request: $invalidFields', async ({ email, password, invalidFields }) => {
    const originalFetch = global.fetch;
    const request = jest.fn(() => Promise.reject(new Error('Unexpected network request')));
    global.fetch = request as typeof fetch;

    try {
      render(<LoginPage />);
      fillLogin(email, password);
      submitLogin();

      const errors = await screen.findAllByRole('alert');
      for (const field of invalidFields) {
        expect(errors.some((error) => new RegExp(field, 'i').test(error.textContent || ''))).toBe(true);
      }
      expect(request).not.toHaveBeenCalled();
    } finally {
      global.fetch = originalFetch;
    }
  });

  test.each(['STUDENT', 'TA'] as const)(
    'sends one POST with the selected %s type and exact password',
    async (type) => {
      const { request, restore } = mockLoginResponse(401, {
        message: 'Unable to sign in with those details.',
      });
      try {
        render(<LoginPage />);
        chooseAccountType(type);
        fillLogin('person@example.test', '  synthetic password  ');
        submitLogin();

        await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
        const [url, options] = request.mock.calls[0];
        expect(url).toBe('/api/auth/login');
        expect(options.method).toBe('POST');
        expect(JSON.parse(options.body)).toEqual(expect.objectContaining({
          email: 'person@example.test',
          password: '  synthetic password  ',
          accountType: type,
        }));
      } finally {
        restore();
      }
    }
  );

  test('shows the uniform denial on HTTP 401 without confirming sign-in', async () => {
    const { restore } = mockLoginResponse(401, {
      message: 'Unable to sign in with those details.',
    });
    try {
      render(<LoginPage />);
      fillLogin('unknown@example.test', 'synthetic-password');
      submitLogin();

      await waitFor(() => expect(screen.getAllByRole('alert').some(
        (alert) => alert.textContent === 'Unable to sign in with those details.'
      )).toBe(true));
      expect(screen.queryByText(/signed.?in/i)).not.toBeInTheDocument();
    } finally {
      restore();
    }
  });

  test('shows a retry message on HTTP 503 without confirming sign-in', async () => {
    const { restore } = mockLoginResponse(503, { message: 'Please try again later.' });
    try {
      render(<LoginPage />);
      fillLogin('person@example.test', 'synthetic-password');
      submitLogin();

      await waitFor(() => expect(screen.getAllByRole('alert').some(
        (alert) => /try again/i.test(alert.textContent || '')
      )).toBe(true));
      expect(screen.queryByText(/signed.?in/i)).not.toBeInTheDocument();
    } finally {
      restore();
    }
  });

  test.each([
    { accountType: 'STUDENT', destination: '/student/dashboard' },
    { accountType: 'TA', destination: '/ta/dashboard' },
  ])('navigates to the $accountType dashboard after successful login', async ({ accountType, destination }) => {
    const { restore } = mockLoginResponse(200, { accountType });
    const assign = jest.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, pathname: '/', assign },
    });
    try {
      render(<LoginPage />);
      chooseAccountType(accountType as 'STUDENT' | 'TA');
      fillLogin('person@example.test', 'synthetic-password');
      submitLogin();

      await waitFor(() => expect(assign).toHaveBeenCalledWith(destination));
      expect(screen.queryByText(/signed.?in/i)).not.toBeInTheDocument();
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
      restore();
    }
  });

  test.each([
    {
      responseName: 'invalid JSON',
      json: () => Promise.reject(new SyntaxError('Invalid JSON')),
    },
    {
      responseName: 'a missing account type',
      json: async () => ({}),
    },
    {
      responseName: 'an unsupported account type',
      json: async () => ({ accountType: 'ADMIN' }),
    },
  ])('does not confirm sign-in for HTTP 200 with $responseName', async ({ json }) => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({ status: 200, json } as Response) as typeof fetch;
    try {
      render(<LoginPage />);
      fillLogin('person@example.test', 'synthetic-password');
      submitLogin();

      await waitFor(() => expect(screen.getAllByRole('alert').some(
        (alert) => alert.textContent === 'Unable to complete sign in. Please try again.'
      )).toBe(true));
      expect(screen.queryByText(/signed.?in/i)).not.toBeInTheDocument();
    } finally {
      global.fetch = originalFetch;
    }
  });
});
