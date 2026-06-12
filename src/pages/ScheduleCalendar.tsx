import * as React from 'react';
import { toast } from 'react-hot-toast';
import {
  format,
  addDays,
  addWeeks,
  addMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
} from 'date-fns';
import {
  Plus,
  X,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  User,
  AlertCircle,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import {
  scheduleStore,
  useSchedule,
  ScheduleEntry,
  ScheduleStatus,
  SCHEDULE_STATUSES,
  SERVICE_TYPES,
  RunType,
  RUN_TYPES,
  RUN_ORDER,
} from '@/data/scheduleStore';
import { useJobs } from '@/hooks/useFirebase';
import { Job } from '@/types';

const RUN_STYLE: Record<RunType, string> = {
  'Morning Run': 'bg-amber-100 text-amber-800 border-amber-200',
  'Afternoon Run': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  Flexible: 'bg-stone-100 text-stone-600 border-stone-200',
};

const RUN_EMPTY: Record<RunType, string> = {
  'Morning Run': 'No morning run jobs',
  'Afternoon Run': 'No afternoon run jobs',
  Flexible: 'No flexible jobs',
};

const STATUS_STYLE: Record<ScheduleStatus, string> = {
  Scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
  'In Progress': 'bg-orange-100 text-orange-700 border-orange-200',
  Completed: 'bg-green-100 text-green-700 border-green-200',
  Cancelled: 'bg-stone-200 text-stone-500 border-stone-300',
  'Needs Reschedule': 'bg-red-100 text-red-700 border-red-200',
};

const JOB_STATUS_TO_SCHEDULE: Record<string, ScheduleStatus> = {
  quoted: 'Scheduled',
  scheduled: 'Scheduled',
  'on-the-way': 'In Progress',
  'in-progress': 'In Progress',
  completed: 'Completed',
  invoiced_final: 'Completed',
  paid: 'Completed',
  cancelled: 'Cancelled',
};

function jobToEntry(job: Job): ScheduleEntry {
  const runType: RunType =
    job.timeSlot === 'morning'
      ? 'Morning Run'
      : job.timeSlot === 'afternoon'
      ? 'Afternoon Run'
      : 'Flexible';

  const scheduledDate =
    job.scheduledDate && job.scheduledDate > 0
      ? format(new Date(job.scheduledDate), 'yyyy-MM-dd')
      : '';

  const scheduledTime =
    job.timeSlot === 'morning' ? '08:00' : job.timeSlot === 'afternoon' ? '13:00' : '09:00';

  return {
    id: 'job-' + job.id,
    jobId: job.id,
    isJob: true,
    clientName: job.clientName,
    phone: job.clientPhone || '',
    address: job.address || '',
    suburb: job.suburb || '',
    serviceType: job.description || job.servicePackage || 'Mowing Service',
    scheduledDate,
    scheduledTime,
    estimatedDuration: '',
    assignedTo: job.workerId || '',
    status: JOB_STATUS_TO_SCHEDULE[job.status] || 'Scheduled',
    runType,
    notes: job.notes || '',
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

type ViewMode = 'daily' | 'weekly' | 'monthly';
type FormState = Omit<ScheduleEntry, 'id' | 'createdAt' | 'updatedAt' | 'isJob' | 'jobId'>;

const todayKey = () => format(new Date(), 'yyyy-MM-dd');

const EMPTY: FormState = {
  clientName: '',
  phone: '',
  address: '',
  suburb: '',
  serviceType: 'Mowing',
  scheduledDate: todayKey(),
  scheduledTime: '09:00',
  estimatedDuration: '45 min',
  assignedTo: '',
  status: 'Scheduled',
  runType: 'Morning Run',
  notes: '',
};

const inputCls =
  'w-full h-11 rounded-xl border border-stone-300 px-3 text-sm focus:ring-2 focus:ring-deep-red outline-none';

export const ScheduleCalendar = () => {
  const { jobs, loading: jobsLoading, firestoreError } = useJobs();
  const localEntries = useSchedule();

  const [view, setView] = React.useState<ViewMode>('weekly');
  const [anchor, setAnchor] = React.useState<Date>(new Date());
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [saving, setSaving] = React.useState(false);

  const jobEntries: ScheduleEntry[] = React.useMemo(
    () =>
      jobs
        .filter((j) => j.scheduledDate && j.scheduledDate > 0 && j.status !== 'cancelled')
        .map(jobToEntry),
    [jobs]
  );

  const entries: ScheduleEntry[] = React.useMemo(
    () => [...jobEntries, ...localEntries],
    [jobEntries, localEntries]
  );

  const unscheduledJobs: Job[] = React.useMemo(
    () =>
      jobs.filter(
        (j) =>
          (!j.scheduledDate || j.scheduledDate === 0) &&
          !['completed', 'cancelled', 'paid', 'invoiced_final'].includes(j.status)
      ),
    [jobs]
  );

  const keyOf = (d: Date) => format(d, 'yyyy-MM-dd');

  const entriesForDay = (d: Date) =>
    entries
      .filter((e) => e.scheduledDate === keyOf(d))
      .sort(
        (a, b) =>
          RUN_ORDER[a.runType] - RUN_ORDER[b.runType] ||
          a.scheduledTime.localeCompare(b.scheduledTime)
      );

  const runCounts = (list: ScheduleEntry[]) => ({
    'Morning Run': list.filter((e) => e.runType === 'Morning Run').length,
    'Afternoon Run': list.filter((e) => e.runType === 'Afternoon Run').length,
    Flexible: list.filter((e) => e.runType === 'Flexible').length,
  });

  const goToday = () => setAnchor(new Date());
  const goPrev = () =>
    setAnchor((a) =>
      view === 'daily' ? addDays(a, -1) : view === 'weekly' ? addWeeks(a, -1) : addMonths(a, -1)
    );
  const goNext = () =>
    setAnchor((a) =>
      view === 'daily' ? addDays(a, 1) : view === 'weekly' ? addWeeks(a, 1) : addMonths(a, 1)
    );

  const openAdd = (date?: Date) => {
    setForm({ ...EMPTY, scheduledDate: keyOf(date ?? anchor) });
    setEditingId(null);
    setFormOpen(true);
  };

  const openEdit = (e: ScheduleEntry) => {
    if (e.isJob && e.jobId) {
      window.location.href = '/jobs/' + e.jobId;
      return;
    }
    const { id, createdAt, updatedAt, isJob, jobId, ...rest } = e;
    setForm(rest as FormState);
    setEditingId(id);
    setFormOpen(true);
  };

  const setField = (k: keyof FormState, v: string) =>
    setForm((f) => ({ ...f, [k]: v } as FormState));

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.clientName.trim()) {
      toast.error('Client name is required.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await scheduleStore.update(editingId, form);
        toast.success('Schedule entry updated.');
      } else {
        await scheduleStore.add(form);
        toast.success('Schedule entry saved.');
      }
      setFormOpen(false);
    } catch {
      toast.error('Failed to save schedule entry.');
    } finally {
      setSaving(false);
    }
  };

  const del = async (e: ScheduleEntry) => {
    if (e.isJob) return;
    if (window.confirm('Delete schedule entry for "' + e.clientName + '"?')) {
      try {
        await scheduleStore.remove(e.id);
        toast.success('Schedule entry deleted.');
        if (editingId === e.id) setFormOpen(false);
      } catch {
        toast.error('Failed to delete entry.');
      }
    }
  };

  const headerLabel = () => {
    if (view === 'daily') return format(anchor, 'EEEE, d MMMM yyyy');
    if (view === 'weekly') {
      const s = startOfWeek(anchor, { weekStartsOn: 1 });
      const e = endOfWeek(anchor, { weekStartsOn: 1 });
      return format(s, 'd MMM') + ' - ' + format(e, 'd MMM yyyy');
    }
    return format(anchor, 'MMMM yyyy');
  };

  const tabBtn = (mode: ViewMode, label: string) => (
    <button
      onClick={() => setView(mode)}
      className={
        'px-4 py-2 rounded-lg text-sm font-black uppercase tracking-widest transition-all ' +
        (view === mode ? 'bg-green-600 text-white shadow-md' : 'text-stone-500 hover:bg-stone-100')
      }
    >
      {label}
    </button>
  );

  const renderChip = (e: ScheduleEntry) => (
    <button
      key={e.id}
      onClick={() => openEdit(e)}
      className={'w-full text-left rounded-lg border px-2 py-1.5 hover:shadow-sm transition-all ' + RUN_STYLE[e.runType]}
      title={e.runType + ' - ' + e.scheduledTime + ' ' + e.clientName}
    >
      <p className="text-[10px] font-black truncate flex items-center gap-1">
        {e.isJob && <ExternalLink className="h-2.5 w-2.5 flex-shrink-0" />}
        {e.scheduledTime} - {e.clientName}
      </p>
      <p className="text-[9px] opacity-80 truncate">{e.serviceType}</p>
    </button>
  );

  function dayCard(e: ScheduleEntry) {
    return (
      <div
        key={e.id}
        className={'border rounded-2xl p-4 flex flex-col md:flex-row md:items-start gap-3 ' + (e.isJob ? 'border-deep-red/20 bg-red-50/30' : 'border-stone-200')}
      >
        <div className="md:w-24 flex-shrink-0">
          <p className="text-lg font-black text-charcoal flex items-center gap-1">
            <Clock className="h-4 w-4 text-deep-red" />
            {e.scheduledTime}
          </p>
          {e.estimatedDuration && (
            <p className="text-[10px] text-stone-400 uppercase tracking-widest">{e.estimatedDuration}</p>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-black text-charcoal">{e.clientName}</h3>
            {e.isJob && (
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-deep-red/30 bg-deep-red/10 text-deep-red">
                JOB
              </span>
            )}
            <span className={'text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ' + RUN_STYLE[e.runType]}>
              {e.runType}
            </span>
            <span className={'text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ' + STATUS_STYLE[e.status]}>
              {e.status}
            </span>
            <span className="text-[10px] font-bold text-ochre uppercase">{e.serviceType}</span>
          </div>
          <p className="text-xs text-stone-600 mt-1 flex items-center gap-1">
            <MapPin className="h-3 w-3 text-ochre" />
            {e.address || '--'}{e.suburb ? ', ' + e.suburb : ''}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-stone-500">
            {e.assignedTo && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />{e.assignedTo}
              </span>
            )}
            {e.phone && <span>{e.phone}</span>}
          </div>
          {e.notes && <p className="text-sm text-stone-700 mt-2 whitespace-pre-wrap">{e.notes}</p>}
        </div>
        <div className="flex gap-2">
          {e.isJob && e.jobId ? (
            <a
              href={'/jobs/' + e.jobId}
              className="p-2 rounded-lg bg-deep-red/10 hover:bg-deep-red/20 text-deep-red"
              title="Open job"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : (
            <>
              <button onClick={() => openEdit(e)} className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200" title="Edit">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => del(e)} className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-deep-red" title="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  function DailyView() {
    const dayEntries = entriesForDay(anchor);
    return (
      <div aria-label="Daily View" data-view="Daily View" className="earth-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black italic uppercase text-charcoal">{format(anchor, 'EEEE, d MMM')}</h2>
          <button
            onClick={() => openAdd(anchor)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-[11px] font-black uppercase tracking-widest"
          >
            <Plus className="h-3.5 w-3.5" /> Add Entry
          </button>
        </div>
        {dayEntries.length === 0 && (
          <p className="text-sm text-stone-500 italic mb-4">No schedule entries for this day.</p>
        )}
        <div className="space-y-6">
          {RUN_TYPES.map((run) => {
            const group = dayEntries.filter((e) => e.runType === run);
            return (
              <div key={run}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={'text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ' + RUN_STYLE[run]}>{run}</span>
                  <span className="text-[11px] font-bold text-stone-400">{group.length} job{group.length === 1 ? '' : 's'}</span>
                </div>
                {group.length === 0 ? (
                  <p className="text-xs text-stone-400 italic pl-1">{RUN_EMPTY[run]}</p>
                ) : (
                  <div className="space-y-3">{group.map((e) => dayCard(e))}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function WeeklyView() {
    const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(anchor, { weekStartsOn: 1 }) });
    const weekCount = days.reduce((sum, d) => sum + entriesForDay(d).length, 0);
    return (
      <div aria-label="Weekly View" data-view="Weekly View">
        {weekCount === 0 && !jobsLoading && (
          <div className="mb-4 py-4 text-center border-2 border-dashed border-stone-200 rounded-2xl bg-white/50">
            <p className="font-serif text-stone-500">No schedule entries this week.</p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {days.map((d) => {
            const list = entriesForDay(d);
            const isToday = isSameDay(d, new Date());
            return (
              <div
                key={d.toISOString()}
                className={'bg-white rounded-2xl border p-3 min-h-[160px] flex flex-col ' + (isToday ? 'border-deep-red ring-1 ring-deep-red/30' : 'border-stone-200')}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-stone-400">{format(d, 'EEE')}</p>
                    <p className={'text-lg font-black ' + (isToday ? 'text-deep-red' : 'text-charcoal')}>{format(d, 'd')}</p>
                  </div>
                  <button onClick={() => openAdd(d)} className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200" title="Add entry">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="space-y-2 flex-1">
                  {RUN_TYPES.map((run) => {
                    const g = list.filter((e) => e.runType === run);
                    return (
                      <div key={run}>
                        <p className={'text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded inline-block border ' + RUN_STYLE[run]}>{run}</p>
                        {g.length === 0 ? (
                          <p className="text-[8px] text-stone-400 italic mt-1">{RUN_EMPTY[run]}</p>
                        ) : (
                          <div className="space-y-1 mt-1">{g.map((e) => renderChip(e))}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function MonthlyView() {
    const monthStart = startOfMonth(anchor);
    const monthEnd = endOfMonth(anchor);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
    const monthCount = entries.filter((e) => {
      const d = new Date(e.scheduledDate + 'T00:00:00');
      return isSameMonth(d, anchor);
    }).length;
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return (
      <div aria-label="Monthly View" data-view="Monthly View">
        {monthCount === 0 && !jobsLoading && (
          <div className="mb-4 py-4 text-center border-2 border-dashed border-stone-200 rounded-2xl bg-white/50">
            <p className="font-serif text-stone-500">No schedule entries this month.</p>
          </div>
        )}
        <div className="earth-card p-4">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekdays.map((w) => (
              <p key={w} className="text-center text-[10px] font-black uppercase tracking-widest text-stone-400">{w}</p>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {days.map((d) => {
              const list = entriesForDay(d);
              const inMonth = isSameMonth(d, anchor);
              const isToday = isSameDay(d, new Date());
              const c = runCounts(list);
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => { setAnchor(d); setView('daily'); }}
                  className={
                    'text-left rounded-xl border p-2 min-h-[92px] transition-all hover:shadow-sm ' +
                    (inMonth ? 'bg-white border-stone-200' : 'bg-stone-50 border-stone-100 opacity-60') +
                    (isToday ? ' ring-2 ring-deep-red' : '')
                  }
                >
                  <div className="flex items-center justify-between">
                    <span className={'text-xs font-black ' + (isToday ? 'text-deep-red' : 'text-charcoal')}>{format(d, 'd')}</span>
                    {list.length > 0 && (
                      <span className="text-[9px] font-black text-white bg-deep-red rounded-full px-1.5 py-0.5">{list.length}</span>
                    )}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    <p className="text-[9px] font-black text-amber-700 leading-tight">Morning Run: {c['Morning Run']}</p>
                    <p className="text-[9px] font-black text-indigo-700 leading-tight">Afternoon Run: {c['Afternoon Run']}</p>
                    <p className="text-[9px] font-black text-stone-500 leading-tight">Flexible: {c['Flexible']}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function UnscheduledSection() {
    if (unscheduledJobs.length === 0) return null;
    return (
      <div className="mt-8">
        <h2 className="text-sm font-black uppercase tracking-widest text-stone-500 mb-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          Unscheduled Jobs ({unscheduledJobs.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {unscheduledJobs.map((job) => (
            <a
              key={job.id}
              href={'/jobs/' + job.id}
              className="flex items-start gap-3 p-4 bg-white border border-amber-200 rounded-2xl hover:shadow-sm hover:border-amber-300 transition-all"
            >
              <div className="flex-1 min-w-0">
                <p className="font-black text-charcoal text-sm truncate">{job.clientName}</p>
                <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 text-ochre flex-shrink-0" />
                  {job.suburb || job.address || 'No address'}
                </p>
                <p className="text-[10px] font-bold text-ochre uppercase mt-1">
                  {job.status} - {job.servicePackage || job.description || 'Service'}
                </p>
              </div>
              <ExternalLink className="h-4 w-4 text-stone-400 flex-shrink-0 mt-0.5" />
            </a>
          ))}
        </div>
      </div>
    );
  }

  function textField(label: string, key: keyof FormState, placeholder?: string) {
    return (
      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-clay">{label}</label>
        <input
          value={form[key] as string}
          onChange={(e) => setField(key, e.target.value)}
          placeholder={placeholder}
          className={inputCls}
        />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-charcoal uppercase italic tracking-tighter">Schedule</h1>
          <p className="text-[11px] font-bold text-charcoal">Runs: Morning Run - Afternoon Run - Flexible</p>
          <p className="text-stone-500 italic text-sm">Daily, weekly and monthly job calendar.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-white p-1 rounded-xl border border-stone-200 shadow-sm">
            {tabBtn('daily', 'Daily')}
            {tabBtn('weekly', 'Weekly')}
            {tabBtn('monthly', 'Monthly')}
          </div>
          <button
            onClick={() => openAdd()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-deep-red text-white font-black uppercase text-xs tracking-widest hover:bg-deep-red/90"
          >
            <Plus className="h-4 w-4" /> Add Schedule Entry
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button onClick={goPrev} className="p-2 rounded-lg border border-stone-200 hover:bg-stone-100" title="Previous">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={goToday} className="px-4 py-2 rounded-lg border border-stone-200 font-black uppercase text-[11px] tracking-widest hover:bg-stone-100">
            Today
          </button>
          <button onClick={goNext} className="p-2 rounded-lg border border-stone-200 hover:bg-stone-100" title="Next">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm font-black uppercase tracking-widest text-charcoal">{headerLabel()}</p>
      </div>

      {firestoreError && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-800 mb-6">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold">Firebase error - schedule data may be incomplete.</p>
            <p className="text-xs mt-0.5 opacity-70">{firestoreError}</p>
          </div>
        </div>
      )}

      {jobsLoading && (
        <div className="flex items-center gap-2 text-stone-500 text-sm mb-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading jobs from Firebase...
        </div>
      )}

      {view === 'daily' && DailyView()}
      {view === 'weekly' && WeeklyView()}
      {view === 'monthly' && MonthlyView()}

      {UnscheduledSection()}

      {formOpen && (
        <div className="fixed inset-0 z-[80] bg-black/40 flex items-start justify-center overflow-y-auto p-4">
          <form onSubmit={save} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl mt-10 mb-10">
            <div className="flex items-center justify-between p-6 border-b border-stone-100">
              <h2 className="text-xl font-black italic uppercase text-charcoal">
                {editingId ? 'Edit Schedule Entry' : 'New Schedule Entry'}
              </h2>
              <button type="button" onClick={() => setFormOpen(false)} className="p-2 rounded-lg hover:bg-stone-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 grid md:grid-cols-2 gap-4">
              {textField('Client Name', 'clientName', 'e.g. John Smith')}
              {textField('Phone', 'phone', '0400 000 000')}
              {textField('Address', 'address', 'e.g. 12 Simpson St')}
              {textField('Suburb', 'suburb', 'e.g. Mount Isa')}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-clay">Service Type</label>
                <select value={form.serviceType} onChange={(e) => setField('serviceType', e.target.value)} className={inputCls}>
                  {SERVICE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-clay">Status</label>
                <select value={form.status} onChange={(e) => setField('status', e.target.value)} className={inputCls}>
                  {SCHEDULE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-clay">Run Type</label>
                <select value={form.runType} onChange={(e) => setField('runType', e.target.value)} className={inputCls}>
                  {RUN_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-clay">Date</label>
                <input type="date" value={form.scheduledDate} onChange={(e) => setField('scheduledDate', e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-clay">Time</label>
                <input type="time" value={form.scheduledTime} onChange={(e) => setField('scheduledTime', e.target.value)} className={inputCls} />
              </div>
              {textField('Estimated Duration', 'estimatedDuration', 'e.g. 45 min')}
              {textField('Assigned To', 'assignedTo', 'e.g. David')}
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-clay">Notes</label>
                <textarea value={form.notes} onChange={(e) => setField('notes', e.target.value)} className="w-full min-h-[80px] rounded-xl border border-stone-300 px-3 py-2 text-sm focus:ring-2 focus:ring-deep-red outline-none" />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 p-6 border-t border-stone-100">
              <div>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => del({ ...form, id: editingId, createdAt: 0, updatedAt: 0 })}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-deep-red font-black uppercase text-xs tracking-widest hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl border border-stone-300 font-black uppercase text-xs tracking-widest hover:bg-stone-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-deep-red text-white font-black uppercase text-xs tracking-widest hover:bg-deep-red/90 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editingId ? 'Save Changes' : 'Save Entry'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ScheduleCalendar;
