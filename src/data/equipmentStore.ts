import * as React from 'react';

// ============================================================================
// Equipment Store — TEMPORARY LOCAL BROWSER STORAGE
// ----------------------------------------------------------------------------
// Firestore security rules for an `equipment` collection are not yet defined,
// so to keep this working locally TODAY this store persists to localStorage.
// All equipment pages (/equipment, /equipment/bushranger, /equipment/:id and
// the admin manager /admin/equipment) read from this single source of truth.
//
// UPGRADE PATH: swap the read/write helpers below for Firestore collection
// `equipment` once rules are in place. The record shape already matches.
// ============================================================================

export type ServiceType =
  | 'Service'
  | 'Repair'
  | 'Blade Change'
  | 'Oil Change'
  | 'Cleaning'
  | 'Inspection'
  | 'Warranty'
  | 'Breakdown'
  | 'Upgrade'
  | 'Field Note';

export const SERVICE_TYPES: ServiceType[] = [
  'Service',
  'Repair',
  'Blade Change',
  'Oil Change',
  'Cleaning',
  'Inspection',
  'Warranty',
  'Breakdown',
  'Upgrade',
  'Field Note',
];

export interface ServiceHistoryEntry {
  id: string;
  date: string;
  type: ServiceType | string;
  title: string;
  description: string;
  cost: string;
  performedBy: string;
  odometerOrHours: string;
  nextServiceDue: string;
  publicVisible: boolean;
}

