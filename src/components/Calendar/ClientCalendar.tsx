import * as React from 'react';
import { 
  format, 
  addMonths,
  getDay, 
  isSameDay, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth,
  startOfWeek,
  endOfWeek,
  parseISO,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckCircle2 } from 'lucide-react';
import { Job, BusinessSettings, BookingSettings } from '@/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarBlock, isBlockActiveOnDate } from '@/data/blockoutStore';

// day-of-week index → BookingSettings.workingDays key
const DOW_TO_KEY: (keyof BookingSettings['workingDays'])[] = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];

interface ClientCalendarProps {
  suburb: string;
  jobs: Job[];
  settings: BusinessSettings | null;
  onSelect: (date: string, slot: 'morning' | 'afternoon') => void;
  selectedDate?: string;
  selectedSlot?: 'morning' | 'afternoon';
  /** Active calendar_blocks from Firestore — used to honour admin block-outs */
  blocks?: CalendarBlock[];
  /** Booking availability settings from bookingSettings/main */
  bookingSettings?: BookingSettings;
}

export const ClientCalendar: React.FC<ClientCalendarProps> = ({
  suburb,
  jobs,
  settings,
  onSelect,
  selectedDate,
  selectedSlot,
  blocks = [],
  bookingSettings,
}) => {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const timeSelectionRef = React.useRef<HTMLDivElement>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const MAX_JOBS_PER_DAY = bookingSettings?.maxBookingsPerDay ?? 6;

  // Resolve per-slot maxBookings from bookingSettings (fallback to SuburbSchedule capacity)
  const getSlotMax = (slotId: 'morning' | 'afternoon', schedule: any): number => {
    if (bookingSettings?.timeSlots) {
      const slotDef = bookingSettings.timeSlots.find(s => s.id === slotId);
      if (slotDef) return slotDef.maxBookings;
    }
    return slotId === 'morning'
      ? (schedule?.morningCapacity ?? 3)
      : (schedule?.afternoonCapacity ?? 3);
  };

  const isSlotEnabledBySettings = (slotId: 'morning' | 'afternoon'): boolean => {
    if (!bookingSettings?.timeSlots) return true;
    const slotDef = bookingSettings.timeSlots.find(s => s.id === slotId);
    return slotDef ? slotDef.enabled : true;
  };

  const getAvailability = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');

    // ── Booking settings gates (checked before anything else) ──────────
    if (bookingSettings) {
      // 1. First available service date
      if (dateStr < bookingSettings.firstAvailableServiceDate) {
        return { morning: false, afternoon: false, isAvailable: false };
      }

      // 2. Working day check from bookingSettings.workingDays
      const dow = getDay(date);
      const dayKey = DOW_TO_KEY[dow];
      if (!bookingSettings.workingDays[dayKey]) {
        return { morning: false, afternoon: false, isAvailable: false };
      }

      // 3. Blocked full date from bookingSettings.blockedDates
      const fullyBlocked = bookingSettings.blockedDates.some(b => b.date === dateStr);
      if (fullyBlocked) {
        return { morning: false, afternoon: false, isAvailable: false };
      }
    }

    if (!settings || !suburb) return { morning: false, afternoon: false, isAvailable: false };

    const schedule = settings.suburbSchedules.find(s => s.suburb === suburb);

    // 4. Suburb schedule working-day check (only when no bookingSettings.workingDays)
    if (!bookingSettings) {
      const availableDays = schedule?.availableDays || [1, 2, 3, 4, 5];
      const dayOfWeek = getDay(date);
      if (!availableDays.includes(dayOfWeek)) {
        return { morning: false, afternoon: false, isAvailable: false };
      }
    }

    // 5. Suburb blocked date
    if (schedule?.blockedDates && schedule.blockedDates.includes(dateStr)) {
      return { morning: false, afternoon: false, isAvailable: false };
    }

    // 6. Calendar blockouts — full_day always blocks regardless of showPublic
    if (blocks.length > 0) {
      const hasFullDayBlock = blocks.some(
        b => b.status === 'active' && isBlockActiveOnDate(b, dateStr) && b.slot === 'full_day'
      );
      if (hasFullDayBlock) {
        return { morning: false, afternoon: false, isAvailable: false };
      }
    }

    // 7. Global daily job limit
    if (jobs.length > 0) {
      const allDayJobs = jobs.filter(
        j => j.scheduledDate && isSameDay(new Date(j.scheduledDate), date) && j.status !== 'cancelled'
      );
      if (allDayJobs.length >= MAX_JOBS_PER_DAY) {
        return { morning: false, afternoon: false, isAvailable: false };
      }
    }

    // 8. Per-slot capacity
    const morningMax = getSlotMax('morning', schedule);
    const afternoonMax = getSlotMax('afternoon', schedule);

    const dayJobs = jobs.filter(j => j.scheduledDate && isSameDay(new Date(j.scheduledDate), date) && j.suburb === suburb);
    const morningCount = dayJobs.filter(j => j.timeSlot === 'morning').length;
    const afternoonCount = dayJobs.filter(j => j.timeSlot === 'afternoon').length;

    let morningAvailable = isSlotEnabledBySettings('morning') && morningCount < morningMax;
    let afternoonAvailable = isSlotEnabledBySettings('afternoon') && afternoonCount < afternoonMax;

    // 9. bookingSettings slot-specific blockouts
    if (bookingSettings?.blockedSlots) {
      const dateSlotBlocks = bookingSettings.blockedSlots.filter(b => b.date === dateStr);
      for (const b of dateSlotBlocks) {
        if (b.slotId === 'morning') morningAvailable = false;
        if (b.slotId === 'afternoon') afternoonAvailable = false;
      }
    }

    // 10. Calendar blockout store — slot-specific (respects showPublic)
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
  };

  const handleDateSelect = (date: string) => {
    onSelect(date, 'morning');
    setTimeout(() => {
      timeSelectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-ochre/10">
          <h3 className="text-sm font-bold text-deep-red uppercase tracking-widest flex items-center gap-2 font-serif">
            <CalendarIcon className="h-4 w-4 text-ochre" />
            Select a Date
          </h3>
          <div className="flex gap-2">
            <button type="button" onClick={() => setCurrentMonth(d => addMonths(d, -1))} className="p-1 hover:bg-ochre/5 rounded transition-colors">
              <ChevronLeft className="h-5 w-5 text-ochre" />
            </button>
            <span className="text-sm font-bold text-charcoal min-w-[100px] text-center font-serif">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button type="button" onClick={() => setCurrentMonth(d => addMonths(d, 1))} className="p-1 hover:bg-ochre/5 rounded transition-colors">
              <ChevronRight className="h-5 w-5 text-ochre" />
            </button>
          </div>
        </div>

        {/* Grid Header */}
        <div className="grid grid-cols-7 bg-ochre/5 border-b border-ochre/10">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={i} className="py-2 text-center text-[10px] font-black text-ochre/60 uppercase">
              {day}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, i) => {
            const { isAvailable } = getAvailability(day);
            const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isSelected = selectedDate === format(day, 'yyyy-MM-dd');
            const dateStr = format(day, 'yyyy-MM-dd');

            return (
              <button
                key={i}
                type="button"
                disabled={!isAvailable || isPast}
                onClick={() => handleDateSelect(dateStr)}
                className={cn(
                  "h-12 flex flex-col items-center justify-center border-b border-r border-ochre/5 transition-all relative",
                  !isCurrentMonth && "opacity-20",
                  isSelected
                    ? "bg-deep-red text-white z-10 scale-105 shadow-lg rounded-sm"
                    : isAvailable && !isPast
                    ? "hover:bg-ochre/5 text-charcoal"
                    : "bg-ochre/5 text-ochre/30 cursor-not-allowed"
                )}
              >
                <span className="text-sm font-bold">{format(day, 'd')}</span>
                {isAvailable && !isPast && !isSelected && (
                  <div className="w-1 h-1 bg-ochre rounded-full mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div ref={timeSelectionRef}>
        <AnimatePresence mode="wait">
          {selectedDate && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3"
            >
              <h3 className="text-sm font-bold text-deep-red uppercase tracking-widest flex items-center gap-2 font-serif">
                <Clock className="h-4 w-4 text-ochre" />
                Select a Time
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {(['morning', 'afternoon'] as const).filter(slot => isSlotEnabledBySettings(slot)).map((slot) => {
                  const { morning, afternoon } = getAvailability(new Date(selectedDate + 'T00:00:00'));
                  const isAvailable = slot === 'morning' ? morning : afternoon;
                  const isSelected = selectedSlot === slot;
                  const slotDef = bookingSettings?.timeSlots?.find(s => s.id === slot);
                  const label = slotDef?.label ?? (slot === 'morning' ? 'Morning Run' : 'Afternoon Run');
                  const time = slotDef?.time ?? (slot === 'morning' ? '08:00' : '13:00');

                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => onSelect(selectedDate, slot)}
                      className={cn(
                        "p-4 rounded-2xl border-2 text-center transition-all relative overflow-hidden",
                        !isAvailable
                          ? "opacity-50 grayscale cursor-not-allowed border-ochre/10 bg-ochre/5"
                          : isSelected
                          ? "border-deep-red bg-deep-red/5 text-deep-red shadow-md"
                          : "border-ochre/10 bg-white hover:border-ochre/30 hover:bg-ochre/5"
                      )}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle2 className="h-4 w-4 text-deep-red" />
                        </div>
                      )}
                      <p className="text-lg font-black capitalize font-serif">{label}</p>
                      <p className="text-[10px] font-bold text-ochre uppercase tracking-widest">{time}</p>
                      <p className="text-[10px] font-bold text-ochre/60 uppercase tracking-widest mt-0.5">
                        {isAvailable ? 'Slots Available' : 'Fully Booked'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
