import React, { useEffect, useRef, useState } from 'react';
import './LoginPage.css';

type AccountType = 'STUDENT' | 'TA';
type Field = 'name' | 'email' | 'password' | 'confirmation' | 'employeeId';
type Errors = Partial<Record<Field, string>>;
const REGISTRATION_NOTICE_KEY = 'codeclinic.registrationNotice';
const byteLength = (value: string) => new Blob([value]).size;
const REGISTRATION_EMAIL_FORMAT = /^[^\s@.]+(\.[^\s@.]+)*@[^\s@.]+(\.[^\s@.]+)+$/;

function RegistrationPage() {
  const [accountType, setAccountType] = useState<AccountType>('STUDENT');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedType, setCompletedType] = useState<AccountType | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(5);
  const pending = useRef(false);

  useEffect(() => {
    if (!completedType) return;
    if (secondsRemaining === 0) {
      window.location.assign('/');
      return;
    }
    const timer = window.setTimeout(() => setSecondsRemaining(secondsRemaining - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [completedType, secondsRemaining]);

  function rememberSuccess(type: AccountType) {
    try {
      window.sessionStorage.setItem(REGISTRATION_NOTICE_KEY, type);
    } catch {
      // Storage can be unavailable; the visible success message still remains.
    }
  }

  function clearError(field: Field) {
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function selectType(next: AccountType) {
    setAccountType(next);
    setFormError('');
    if (next === 'STUDENT') {
      setEmployeeId('');
      clearError('employeeId');
    }
  }

  async function submitRegistration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    setFormError('');
    const nextErrors: Errors = {};
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanEmployeeId = employeeId.trim();
    if (!cleanName) nextErrors.name = 'Enter your name.';
    else if (byteLength(cleanName) > 200) nextErrors.name = 'Name must be at most 200 bytes.';
    if (!cleanEmail) nextErrors.email = 'Enter your email address.';
    else if (byteLength(cleanEmail) > 254) nextErrors.email = 'Email must be at most 254 bytes.';
    else if (!REGISTRATION_EMAIL_FORMAT.test(cleanEmail)) nextErrors.email = 'Enter a valid email address.';
    if (!password.trim()) nextErrors.password = 'Enter a password.';
    else if (password.length < 8) nextErrors.password = 'Password must be at least 8 characters.';
    else if (byteLength(password) > 1024) nextErrors.password = 'Password must be at most 1024 bytes.';
    if (!confirmation.trim()) nextErrors.confirmation = 'Confirm your password.';
    else if (confirmation !== password) nextErrors.confirmation = 'Passwords must match.';
    if (accountType === 'TA') {
      if (!cleanEmployeeId) nextErrors.employeeId = 'Enter your employee ID.';
      else if (byteLength(cleanEmployeeId) > 64) nextErrors.employeeId = 'Employee ID must be at most 64 bytes.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    pending.current = true;
    setIsSubmitting(true);
    try {
      const payload = {
        accountType, name: cleanName, email: cleanEmail, password,
        ...(accountType === 'TA' ? { employeeId: cleanEmployeeId } : {}),
      };
      const response = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (response.status === 409) setFormError('Registration could not be completed. Please check your details or try again.');
      else if (response.status === 429) setFormError('Too many attempts. Please try again later.');
      else if (response.status === 503) setFormError('Registration is temporarily unavailable. Please try again later.');
      else if (response.status !== 201) setFormError('Unable to register. Please check your details and try again.');
      else {
        const body: unknown = await response.json();
        const result = body as { accountType?: unknown; accountStatus?: unknown } | null;
        const expectedStatus = accountType === 'STUDENT' ? 'ACTIVE' : 'INACTIVE';
        if (!result || typeof result !== 'object' || Array.isArray(result) ||
            Object.keys(result).sort().join(',') !== 'accountStatus,accountType' ||
            result.accountType !== accountType || result.accountStatus !== expectedStatus)
          setFormError('Unable to confirm registration. Please try again later.');
        else {
          rememberSuccess(accountType);
          setCompletedType(accountType);
        }
      }
    } catch {
      setFormError('Registration is temporarily unavailable. Please try again later.');
    } finally {
      pending.current = false;
      setIsSubmitting(false);
    }
  }

  function fieldError(field: Field) {
    return <div id={`${field}-error`} className="field-error" role={errors[field] ? 'alert' : undefined}>{errors[field]}</div>;
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="registration-title">
        <div className="brand-mark" aria-hidden="true">C</div>
        <p className="eyebrow">CODECLINIC</p>
        <h1 id="registration-title">Register</h1>
        <p className="login-intro">Create your CodeClinic account.</p>
        {completedType ? <div role="status" aria-live="polite">
          <p>{completedType === 'STUDENT'
            ? 'Student registration complete. You can now sign in.'
            : 'TA registration complete. A TA Coordinator must activate your account before you can sign in.'}</p>
          <p>Returning to login in {secondsRemaining} seconds.</p>
          <p><a href="/">Go to login now</a></p>
        </div> : <>
          <form className="login-form" noValidate onSubmit={submitRegistration}>
            <fieldset className="account-type-fieldset" disabled={isSubmitting}>
              <legend>Register as</legend>
              <div className="account-type-options">
                {(['STUDENT', 'TA'] as const).map((type) => (
                  <label key={type} className={`account-type-option${accountType === type ? ' is-selected' : ''}`}>
                    <input type="radio" name="accountType" value={type} checked={accountType === type} onChange={() => selectType(type)} />
                    <span className="option-icon" aria-hidden="true">{type[0]}</span>
                    <span>{type === 'STUDENT' ? 'Student' : 'TA'}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {accountType === 'TA' && <p role="note">A TA Coordinator must activate your account before you can sign in.</p>}
            <div className="form-field">
              <label htmlFor="name">Name</label>
              <input id="name" name="name" autoComplete="name" value={name} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'name-error' : undefined} onChange={(event) => { setName(event.target.value); clearError('name'); }} />
              {fieldError('name')}
            </div>
            <div className="form-field">
              <label htmlFor="email">Email address</label>
              <input id="email" name="email" type="email" autoComplete="email" value={email} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} onChange={(event) => { setEmail(event.target.value); clearError('email'); }} />
              {fieldError('email')}
            </div>
            <div className="form-field">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" autoComplete="new-password" value={password} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'password-error' : undefined} onChange={(event) => { setPassword(event.target.value); clearError('password'); }} />
              {fieldError('password')}
            </div>
            <div className="form-field">
              <label htmlFor="confirmation">Confirm password</label>
              <input id="confirmation" name="confirmation" type="password" autoComplete="new-password" value={confirmation} aria-invalid={Boolean(errors.confirmation)} aria-describedby={errors.confirmation ? 'confirmation-error' : undefined} onChange={(event) => { setConfirmation(event.target.value); clearError('confirmation'); }} />
              {fieldError('confirmation')}
            </div>
            {accountType === 'TA' && <div className="form-field">
              <label htmlFor="employeeId">Employee ID</label>
              <input id="employeeId" name="employeeId" value={employeeId} aria-invalid={Boolean(errors.employeeId)} aria-describedby={errors.employeeId ? 'employeeId-error' : undefined} onChange={(event) => { setEmployeeId(event.target.value); clearError('employeeId'); }} />
              {fieldError('employeeId')}
            </div>}
            {formError && <div className="form-error" role="alert">{formError}</div>}
            <button className="submit-button" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating account…' : 'Create account'}</button>
          </form>
          <p className="login-footer"><a href="/">Back to login</a></p>
        </>}
      </section>
    </main>
  );
}

export default RegistrationPage;
