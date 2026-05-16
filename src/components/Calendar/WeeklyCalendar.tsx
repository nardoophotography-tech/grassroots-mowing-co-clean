import * as React from 'react';
import { 
  format, 
  startOfWeek, 
  addDays, 
  eachDayOfInterval, 
  isSameDay, 
  addWeeks, 
  subWeeks,
  isToday
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Clock, User, ArrowUp, ArrowDown } from 'lucide-react';
import { Job, UserProfile } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { Badge } from '@/src/components/ui/Badge';

interface WeeklyCalendarProps {
  jobs: Job[];
  workers: UserProfile[];
  onJobClick: (job: Job) => void;
  onAssignWorker: (jobId: string, workerId: string) => void;
  onReorderJob: (jobId: string, direction: 'up' | 'down') => void;
}

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
  jobs,
  workers,
  onJobClick,
  onAssignWorker,
  onReorderJob
}) => {
  const [currentWeek, setCurrentWeek] = React.useState(new Date());

  const weekStart = startOfWeek(currentWeek);
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: addDays(weekStart, 6),
  });

  const nextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const prevWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));

  const getJobsForDay = (date: Date) => {
    return jobs.filter(job => isSameDay(new Date(job.scheduledDate), date))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  };

  const JobCard: React.FC<{ job: any }> = ({ job }) => {
    const worker = workers.find(w => w.uid === job.workerId);

    return (
      <div
        onClick={() => onJobClick(job)}
        className={cn(
          "p-2 mb-2 rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer group",
          job.status === 'completed' && "opacity-60 grayscale-[0.5]"
        )}
      >
        <div className="flex justify-between items-start mb-1">
          <h4 className="text-xs font-bold text-gray-900 truncate flex-1">{job.clientName}</h4>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onReorderJob(job.id, 'up'); }}
              className="p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-green-600"
            >
              <ArrowUp className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onReorderJob(job.id, 'down'); }}
              className="p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-green-600"
            >
              <ArrowDown className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1">
          <MapPin className="h-2.5 w-2.5" />
          <span className="truncate">{job.suburb}</span>
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
              <User className="h-3 w-3 text-gray-400" />
            </div>
            <select
              value={job.workerId || ''}
              onChange={(e) => {
                e.stopPropagation();
                onAssignWorker(job.id, e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] bg-transparent border-none focus:ring-0 p-0 font-medium text-gray-600 cursor-pointer"
            >
              <option value="">Unassigned</option>
              {workers.map(w => (
                <option key={w.uid} value={w.uid}>{w.displayName}</option>
              ))}
            </select>
          </div>
          <Badge 
            variant={job.status === 'completed' ? 'success' : 'outline'} 
            className="text-[8px] px-1 py-0 h-3.5"
          >
            {job.status}
          </Badge>
        </div>
      </div>
    );
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
            Week of {format(weekStart, 'MMM d, yyyy')}
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={prevWeek}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-gray-500" />
          </button>
          <button
            onClick={() => setCurrentWeek(new Date())}
            className="px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Today
          </button>
          <button
            onClick={nextWeek}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Weekly Grid */}
      <div className="grid grid-cols-7 divide-x divide-gray-100">
        {weekDays.map((day, i) => {
          const dayJobs = getJobsForDay(day);
          const morningJobs = dayJobs.filter(j => j.timeSlot === 'morning');
          const afternoonJobs = dayJobs.filter(j => j.timeSlot === 'afternoon');

          return (
            <div key={i} className={cn(
              "min-h-[600px] bg-gray-50/30",
              isToday(day) && "bg-green-50/20"
            )}>
              <div className={cn(
                "p-3 text-center border-b border-gray-100 sticky top-0 bg-white z-10",
                isToday(day) && "bg-green-50"
              )}>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{format(day, 'EEE')}</p>
                <p className={cn(
                  "text-lg font-black",
                  isToday(day) ? "text-green-600" : "text-gray-900"
                )}>{format(day, 'd')}</p>
              </div>

              <div className="p-2 space-y-4">
                {/* Morning Section */}
                <div>
                  <div className="flex items-center gap-1 mb-2 px-1">
                    <Clock className="h-3 w-3 text-amber-500" />
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-tight">Morning Run</span>
                  </div>
                  {morningJobs.length > 0 ? (
                    morningJobs.map(job => <JobCard key={job.id} job={job} />)
                  ) : (
                    <div className="p-4 border-2 border-dashed border-gray-100 rounded-lg text-center">
                      <p className="text-[10px] text-gray-300 font-medium">No jobs</p>
                    </div>
                  )}
                </div>

                {/* Afternoon Section */}
                <div>
                  <div className="flex items-center gap-1 mb-2 px-1">
                    <Clock className="h-3 w-3 text-blue-500" />
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">Afternoon Run</span>
                  </div>
                  {afternoonJobs.length > 0 ? (
                    afternoonJobs.map(job => <JobCard key={job.id} job={job} />)
                  ) : (
                    <div className="p-4 border-2 border-dashed border-gray-100 rounded-lg text-center">
                      <p className="text-[10px] text-gray-300 font-medium">No jobs</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
