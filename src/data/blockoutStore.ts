import * as React from 'react';
import { auth } from '../firebase';
// Pure types + block logic live in blockoutLogic.ts (no react/firebase) so they
// can be imported by unit-tested modules. Re-exported here for existing callers.
import {
  type BlockSlot,
  type BlockRepeat,
  type WeekDay,
  type CalendarBlock,
  WEEKDAYS,
  isBlockActiveOnDate,
  getActiveBlocksForDate,
  checkBlockConflict,
  isSlotBlocked,
  isDayFullyBlocked,
  formatBlockLabel,
} from './blockoutLogic';

export {
  WEEKDAYS,
  isBlockActiveOnDate,
  getActiveBlocksForDate,
  checkBlockConflict,
  isSlotBlocked,
  isDayFullyBlocked,
  formatBlockLabel,
};
export type { BlockSlot, BlockRepeat, WeekDay, CalendarBlock };

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

const COLLECTION = 'calendar_blocks';

// ─── Module-level refresh signal ─────────────────────────────────────────────
// When a write completes, we notify all mounted useBlockouts hooks to re-fetch.
const _refreshListeners = new Set<() => void>();
function _notifyRefresh() {
  _refreshListeners.forEach((fn) => fn());
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
    // Poll every 60 s so the public booking calendar picks up admin changes
    // (e.g. newly blocked days) without requiring a full page reload.
    const interval = setInterval(refresh, 60_000);
    return () => {
      _refreshListeners.delete(refresh);
      clearInterval(interval);
    };
  }, [refresh]);

  return items;
}
