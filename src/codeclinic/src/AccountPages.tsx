import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import './AccountPages.css';
import { NotificationBell } from './notifications/Notifications';

type Account = { name: string; email: string; accountType: 'STUDENT' | 'TA'; isManager?: boolean };
type Entry = { userId: string; name: string; email: string; accountType: 'STUDENT' | 'TA'; accountStatus: 'ACTIVE' | 'INACTIVE'; registrationDateTime: string | null };
type Props = { mode: 'account' | 'students' | 'tas' | 'password-change' };

async function csrf() {
  const response = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
  const body = await response.json();
  if (!response.ok || typeof body.csrfToken !== 'string') throw new Error('Could not verify this request.');
  return body.csrfToken as string;
}

export default function AccountPages({ mode }: Props) {
  const [account, setAccount] = useState<Account | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const type = mode === 'students' ? 'STUDENT' : 'TA';

  const loadAccount = useCallback(async () => {
    const response = await fetch('/api/account', { credentials: 'same-origin' });
    if (!response.ok) throw new Error('Could not load your account.');
    setAccount(await response.json());
  }, []);
  const loadEntries = useCallback(async (cursor?: string) => {
    const query = new URLSearchParams({ type, limit: '50', ...(cursor ? { cursor } : {}) });
    const response = await fetch(`/api/support/accounts?${query}`, { credentials: 'same-origin' });
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || 'Could not load accounts.');
    setEntries((previous) => cursor ? [...previous, ...body.accounts] : body.accounts);
    setNextCursor(body.nextCursor || null);
  }, [type]);
  const loadPage = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (mode === 'password-change') {
        const response = await fetch('/api/auth/session', { credentials: 'same-origin' });
        if (response.status === 401) { window.location.assign('/'); return; }
        if (!response.ok) throw new Error('Could not verify your session.');
        const session = await response.json() as Account & { mustChangePassword?: boolean };
        setAccount(session);
        if (!session.mustChangePassword) window.location.assign(session.accountType === 'STUDENT' ? '/student/dashboard' : '/ta/dashboard');
      } else {
        await Promise.all([loadAccount(), ...(mode === 'students' || mode === 'tas' ? [loadEntries()] : [])]);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load account details.'); }
    finally { setLoading(false); }
  }, [loadAccount, loadEntries, mode]);
  useEffect(() => { void loadPage(); }, [loadPage]);

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    const form = new FormData(event.currentTarget);
    const body: Record<string, string> = {};
    for (const key of ['name', 'email', 'currentPassword']) {
      const value = String(form.get(key) || ''); if (value) body[key] = value;
    }
    try {
      const response = await fetch('/api/account/profile', { method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': await csrf() }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Could not update your account.');
      setAccount(result); setMessage('Account details updated.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update your account.'); }
    finally { setBusy(false); }
  };

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/account/password', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': await csrf() }, body: JSON.stringify({ currentPassword: form.get('currentPassword'), newPassword: form.get('newPassword') }) });
      if (!response.ok) { const body = await response.json(); throw new Error(body.message || 'Could not change your password.'); }
      setTemporaryPassword(null); setMessage('Password changed.');
      if (mode === 'password-change') window.location.assign(account?.accountType === 'STUDENT' ? '/student/dashboard' : '/ta/dashboard');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not change your password.'); }
    finally { setBusy(false); }
  };

  const changeStatus = async (entry: Entry) => {
    const next = entry.accountStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (next === 'INACTIVE' && !window.confirm(`Deactivate ${entry.name}? They will be signed out.`)) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch(`/api/support/accounts/${encodeURIComponent(entry.userId)}/status`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': await csrf() }, body: JSON.stringify({ accountStatus: next }) });
      if (!response.ok) { const body = await response.json(); throw new Error(body.message || 'Could not update account status.'); }
      await loadEntries(); setMessage(`${entry.name} is now ${next.toLowerCase()}.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update account status.'); }
    finally { setBusy(false); }
  };

  const resetPassword = async (entry: Entry) => {
    if (!window.confirm(`Issue a temporary password for ${entry.name}?`)) return;
    setBusy(true); setError(''); setMessage(''); setTemporaryPassword(null);
    try {
      const response = await fetch(`/api/support/accounts/${encodeURIComponent(entry.userId)}/password-reset`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': await csrf() }, body: '{}' });
      const body = await response.json();
      if (!response.ok || typeof body.temporaryPassword !== 'string') throw new Error(body.message || 'Could not reset password.');
      setTemporaryPassword(body.temporaryPassword); setMessage(`Temporary password for ${entry.name}. Copy it now; it will not be shown again.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not reset password.'); }
    finally { setBusy(false); }
  };

  const logout = async () => {
    try {
      const token = await csrf();
      const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': token } });
      if (response.status === 204 || response.status === 401) { window.location.assign('/'); return; }
      setError('Could not confirm sign out. Please retry.');
    } catch { setError('Could not confirm sign out. Please retry.'); }
  };

  return <><header className="student-navbar"><a className="student-navbar__brand" href={account?.accountType === 'STUDENT' ? '/student/dashboard' : '/ta/dashboard'}>CodeClinic</a>{mode !== 'password-change' && <><a href={account?.accountType === 'STUDENT' ? '/student/account' : '/ta/account'}>Account</a>{account?.accountType === 'TA' && <a href="/ta/students">Students</a>}{account?.isManager && <a href="/ta/tas">TAs</a>}<NotificationBell /></>}<button type="button" className="student-navbar__logout" onClick={() => void logout()}>Log out</button></header><main className="account-page">
    <p className="eyebrow">CodeClinic account</p>
    <h1>{mode === 'account' ? 'Account' : mode === 'students' ? 'Students' : mode === 'tas' ? 'TAs' : 'Change your password'}</h1>
    {error && <p role="alert">{error} <button type="button" onClick={() => void loadPage()}>Retry</button></p>}{message && <p role="status">{message}</p>}{loading && <p role="status" aria-busy="true">Loading account details…</p>}
    {mode === 'account' && <>
      <form key={`${account?.name || ''}:${account?.email || ''}`} className="account-panel account-form" onSubmit={submitProfile}>
        <h2>Profile</h2><label>Name<input name="name" defaultValue={account?.name || ''} maxLength={200} required /></label>
        <label>Email<input name="email" type="email" defaultValue={account?.email || ''} maxLength={254} required /></label>
        <label>Current password <span>(required when changing email)</span><input name="currentPassword" type="password" autoComplete="current-password" /></label>
        <button className="submit-button" disabled={busy}>Save profile</button>
      </form>
      <form className="account-panel account-form" onSubmit={submitPassword}>
        <h2>Password</h2><label>Current password<input name="currentPassword" type="password" autoComplete="current-password" required /></label>
        <label>New password<input name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={1024} required /></label>
        <button className="submit-button" disabled={busy}>Change password</button>
      </form>
    </>}
    {mode === 'password-change' && <form className="account-panel account-form" onSubmit={submitPassword}>
      <p>Your account has a temporary password. Choose a new password to continue.</p>
      <label>Temporary password<input name="currentPassword" type="password" autoComplete="current-password" required /></label>
      <label>New password<input name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={1024} required /></label>
      <button className="submit-button" disabled={busy}>Set new password</button>
    </form>}
    {(mode === 'students' || mode === 'tas') && <section className="account-panel">
      {!loading && !error && entries.length === 0 ? <p>No accounts found.</p> : entries.length > 0 && <ul className="account-list">{entries.map((entry) => <li key={entry.userId}>
        <div><strong>{entry.name}</strong><span>{entry.email} · {entry.accountStatus}</span></div>
        <button type="button" disabled={busy} onClick={() => void changeStatus(entry)}>{entry.accountStatus === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button>
        <button type="button" disabled={busy} onClick={() => void resetPassword(entry)}>Reset password</button>
      </li>)}</ul>}
      {nextCursor && <button type="button" disabled={busy} onClick={() => void loadEntries(nextCursor).catch((e) => setError(e.message))}>Load more</button>}
    </section>}
    {temporaryPassword && <section className="account-panel" aria-label="Temporary password"><p>This password will not be shown again. Share it with the account owner outside CodeClinic.</p><code>{temporaryPassword}</code><button type="button" onClick={() => void navigator.clipboard?.writeText(temporaryPassword)}>Copy password</button><button type="button" onClick={() => setTemporaryPassword(null)}>Hide password</button></section>}
  </main></>;
}
