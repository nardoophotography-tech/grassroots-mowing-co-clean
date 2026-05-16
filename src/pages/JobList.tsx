import * as React from 'react';
import { WarriorMan } from '@/src/components/WarriorMan';
import { useJobs } from '@/src/hooks/useFirebase';
import { JOB_STATUS_LABELS, JOB_STATUS_COLORS, TIME_SLOT_LABELS } from '@/src/constants';
import { format } from 'date-fns';
import { Badge } from '@/src/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Search, Filter, PlusCircle, MapPin, Navigation, ArrowLeft } from 'lucide-react';
import { Input } from '@/src/components/ui/Input';
import { cn } from '@/src/lib/utils';

export const JobList = () => {
  const navigate = useNavigate();
  const { jobs, loading, updateJob } = useJobs();
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState('all');
  const [sortBy, setSortBy] = React.useState<'date' | 'suburb'>('date');
  const [isGroupedBySuburb, setIsGroupedBySuburb] = React.useState(false);

  if (loading) {
    return <div className="p-8 text-center">Loading jobs...</div>;
  }

  const handleQuickComplete = async (e: React.ChangeEvent<HTMLInputElement>, jobId: string) => {
    if (e.target.checked) {
      try {
        await updateJob(jobId, { status: 'completed' });
        toast.success('Job marked as completed and invoice generated');
      } catch (err) {
        toast.error('Failed to complete job');
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
        <WarriorMan size={400} />
      </div>
      <div className="fixed -bottom-20 -left-20 w-80 h-80 pointer-events-none select-none rotate-45 opacity-[0.03]">
        <WarriorMan size={350} />
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
        <div>
          <h2 className="text-3xl font-bold text-deep-red font-serif tracking-tight">Frontier Ledger - Jobs</h2>
          <p className="text-ochre font-medium uppercase tracking-widest text-[10px] mt-1">Manage Work Orders & Operational Flow</p>
        </div>
        <Link to="/jobs/new">
          <Button className="bg-deep-red hover:bg-deep-red/90 text-white shadow-lg rounded-xl font-bold">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Job
          </Button>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-4 relative z-10">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ochre" />
          <Input 
            placeholder="Search clients or descriptions..." 
            className="pl-10 border-ochre/20 focus:ring-deep-red"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-ochre" />
          <select 
            className="h-10 rounded-xl border border-ochre/20 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-deep-red font-medium text-charcoal"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="quoted">Quoted</option>
            <option value="scheduled">Scheduled</option>
            <option value="on-the-way">On The Way</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="invoiced">Invoiced</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select 
            className="h-10 rounded-xl border border-ochre/20 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-deep-red font-medium text-charcoal"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="date">Sort by Date</option>
            <option value="suburb">Sort by Suburb</option>
          </select>
          <Button
            variant={isGroupedBySuburb ? "primary" : "outline"}
            onClick={() => setIsGroupedBySuburb(!isGroupedBySuburb)}
            className={cn(
              "h-10 rounded-xl font-bold uppercase text-[10px] tracking-widest",
              isGroupedBySuburb ? "bg-ochre text-white" : "border-ochre/20 text-ochre"
            )}
          >
            <Navigation className="h-4 w-4 mr-2" />
            {isGroupedBySuburb ? "Ungroup" : "Group by Suburb"}
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
              checked={job.status === 'completed' || job.status === 'invoiced' || job.status === 'paid'}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => handleQuickComplete(e, job.id)}
              disabled={job.status === 'completed' || job.status === 'invoiced' || job.status === 'paid'}
              className="h-6 w-6 rounded border-ochre/30 text-deep-red focus:ring-deep-red cursor-pointer"
            />
          </div>
          <Button variant="ghost" size="sm" className="text-ochre hover:text-deep-red hover:bg-ochre/5 font-bold uppercase text-[10px] tracking-widest mt-2">Details</Button>
        </div>
      </div>
    </Link>
  </Card>
);
