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
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Job, UserRole } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { JOB_STATUS_LABELS, JOB_STATUS_COLORS } from '@/constants';

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
    const [isExpanded, setIsExpanded] = React.useState(false);
    const hasPendingAddOns = job.addOns.some((a: any) => a.selected && !a.approvedBy);

    return (
      <motion.div
        layout
        className={cn(
          "bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-3 active:scale-[0.98] transition-all",
          job.status === 'completed' && "bg-gray-50 border-gray-50 opacity-75"
        )}
      >
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-3 cursor-pointer flex justify-between items-center gap-3"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-sm font-black text-gray-900 truncate uppercase tracking-tight">{job.clientName}</h3>
              <Badge variant={JOB_STATUS_COLORS[job.status]} className="text-[8px] px-1 py-0 h-4 leading-none font-black uppercase">
                {JOB_STATUS_LABELS[job.status].replace(/ /g, '')}
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-gray-500 text-[10px]">
              <MapPin className="h-3 w-3 text-green-600/70" />
              <span className="font-bold uppercase tracking-wider">{job.suburb}</span>
              <span className="mx-1 text-gray-300">•</span>
              <span className="font-medium text-gray-400 capitalize">{job.servicePackage?.substring(0, 15)}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className="text-xs font-black text-green-700 leading-tight">${job.price.toFixed(2)}</p>
            </div>
            <div className={cn(
              "w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center transition-transform",
              isExpanded && "rotate-180 bg-green-50"
            )}>
              <ChevronDown className={cn("h-3 w-3 text-gray-400", isExpanded && "text-green-600")} />
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="px-3 pb-3 border-t border-gray-50 pt-3 bg-gray-50/30"
            >
              <div className="space-y-3">
                <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1 block">Deployment Address</label>
                  <p className="text-xs text-gray-700 font-medium leading-tight">{job.address}</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 mt-2 p-0 text-[10px] text-green-600 font-black uppercase tracking-widest hover:bg-transparent"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`, '_blank');
                    }}
                  >
                    <Navigation className="h-3 w-3 mr-1" /> Open Maps
                  </Button>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div>
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1 block">Account</label>
                      <Badge variant={job.paymentStatus === 'paid' ? 'success' : 'outline'} className="text-[8px] h-4 font-black uppercase">
                        {job.paymentStatus}
                      </Badge>
                    </div>
                    {job.timeSlot && (
                      <div>
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1 block">Target window</label>
                        <div className="flex items-center gap-1 text-[10px] font-black text-gray-600 uppercase">
                           <Clock className="h-3 w-3 text-amber-500" />
                           {job.timeSlot}
                        </div>
                      </div>
                    )}
                  </div>
                  {job.status !== 'completed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[8px] font-black uppercase tracking-widest border-green-200 text-green-700 rounded-lg px-2"
                      onClick={(e) => { e.stopPropagation(); onAddOnRequest(job); }}
                    >
                      <PlusCircle className="mr-1 h-3 w-3" /> Add-On
                    </Button>
                  )}
                </div>

                {hasPendingAddOns && (
                  <div className="p-2 bg-amber-50 border border-amber-100 rounded-lg flex items-center gap-2">
                    <Info className="h-3 w-3 text-amber-600" />
                    <p className="text-[8px] font-black text-amber-700 uppercase tracking-widest">Approval Required</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  {job.status === 'scheduled' && (
                    <Button
                      variant="primary"
                      className="flex items-center justify-center gap-2 h-9 rounded-xl bg-amber-600 hover:bg-amber-700 w-full text-[10px] font-black uppercase tracking-widest"
                      onClick={(e) => { e.stopPropagation(); onStatusChange(job.id, 'on-the-way'); }}
                    >
                      <Truck className="h-3 w-3" /> Trip
                    </Button>
                  )}

                  {job.status === 'on-the-way' && (
                    <Button
                      variant="primary"
                      className="flex items-center justify-center gap-2 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 w-full text-[10px] font-black uppercase tracking-widest"
                      onClick={(e) => { e.stopPropagation(); onStatusChange(job.id, 'in-progress'); }}
                    >
                      <Play className="h-3 w-3" /> Start
                    </Button>
                  )}

                  {job.status === 'in-progress' && (
                    <Button
                      variant="primary"
                      className="flex items-center justify-center gap-2 h-9 rounded-xl bg-green-600 hover:bg-green-700 w-full text-[10px] font-black uppercase tracking-widest"
                      onClick={(e) => { e.stopPropagation(); onStatusChange(job.id, 'completed'); }}
                    >
                      <CheckCircle2 className="h-3 w-3" /> Finish
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    className="flex items-center justify-center gap-2 h-9 rounded-xl border border-gray-200 text-gray-600 w-full text-[10px] font-black uppercase tracking-widest"
                    onClick={(e) => { e.stopPropagation(); onJobClick(job); }}
                  >
                    Details <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
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
