import * as React from 'react';

// ============================================================================
// Notification store — TEMPORARY BROWSER STORAGE
// ----------------------------------------------------------------------------
// Firebase notification storage required for production. The Firestore
// `notifications` collection is currently permission-denied for the live
// session, so the bell would otherwise show a dead/empty panel. This store
// persists to localStorage so the notification centre is fully functional
// locally (badge count, mark read/unread, delete, clear, etc.).
//
// UPGRADE PATH: swap read/write for the Firestore `notifications` collection
// once security rules are in place; the record shape already matches
// AppNotification (minus userId, which Firestore scopes per user).
// ============================================================================

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface LocalNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  link?: string;
  createdAt: number;
  /** Marks the safe starter examples seeded for local testing. */
  isLocalTest?: boolean;
}

const STORAGE_KEY = 'grassroots_notifications_v1';

// Safe starter examples for local testing only (clearly labelled, clearable).
function seed(): LocalNotification[] {
  const now = Date.now();
  return [
    {
      id: 'seed-equipment',
      title: 'Equipment register updated',
      message: 'The equipment register and Bushranger list now reflect the latest gear. (Local test notification)',
      type: 'success',
      read: false,
      link: '/admin/equipment',
      createdAt: now - 1000 * 60 * 5,
      isLocalTest: true,
    },
    {
      id: 'seed-schedule',
      title: 'Schedule data needs Firebase permission update',
      message: 'Live schedule/job data is blocked by Firestore rules; the app is showing a safe empty state. (Local test notification)',
      type: 'warning',
      read: false,
      link: '/schedule',
      createdAt: now - 1000 * 60 * 30,
      isLocalTest: true,
    },
    {
      id: 'seed-field',
      title: 'Field View is using safe empty state',
      message: 'Field View loads its admin-safe shell until Firebase job permissions are enabled. (Local test notification)',
      type: 'info',
      link: '/tech',
      read: false,
      createdAt: now - 1000 * 60 * 60,
      isLocalTest: true,
    },
  ];
}

function read(): LocalNotification[] {
  if (typeof window === 'undefined') return seed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      // First ever load — seed starter examples once.
      const seeded = seed();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as LocalNotification[];
  } catch {
    return [];
  }
}

function write(items: LocalNotification[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('notifications-changed'));
}

function sortNewest(items: LocalNotification[]): LocalNotification[] {
  return [...items].sort((a, b) => b.createdAt - a.createdAt);
}

export const notificationStore = {
  getAll(): LocalNotification[] {
    return sortNewest(read());
  },

  add(data: Omit<LocalNotification, 'id' | 'createdAt' | 'read'> & { read?: boolean; createdAt?: number }): LocalNotification {
    const items = read();
    const item: LocalNotification = {
      type: 'info',
      ...data,
      id: `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      read: data.read ?? false,
      createdAt: data.createdAt ?? Date.now(),
    };
    items.push(item);
    write(items);
    return item;
  },

  setRead(id: string, value: boolean): void {
    write(read().map((n) => (n.id === id ? { ...n, read: value } : n)));
  },

  markRead(id: string): void {
    write(read().map((n) => (n.id === id ? { ...n, read: true } : n)));
  },

  markUnread(id: string): void {
    write(read().map((n) => (n.id === id ? { ...n, read: false } : n)));
  },

  remove(id: string): void {
    write(read().filter((n) => n.id !== id));
  },

  markAllRead(): void {
    write(read().map((n) => ({ ...n, read: true })));
  },

  clearRead(): void {
    write(read().filter((n) => !n.read));
  },
};

export function useLocalNotifications(): LocalNotification[] {
  const [items, setItems] = React.useState<LocalNotification[]>(() => notificationStore.getAll());
  React.useEffect(() => {
    const refresh = () => setItems(notificationStore.getAll());
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
