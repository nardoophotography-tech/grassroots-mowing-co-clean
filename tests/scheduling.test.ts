import { describe, it, expect, beforeAll } from 'vitest';
import { computeDayAvailability, DOW_TO_KEY } from '@/utils/scheduling';
import type { CalendarBlock } from '@/data/blockoutLogic';

// Pin to Queensland time so date-fns local-day maths is deterministic.
beforeAll(() => { process.env.TZ = 'Australia/Brisbane'; });

const allWorkingDays = {
  monday: true, tuesday: true, wednesday: true, thursday: true,
  friday: true, saturday: true, sunday: true,
};

function makeBookingSettings(over: Partial<any> = {}) {
  return {
    bookingIntakeOpenDate: '2026-01-01',
    firstAvailableServiceDate: '2026-01-01',
    maxBookingsPerDay: 6,
    workingDays: { ...allWorkingDays },
    timeSlots: [
      { id: 'morning', enabled: true, maxBookings: 3 },
      { id: 'afternoon', enabled: true, maxBookings: 3 },
    ],
    blockedDates: [],
    blockedSlots: [],
    ...over,
  } as any;
}

const settings: any = {
  suburbSchedules: [
    { suburb: 'Highfields', availableDays: [1, 2, 3, 4, 5], morningCapacity: 3, afternoonCapacity: 3, blockedDates: [] },
  ],
};

const ctxBase = (over: Partial<any> = {}) => ({
  suburb: 'Highfields',
  jobs: [],
  settings,
  blocks: [],
  bookingSettings: makeBookingSettings(),
  ...over,
});

// 2026-01-05 is a Monday, 2026-01-10 a Saturday, 2026-01-11 a Sunday.
const MON = new Date('2026-01-05T09:00:00');
const SAT = new Date('2026-01-10T09:00:00');

describe('DOW_TO_KEY mapping', () => {
  it('maps 0->sunday and 1->monday', () => {
    expect(DOW_TO_KEY[0]).toBe('sunday');
    expect(DOW_TO_KEY[1]).toBe('monday');
  });
});

describe('working days', () => {
  it('a working day is available', () => {
    const r = computeDayAvailability(MON, ctxBase());
    expect(r.isAvailable).toBe(true);
    expect(r.morning && r.afternoon).toBe(true);
  });
  it('a non-working day (Saturday off) is blocked', () => {
    const bs = makeBookingSettings({ workingDays: { ...allWorkingDays, saturday: false } });
    const r = computeDayAvailability(SAT, ctxBase({ bookingSettings: bs }));
    expect(r.isAvailable).toBe(false);
  });
});

describe('first available service date gate', () => {
  it('a date before firstAvailableServiceDate is blocked', () => {
    const bs = makeBookingSettings({ firstAvailableServiceDate: '2026-02-01' });
    const r = computeDayAvailability(MON, ctxBase({ bookingSettings: bs }));
    expect(r.isAvailable).toBe(false);
  });
});

describe('full-date and slot block-outs', () => {
  it('a fully blocked date is unavailable', () => {
    const bs = makeBookingSettings({ blockedDates: [{ date: '2026-01-05', reason: 'Public holiday' }] });
    const r = computeDayAvailability(MON, ctxBase({ bookingSettings: bs }));
    expect(r.isAvailable).toBe(false);
  });
  it('AM-only slot block leaves afternoon open', () => {
    const bs = makeBookingSettings({ blockedSlots: [{ date: '2026-01-05', slotId: 'morning', reason: 'x' }] });
    const r = computeDayAvailability(MON, ctxBase({ bookingSettings: bs }));
    expect(r.morning).toBe(false);
    expect(r.afternoon).toBe(true);
    expect(r.isAvailable).toBe(true);
  });
  it('PM-only slot block leaves morning open', () => {
    const bs = makeBookingSettings({ blockedSlots: [{ date: '2026-01-05', slotId: 'afternoon', reason: 'x' }] });
    const r = computeDayAvailability(MON, ctxBase({ bookingSettings: bs }));
    expect(r.morning).toBe(true);
    expect(r.afternoon).toBe(false);
  });
});

describe('calendar_blocks full-day and slot', () => {
  const block = (over: Partial<CalendarBlock>): CalendarBlock => ({
    id: 'b1', type: 'blockout', title: 't', reason: 'r', publicLabel: 'Unavailable',
    showPublic: true, date: '2026-01-05', slot: 'full_day', createdAt: 0, updatedAt: 0,
    status: 'active', ...over,
  } as CalendarBlock);

  it('full_day block blocks the whole day even if not public', () => {
    const r = computeDayAvailability(MON, ctxBase({ blocks: [block({ slot: 'full_day', showPublic: false })] }));
    expect(r.isAvailable).toBe(false);
  });
  it('public morning block removes only morning', () => {
    const r = computeDayAvailability(MON, ctxBase({ blocks: [block({ slot: 'morning' })] }));
    expect(r.morning).toBe(false);
    expect(r.afternoon).toBe(true);
  });
});

describe('capacity', () => {
  const job = (slot: 'morning' | 'afternoon', id: string) => ({
    id, suburb: 'Highfields', timeSlot: slot, status: 'scheduled',
    scheduledDate: new Date('2026-01-05T09:00:00').getTime(),
  } as any);

  it('morning fills at capacity (3) and closes', () => {
    const jobs = [job('morning', 'a'), job('morning', 'b'), job('morning', 'c')];
    const r = computeDayAvailability(MON, ctxBase({ jobs }));
    expect(r.morning).toBe(false);
    expect(r.afternoon).toBe(true);
  });
  it('reaching global maxBookingsPerDay blocks the entire day', () => {
    const jobs = Array.from({ length: 6 }, (_, i) => job(i % 2 ? 'afternoon' : 'morning', 'j' + i));
    const r = computeDayAvailability(MON, ctxBase({ jobs }));
    expect(r.isAvailable).toBe(false);
  });
  it('cancelled jobs do not consume capacity', () => {
    const jobs = [job('morning', 'a'), { ...job('morning', 'b'), status: 'cancelled' }, { ...job('morning', 'c'), status: 'cancelled' }];
    const r = computeDayAvailability(MON, ctxBase({ jobs }));
    expect(r.morning).toBe(true);
  });
});

describe('missing settings safety', () => {
  it('no settings -> blocked (no crash)', () => {
    const r = computeDayAvailability(MON, ctxBase({ settings: null }));
    expect(r.isAvailable).toBe(false);
  });
});
