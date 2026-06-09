import * as React from 'react';

// ============================================================================
// Schedule store — TEMPORARY BROWSER STORAGE
// ----------------------------------------------------------------------------
// Temporary browser schedule storage — Firebase upgrade required for production.
// The Firestore `jobs` collection is permission-denied for the live session,
// so this store keeps the calendar fully working locally (add/edit/delete,
// daily/weekly/monthly views) using localStorage.
// ============================================================================

export type ScheduleStatus =
  | 'Scheduled'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled'
  | 'Needs Reschedule';

export type RunType = 'Morning Run' | 'Afternoon Run' | 'Flexible';

export const RUN_TYPES: RunType[] = ['Morning Run', 'Afternoon Run', 'Flexible'];

// Sort/group order: Morning Run first, then Afternoon Run, then Flexible.
export const RUN_ORDER: Record<RunType, number> = {
  'Morning Run': 0,
  'Afternoon Run': 1,
  Flexible: 2,
};

export const SCHEDULE_STATUSES: ScheduleStatus[] = [
  'Scheduled',
  'In Progress',
  'Completed',
  'Cancelled',
  'Needs Reschedule',
];

export const SERVICE_TYPES: string[] = [
  'Mowing',
  'Edging',
  'Hedging',
  'Clean-up',
  'Brush Cutting',
  'Chipping',
  'Full Service',
  'Quote / Inspection',
  'Other',
];

export interface ScheduleEntry {
  id: string;
  clientName: string;
  phone: string;
  address: string;
  suburb: string;
  serviceType: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  estimatedDuration: string;
  assignedTo: string;
  status: ScheduleStatus;
  runType: RunType;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'grassroots_schedule_v1';

function read(): ScheduleEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      // Start empty — empty states render the calendar layout + Add buttons.
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Backfill: older entries without a runType fall back to 'Flexible'
    // so they keep working and never break the grouped views.
    return (parsed as ScheduleEntry[]).map((e) => ({
      ...e,
      runType: (e as any).runType ?? 'Flexible',
    }));
  } catch {
    return [];
  }
}

function write(items: ScheduleEntry[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('schedule-changed'));
}

export const scheduleStore = {
  getAll(): ScheduleEntry[] {
    return read();
  },

  add(data: Omit<ScheduleEntry, 'id' | 'createdAt' | 'updatedAt'>): ScheduleEntry {
    const items = read();
    const now = Date.now();
    const entry: ScheduleEntry = {
      ...data,
      id: `sch-${now}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    };
    items.push(entry);
    write(items);
    return entry;
  },

  update(id: string, data: Partial<ScheduleEntry>): void {
    write(read().map((e) => (e.id === id ? { ...e, ...data, id, updatedAt: Date.now() } : e)));
  },

  remove(id: string): void {
    write(read().filter((e) => e.id !== id));
  },
};

export function useSchedule(): ScheduleEntry[] {
  const [items, setItems] = React.useState<ScheduleEntry[]>(() => scheduleStore.getAll());
  React.useEffect(() => {
    const refresh = () => setItems(scheduleStore.getAll());
    window.addEventListener('schedule-changed', refresh);
    window.addEventListener('storage', refresh);
    refresh();
    return () => {
      window.removeEventListener('schedule-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  return items;
}
