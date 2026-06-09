import * as React from 'react';

// ============================================================================
// Notification store — TEMPORARY BROWSER STORAGE
// ----------------------------------------------------------------------------
// Firebase notification storage required for production. The Firestore
// `notifications` collection is permission-denied for the live session, so
// this store persists to localStorage so the global header bell is fully
// functional (badge count, mark read/unread, delete, clear, etc.).
// ============================================================================

export type NotificationType = 'system' | 'booking' | 'schedule' | 'payment' | 'equipment' | 'admin';

export interface AppNotificationItem {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: number;
  link?: string;
  actionLabel?: string;
}

// Bumped to v2 so the relabelled setup/test notices replace any older cached
// seeds (older seeds only re-seed when storage is empty). Only setup notices
// live here — no real customer data is lost.
const STORAGE_KEY = 'grassroots_notifications_v2';

// Seed SETUP/TEST notices only when storage is empty.
// These are NOT live customer data — no fake client names, bookings, or payments.
function seed(): AppNotificationItem[] {
  const now = Date.now();
  return [
    {
      id: 'seed-system',
      title: 'Setup notice — Notification centre active',
      message: 'Local test notification. The bell is working. Live booking and payment alerts require Firebase production rules — not live customer data.',
      type: 'system',
      read: false,
      createdAt: now - 1000 * 60 * 2,
      link: '/admin/automations',
      actionLabel: 'Manage',
    },
    {
      id: 'seed-schedule',
      title: 'Setup notice — Schedule calendar active',
      message: 'Local test notification. Morning Run, Afternoon Run and Flexible scheduling is active. Not live customer data.',
      type: 'schedule',
      read: false,
      createdAt: now - 1000 * 60 * 20,
      link: '/schedule',
      actionLabel: 'View schedule',
    },
    {
      id: 'seed-equipment',
      title: 'Setup notice — Equipment register active',
      message: 'Local test notification. Equipment media and service history are active. Not live customer data.',
      type: 'equipment',
      read: false,
      createdAt: now - 1000 * 60 * 45,
      link: '/equipment',
      actionLabel: 'View equipment',
    },
    {
      id: 'seed-firebase',
      title: 'Setup notice — Firebase permission update required',
      message: 'Local test notification. Firebase connection required for production so live booking, payment and job alerts can replace these setup notices.',
      type: 'admin',
      read: false,
      createdAt: now - 1000 * 60 * 60,
      link: '/admin/automations',
      actionLabel: 'Manage',
    },
  ];
}

export function loadNotifications(): AppNotificationItem[] {
  if (typeof window === 'undefined') return seed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      const seeded = seed();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as AppNotificationItem[];
  } catch {
    return [];
  }
}

export function saveNotifications(items: AppNotificationItem[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('notifications-changed'));
}

function sortNewest(items: AppNotificationItem[]): AppNotificationItem[] {
  return [...items].sort((a, b) => b.createdAt - a.createdAt);
}

export function getNotifications(): AppNotificationItem[] {
  return sortNewest(loadNotifications());
}

export function addNotification(
  data: Omit<AppNotificationItem, 'id' | 'createdAt' | 'read'> & { read?: boolean; createdAt?: number }
): AppNotificationItem {
  const items = loadNotifications();
  const item: AppNotificationItem = {
    type: 'system',
    ...data,
    id: `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    read: data.read ?? false,
    createdAt: data.createdAt ?? Date.now(),
  };
  items.push(item);
  saveNotifications(items);
  return item;
}

export function markNotificationRead(id: string): void {
  saveNotifications(loadNotifications().map((n) => (n.id === id ? { ...n, read: true } : n)));
}

export function markNotificationUnread(id: string): void {
  saveNotifications(loadNotifications().map((n) => (n.id === id ? { ...n, read: false } : n)));
}

export function deleteNotification(id: string): void {
  saveNotifications(loadNotifications().filter((n) => n.id !== id));
}

export function markAllNotificationsRead(): void {
  saveNotifications(loadNotifications().map((n) => ({ ...n, read: true })));
}

export function clearReadNotifications(): void {
  saveNotifications(loadNotifications().filter((n) => !n.read));
}

export function getUnreadNotificationCount(): number {
  return loadNotifications().filter((n) => !n.read).length;
}

// Reactive hook — re-renders when notifications change (same tab or other tabs).
export function useNotificationsLocal(): AppNotificationItem[] {
  const [items, setItems] = React.useState<AppNotificationItem[]>(() => getNotifications());
  React.useEffect(() => {
    const refresh = () => setItems(getNotifications());
    window.addEventListener('notifications-changed', refresh);
    window.addEventListener('storage', refresh);
    refresh();
    return () => {
      window.removeEventListener('notifications-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  return items;
}
