import React, { useEffect, useState } from 'react';
import './LoginPage.css';

type AccountType = 'STUDENT' | 'TA';
const REGISTRATION_NOTICE_KEY = 'codeclinic.registrationNotice';

function readRegistrationNotice(): AccountType | null {
  try {
    const value = window.sessionStorage.getItem(REGISTRATION_NOTICE_KEY);
    return value === 'STUDENT' || value === 'TA' ? value : null;
  } catch {
    return null;
  }
}

function LoginPage() {
  const [registrationNotice] = useState(readRegistrationNotice);
  useEffect(() => {
    if (registrationNotice) {
      try { window.sessionStorage.removeItem(REGISTRATION_NOTICE_KEY); } catch { /* Storage can be unavailable. */ }
    }
  }, [registrationNotice]);
  const [accountType, setAccountType] = useState<AccountType>('STUDENT');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');
    const nextFieldErrors: { email?: string; password?: string } = {};
    if (!email.trim()) nextFieldErrors.email = 'Enter your email address.';
    if (!password.trim()) nextFieldErrors.password = 'Enter your password.';
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, accountType }),
      });

      if (response.status === 401) {
        setFormError('Unable to sign in with those details.');
        return;
      }
      if (response.status === 503) {
        setFormError('Sign in is temporarily unavailable. Please try again later.');
        return;
      }
      if (response.status !== 200) {
        setFormError('Unable to complete sign in. Please try again.');
        return;
      }

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        setFormError('Unable to complete sign in. Please try again.');
        return;
      }

      const returnedType = (body as { accountType?: unknown } | null)?.accountType;
      if (returnedType !== 'STUDENT' && returnedType !== 'TA') {
        setFormError('Unable to complete sign in. Please try again.');
        return;
      }
      window.location.assign(returnedType === 'STUDENT' ? '/student/dashboard' : '/ta/dashboard');
    } catch {
      setFormError('Sign in is temporarily unavailable. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="brand-mark" aria-hidden="true">C</div>
        <p className="eyebrow">CODECLINIC</p>
        <h1 id="login-title">Welcome back</h1>
        <p className="login-intro">Sign in to continue to CodeClinic.</p>
        {registrationNotice && <p role="status" aria-live="polite">
          {registrationNotice === 'STUDENT'
            ? 'Student registration complete. You can now sign in.'
            : 'TA registration complete. A TA Coordinator must activate your account before you can sign in.'}
        </p>}

        <form className="login-form" noValidate onSubmit={submitLogin}>
          <fieldset className="account-type-fieldset">
            <legend>Sign in as</legend>
            <div className="account-type-options">
              <label className={`account-type-option${accountType === 'STUDENT' ? ' is-selected' : ''}`}>
                <input
                  type="radio"
                  name="accountType"
                  value="STUDENT"
                  checked={accountType === 'STUDENT'}
                  onChange={() => setAccountType('STUDENT')}
                />
                <span className="option-icon" aria-hidden="true">S</span>
                <span>Student</span>
              </label>
              <label className={`account-type-option${accountType === 'TA' ? ' is-selected' : ''}`}>
                <input
                  type="radio"
                  name="accountType"
                  value="TA"
                  checked={accountType === 'TA'}
                  onChange={() => setAccountType('TA')}
                />
                <span className="option-icon" aria-hidden="true">T</span>
                <span>TA</span>
              </label>
            </div>
          </fieldset>

          <div className="form-field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="you@example.com"
              aria-describedby="email-error"
              aria-invalid={Boolean(fieldErrors.email)}
              onChange={() => setFieldErrors((errors) => ({ ...errors, email: undefined }))}
            />
            <div id="email-error" className="field-error" role="alert" aria-live="polite">{fieldErrors.email}</div>
          </div>

          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              aria-describedby="password-error"
              aria-invalid={Boolean(fieldErrors.password)}
              onChange={() => setFieldErrors((errors) => ({ ...errors, password: undefined }))}
            />
            <div id="password-error" className="field-error" role="alert" aria-live="polite">{fieldErrors.password}</div>
          </div>

          <div className="form-error" role="alert" aria-live="polite">{formError}</div>
          <button className="submit-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'} <span aria-hidden="true">→</span>
          </button>
        </form>

        <p className="login-footer">New to CodeClinic? <a href="/register">Register</a></p>
      </section>
    </main>
  );
}

export default LoginPage;
