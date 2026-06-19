import * as React from 'react';
import { auth } from '../firebase';

// ─── Firestore REST config ────────────────────────────────────────────────────
// The app uses a named Firestore database. The JS SDK's write stream is
// unreliable in this environment (addDoc hangs indefinitely). All store
// operations go through the Firestore REST API directly, which works fine.

const _PROJECT = 'gen-lang-client-0207351054';
const _DB = 'ai-studio-e9bfaa37-43fb-46f5-bcf0-c0a5adc17337';
const _FS = `https://firestore.googleapis.com/v1/projects/${_PROJECT}/databases/${_DB}/documents`;

async function _token(): Promise<string | null> {
  try {
    return (await auth.currentUser?.getIdToken()) ?? null;
  } catch {
    return null;
  }
}

function _authHeaders(token: string | null): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

/** Encode a plain JS object into Firestore REST field map */
function _encode(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (v === null) out[k] = { nullValue: null };
    else if (typeof v === 'string') out[k] = { stringValue: v };
    else if (typeof v === 'boolean') out[k] = { booleanValue: v };
    else if (typeof v === 'number')
      out[k] = Number.isInteger(v)
        ? { integerValue: String(v) }
        : { doubleValue: v };
    else if (Array.isArray(v))
      out[k] = {
        arrayValue: {
          values: v.map((s) =>
            typeof s === 'string'
              ? { stringValue: s }
              : typeof s === 'boolean'
              ? { booleanValue: s }
              : { nullValue: null }
          ),
        },
      };
  }
  return out;
}

/** Decode a Firestore REST document fields map back to a plain JS object */
function _decode(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, raw] of Object.entries(fields)) {
    const v = raw as Record<string, unknown>;
    if ('stringValue' in v) out[k] = v.stringValue;
    else if ('booleanValue' in v) out[k] = v.booleanValue;
    else if ('integerValue' in v) out[k] = parseInt(v.integerValue as string, 10);
    else if ('doubleValue' in v) out[k] = v.doubleValue;
    else if ('nullValue' in v) out[k] = null;
    else if ('arrayValue' in v) {
      const av = v.arrayValue as { values?: Array<Record<string, unknown>> };
      out[k] = (av.values ?? []).map((item) => {
        if ('stringValue' in item) return item.stringValue;
        if ('booleanValue' in item) return item.booleanValue;
        return null;
      });
    }
  }
  return out;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export type BlockSlot = 'morning' | 'afternoon' | 'flexible' | 'full_day' | 'custom';
export type BlockRepeat = 'none' | 'weekly';
export type WeekDay =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

/** Ordered list of weekdays for rendering pickers */
export const WEEKDAYS: { key: WeekDay; label: string; short: string }[] = [
  { key: 'monday',    label: 'Monday',    short: 'Mon' },
  { key: 'tuesday',   label: 'Tuesday',   short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday',  label: 'Thursday',  short: 'Thu' },
  { key: 'friday',    label: 'Friday',    short: 'Fri' },
  { key: 'saturday',  label: 'Saturday',  short: 'Sat' },
  { key: 'sunday',    label: 'Sunday',    short: 'Sun' },
];

/** Internal mapping: getDay() index -> WeekDay name */
const DAY_INDEX_TO_NAME: WeekDay[] = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];

export interface CalendarBlock {
  id: string;
  type: 'blockout';
  title: string;
  reason: string;
  publicLabel: string;
  showPublic: boolean;
  date: string;
  slot: BlockSlot;
  startTime?: string;
  endTime?: string;
  repeat?: BlockRepeat;
  repeatDays?: WeekDay[];
  repeatStartDate?: string;
  repeatEndDate?: string;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
  status: 'active' | 'deleted';
}

const COLLECTION = 'calendar_blocks';

