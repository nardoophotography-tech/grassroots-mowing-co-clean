import * as React from 'react';
import { GrassRootsGuardian } from '@/components/GrassRootsGuardian';
import { useJobs } from '@/hooks/useFirebase';
import { JOB_STATUS_LABELS, JOB_STATUS_COLORS, TIME_SLOT_LABELS } from '@/constants';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { offlineQueue } from '@/services/offlineQueue';
import { Search, Filter, PlusCircle, MapPin, Navigation, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

export const JobList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialFilter = searchParams.get('filter') || 'all';

  const { jobs, loading, updateJob } = useJobs();
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState(initialFilter);
  const [sortBy, setSortBy] = React.useState<'date' | 'suburb'>('date');
  const [isGroupedBySuburb, setIsGroupedBySuburb] = React.useState(false);

  if (loading) {
    return <div className="p-8 text-center">Loading jobs...</div>;
  }

  const handleQuickComplete = async (e: React.ChangeEvent<HTMLInputElement>, jobId: string) => {
    if (e.target.checked) {
      // 1. Log offline command
      offlineQueue.add(jobId, 'COMPLETE_JOB');
      
      // 2. Optimistic UI update
      try {
        await updateJob(jobId, { status: 'completed' });
        toast.success('Job marked as completed. Finalizing in background...');
      } catch (err) {
        toast.success('Action queued. Will sync when internet is available.');
      }
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.clientName.toLowerCase().includes(search.toLowerCase()) || 
                          job.description.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || job.status === filter;
    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    if (sortBy === 'suburb') {
      const suburbCompare = a.suburb.localeCompare(b.suburb);
      if (suburbCompare !== 0) return suburbCompare;
    }
    // Default sort by date and then time slot
    if (a.scheduledDate !== b.scheduledDate) {
      return a.scheduledDate - b.scheduledDate;
    }
    const timeSlots = { morning: 0, afternoon: 1 };
    return timeSlots[a.timeSlot] - timeSlots[b.timeSlot];
  });

  return (
    <div className="p-4 lg:p-8 space-y-8 relative overflow-hidden">
      <div className="absolute inset-0 cultural-pattern opacity-5 pointer-events-none" />
      
      {/* Background Watermarks */}
      <div className="fixed -top-20 -right-20 w-96 h-96 pointer-events-none select-none opacity-[0.03]">
        <GrassRootsGuardian size={400} />
      </div>
      <div className="fixed -bottom-20 -left-20 w-80 h-80 pointer-events-none select-none rotate-45 opacity-[0.03]">
        <GrassRootsGuardian size={350} />
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
        <div>
          <h2 className="text-4xl font-black text-charcoal uppercase italic tracking-tighter">Operational <span className="text-primary">Ledger</span></h2>
          <p className="text-secondary font-black uppercase tracking-[0.3em] text-[10px] mt-1">Work Orders & In-Field Deployments</p>
        </div>
        <Link to="/jobs/new">
          <Button className="bg-deep-red hover:bg-deep-red/90 text-white shadow-lg rounded-xl font-bold">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Job
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 relative z-10">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ochre" />
          <Input 
            placeholder="Search clients..." 
            className="pl-10 border-ochre/20 focus:ring-deep-red h-12 sm:h-10 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
          <select 
            className="h-12 sm:h-10 rounded-xl border border-ochre/20 bg-white px-3 py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-deep-red font-bold text-charcoal uppercase tracking-widest sm:normal-case sm:tracking-normal"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Statuses</option>
            <option value="quoted">Quoted</option>
            <option value="scheduled">Scheduled</option>
            <option value="on-the-way">En Route</option>
            <option value="in-progress">Active</option>
            <option value="completed">Done</option>
          </select>
          <select 
            className="h-12 sm:h-10 rounded-xl border border-ochre/20 bg-white px-3 py-2 text-[10px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-deep-red font-bold text-charcoal uppercase tracking-widest sm:normal-case sm:tracking-normal"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="date">By Date</option>
            <option value="suburb">By District</option>
          </select>
          <Button
            variant={isGroupedBySuburb ? "primary" : "outline"}
            onClick={() => setIsGroupedBySuburb(!isGroupedBySuburb)}
            className={cn(
              "col-span-2 sm:col-span-1 h-12 sm:h-10 rounded-xl font-bold uppercase text-[10px] tracking-widest",
              isGroupedBySuburb ? "bg-ochre text-white" : "border-ochre/20 text-ochre"
            )}
          >
            <Navigation className="h-4 w-4 mr-2" />
            {isGroupedBySuburb ? "Ungroup" : "Group by District"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 relative z-10">
        {isGroupedBySuburb ? (
          Object.entries(
            filteredJobs.reduce((acc, job) => {
              const suburb = job.suburb || 'Unspecified';
              if (!acc[suburb]) acc[suburb] = [];
              acc[suburb].push(job);
              return acc;
            }, {} as Record<string, typeof jobs>)
          ).sort(([a], [b]) => a.localeCompare(b)).map(([suburb, suburbJobs]: [string, any[]]) => (
            <div key={suburb} className="space-y-4 mb-6">
              <div className="flex items-center gap-4 px-2">
                <div className="h-px flex-1 bg-ochre/10" />
                <h3 className="text-ochre font-black uppercase tracking-[0.2em] text-[10px] flex items-center gap-2">
                  <MapPin className="h-3 w-3" /> {suburb}
                  <span className="bg-ochre/10 px-2 py-0.5 rounded text-[8px] tracking-normal">{suburbJobs.length} Jobs</span>
                </h3>
                <div className="h-px flex-1 bg-ochre/10" />
              </div>
              <div className="grid grid-cols-1 gap-4">
                {suburbJobs.map(job => (
                  <JobCard key={job.id} job={job} handleQuickComplete={handleQuickComplete} />
                ))}
              </div>
            </div>
          ))
        ) : (
          filteredJobs.map(job => (
            <JobCard key={job.id} job={job} handleQuickComplete={handleQuickComplete} />
          ))
        )}
        {filteredJobs.length === 0 && (
          <div className="py-20 text-center text-ochre/40 italic font-serif text-lg">
            No jobs found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
};

const JobCard: React.FC<{ job: any, handleQuickComplete: any }> = ({ job, handleQuickComplete }) => (
  <Card className="border-ochre/10 shadow-sm hover:shadow-md transition-all rounded-xl overflow-hidden bg-white/80 backdrop-blur-sm">
    <Link to={`/jobs/${job.id}`} className="block p-5">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-xl text-charcoal font-serif">{job.clientName}</h3>
            <Badge variant="outline" className="border-ochre/30 text-ochre font-bold uppercase text-[10px] tracking-widest">
              {JOB_STATUS_LABELS[job.status]}
            </Badge>
          </div>
          <p className="text-sm text-charcoal/60 line-clamp-1">{job.description || 'No description provided'}</p>
          <div className="flex flex-wrap items-center gap-4 text-[10px] text-ochre font-bold uppercase tracking-wider pt-2">
            <span className="flex items-center gap-1 bg-ochre/5 px-2 py-1 rounded-lg border border-ochre/10">
              <MapPin className="h-3 w-3" /> {job.suburb}
            </span>
            <span className="bg-ochre/5 px-2 py-1 rounded-lg border border-ochre/10">
              {format(job.scheduledDate, 'MMM d, yyyy')} • {TIME_SLOT_LABELS[job.timeSlot]}
            </span>
            <span className="text-deep-red text-sm font-black ml-auto bg-deep-red/5 px-2 py-1 rounded-lg">
              ${job.price.toFixed(2)}
              {job.paymentStatus === 'pending-cash' && <span className="text-[9px] block text-charcoal/50 text-right mt-1">CASH (PEND)</span>}
              {job.paymentStatus === 'paid' && <span className="text-[9px] block text-green-600 text-right mt-1">PAID ({job.paymentMethod?.toUpperCase() || 'CARD'})</span>}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2 relative z-20">
          <div className="flex flex-col items-center gap-1">
            <p className="text-[8px] font-black text-ochre uppercase tracking-widest mb-1">Quick Complete</p>
            <input 
              type="checkbox"
              checked={job.status === 'completed' || job.status === 'invoiced_final' || job.status === 'paid'}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => handleQuickComplete(e, job.id)}
              disabled={job.status === 'completed' || job.status === 'invoiced_final' || job.status === 'paid'}
              className="h-6 w-6 rounded border-ochre/30 text-deep-red focus:ring-deep-red cursor-pointer"
            />
          </div>
          <Button variant="ghost" size="sm" className="text-ochre hover:text-deep-red hover:bg-ochre/5 font-bold uppercase text-[10px] tracking-widest mt-2">Details</Button>
        </div>
      </div>
    </Link>
  </Card>
);
