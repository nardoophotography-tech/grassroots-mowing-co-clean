/**
 * Pure day-availability logic for the public booking calendar.
 *
 * Extracted verbatim from ClientCalendar.getAvailability so the exact
 * production rules are unit-testable (working days, first-available date,
 * full-day / slot block-outs, daily + per-slot capacity). ClientCalendar
 * imports computeDayAvailability so there is a single source of truth.
 */
import { format, getDay, isSameDay } from 'date-fns';
import type { Job, BusinessSettings, BookingSettings } from '@/types';
import { CalendarBlock, isBlockActiveOnDate } from '@/data/blockoutLogic';

// day-of-week index (0=Sun) -> BookingSettings.workingDays key
export const DOW_TO_KEY: (keyof BookingSettings['workingDays'])[] = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];

export interface DayAvailability {
  morning: boolean;
  afternoon: boolean;
  isAvailable: boolean;
}

export interface AvailabilityContext {
  suburb: string;
  jobs: Job[];
  settings: BusinessSettings | null;
  blocks?: CalendarBlock[];
  bookingSettings?: BookingSettings;
}

const BLOCKED: DayAvailability = { morning: false, afternoon: false, isAvailable: false };

export function getSlotMax(
  slotId: 'morning' | 'afternoon',
  schedule: any,
  bookingSettings?: BookingSettings
): number {
  if (bookingSettings?.timeSlots) {
    const slotDef = bookingSettings.timeSlots.find(s => s.id === slotId);
    if (slotDef) return slotDef.maxBookings;
  }
  return slotId === 'morning'
    ? (schedule?.morningCapacity ?? 3)
    : (schedule?.afternoonCapacity ?? 3);
}

export function isSlotEnabledBySettings(
  slotId: 'morning' | 'afternoon',
  bookingSettings?: BookingSettings
): boolean {
  if (!bookingSettings?.timeSlots) return true;
  const slotDef = bookingSettings.timeSlots.find(s => s.id === slotId);
  return slotDef ? slotDef.enabled : true;
}

export function computeDayAvailability(date: Date, ctx: AvailabilityContext): DayAvailability {
  const { suburb, jobs, settings, blocks = [], bookingSettings } = ctx;
  const dateStr = format(date, 'yyyy-MM-dd');
  const MAX_JOBS_PER_DAY = bookingSettings?.maxBookingsPerDay ?? 6;

  if (bookingSettings) {
    if (dateStr < bookingSettings.firstAvailableServiceDate) return BLOCKED;
    const dayKey = DOW_TO_KEY[getDay(date)];
    if (!bookingSettings.workingDays[dayKey]) return BLOCKED;
    const fullyBlocked = bookingSettings.blockedDates.some(b => b.date === dateStr);
    if (fullyBlocked) return BLOCKED;
  }

  if (!settings || !suburb) return BLOCKED;

  const schedule = settings.suburbSchedules.find(s => s.suburb === suburb);

  if (!bookingSettings) {
    const availableDays = schedule?.availableDays || [1, 2, 3, 4, 5];
    if (!availableDays.includes(getDay(date))) return BLOCKED;
  }

  if (schedule?.blockedDates && schedule.blockedDates.includes(dateStr)) return BLOCKED;

  if (blocks.length > 0) {
    const hasFullDayBlock = blocks.some(
      b => b.status === 'active' && isBlockActiveOnDate(b, dateStr) && b.slot === 'full_day'
    );
    if (hasFullDayBlock) return BLOCKED;
  }

  if (jobs.length > 0) {
    const allDayJobs = jobs.filter(
      j => j.scheduledDate && isSameDay(new Date(j.scheduledDate), date) && j.status !== 'cancelled'
    );
    if (allDayJobs.length >= MAX_JOBS_PER_DAY) return BLOCKED;
  }

  const morningMax = getSlotMax('morning', schedule, bookingSettings);
  const afternoonMax = getSlotMax('afternoon', schedule, bookingSettings);

  // Exclude cancelled jobs -- a cancelled booking must free its slot (matches the
  // global daily-limit check above, which already ignores cancelled jobs).
  const dayJobs = jobs.filter(j => j.scheduledDate && isSameDay(new Date(j.scheduledDate), date) && j.suburb === suburb && j.status !== 'cancelled');
  const morningCount = dayJobs.filter(j => j.timeSlot === 'morning').length;
  const afternoonCount = dayJobs.filter(j => j.timeSlot === 'afternoon').length;

  let morningAvailable = isSlotEnabledBySettings('morning', bookingSettings) && morningCount < morningMax;
  let afternoonAvailable = isSlotEnabledBySettings('afternoon', bookingSettings) && afternoonCount < afternoonMax;

  if (bookingSettings?.blockedSlots) {
    const dateSlotBlocks = bookingSettings.blockedSlots.filter(b => b.date === dateStr);
    for (const b of dateSlotBlocks) {
      if (b.slotId === 'morning') morningAvailable = false;
      if (b.slotId === 'afternoon') afternoonAvailable = false;
    }
  }

  if (blocks.length > 0) {
    const slotBlocks = blocks.filter(
      b => b.status === 'active' && isBlockActiveOnDate(b, dateStr) && b.showPublic && b.slot !== 'full_day'
    );
    for (const block of slotBlocks) {
      if (block.slot === 'morning') morningAvailable = false;
      if (block.slot === 'afternoon') afternoonAvailable = false;
      if (block.slot === 'flexible') { morningAvailable = false; afternoonAvailable = false; }
    }
  }

  return {
    morning: morningAvailable,
    afternoon: afternoonAvailable,
    isAvailable: morningAvailable || afternoonAvailable,
  };
}
