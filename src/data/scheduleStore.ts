import * as React from 'react';
import { db, safeOnSnapshot } from '../firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore';

export type ScheduleStatus =
  | 'Scheduled'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled'
  | 'Needs Reschedule';

export type RunType = 'Morning Run' | 'Afternoon Run' | 'Flexible';

export const RUN_TYPES: RunType[] = ['Morning Run', 'Afternoon Run', 'Flexible'];

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
  isJob?: boolean;
  jobId?: string;
}

const FIRESTORE_COLLECTION = 'scheduleEntries';
const STORAGE_KEY = 'grassroots_schedule_v1';

function readLocal(): ScheduleEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as ScheduleEntry[]).map((e) => ({
      ...e,
      runType: (e as any).runType ?? 'Flexible',
    }));
  } catch {
    return [];
  }
}

function writeLocal(items: ScheduleEntry[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('schedule-changed'));
}

export const scheduleStore = {
  async add(data: Omit<ScheduleEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScheduleEntry> {
    const now = Date.now();
    const payload = { ...data, createdAt: now, updatedAt: now };
    try {
      const docRef = await addDoc(collection(db, FIRESTORE_COLLECTION), payload);
      return { ...payload, id: docRef.id };
    } catch (err) {
      console.warn('[scheduleStore] Firestore write failed, using localStorage:', err);
      const id = 'sch-' + now + '-' + Math.random().toString(36).slice(2, 6);
      const entry: ScheduleEntry = { ...payload, id };
      const items = readLocal();
      items.push(entry);
      writeLocal(items);
      return entry;
    }
  },

  async update(id: string, data: Partial<ScheduleEntry>): Promise<void> {
    const updated = { ...data, updatedAt: Date.now() };
    if (!id.startsWith('sch-')) {
      try {
        await updateDoc(doc(db, FIRESTORE_COLLECTION, id), updated);
        return;
      } catch (err) {
        console.warn('[scheduleStore] Firestore update failed, using localStorage:', err);
      }
    }
    writeLocal(readLocal().map((e) => (e.id === id ? { ...e, ...updated } : e)));
  },

  async remove(id: string): Promise<void> {
    if (!id.startsWith('sch-')) {
      try {
        await deleteDoc(doc(db, FIRESTORE_COLLECTION, id));
        return;
      } catch (err) {
        console.warn('[scheduleStore] Firestore delete failed, using localStorage:', err);
      }
    }
    writeLocal(readLocal().filter((e) => e.id !== id));
  },
};

export function useSchedule(): ScheduleEntry[] {
  const [items, setItems] = React.useState<ScheduleEntry[]>(readLocal);

  React.useEffect(() => {
    const q = query(collection(db, FIRESTORE_COLLECTION), orderBy('createdAt', 'asc'));
    const unsub = safeOnSnapshot(
      q,
      (snapshot) => {
        const entries = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as object),
          runType: ((d.data() as any).runType ?? 'Flexible') as RunType,
        })) as ScheduleEntry[];
        setItems(entries);
      },
      (_err: any) => {
        console.warn('[useSchedule] Firestore unavailable, using localStorage fallback');
        setItems(readLocal());
      }
    );

    const onStorage = () => setItems(readLocal());
    window.addEventListener('schedule-changed', onStorage);
    window.addEventListener('storage', onStorage);

    return () => {
      unsub();
      window.removeEventListener('schedule-changed', onStorage);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return items;
}
