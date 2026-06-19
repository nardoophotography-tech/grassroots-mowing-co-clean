import * as React from 'react';
import { db, safeOnSnapshot } from '../firebase';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore';

// ─── Types ──────────────────────────────────────────────────────────────────

export type BlockSlot = 'morning' | 'afternoon' | 'flexible' | 'full_day' | 'custom';

export interface CalendarBlock {
  id: string;
  type: 'blockout';
  title: string;
  reason: string;       // admin-only private note
  publicLabel: string;  // customer-safe text
  showPublic: boolean;  // whether public booking calendar sees this
  date: string;         // YYYY-MM-DD
  slot: BlockSlot;
  startTime?: string;   // HH:mm — only for custom slot
  endTime?: string;     // HH:mm — only for custom slot
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
  status: 'active' | 'deleted';
}

// ─── Firestore collection ───────────────────────────────────────────────────

const COLLECTION = 'calendar_blocks';

// ─── Helper functions ───────────────────────────────────────────────────────

/** All active blocks for a given YYYY-MM-DD date string */
export function getActiveBlocksForDate(
  blocks: CalendarBlock[],
  date: string
): CalendarBlock[] {
  return blocks.filter((b) => b.status === 'active' && b.date === date);
}

/**
 * Returns the first block that conflicts with the given run slot / time.
 * Pass `activeBlocks` (already-filtered to status=active) for efficiency.
 */
export function checkBlockConflict(
  blocks: CalendarBlock[],
  date: string,
  runType: 'Morning Run' | 'Afternoon Run' | 'Flexible',
  time?: string
): CalendarBlock | null {
  const dayBlocks = getActiveBlocksForDate(blocks, date);
  for (const b of dayBlocks) {
    if (b.slot === 'full_day') return b;
    if (b.slot === 'morning' && runType === 'Morning Run') return b;
    if (b.slot === 'afternoon' && runType === 'Afternoon Run') return b;
    if (b.slot === 'flexible' && runType === 'Flexible') return b;
    if (b.slot === 'custom' && time && b.startTime && b.endTime) {
      if (time >= b.startTime && time <= b.endTime) return b;
    }
  }
  return null;
}

/** True if the given date+slot is blocked (for public calendar use) */
export function isSlotBlocked(
  blocks: CalendarBlock[],
  date: string,
  slot: 'morning' | 'afternoon' | 'flexible'
): boolean {
  const dayBlocks = getActiveBlocksForDate(blocks, date);
  return dayBlocks.some(
    (b) =>
      b.slot === 'full_day' ||
      (b.slot === 'morning' && slot === 'morning') ||
      (b.slot === 'afternoon' && slot === 'afternoon') ||
      (b.slot === 'flexible' && slot === 'flexible')
  );
}

/** True if the entire day is blocked */
export function isDayFullyBlocked(blocks: CalendarBlock[], date: string): boolean {
  return getActiveBlocksForDate(blocks, date).some((b) => b.slot === 'full_day');
}

/** Short admin-facing label for display in day cards / chips */
export function formatBlockLabel(b: Pick<CalendarBlock, 'slot' | 'startTime' | 'endTime'>): string {
  if (b.slot === 'full_day') return 'FULL DAY BLOCKED';
  if (b.slot === 'morning') return 'MORNING BLOCKED';
  if (b.slot === 'afternoon') return 'AFTERNOON BLOCKED';
  if (b.slot === 'flexible') return 'FLEXIBLE BLOCKED';
  if (b.slot === 'custom') return `BLOCKED ${b.startTime ?? ''}–${b.endTime ?? ''}`;
  return 'BLOCKED';
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const blockoutStore = {
  async add(
    data: Omit<CalendarBlock, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<CalendarBlock> {
    const now = Date.now();
    const payload = { ...data, createdAt: now, updatedAt: now };
    const docRef = await addDoc(collection(db, COLLECTION), payload);
    return { ...payload, id: docRef.id };
  },

  async update(id: string, data: Partial<Omit<CalendarBlock, 'id'>>): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), { ...data, updatedAt: Date.now() });
  },

  /** Soft-delete: sets status to "deleted" so it falls out of the live query */
  async remove(id: string): Promise<void> {
    await updateDoc(doc(db, COLLECTION, id), {
      status: 'deleted',
      updatedAt: Date.now(),
    });
  },
};

// ─── React hook ─────────────────────────────────────────────────────────────

/**
 * Live-synced list of ACTIVE calendar blocks from Firestore.
 * Filters `status === 'active'` in memory to avoid needing a composite index.
 */
export function useBlockouts(): CalendarBlock[] {
  const [items, setItems] = React.useState<CalendarBlock[]>([]);

  React.useEffect(() => {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'asc'));
    const unsub = safeOnSnapshot(
      q,
      (snapshot: any) => {
        const all = snapshot.docs.map((d: any) => ({
          id: d.id,
          ...(d.data() as object),
        })) as CalendarBlock[];
        setItems(all.filter((b) => b.status === 'active'));
      },
      (_err: any) => {
        console.warn('[useBlockouts] Firestore unavailable — block-outs hidden');
        setItems([]);
      }
    );
    return () => unsub();
  }, []);

  return items;
}
