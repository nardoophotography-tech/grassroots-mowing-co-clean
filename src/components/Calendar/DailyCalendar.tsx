import * as React from 'react';
import { format, isToday, isSameDay } from 'date-fns';
import { 
  Navigation, 
  MapPin, 
  Phone, 
  Clock, 
  ChevronRight, 
  CheckCircle2, 
  Play, 
  Truck, 
  DollarSign, 
  PlusCircle, 
  Info,
  ChevronLeft,
  Calendar as CalendarIcon
} from 'lucide-react';
import { Job, UserRole } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { JOB_STATUS_LABELS, JOB_STATUS_COLORS } from '@/src/constants';

interface DailyCalendarProps {
  jobs: Job[];
  role: UserRole;
  onJobClick: (job: Job) => void;
  onStatusChange: (jobId: string, status: Job['status']) => void;
  onAddOnRequest: (job: Job) => void;
}

export const DailyCalendar: React.FC<DailyCalendarProps> = ({
  jobs,
  role,
  onJobClick,
  onStatusChange,
  onAddOnRequest
}) => {
  const [selectedDate, setSelectedDate] = React.useState(new Date());

  const dayJobs = jobs.filter(job => isSameDay(new Date(job.scheduledDate), selectedDate))
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const morningJobs = dayJobs.filter(j => j.timeSlot === 'morning');
  const afternoonJobs = dayJobs.filter(j => j.timeSlot === 'afternoon');

  const JobItem: React.FC<{ job: any }> = ({ job }) => {
    const hasPendingAddOns = job.addOns.some((a: any) => a.selected && !a.approvedBy);

    return (
      <div
        onClick={() => onJobClick(job)}
        className={cn(
          "bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-4 p-4 active:scale-[0.98] transition-transform",
          job.status === 'completed' && "bg-gray-50 border-gray-100 opacity-80"
        )}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-gray-900">{job.clientName}</h3>
              <Badge variant={JOB_STATUS_COLORS[job.status]}>{JOB_STATUS_LABELS[job.status]}</Badge>
            </div>
            <div className="flex items-center gap-1.5 text-gray-500 text-sm">
              <MapPin className="h-4 w-4 text-green-600" />
              <span className="font-medium">{job.suburb}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{job.address}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-green-600">${job.price.toFixed(2)}</p>
            <Badge variant={job.paymentStatus === 'paid' ? 'success' : 'outline'} className="text-[10px] mt-1">
              {job.paymentStatus.toUpperCase()}
            </Badge>
          </div>
        </div>

        {hasPendingAddOns && (
          <div className="mb-3 p-2 bg-amber-50 border border-amber-100 rounded-lg flex items-center gap-2">
            <Info className="h-4 w-4 text-amber-600" />
            <p className="text-xs font-bold text-amber-700">Add-on Approval Pending</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mt-4">
          {job.status === 'scheduled' && (
            <Button
              variant="primary"
              size="sm"
              className="flex items-center gap-2 h-12 rounded-xl bg-amber-600 hover:bg-amber-700 w-full"
              onClick={(e) => { e.stopPropagation(); onStatusChange(job.id, 'on-the-way'); }}
            >
              <Truck className="h-4 w-4" />
              On The Way
            </Button>
          )}

          {job.status === 'on-the-way' && (
            <Button
              variant="primary"
              size="sm"
              className="flex items-center gap-2 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 w-full"
              onClick={(e) => { e.stopPropagation(); onStatusChange(job.id, 'in-progress'); }}
            >
              <Play className="h-4 w-4" />
              Start Job
            </Button>
          )}

          {job.status === 'in-progress' && (
            <Button
              variant="primary"
              size="sm"
              className="flex items-center gap-2 h-12 rounded-xl bg-green-600 hover:bg-green-700 w-full"
              onClick={(e) => { e.stopPropagation(); onStatusChange(job.id, 'completed'); }}
            >
              <CheckCircle2 className="h-4 w-4" />
              Complete
            </Button>
          )}

          {job.status !== 'completed' && (
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 h-12 rounded-xl border-green-200 text-green-700 w-full"
              onClick={(e) => { e.stopPropagation(); onAddOnRequest(job); }}
            >
              <PlusCircle className="h-4 w-4" />
              Add-On
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 h-12 rounded-xl col-span-2 border-gray-200 text-gray-600"
            onClick={(e) => { e.stopPropagation(); onJobClick(job); }}
          >
            <ChevronRight className="h-4 w-4" />
            View Full Details
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto pb-24">
      {/* Date Selector */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <CalendarIcon className="h-5 w-5 text-green-700" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE, MMM d')}
            </h2>
            <p className="text-xs text-gray-500 font-medium">{dayJobs.length} Jobs Scheduled</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedDate(d => new Date(d.setDate(d.getDate() - 1)))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-gray-500" />
          </button>
          <button
            onClick={() => setSelectedDate(new Date())}
            className="px-3 py-1 text-sm font-bold text-green-600 hover:bg-green-50 rounded-lg transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setSelectedDate(d => new Date(d.setDate(d.getDate() + 1)))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Morning Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 px-2">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <h4 className="text-sm font-black text-amber-700 uppercase tracking-widest">Morning Run</h4>
          </div>
          {morningJobs.length > 0 ? (
            morningJobs.map(job => <JobItem key={job.id} job={job} />)
          ) : (
            <div className="p-8 border-2 border-dashed border-gray-200 rounded-2xl text-center">
              <p className="text-gray-400 font-medium">No morning jobs scheduled</p>
            </div>
          )}
        </div>

        {/* Afternoon Section */}
        <div>
          <div className="flex items-center gap-2 mb-4 px-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
            <h4 className="text-sm font-black text-blue-700 uppercase tracking-widest">Afternoon Run</h4>
          </div>
          {afternoonJobs.length > 0 ? (
            afternoonJobs.map(job => <JobItem key={job.id} job={job} />)
          ) : (
            <div className="p-8 border-2 border-dashed border-gray-200 rounded-2xl text-center">
              <p className="text-gray-400 font-medium">No afternoon jobs scheduled</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
