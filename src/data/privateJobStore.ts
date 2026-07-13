import * as React from 'react';
import { auth } from '../firebase';

// ─── Firestore REST config (same named database as blockoutStore) ─────────────
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
  }
  return out;
}

function _decode(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, raw] of Object.entries(fields)) {
    const v = raw as Record<string, unknown>;
    if ('stringValue' in v) out[k] = v.stringValue;
    else if ('booleanValue' in v) out[k] = v.booleanValue;
    else if ('integerValue' in v) out[k] = parseInt(v.integerValue as string, 10);
    else if ('doubleValue' in v) out[k] = v.doubleValue;
    else if ('nullValue' in v) out[k] = null;
  }
  return out;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export type PrivateJobCategory =
  | 'private_job'
  | 'personal'
  | 'project_156'
  | 'maintenance'
  | 'equipment'
  | 'internal_task'
  | 'other';

export type PrivateJobTimeSlot = 'morning' | 'afternoon' | 'full_day' | 'custom';

export const PRIVATE_JOB_CATEGORIES: { key: PrivateJobCategory; label: string }[] = [
  { key: 'private_job',   label: 'Private Job' },
  { key: 'personal',      label: 'Personal' },
  { key: 'project_156',   label: 'Project #156' },
  { key: 'maintenance',   label: 'Maintenance' },
  { key: 'equipment',     label: 'Equipment' },
  { key: 'internal_task', label: 'Internal Task' },
  { key: 'other',         label: 'Other' },
];

export const PRIVATE_JOB_TIME_SLOT_LABELS: Record<PrivateJobTimeSlot, string> = {
  morning:  'Morning',
  afternoon: 'Afternoon',
  full_day:  'Full Day',
  custom:    'Custom Time',
};

export interface PrivateJob {
  id: string;
  entryType: 'private_job';
  /** Always admin_only — private jobs are never shown publicly */
  visibility: 'admin_only';
  isPrivate: boolean;
  title: string;
  date: string;              // YYYY-MM-DD
  startTime?: string;        // HH:mm
  endTime?: string;          // HH:mm
  timeSlot?: PrivateJobTimeSlot;
  address?: string;
  contactName?: string;
  phone?: string;
  price?: number;
  privateNotes?: string;
  category: PrivateJobCategory;
  /** 'active' | 'deleted' — soft delete */
  status: 'active' | 'deleted';
  createdBy?: string;
  createdAt: number;
  updatedAt: number;
}

const COLLECTION = 'private_jobs';

// ─── Module-level refresh signal ─────────────────────────────────────────────
const _refreshListeners = new Set<() => void>();
function _notifyRefresh() {
  _refreshListeners.forEach((fn) => fn());
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const privateJobStore = {
  async add(
    data: Omit<PrivateJob, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PrivateJob> {
    const token = await _token();
    if (!token) throw new Error('Authentication required to save private jobs.');
    const now = Date.now();
    const payload = {
      ...data,
      entryType: 'private_job' as const,
      visibility: 'admin_only' as const,
      isPrivate: true,
      createdAt: now,
      updatedAt: now,
    };
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

  async update(id: string, data: Partial<Omit<PrivateJob, 'id'>>): Promise<void> {
    const token = await _token();
    if (!token) throw new Error('Authentication required to update private jobs.');
    const patch = { ...data, updatedAt: Date.now() };
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
    const token = await _token();
    if (!token) throw new Error('Authentication required to delete private jobs.');
    const patch = { status: 'deleted' as const, updatedAt: Date.now() };
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
// Private jobs are NEVER fetched without authentication. If auth.currentUser
// is null, the hook returns [] without making any network request.

async function _fetchPrivateJobs(): Promise<PrivateJob[]> {
  const token = auth.currentUser
    ? await auth.currentUser.getIdToken().catch(() => null)
    : null;

  // Abort without auth — private jobs must never reach unauthenticated clients.
  if (!token) return [];

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
    console.warn('[usePrivateJobs] REST runQuery failed:', resp.status);
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
        ...(decoded as Omit<PrivateJob, 'id'>),
      } as PrivateJob;
    })
    .filter((j) => j.status === 'active');
}

export function usePrivateJobs(): PrivateJob[] {
  const [items, setItems] = React.useState<PrivateJob[]>([]);

  const refresh = React.useCallback(() => {
    if (!auth.currentUser) {
      setItems([]);
      return;
    }
    _fetchPrivateJobs()
      .then(setItems)
      .catch((e) => {
        console.warn('[usePrivateJobs] fetch error:', e);
        setItems([]);
      });
  }, []);

  React.useEffect(() => {
    refresh();
    _refreshListeners.add(refresh);
    // Re-fetch on auth state change (login / logout)
    const unsubscribeAuth = auth.onAuthStateChanged(() => refresh());
    // Poll every 60 s for updates from other admin sessions
    const interval = setInterval(refresh, 60_000);
    return () => {
      _refreshListeners.delete(refresh);
      unsubscribeAuth();
      clearInterval(interval);
    };
  }, [refresh]);

  return items;
}
