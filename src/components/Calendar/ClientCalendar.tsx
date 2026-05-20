import * as React from 'react';
import { 
  format, 
  addDays, 
  addMonths,
  getDay, 
  isSameDay, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckCircle2 } from 'lucide-react';
import { Job, BusinessSettings } from '@/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ClientCalendarProps {
  suburb: string;
  jobs: Job[];
  settings: BusinessSettings | null;
  onSelect: (date: string, slot: 'morning' | 'afternoon') => void;
  selectedDate?: string;
  selectedSlot?: 'morning' | 'afternoon';
}

export const ClientCalendar: React.FC<ClientCalendarProps> = ({
  suburb,
  jobs,
  settings,
  onSelect,
  selectedDate,
  selectedSlot
}) => {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const timeSelectionRef = React.useRef<HTMLDivElement>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const getAvailability = (date: Date) => {
    if (!settings || !suburb) return { morning: false, afternoon: false, isAvailable: false };
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const schedule = settings.suburbSchedules.find(s => s.suburb === suburb);
    
    // Fallback to Mon-Fri with capacity 2 if no schedule found
    const availableDays = schedule?.availableDays || [1, 2, 3, 4, 5];
    const morningCapacity = schedule?.morningCapacity ?? 2;
    const afternoonCapacity = schedule?.afternoonCapacity ?? 2;

    // Check if day of week is available
    const dayOfWeek = getDay(date);
    if (!availableDays.includes(dayOfWeek)) return { morning: false, afternoon: false, isAvailable: false };

    // Check if date is blocked
    if (schedule?.blockedDates && schedule.blockedDates.includes(dateStr)) return { morning: false, afternoon: false, isAvailable: false };

    // Check capacity
    const dayJobs = jobs.filter(j => isSameDay(new Date(j.scheduledDate), date) && j.suburb === suburb);
    const morningJobs = dayJobs.filter(j => j.timeSlot === 'morning');
    const afternoonJobs = dayJobs.filter(j => j.timeSlot === 'afternoon');

    const morningAvailable = morningJobs.length < morningCapacity;
    const afternoonAvailable = afternoonJobs.length < afternoonCapacity;

    return {
      morning: morningAvailable,
      afternoon: afternoonAvailable,
      isAvailable: morningAvailable || afternoonAvailable
    };
  };

  const handleDateSelect = (date: string) => {
    onSelect(date, 'morning');
    // Scroll to time selection on small screens
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
            const isPast = day < new Date(new Date().setHours(0,0,0,0));
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
                  isSelected ? "bg-deep-red text-white z-10 scale-105 shadow-lg rounded-sm" : 
                  isAvailable && !isPast ? "hover:bg-ochre/5 text-charcoal" : "bg-ochre/5 text-ochre/30 cursor-not-allowed"
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
                {['morning', 'afternoon'].map((slot) => {
                  const { morning, afternoon } = getAvailability(new Date(selectedDate));
                  const isAvailable = slot === 'morning' ? morning : afternoon;
                  const isSelected = selectedSlot === slot;

                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => onSelect(selectedDate, slot as any)}
                      className={cn(
                        "p-4 rounded-2xl border-2 text-center transition-all relative overflow-hidden",
                        !isAvailable ? "opacity-50 grayscale cursor-not-allowed border-ochre/10 bg-ochre/5" :
                        isSelected ? "border-deep-red bg-deep-red/5 text-deep-red shadow-md" : 
                        "border-ochre/10 bg-white hover:border-ochre/30 hover:bg-ochre/5"
                      )}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle2 className="h-4 w-4 text-deep-red" />
                        </div>
                      )}
                      <p className="text-lg font-black capitalize font-serif">{slot}</p>
                      <p className="text-[10px] font-bold text-ochre uppercase tracking-widest">
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
