import * as React from 'react';
import { BUSHRANGER_INVOICE } from './bushrangerInvoice';

// ============================================================================
// Bushranger equipment list (cost-noted) — Bushranger page only.
// Lightweight localStorage list, separate from the main equipment register.
// Seeded from the Atlas Motorsport purchase; admin can add/remove items here.
// TEMPORARY browser storage — Firebase upgrade required for live production.
// ============================================================================

export interface BushrangerItem {
  id: string;
  name: string;
  model: string; // stock code / model (optional)
  cost: number;  // AUD, per item
}

const STORAGE_KEY = 'grassroots_bushranger_list_v1';

const SEED: BushrangerItem[] = BUSHRANGER_INVOICE.items.map((line) => ({
  id: line.stockCode.toLowerCase(),
  name: line.description,
  model: line.stockCode,
  cost: line.unitPrice,
}));

function read(): BushrangerItem[] {
  if (typeof window === 'undefined') return [...SEED];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
      return [...SEED];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...SEED];
    return parsed as BushrangerItem[];
  } catch {
    return [...SEED];
  }
}

function write(items: BushrangerItem[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('bushranger-list-changed'));
}

export const bushrangerList = {
  getAll(): BushrangerItem[] {
    return read();
  },
  add(data: Omit<BushrangerItem, 'id'>): BushrangerItem {
    const items = read();
    const item: BushrangerItem = { ...data, id: `br-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
    items.push(item);
    write(items);
    return item;
  },
  remove(id: string): void {
    write(read().filter((i) => i.id !== id));
  },
};

export function useBushrangerList(): BushrangerItem[] {
  const [items, setItems] = React.useState<BushrangerItem[]>(() => bushrangerList.getAll());
  React.useEffect(() => {
    const refresh = () => setItems(bushrangerList.getAll());
    window.addEventListener('bushranger-list-changed', refresh);
    window.addEventListener('storage', refresh);
    refresh();
    return () => {
      window.removeEventListener('bushranger-list-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  return items;
}
