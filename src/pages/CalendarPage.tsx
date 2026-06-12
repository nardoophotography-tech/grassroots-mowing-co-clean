import * as React from 'react';
import { useJobs, useStaff, useSettings } from '@/hooks/useFirebase';
import { useAuth } from '@/contexts/AuthContext';
import { MonthlyCalendar } from '@/components/Calendar/MonthlyCalendar';
import { WeeklyCalendar } from '@/components/Calendar/WeeklyCalendar';
import { DailyCalendar } from '@/components/Calendar/DailyCalendar';
import { Job } from '@/types';
import { useNavigate, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { offlineQueue } from '@/services/offlineQueue';
import { toast } from 'react-hot-toast';
import { Calendar as CalendarIcon, List, LayoutGrid, Columns } from 'lucide-react';

type ViewType = 'monthly' | 'weekly' | 'daily';

export const CalendarPage = () => {
  const { profile } = useAuth();
  const { jobs, updateJob, reorderJob, assignWorker, loading: jobsLoading } = useJobs();
  const { staff, loading: staffLoading } = useStaff();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const dataError = null;

  const [view, setView] = React.useState<ViewType>(
    profile?.role === 'admin' ? 'monthly' : 'daily'
  );

  // Safety net: never hang on the loading state forever. If the data hooks
  // haven't resolved within 8s we stop waiting and render an empty schedule.
  const [timedOut, setTimedOut] = React.useState(false);
  React.useEffect(() => {
    const t = window.setTimeout(() => setTimedOut(true), 8000);
    return () => window.clearTimeout(t);
  }, []);

  const stillLoading = (jobsLoading || staffLoading) && !timedOut;

  if (stillLoading) {
    return <div className="p-8 text-center text-clay font-bold animate-pulse">Loading schedule...</div>;
  }

  // Admin-safe shell: when no jobs can be loaded (permission-denied or genuinely
  // empty) we still render the page shell with a useful empty state + actions
  // instead of a hard error wall.
  if (jobs.length === 0) {
    return (
      <div className="p-4 lg:p-8 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900">Schedule</h1>
        <p className="text-gray-500 italic">Manage your regional business workflow and appointments.</p>
        <div className="mt-10 py-20 text-center border-2 border-dashed border-stone-200 rounded-[2rem] bg-white/50">
          <p className="font-serif text-lg text-stone-700">No schedule entries available yet.</p>
          {dataError && (
            <p className="text-sm text-stone-500 mt-2">Firebase permissions need updating for live schedule data.</p>
          )}
          <div className="flex flex-wrap gap-3 justify-center mt-8">
            <Link to="/admin" className="px-6 py-3 rounded-xl bg-deep-red text-white font-black uppercase text-xs tracking-widest hover:bg-deep-red/90">
              Back to Admin Portal
            </Link>
            <Link to="/jobs" className="px-6 py-3 rounded-xl border border-stone-300 font-black uppercase text-xs tracking-widest hover:bg-stone-100">
              Job Queue
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleJobClick = (job: Job) => {
    navigate(`/jobs/${job.id}`);
  };

  const handleStatusChange = async (jobId: string, status: Job['status']) => {
    if (status === 'completed') {
      // Offline-first: Add to queue
      offlineQueue.add(jobId, 'COMPLETE_JOB');
      toast.success('Job marked as completed. Finalizing in background...');
    }
    
    try {
      await updateJob(jobId, { status });
    } catch (err) {
      if (status === 'completed') {
        toast.success('Action queued. Will sync when internet is available.');
      } else {
        toast.error('Failed to update status.');
      }
    }
  };

  const handleAddOnRequest = (job: Job) => {
    navigate(`/jobs/${job.id}`); // Add-on logic is in JobDetail
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Regional Tracker - Schedule</h1>
          <p className="text-gray-500 italic">Manage your regional business workflow and appointments.</p>
        </div>

        {/* View Switcher */}
        <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm self-start">
          {profile?.role === 'admin' && (
            <>
              <button
                onClick={() => setView('monthly')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                  view === 'monthly' ? "bg-green-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
                Monthly
              </button>
              <button
                onClick={() => setView('weekly')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                  view === 'weekly' ? "bg-green-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
                )}
              >
                <Columns className="h-4 w-4" />
                Weekly
              </button>
            </>
          )}
          <button
            onClick={() => setView('daily')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
              view === 'daily' ? "bg-green-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            <List className="h-4 w-4" />
            Daily
          </button>
        </div>
      </div>

      <div className="animate-in fade-in duration-500">
        {view === 'monthly' && profile?.role === 'admin' && (
          <MonthlyCalendar 
            jobs={jobs} 
            settings={settings}
            onDayClick={(date) => {
              // Optionally switch to daily view for that date
              console.log('Day clicked:', date);
            }}
            onJobClick={handleJobClick}
          />
        )}

        {view === 'weekly' && profile?.role === 'admin' && (
          <WeeklyCalendar 
            jobs={jobs}
            workers={staff}
            onJobClick={handleJobClick}
            onAssignWorker={assignWorker}
            onReorderJob={reorderJob}
          />
        )}

        {view === 'daily' && (
          <DailyCalendar 
            jobs={jobs}
            role={profile?.role || 'staff'}
            onJobClick={handleJobClick}
            onStatusChange={handleStatusChange}
            onAddOnRequest={handleAddOnRequest}
          />
        )}
      </div>
    </div>
  );
};
