import * as React from 'react';
import { useJobs, useStaff, useSettings } from '@/src/hooks/useFirebase';
import { useAuth } from '@/src/contexts/AuthContext';
import { MonthlyCalendar } from '@/src/components/Calendar/MonthlyCalendar';
import { WeeklyCalendar } from '@/src/components/Calendar/WeeklyCalendar';
import { DailyCalendar } from '@/src/components/Calendar/DailyCalendar';
import { Job } from '@/src/types';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { Calendar as CalendarIcon, List, LayoutGrid, Columns } from 'lucide-react';

type ViewType = 'monthly' | 'weekly' | 'daily';

export const CalendarPage = () => {
  const { profile } = useAuth();
  const { jobs, updateJob, reorderJob, assignWorker, loading: jobsLoading } = useJobs();
  const { staff, loading: staffLoading } = useStaff();
  const { settings } = useSettings();
  const navigate = useNavigate();
  
  const [view, setView] = React.useState<ViewType>(
    profile?.role === 'admin' ? 'monthly' : 'daily'
  );

  if (jobsLoading || staffLoading) {
    return <div className="p-8 text-center">Loading schedule...</div>;
  }

  const handleJobClick = (job: Job) => {
    navigate(`/jobs/${job.id}`);
  };

  const handleStatusChange = async (jobId: string, status: Job['status']) => {
    await updateJob(jobId, { status });
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
