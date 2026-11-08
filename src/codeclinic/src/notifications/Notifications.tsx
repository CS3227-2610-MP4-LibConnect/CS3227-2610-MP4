import React, { useCallback, useEffect, useRef, useState } from 'react';
import './Notifications.css';

type NotificationType = 'TICKET_CLAIMED' | 'TICKET_REPLY' | 'TICKET_RESOLVED' | 'SESSION_UPDATE';
export interface NotificationItem {
  notificationId: string;
  notificationType: NotificationType;
  ticketId: string;
  message: string;
  createdAt: string | null;
  read: boolean;
}

type ListResponse = { notifications: NotificationItem[]; nextCursor: string | null };
type InboxState = 'loading' | 'ready' | 'error';
const NOTIFICATIONS_CHANGED = 'codeclinic:notifications-changed';

async function readCsrfToken(): Promise<string> {
  const response = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
  if (!response.ok) throw new Error('Request could not be verified.');
  const body = await response.json() as { csrfToken?: unknown };
  if (typeof body.csrfToken !== 'string' || body.csrfToken.length === 0) {
    throw new Error('Request could not be verified.');
  }
  return body.csrfToken;
}

function typeLabel(type: NotificationType): string {
  return ({ TICKET_CLAIMED: 'Ticket claimed', TICKET_REPLY: 'Ticket reply',
    TICKET_RESOLVED: 'Ticket resolved', SESSION_UPDATE: 'Session update' })[type];
}

function relativeTime(value: string | null): string {
  if (!value) return 'Time unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Bell for dashboard navigation. Count is refreshed whenever this component mounts. */
export function NotificationBell({ active = false }: { active?: boolean }) {
  const [count, setCount] = useState<number | null>(null);
  const mounted = useRef(false);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/unread-count', { credentials: 'same-origin' });
      if (!response.ok) throw new Error('Unread count unavailable.');
      const body = await response.json() as { unreadCount?: unknown };
      if (typeof body.unreadCount !== 'number' || !Number.isFinite(body.unreadCount)) throw new Error('Unread count unavailable.');
      if (mounted.current) setCount(Math.min(99, Math.max(0, Math.floor(body.unreadCount))));
    } catch { if (mounted.current) setCount(null); }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    window.addEventListener(NOTIFICATIONS_CHANGED, refresh);
    return () => { mounted.current = false; window.removeEventListener(NOTIFICATIONS_CHANGED, refresh); };
  }, [refresh]);

  return <a className={`notification-bell${active ? ' notification-bell--active' : ''}`} href="/notifications" aria-current={active ? 'page' : undefined} aria-label={count === null ? 'Notifications' : `Notifications, ${count} unread`}>
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg><span>Notifications</span>
    {count !== null && count > 0 && <span className="notification-bell__count" aria-label={`${count} unread`}>{count}</span>}
  </a>;
}

