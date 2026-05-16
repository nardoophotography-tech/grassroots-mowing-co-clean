import * as React from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Clock } from 'lucide-react';
import { Job, BusinessSettings } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { Badge } from '@/src/components/ui/Badge';

interface MonthlyCalendarProps {
  jobs: Job[];
  settings: BusinessSettings | null;
  onDayClick: (date: Date) => void;
  onJobClick: (job: Job) => void;
}

export const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({
  jobs,
  settings,
  onDayClick,
  onJobClick
}) => {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const getJobsForDay = (date: Date) => {
    return jobs.filter(job => isSameDay(new Date(job.scheduledDate), date));
  };

  const isBlocked = (date: Date) => {
    if (!settings) return false;
    const dateStr = format(date, 'yyyy-MM-dd');
    return settings.suburbSchedules.some(s => s.blockedDates.includes(dateStr));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <CalendarIcon className="h-5 w-5 text-green-700" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-gray-500" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Grid Header */}
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="py-2 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, i) => {
          const dayJobs = getJobsForDay(day);
          const morningJobs = dayJobs.filter(j => j.timeSlot === 'morning');
          const afternoonJobs = dayJobs.filter(j => j.timeSlot === 'afternoon');
          const blocked = isBlocked(day);
          const suburbs = Array.from(new Set(dayJobs.map(j => j.suburb)));

          return (
            <div
              key={i}
              onClick={() => onDayClick(day)}
              className={cn(
                "min-h-[100px] p-2 border-b border-r border-gray-100 transition-colors cursor-pointer hover:bg-gray-50",
                !isSameMonth(day, monthStart) && "bg-gray-50/50 text-gray-300",
                isToday(day) && "bg-green-50/30",
                blocked && "bg-red-50/30"
              )}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={cn(
                  "text-sm font-semibold",
                  isToday(day) ? "text-green-600" : "text-gray-700",
                  !isSameMonth(day, monthStart) && "text-gray-300"
                )}>
                  {format(day, 'd')}
                </span>
                {blocked && (
                  <Badge variant="destructive" className="text-[8px] px-1 py-0 h-3">BLOCKED</Badge>
                )}
              </div>

              {dayJobs.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>{morningJobs.length}M / {afternoonJobs.length}A</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {suburbs.slice(0, 2).map(s => (
                      <div key={s} className="flex items-center gap-0.5 px-1 py-0.5 bg-blue-50 text-blue-700 rounded text-[8px] font-medium border border-blue-100">
                        <MapPin className="h-2 w-2" />
                        {s}
                      </div>
                    ))}
                    {suburbs.length > 2 && (
                      <span className="text-[8px] text-gray-400">+{suburbs.length - 2}</span>
                    )}
                  </div>

                  <div className="mt-1 space-y-0.5">
                    {dayJobs.slice(0, 2).map(job => (
                      <div
                        key={job.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onJobClick(job);
                        }}
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[9px] truncate font-medium border",
                          job.status === 'paid' ? "bg-green-50 text-green-700 border-green-100" :
                          job.status === 'completed' ? "bg-blue-50 text-blue-700 border-blue-100" :
                          "bg-white text-gray-700 border-gray-200"
                        )}
                      >
                        {job.clientName}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