export interface EquipmentRecord {
  id: string;
  name: string;
  brand: string;
  model: string;
  category: string;
  status: string;
  usedFor: string;
  mountIsaNotes: string;
  reviewNotes: string;
  maintenanceNotes: string;
  imageUrl: string;
  videoUrl: string;
  imageFileName: string;
  videoFileName: string;
  mediaUpdatedAt: number | null;
  serviceHistory: ServiceHistoryEntry[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'grassroots_equipment_v1';

// Seed data (migrated from the old static src/data/equipment.ts mock list).
const SEED: EquipmentRecord[] = [
  {
    id: 'spartan-shield-54',
    name: 'Bushranger Spartan Shield 54" Zero-Turn Mower',
    brand: 'Bushranger',
    model: 'Spartan Shield 54 inch',
    category: 'Mowing',
    status: 'In Service',
    usedFor: 'Heavy mowing, overgrown yards, large blocks, and fast property clean-ups.',
    mountIsaNotes: 'Used in Mount Isa heat, dust, rough ground, dry grass, and real GrassRoots field work.',
    reviewNotes: 'Field review footage to be added.',
    maintenanceNotes: 'Check blades and air filter regularly in dusty conditions.',
    imageUrl: '',
    videoUrl: '',
    imageFileName: '',
    videoFileName: '',
    mediaUpdatedAt: null,
    serviceHistory: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'brc40',
    name: 'Bushranger BRC40 Commercial Wood Chipper',
    brand: 'Bushranger',
    model: 'BRC40',
    category: 'Clean-up',
    status: 'In Service',
    usedFor: 'Branches, green waste, and heavy yard clean-up work.',
    mountIsaNotes: 'Useful for reducing green waste after rough Mount Isa clean-up jobs.',
    reviewNotes: 'Field review footage to be added.',
    maintenanceNotes: 'Sharpen chipper blades and grease bearings per service schedule.',
    imageUrl: '',
    videoUrl: '',
    imageFileName: '',
    videoFileName: '',
    mediaUpdatedAt: null,
    serviceHistory: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'tps261',
    name: 'Bushranger TPS261 Pole Saw',
    brand: 'Bushranger',
    model: 'TPS261',
    category: 'Cutting',
    status: 'In Service',
    usedFor: 'High branches, small limbs, and clean-up preparation.',
    mountIsaNotes: 'Useful around fences, driveways, and yards where branches hang over mowing areas.',
    reviewNotes: 'Field review footage to be added.',
    maintenanceNotes: 'Keep chain tensioned and oiled.',
    imageUrl: '',
    videoUrl: '',
    imageFileName: '',
    videoFileName: '',
    mediaUpdatedAt: null,
    serviceHistory: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'backpack-brush-cutter',
    name: 'Bushranger Backpack Brush Cutter',
    brand: 'Bushranger',
    model: 'Backpack Brush Cutter',
    category: 'Cutting',
    status: 'In Service',
    usedFor: 'Long grass, thick weeds, awkward blocks, and heavy edges.',
    mountIsaNotes: 'Useful in thick Mount Isa grass, dry weeds, and rough access areas.',
    reviewNotes: 'Field review footage to be added.',
    maintenanceNotes: 'Replace trimmer line and check harness padding.',
    imageUrl: '',
    videoUrl: '',
    imageFileName: '',
    videoFileName: '',
    mediaUpdatedAt: null,
    serviceHistory: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'dewalt-hedge-trimmer',
    name: 'DeWalt Brushless 18V Hedge Trimmer',
    brand: 'DeWalt',
    model: '18V Brushless',
    category: 'Battery Tools',
    status: 'In Service',
    usedFor: 'Hedges, trimming, finishing work, and tidy-ups.',
    mountIsaNotes: 'Good for quiet, quick residential finishing work.',
    reviewNotes: 'Field review footage to be added.',
    maintenanceNotes: 'Clean blades, keep batteries charged and stored cool.',
    imageUrl: '',
    videoUrl: '',
    imageFileName: '',
    videoFileName: '',
    mediaUpdatedAt: null,
    serviceHistory: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

// Backfill fields that may be missing on records saved by older versions.
function normalize(rec: any): EquipmentRecord {
  return {
    ...rec,
    imageUrl: rec.imageUrl || '',
    videoUrl: rec.videoUrl || '',
    imageFileName: rec.imageFileName || '',
    videoFileName: rec.videoFileName || '',
    mediaUpdatedAt: typeof rec.mediaUpdatedAt === 'number' ? rec.mediaUpdatedAt : null,
    serviceHistory: Array.isArray(rec.serviceHistory) ? rec.serviceHistory : [],
  } as EquipmentRecord;
}

function read(): EquipmentRecord[] {
  if (typeof window === 'undefined') return SEED.map(normalize);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
      return SEED.map(normalize);
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return SEED.map(normalize);
    return parsed.map(normalize);
  } catch {
    return SEED.map(normalize);
  }
}

export class StorageQuotaError extends Error {
  constructor() {
    super('STORAGE_QUOTA_EXCEEDED');
    this.name = 'StorageQuotaError';
  }
}

function write(records: EquipmentRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err: any) {
    // QuotaExceededError (names differ across browsers) — most likely a large
    // base64 video. Surface a typed error so the UI can warn instead of crash.
    if (
      err &&
      (err.name === 'QuotaExceededError' ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        err.code === 22 ||
        err.code === 1014)
    ) {
      throw new StorageQuotaError();
    }
    throw err;
  }
  // Let any listeners (other tabs/components) know data changed.
  window.dispatchEvent(new Event('equipment-store-changed'));
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export const equipmentStore = {
  getAll(): EquipmentRecord[] {
    return read().sort((a, b) => b.updatedAt - a.updatedAt);
  },

  getById(id: string): EquipmentRecord | undefined {
    return read().find((r) => r.id === id);
  },

  getByBrand(brand: string): EquipmentRecord[] {
    const target = brand.toLowerCase();
    return read().filter((r) => (r.brand || '').toLowerCase() === target);
  },

  add(data: Omit<EquipmentRecord, 'id' | 'createdAt' | 'updatedAt'>): EquipmentRecord {
    const records = read();
    const now = Date.now();
    let id = slugify(data.name || data.model || 'equipment') || `eq-${now}`;
    // Ensure unique id
    if (records.some((r) => r.id === id)) id = `${id}-${now.toString().slice(-5)}`;
    const record: EquipmentRecord = { ...data, id, createdAt: now, updatedAt: now };
    records.push(record);
    write(records);
    return record;
  },

  update(id: string, data: Partial<EquipmentRecord>): EquipmentRecord | undefined {
    const records = read();
    const idx = records.findIndex((r) => r.id === id);
    if (idx === -1) return undefined;
    records[idx] = { ...records[idx], ...data, id, updatedAt: Date.now() };
    write(records);
    return records[idx];
  },

  remove(id: string): void {
    write(read().filter((r) => r.id !== id));
  },

  // ---- Service History -----------------------------------------------------
  addServiceEntry(
    equipmentId: string,
    entry: Omit<ServiceHistoryEntry, 'id'>
  ): ServiceHistoryEntry | undefined {
    const records = read();
    const idx = records.findIndex((r) => r.id === equipmentId);
    if (idx === -1) return undefined;
    const newEntry: ServiceHistoryEntry = {
      ...entry,
      id: `svc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };
    records[idx].serviceHistory = [...(records[idx].serviceHistory || []), newEntry];
    records[idx].updatedAt = Date.now();
    write(records);
    return newEntry;
  },

  updateServiceEntry(
    equipmentId: string,
    entryId: string,
    data: Partial<ServiceHistoryEntry>
  ): void {
    const records = read();
    const idx = records.findIndex((r) => r.id === equipmentId);
    if (idx === -1) return;
    records[idx].serviceHistory = (records[idx].serviceHistory || []).map((e) =>
      e.id === entryId ? { ...e, ...data, id: entryId } : e
    );
    records[idx].updatedAt = Date.now();
    write(records);
  },

  removeServiceEntry(equipmentId: string, entryId: string): void {
    const records = read();
    const idx = records.findIndex((r) => r.id === equipmentId);
    if (idx === -1) return;
    records[idx].serviceHistory = (records[idx].serviceHistory || []).filter(
      (e) => e.id !== entryId
    );
    records[idx].updatedAt = Date.now();
    write(records);
  },
};

// Count of public-visible service entries for a record.
export function publicServiceCount(rec: { serviceHistory?: ServiceHistoryEntry[] }): number {
  return (rec.serviceHistory || []).filter((e) => e.publicVisible).length;
}

// Reactive hook: re-renders when the store changes (same tab or other tabs).
export function useEquipment(): EquipmentRecord[] {
  const [items, setItems] = React.useState<EquipmentRecord[]>(() => equipmentStore.getAll());

  React.useEffect(() => {
    const refresh = () => setItems(equipmentStore.getAll());
    window.addEventListener('equipment-store-changed', refresh);
    window.addEventListener('storage', refresh);
    refresh();
    return () => {
      window.removeEventListener('equipment-store-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return items;
}
