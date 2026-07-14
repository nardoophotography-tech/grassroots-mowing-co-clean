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
import { CalendarBlock } from '@/data/blockoutStore';
import { computeDayAvailability } from '@/utils/scheduling';

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

  const isSlotEnabledBySettings = (slotId: string) => {
    if (!bookingSettings?.timeSlots) return true;
    const slot = bookingSettings.timeSlots.find(s => s.id === slotId);
    return slot ? slot.enabled : true;
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  // Availability logic lives in src/utils/scheduling.ts (single source of truth, unit-tested).
  const getAvailability = (date: Date) =>
    computeDayAvailability(date, { suburb, jobs, settings, blocks, bookingSettings });

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
