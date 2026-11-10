import React, { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import './AccountPages.css';
import AppHeader from './AppHeader';
import { AccountFailure, AccountField, csrfFailure, readFailure, sessionFailure } from './accountFeedback';

export type Account = { name: string; email: string; accountType: 'STUDENT' | 'TA'; isManager?: boolean };
type Entry = { userId: string; name: string; email: string; accountType: 'STUDENT' | 'TA'; accountStatus: 'ACTIVE' | 'INACTIVE'; registrationDateTime: string | null };
// `initialAccount` is the account the route guard already loaded, so the page
// does not fetch /api/account a second time. Retries always refetch.
type Props = { mode: 'account' | 'students' | 'tas' | 'password-change'; initialAccount?: Account };
type Feedback = AccountFailure | null;
class AccountActionError extends Error {
  constructor(readonly accountFailure: AccountFailure) {
    super(accountFailure.message);
    this.name = 'AccountActionError';
  }
}

async function csrf(): Promise<string> {
  const response = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
  if (response.status === 401) throw new Error('session');
  let body: { csrfToken?: unknown };
  try { body = await response.json(); } catch { throw new Error('csrf'); }
  if (!response.ok || typeof body.csrfToken !== 'string' || !body.csrfToken) throw new Error('csrf');
  return body.csrfToken;
}
const actionFallback = (action: 'profile' | 'password' | 'support'): AccountFailure => ({
  message: action === 'profile' ? 'Could not save your profile. Please try again.'
    : action === 'password' ? 'Could not change your password. Please try again.'
      : 'Could not complete this support action. Please try again.',
});

export default function AccountPages({ mode, initialAccount }: Props) {
  const [account, setAccount] = useState<Account | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<{ value: string; name: string } | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loadRetry, setLoadRetry] = useState<'account' | 'support' | 'session'>('account');
  const [profileError, setProfileError] = useState<Feedback>(null);
  const [passwordError, setPasswordError] = useState<Feedback>(null);
  const [supportError, setSupportError] = useState<Feedback>(null);
  const [logoutError, setLogoutError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const loadAlert = useRef<HTMLParagraphElement>(null);
  const profileAlert = useRef<HTMLDivElement>(null);
  const passwordAlert = useRef<HTMLDivElement>(null);
  const supportAlert = useRef<HTMLDivElement>(null);
  const profileFields = useRef<Record<string, HTMLInputElement | null>>({});
  const passwordFields = useRef<Record<string, HTMLInputElement | null>>({});
  const type = mode === 'students' ? 'STUDENT' : 'TA';

  async function actionToken(action: 'profile' | 'password' | 'support') {
    try { return await csrf(); } catch (error) {
      throw new AccountActionError(error instanceof Error && error.message === 'session' ? sessionFailure() : csrfFailure(action));
    }
  }
  const loadAccount = useCallback(async () => {
    const response = await fetch('/api/account', { credentials: 'same-origin' });
    if (!response.ok) throw new Error('Could not load your account.');
    setAccount(await response.json());
  }, []);
  const loadEntries = useCallback(async (cursor?: string) => {
    const query = new URLSearchParams({ type, limit: '50', ...(cursor ? { cursor } : {}) });
    const response = await fetch(`/api/support/accounts?${query}`, { credentials: 'same-origin' });
    if (!response.ok) throw new Error('Could not load accounts.');
    const body = await response.json();
    setEntries((previous) => cursor ? [...previous, ...body.accounts] : body.accounts);
    setNextCursor(body.nextCursor || null);
  }, [type]);
  const loadPage = useCallback(async (retry?: 'account' | 'support' | 'session') => {
    setLoading(true); setLoadError('');
    try {
      if (mode === 'password-change') {
        setLoadRetry('session');
        const response = await fetch('/api/auth/session', { credentials: 'same-origin' });
        if (response.status === 401) { window.location.assign('/'); return; }
        if (!response.ok) throw new Error('Could not verify your session.');
        const session = await response.json() as Account & { mustChangePassword?: boolean };
        setAccount(session);
        if (!session.mustChangePassword) window.location.assign(session.accountType === 'STUDENT' ? '/student/dashboard' : '/ta/dashboard');
      } else {
        if (retry === 'support') {
          setLoadRetry('support');
          await loadEntries();
        } else {
          setLoadRetry('account');
          if (initialAccount && !retry) setAccount(initialAccount);
          else await loadAccount();
          if (mode === 'students' || mode === 'tas') {
            setLoadRetry('support');
            await loadEntries();
          }
        }
      }
    } catch (error) { setLoadError(error instanceof Error && error.message === 'Could not load accounts.' ? error.message
      : error instanceof Error && error.message === 'Could not load your account.' ? error.message
        : mode === 'password-change' ? 'Could not verify your session.' : 'Could not load account details.'); }
    finally { setLoading(false); }
  }, [initialAccount, loadAccount, loadEntries, mode]);
  useEffect(() => { void loadPage(); }, [loadPage]);
  useEffect(() => { if (loadError) loadAlert.current?.focus(); }, [loadError]);
  useEffect(() => {
    if (profileError) (profileError.field ? profileFields.current[profileError.field] : profileAlert.current)?.focus();
  }, [profileError]);
  useEffect(() => {
    if (passwordError) (passwordError.field ? passwordFields.current[passwordError.field] : passwordAlert.current)?.focus();
  }, [passwordError]);
  useEffect(() => { if (supportError) supportAlert.current?.focus(); }, [supportError]);

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true); setProfileError(null); setMessage('');
    const form = new FormData(event.currentTarget);
    const body: Record<string, string> = {};
    for (const key of ['name', 'email', 'currentPassword']) { const value = String(form.get(key) || ''); if (value) body[key] = value; }
    try {
      const token = await actionToken('profile');
      const response = await fetch('/api/account/profile', { method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token }, body: JSON.stringify(body) });
      if (!response.ok) { setProfileError(await readFailure(response, 'profile')); return; }
      setAccount(await response.json()); setMessage('Account details updated.');
    } catch (error) { setProfileError(error instanceof AccountActionError ? error.accountFailure : actionFallback('profile')); }
    finally { setBusy(false); }
  };

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true); setPasswordError(null); setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const token = await actionToken('password');
      const response = await fetch('/api/account/password', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token }, body: JSON.stringify({ currentPassword: form.get('currentPassword'), newPassword: form.get('newPassword') }) });
      if (!response.ok) { setPasswordError(await readFailure(response, 'password', mode === 'password-change')); return; }
      setTemporaryPassword(null); setMessage('Password changed.');
      if (mode === 'password-change') window.location.assign(account?.accountType === 'STUDENT' ? '/student/dashboard' : '/ta/dashboard');
    } catch (error) { setPasswordError(error instanceof AccountActionError ? error.accountFailure : actionFallback('password')); }
    finally { setBusy(false); }
  };

  const changeStatus = async (entry: Entry) => {
    const next = entry.accountStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (next === 'INACTIVE' && !window.confirm(`Deactivate ${entry.name}? They will be signed out.`)) return;
    setBusy(true); setSupportError(null); setMessage('');
    try {
      const token = await actionToken('support');
      const response = await fetch(`/api/support/accounts/${encodeURIComponent(entry.userId)}/status`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token }, body: JSON.stringify({ accountStatus: next }) });
      if (!response.ok) { setSupportError(await readFailure(response, 'support')); return; }
      await loadEntries(); setMessage(`${entry.name} is now ${next.toLowerCase()}.`);
    } catch (error) { setSupportError(error instanceof AccountActionError ? error.accountFailure : actionFallback('support')); }
    finally { setBusy(false); }
  };

  const resetPassword = async (entry: Entry) => {
    if (!window.confirm(`Issue a temporary password for ${entry.name}?`)) return;
    setBusy(true); setSupportError(null); setMessage(''); setTemporaryPassword(null);
    try {
      const token = await actionToken('support');
      const response = await fetch(`/api/support/accounts/${encodeURIComponent(entry.userId)}/password-reset`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token }, body: '{}' });
      if (!response.ok) { setSupportError(await readFailure(response, 'support')); return; }
      let body: { temporaryPassword?: unknown } = {};
      try { body = await response.json(); } catch { /* use the local fallback below */ }
      if (typeof body.temporaryPassword !== 'string') { setSupportError(actionFallback('support')); return; }
      setTemporaryPassword({ value: body.temporaryPassword, name: entry.name }); setCopyStatus('idle'); setMessage(`Temporary password created for ${entry.name}.`);
    } catch (error) { setSupportError(error instanceof AccountActionError ? error.accountFailure : actionFallback('support')); }
    finally { setBusy(false); }
  };

  const logout = async () => {
    try {
      const token = await csrf();
      const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': token } });
      if (response.status === 204 || response.status === 401) { window.location.assign('/'); return; }
      setLogoutError('Could not confirm sign out. Please try again.');
    } catch { setLogoutError('Could not confirm sign out. Please try again.'); }
  };
  const fieldProps = (action: 'profile' | 'password', field: AccountField) => {
    const feedback = action === 'profile' ? profileError : passwordError;
    const invalid = feedback?.field === field;
    return { id: `${action}-${field}`, ref: (element: HTMLInputElement | null) => { (action === 'profile' ? profileFields : passwordFields).current[field] = element; },
      'aria-invalid': invalid ? true : undefined, 'aria-describedby': invalid ? `${action}-${field}-error` : undefined,
      onChange: () => { if (invalid) action === 'profile' ? setProfileError(null) : setPasswordError(null); } };
  };
  const feedbackBox = (feedback: Feedback, id: string, ref: React.RefObject<HTMLDivElement | null>) => feedback && !feedback.field && <div id={id} className="account-form-error" role="alert" tabIndex={-1} ref={ref}>
    <p>{feedback.message}</p>{feedback.signIn && <> <a href="/">Sign in</a></>}
  </div>;

  // Support actions on one's own account are refused by the server (account-management R4);
  // hide them here so the page does not offer an action that can only fail.
  const ownEmail = typeof account?.email === 'string' ? account.email.trim().toLowerCase() : '';
  const isOwnEntry = (entry: Entry) => Boolean(ownEmail) && entry.email.trim().toLowerCase() === ownEmail;
  return <>{account && <AppHeader accountType={account.accountType} isManager={account.isManager} activePath={window.location.pathname} restricted={mode === 'password-change'} onLogout={() => void logout()} />}<main className="account-page">
    <p className="eyebrow">CodeClinic account</p>
    <h1>{mode === 'account' ? 'Account' : mode === 'students' ? 'Students' : mode === 'tas' ? 'TAs' : 'Change your password'}</h1>
    {logoutError && <p role="alert">{logoutError}</p>}
    {loadError && <p role="alert" tabIndex={-1} ref={loadAlert}>{loadError} <button type="button" onClick={() => void loadPage(loadRetry)}>Retry</button></p>}
    {message && <p role="status">{message}</p>}{loading && <p role="status" aria-busy="true">Loading account details…</p>}
    {mode === 'account' && <>
      <form className="account-panel account-form" onSubmit={submitProfile}>
        <h2>Profile</h2>{feedbackBox(profileError, 'profile-error', profileAlert)}
        <label htmlFor="profile-name">Name<input {...fieldProps('profile', 'name')} name="name" defaultValue={account?.name || ''} maxLength={200} required /></label>
        {profileError?.field === 'name' && <p id="profile-name-error" className="account-field-error" role="alert">{profileError.message}</p>}
        <label htmlFor="profile-email">Email<input {...fieldProps('profile', 'email')} name="email" type="email" defaultValue={account?.email || ''} maxLength={254} required /></label>
        {profileError?.field === 'email' && <p id="profile-email-error" className="account-field-error" role="alert">{profileError.message}</p>}
        <label htmlFor="profile-currentPassword">Current password <span>(required when changing email)</span><input {...fieldProps('profile', 'currentPassword')} name="currentPassword" type="password" autoComplete="current-password" /></label>
        {profileError?.field === 'currentPassword' && <p id="profile-currentPassword-error" className="account-field-error" role="alert">{profileError.message}</p>}
        <button className="submit-button" disabled={busy}>Save profile</button>
      </form>
      <form className="account-panel account-form" onSubmit={submitPassword}>
        <h2>Password</h2>{feedbackBox(passwordError, 'password-error', passwordAlert)}
        <label htmlFor="password-currentPassword">Current password<input {...fieldProps('password', 'currentPassword')} name="currentPassword" type="password" autoComplete="current-password" required /></label>
        {passwordError?.field === 'currentPassword' && <p id="password-currentPassword-error" className="account-field-error" role="alert">{passwordError.message}</p>}
        <label htmlFor="password-newPassword">New password<input {...fieldProps('password', 'newPassword')} name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={1024} required /></label>
        {passwordError?.field === 'newPassword' && <p id="password-newPassword-error" className="account-field-error" role="alert">{passwordError.message}</p>}
        <button className="submit-button" disabled={busy}>Change password</button>
      </form>
    </>}
    {mode === 'password-change' && <form className="account-panel account-form" onSubmit={submitPassword}>
      <p>Your account has a temporary password. Choose a new password to continue.</p>{feedbackBox(passwordError, 'password-error', passwordAlert)}
      <label htmlFor="password-currentPassword">Temporary password<input {...fieldProps('password', 'currentPassword')} name="currentPassword" type="password" autoComplete="current-password" required /></label>
      {passwordError?.field === 'currentPassword' && <p id="password-currentPassword-error" className="account-field-error" role="alert">{passwordError.message}</p>}
      <label htmlFor="password-newPassword">New password<input {...fieldProps('password', 'newPassword')} name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={1024} required /></label>
      {passwordError?.field === 'newPassword' && <p id="password-newPassword-error" className="account-field-error" role="alert">{passwordError.message}</p>}
      <button className="submit-button" disabled={busy}>Set new password</button>
    </form>}
    {temporaryPassword && <section className="account-panel temp-password" aria-labelledby="temp-password-title">
      <h2 id="temp-password-title">Temporary password for {temporaryPassword.name}</h2>
      <p className="temp-password__warning"><strong>Copy it now. It will not be shown again.</strong> Share it with {temporaryPassword.name} outside CodeClinic. They will be asked to set a new password when they next sign in.</p>
      <div className="temp-password__row">
        <code className="temp-password__value">{temporaryPassword.value}</code>
        <button type="button" className="temp-password__copy" onClick={() => {
          const clipboard = navigator.clipboard;
          if (!clipboard) { setCopyStatus('failed'); return; }
          clipboard.writeText(temporaryPassword.value).then(() => setCopyStatus('copied'), () => setCopyStatus('failed'));
        }}>{copyStatus === 'copied' ? 'Copied ✓' : 'Copy password'}</button>
      </div>
      <p className="temp-password__copy-status" role="status">{copyStatus === 'copied' ? 'Password copied to the clipboard.' : copyStatus === 'failed' ? 'Could not copy automatically. Select the password and copy it manually.' : ''}</p>
      <button type="button" className="temp-password__done" onClick={() => { setTemporaryPassword(null); setCopyStatus('idle'); setMessage(''); }}>Done</button>
    </section>}
    {(mode === 'students' || mode === 'tas') && <section className="account-panel">
      {supportError && <div className="account-form-error" role="alert" tabIndex={-1} ref={supportAlert}><p>{supportError.message}</p>{supportError.signIn && <> <a href="/">Sign in</a></>}</div>}
      {!loading && !loadError && entries.length === 0 ? <p>No accounts found.</p> : entries.length > 0 && <ul className="account-list">{entries.map((entry) => <li key={entry.userId}>
        <div><strong>{entry.name}{isOwnEntry(entry) && <span className="account-self-badge"> (you)</span>}</strong><span>{entry.email} · {entry.accountStatus}</span></div>
        {isOwnEntry(entry)
          ? <p className="account-self-note">Manage your own account on your <a href="/ta/account">Account page</a>.</p>
          : <>
            <button type="button" disabled={busy} onClick={() => void changeStatus(entry)}>{entry.accountStatus === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button>
            <button type="button" disabled={busy} onClick={() => void resetPassword(entry)}>Reset password</button>
          </>}
      </li>)}</ul>}
      {nextCursor && <button type="button" disabled={busy} onClick={() => { setSupportError(null); void loadEntries(nextCursor).catch(() => setSupportError(actionFallback('support'))); }}>Load more</button>}
    </section>}
  </main></>;
}