/** Inbox UI. `ticketHref` lets a dashboard link only to tickets it can open. */
export function NotificationInbox({ ticketHref }: { ticketHref?: (ticketId: string) => string | null }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState<InboxState>('loading');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [retryAction, setRetryAction] = useState<(() => void) | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setState('loading');
    fetch('/api/notifications', { credentials: 'same-origin' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load notifications.');
        return response.json() as Promise<ListResponse>;
      })
      .then((body) => {
        if (!Array.isArray(body.notifications) || !(body.nextCursor === null || typeof body.nextCursor === 'string')) throw new Error('Could not load notifications.');
        if (active) { setItems(body.notifications); setCursor(body.nextCursor); setState('ready'); }
      })
      .catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [refreshKey]);

  const loadMore = async () => {
    if (!cursor || busy) return;
    setBusy(true); setActionError(''); setRetryAction(null);
    try {
      const response = await fetch(`/api/notifications?cursor=${encodeURIComponent(cursor)}`, { credentials: 'same-origin' });
      if (!response.ok) throw new Error();
      const body = await response.json() as ListResponse;
      if (!Array.isArray(body.notifications)) throw new Error();
      if (mounted.current) { setItems((current) => [...current, ...body.notifications]); setCursor(body.nextCursor); }
    } catch {
      if (mounted.current) {
        setActionError('Could not load more notifications. Please retry.');
        setRetryAction(() => () => { void loadMore(); });
      }
    } finally { if (mounted.current) setBusy(false); }
  };

  const markRead = async (item: NotificationItem): Promise<boolean> => {
    if (item.read) return true;
    if (busy) return false;
    setBusy(true); setActionError(''); setRetryAction(null);
    try {
      const csrfToken = await readCsrfToken();
      const response = await fetch(`/api/notifications/${encodeURIComponent(item.notificationId)}/read`, {
        method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': csrfToken },
      });
      if (!response.ok) throw new Error();
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
      if (mounted.current) setItems((current) => current.map((entry) => entry.notificationId === item.notificationId ? { ...entry, read: true } : entry));
      return true;
    } catch {
      if (mounted.current) {
        setActionError('Could not mark this notification as read. Please retry.');
        setRetryAction(() => () => { void markRead(item); });
      }
      return false;
    } finally { if (mounted.current) setBusy(false); }
  };

  const openTicket = async (event: React.MouseEvent<HTMLAnchorElement>, item: NotificationItem, href: string) => {
    event.preventDefault();
    if (busy) return;
    if (item.read) { window.location.assign(href); return; }
    if (await markRead(item) && mounted.current) window.location.assign(href);
  };

  const markAllRead = async () => {
    if (busy) return;
    setBusy(true); setActionError(''); setRetryAction(null);
    try {
      const csrfToken = await readCsrfToken();
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-Token': csrfToken },
      });
      if (!response.ok) throw new Error();
      if (mounted.current) setItems((current) => current.map((item) => ({ ...item, read: true })));
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
    } catch {
      if (mounted.current) {
        setActionError('Could not mark notifications as read. Please retry.');
        setRetryAction(() => () => { void markAllRead(); });
      }
    } finally { if (mounted.current) setBusy(false); }
  };

  return <main className="notification-inbox" aria-labelledby="notification-inbox-title">
    <div className="notification-inbox__heading">
      <div><p className="eyebrow">Your updates</p><h1 id="notification-inbox-title">Notifications</h1></div>
      <button type="button" className="notification-inbox__mark-all" onClick={() => { void markAllRead(); }} disabled={busy || state !== 'ready' || !items.some((item) => !item.read)}>Mark all as read</button>
    </div>
    {actionError && <div role="alert" className="notification-inbox__error"><p>{actionError}</p>{retryAction && <button type="button" onClick={retryAction} disabled={busy}>Retry</button>}</div>}
    {state === 'loading' && <p role="status" aria-busy="true">Loading notifications…</p>}
    {state === 'error' && <div role="alert" className="notification-inbox__error"><p>We couldn’t load your notifications.</p><button type="button" onClick={() => setRefreshKey((key) => key + 1)}>Retry</button></div>}
    {state === 'ready' && items.length === 0 && <p className="notification-inbox__empty">You’re all caught up. New updates will appear here.</p>}
    {state === 'ready' && items.length > 0 && <>
      <ul className="notification-list">
        {items.map((item) => {
          const href = ticketHref?.(item.ticketId) ?? null;
          const content = <><span className="notification-list__type">{typeLabel(item.notificationType)}</span>
            <span className="notification-list__message">{item.message}</span>
            <time className="notification-list__time" dateTime={item.createdAt ?? undefined}>{relativeTime(item.createdAt)}</time></>;
          return <li className={`notification-list__item${item.read ? '' : ' notification-list__item--unread'}`} key={item.notificationId}>
            {href ? <a className="notification-list__content" href={href} onClick={(event) => { void openTicket(event, item, href); }}>{content}<span className="notification-list__ticket">Open related ticket</span></a>
              : <div className="notification-list__content">{content}{!item.read && <button type="button" onClick={() => { void markRead(item); }} disabled={busy}>Mark as read</button>}</div>}
            {!item.read && <span className="notification-list__unread" aria-label="Unread" />}
          </li>;
        })}
      </ul>
      {cursor && <button type="button" className="notification-inbox__more" onClick={() => { void loadMore(); }} disabled={busy}>{busy ? 'Loading…' : 'Load more'}</button>}
    </>}
  </main>;
}
