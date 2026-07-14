/**
 * Pure calendar block-out types and logic — NO react / firebase imports.
 *
 * Split out of blockoutStore.ts so this logic can be imported by pure,
 * unit-testable modules (e.g. src/utils/scheduling.ts) without dragging in
 * the Firestore/React runtime. blockoutStore.ts re-exports everything here
 * so existing import paths keep working.
 */

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
