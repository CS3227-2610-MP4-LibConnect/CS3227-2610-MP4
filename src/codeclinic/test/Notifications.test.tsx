import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NotificationBell, NotificationInbox } from '../src/notifications/Notifications';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const response = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const source = (name: string) => readFileSync(resolve(__dirname, '../src/notifications', name), 'utf8');

describe('notification navigation and inbox', () => {
  beforeEach(() => { jest.resetAllMocks(); });

  test('bell displays a capped unread count and links to the inbox', async () => {
    global.fetch = jest.fn().mockResolvedValue(response({ unreadCount: 124 })) as jest.Mock;
    render(<NotificationBell />);
    expect(await screen.findByRole('link', { name: 'Notifications, 99 unread' })).toHaveAttribute('href', '/notifications');
    expect(screen.getByLabelText('99 unread')).toHaveTextContent('99');
  });

  test('inbox shows loading and retryable error states', async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(response({ notifications: [], nextCursor: null })) as jest.Mock;
    render(<NotificationInbox />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading notifications');
    expect(await screen.findByRole('alert')).toHaveTextContent('couldn’t load');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(/all caught up/i)).toBeInTheDocument();
  });

  test('inbox renders untrusted message literally and marks all read with CSRF', async () => {
    const item = { notificationId: 'n-1', notificationType: 'TICKET_REPLY', ticketId: 't-1', message: '<img src=x onerror=alert(1)>', createdAt: new Date().toISOString(), read: false };
    global.fetch = jest.fn()
      .mockResolvedValueOnce(response({ notifications: [item], nextCursor: null }))
      .mockResolvedValueOnce(response({ csrfToken: 'csrf-value' }))
      .mockResolvedValueOnce(response(null, 204)) as jest.Mock;
    render(<NotificationInbox />);
    expect(await screen.findByText(item.message)).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeDisabled());
    expect(global.fetch).toHaveBeenNthCalledWith(3, '/api/notifications/read-all', expect.objectContaining({
      method: 'POST', headers: { 'X-CSRF-Token': 'csrf-value' }, credentials: 'same-origin',
    }));
  });

  test('an item without a ticket route can be marked read through its accessible action', async () => {
    const item = { notificationId: 'n-own', notificationType: 'TICKET_REPLY', ticketId: 't-1', message: 'Reply received', createdAt: null, read: false };
    global.fetch = jest.fn()
      .mockResolvedValueOnce(response({ notifications: [item], nextCursor: null }))
      .mockResolvedValueOnce(response({ csrfToken: 'csrf-value' }))
      .mockResolvedValueOnce(response(null, 204)) as jest.Mock;
    render(<NotificationInbox />);
    fireEvent.click(await screen.findByRole('button', { name: 'Mark as read' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Mark as read' })).not.toBeInTheDocument());
    expect(global.fetch).toHaveBeenNthCalledWith(3, '/api/notifications/n-own/read', expect.objectContaining({
      method: 'POST', headers: { 'X-CSRF-Token': 'csrf-value' }, credentials: 'same-origin',
    }));
  });

  test('a failed per-item read shows retry and succeeds on retry', async () => {
    const item = { notificationId: 'n-retry', notificationType: 'TICKET_REPLY', ticketId: 't-1', message: 'Reply received', createdAt: null, read: false };
    global.fetch = jest.fn()
      .mockResolvedValueOnce(response({ notifications: [item], nextCursor: null }))
      .mockResolvedValueOnce(response({ csrfToken: 'csrf-value' }))
      .mockResolvedValueOnce(response({ message: 'unavailable' }, 503))
      .mockResolvedValueOnce(response({ csrfToken: 'csrf-value' }))
      .mockResolvedValueOnce(response(null, 204)) as jest.Mock;
    render(<NotificationInbox />);
    fireEvent.click(await screen.findByRole('button', { name: 'Mark as read' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not mark this notification as read');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Mark as read' })).not.toBeInTheDocument());
    expect(global.fetch).toHaveBeenNthCalledWith(5, '/api/notifications/n-retry/read', expect.objectContaining({ method: 'POST' }));
  });

  test('load more requests the next page using the cursor', async () => {
    const first = { notificationId: 'n-1', notificationType: 'TICKET_REPLY', ticketId: 't-1', message: 'First page', createdAt: null, read: true };
    const next = { ...first, notificationId: 'n-2', message: 'Second page' };
    global.fetch = jest.fn()
      .mockResolvedValueOnce(response({ notifications: [first], nextCursor: 'cursor / 1' }))
      .mockResolvedValueOnce(response({ notifications: [next], nextCursor: null })) as jest.Mock;
    render(<NotificationInbox />);
    expect(await screen.findByText('First page')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(await screen.findByText('Second page')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/notifications?cursor=cursor%20%2F%201', expect.anything());
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  test('bell refreshes after a notification is marked read', async () => {
    const item = { notificationId: 'n-refresh', notificationType: 'TICKET_REPLY', ticketId: 't-1', message: 'Reply', createdAt: null, read: false };
    global.fetch = jest.fn()
      .mockResolvedValueOnce(response({ unreadCount: 1 }))
      .mockResolvedValueOnce(response({ notifications: [item], nextCursor: null }))
      .mockResolvedValueOnce(response({ csrfToken: 'csrf-value' }))
      .mockResolvedValueOnce(response(null, 204))
      .mockResolvedValueOnce(response({ unreadCount: 0 })) as jest.Mock;
    render(<><NotificationBell /><NotificationInbox /></>);
    expect(await screen.findByRole('link', { name: 'Notifications, 1 unread' })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Mark as read' }));
    await waitFor(() => expect(screen.getByRole('link', { name: 'Notifications, 0 unread' })).toBeInTheDocument());
    expect(global.fetch).toHaveBeenNthCalledWith(5, '/api/notifications/unread-count', expect.anything());
  });

  test('empty state is shown for a successful empty response', async () => {
    global.fetch = jest.fn().mockResolvedValue(response({ notifications: [], nextCursor: null })) as jest.Mock;
    render(<NotificationInbox />);
    expect(await screen.findByText(/all caught up/i)).toBeInTheDocument();
  });

  test('notification styles use shared theme tokens and reflow at 320 CSS pixels', () => {
    const css = source('Notifications.css');
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 });
    expect(css).toMatch(/var\(--lc-color-surface\)/);
    expect(css).toMatch(/@media\s*\(max-width:\s*520px\)/);
    expect(css).toMatch(/overflow-wrap:\s*anywhere/);
    expect(css).not.toMatch(/min-width:\s*(?:[4-9]\d{2}|\d{4,})px/);
    expect(window.innerWidth).toBe(320);
  });
});