// ─── Module-level refresh signal ─────────────────────────────────────────────
// When a write completes, we notify all mounted useBlockouts hooks to re-fetch.
const _refreshListeners = new Set<() => void>();
function _notifyRefresh() {
  _refreshListeners.forEach((fn) => fn());
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function isBlockActiveOnDate(block: CalendarBlock, date: string): boolean {
  if (block.status !== 'active') return false;
  const repeat = block.repeat ?? 'none';
  if (repeat === 'none') {
    return block.date === date;
  }
  if (repeat === 'weekly') {
    const repeatDays = block.repeatDays ?? [];
    if (repeatDays.length === 0) return false;
    const startDate = block.repeatStartDate ?? block.date;
    if (date < startDate) return false;
    if (block.repeatEndDate && date > block.repeatEndDate) return false;
    const d = new Date(date + 'T00:00:00');
    const dayName = DAY_INDEX_TO_NAME[d.getDay()];
    return repeatDays.includes(dayName);
  }
  return false;
}

export function getActiveBlocksForDate(
  blocks: CalendarBlock[],
  date: string
): CalendarBlock[] {
  return blocks.filter((b) => isBlockActiveOnDate(b, date));
}

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

export function isDayFullyBlocked(blocks: CalendarBlock[], date: string): boolean {
  return getActiveBlocksForDate(blocks, date).some((b) => b.slot === 'full_day');
}

export function formatBlockLabel(
  b: Pick<CalendarBlock, 'slot' | 'startTime' | 'endTime'> & { repeat?: BlockRepeat }
): string {
  const suffix = b.repeat === 'weekly' ? ' — WEEKLY' : '';
  if (b.slot === 'full_day') return 'FULL DAY BLOCKED' + suffix;
  if (b.slot === 'morning') return 'MORNING BLOCKED' + suffix;
  if (b.slot === 'afternoon') return 'AFTERNOON BLOCKED' + suffix;
  if (b.slot === 'flexible') return 'FLEXIBLE BLOCKED' + suffix;
  if (b.slot === 'custom') return 'BLOCKED ' + (b.startTime ?? '') + '–' + (b.endTime ?? '') + suffix;
  return 'BLOCKED' + suffix;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const blockoutStore = {
  async add(
    data: Omit<CalendarBlock, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<CalendarBlock> {
    const now = Date.now();
    const payload = { ...data, createdAt: now, updatedAt: now };
    const token = await _token();
    const resp = await fetch(`${_FS}/${COLLECTION}`, {
      method: 'POST',
      headers: _authHeaders(token),
      body: JSON.stringify({ fields: _encode(payload as unknown as Record<string, unknown>) }),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Firestore write failed (${resp.status}): ${txt}`);
    }
    const doc = await resp.json();
    const id: string = (doc.name as string).split('/').pop()!;
    _notifyRefresh();
    return { ...payload, id };
  },

  async update(id: string, data: Partial<Omit<CalendarBlock, 'id'>>): Promise<void> {
    const patch = { ...data, updatedAt: Date.now() };
    const token = await _token();
    const fields = _encode(patch as unknown as Record<string, unknown>);
    const mask = Object.keys(fields)
      .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
      .join('&');
    const resp = await fetch(`${_FS}/${COLLECTION}/${id}?${mask}`, {
      method: 'PATCH',
      headers: _authHeaders(token),
      body: JSON.stringify({ fields }),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Firestore update failed (${resp.status}): ${txt}`);
    }
    _notifyRefresh();
  },

  async remove(id: string): Promise<void> {
    const patch = { status: 'deleted' as const, updatedAt: Date.now() };
    const token = await _token();
    const fields = _encode(patch as unknown as Record<string, unknown>);
    const mask = Object.keys(fields)
      .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
      .join('&');
    const resp = await fetch(`${_FS}/${COLLECTION}/${id}?${mask}`, {
      method: 'PATCH',
      headers: _authHeaders(token),
      body: JSON.stringify({ fields }),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Firestore delete failed (${resp.status}): ${txt}`);
    }
    _notifyRefresh();
  },
};

// ─── Hook ────────────────────────────────────────────────────────────────────

async function _fetchBlocks(): Promise<CalendarBlock[]> {
  // runQuery works for both authenticated and unauthenticated callers
  // (rules: allow read: if true)
  const token = auth.currentUser
    ? await auth.currentUser.getIdToken().catch(() => null)
    : null;

  const resp = await fetch(`${_FS}:runQuery`, {
    method: 'POST',
    headers: _authHeaders(token),
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: COLLECTION }],
        orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'ASCENDING' }],
      },
    }),
  });

  if (!resp.ok) {
    console.warn('[useBlockouts] REST runQuery failed:', resp.status);
    return [];
  }

  const rows: Array<{ document?: { name: string; fields: Record<string, unknown> } }> =
    await resp.json();

  return rows
    .filter((r) => r.document)
    .map((r) => {
      const d = r.document!;
      const decoded = _decode(d.fields);
      return {
        id: d.name.split('/').pop()!,
        ...(decoded as Omit<CalendarBlock, 'id'>),
      } as CalendarBlock;
    })
    .filter((b) => b.status === 'active');
}

export function useBlockouts(): CalendarBlock[] {
  const [items, setItems] = React.useState<CalendarBlock[]>([]);

  const refresh = React.useCallback(() => {
    _fetchBlocks()
      .then(setItems)
      .catch((e) => {
        console.warn('[useBlockouts] fetch error:', e);
        setItems([]);
      });
  }, []);

  React.useEffect(() => {
    refresh();
    _refreshListeners.add(refresh);
    return () => {
      _refreshListeners.delete(refresh);
    };
  }, [refresh]);

  return items;
}
