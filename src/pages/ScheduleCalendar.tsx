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
  Ban,
  Lock,
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
import {
  blockoutStore,
  useBlockouts,
  CalendarBlock,
  BlockSlot,
  BlockRepeat,
  WeekDay,
  WEEKDAYS,
  checkBlockConflict,
  formatBlockLabel,
  getActiveBlocksForDate,
} from '@/data/blockoutStore';
import {
  privateJobStore,
  usePrivateJobs,
  PrivateJob,
  PrivateJobCategory,
  PrivateJobTimeSlot,
  PRIVATE_JOB_CATEGORIES,
  PRIVATE_JOB_TIME_SLOT_LABELS,
} from '@/data/privateJobStore';
import { useJobs } from '@/hooks/useFirebase';
import { useAuth } from '@/contexts/AuthContext';
import { Job } from '@/types';
import { BookingSettingsPanel } from '@/components/BookingSettingsPanel';


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

type BlockoutFormState = {
  slot: BlockSlot;
  date: string;        // for one-off: the date; for weekly: the start date
  reason: string;
  publicLabel: string;
  showPublic: boolean;
  startTime: string;
  endTime: string;
  // ── Recurring fields ──────────────────────────────────────────────────
  repeat: BlockRepeat;
  repeatDays: WeekDay[];
  repeatEndDate: string;
};

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

const EMPTY_BLOCKOUT: BlockoutFormState = {
  slot: 'full_day',
  date: todayKey(),
  reason: '',
  publicLabel: 'Unavailable',
  showPublic: true,
  startTime: '09:00',
  endTime: '17:00',
  repeat: 'none',
  repeatDays: [],
  repeatEndDate: '',
};

type PrivateJobFormState = {
  title: string;
  date: string;
  timeSlot: PrivateJobTimeSlot;
  startTime: string;
  endTime: string;
  address: string;
  contactName: string;
  phone: string;
  price: string; // string so empty input works; parsed to number on save
  privateNotes: string;
  category: PrivateJobCategory;
};

const EMPTY_PRIVATE_JOB: PrivateJobFormState = {
  title: '',
  date: todayKey(),
  timeSlot: 'morning',
  startTime: '08:00',
  endTime: '10:00',
  address: '',
  contactName: '',
  phone: '',
  price: '',
  privateNotes: '',
  category: 'private_job',
};

const inputCls =
  'w-full h-11 rounded-xl border border-stone-300 px-3 text-sm focus:ring-2 focus:ring-deep-red outline-none';

export const ScheduleCalendar = () => {
  const { profile } = useAuth();
  const { jobs, loading: jobsLoading, firestoreError } = useJobs();
  const localEntries = useSchedule();
  const activeBlocks = useBlockouts();
  const privateJobs = usePrivateJobs();

  const [view, setView] = React.useState<ViewMode>('weekly');
  const [anchor, setAnchor] = React.useState<Date>(new Date());

  // ── Schedule entry form state ──────────────────────────────────────────
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [saving, setSaving] = React.useState(false);

  // ── Block-out form state ───────────────────────────────────────────────
  const [blockoutFormOpen, setBlockoutFormOpen] = React.useState(false);
  const [editingBlockId, setEditingBlockId] = React.useState<string | null>(null);
  const [blockoutForm, setBlockoutForm] = React.useState<BlockoutFormState>(EMPTY_BLOCKOUT);
  const [savingBlockout, setSavingBlockout] = React.useState(false);

  // ── Private job form state ─────────────────────────────────────────────
  const [privateJobFormOpen, setPrivateJobFormOpen] = React.useState(false);
  const [editingPrivateJobId, setEditingPrivateJobId] = React.useState<string | null>(null);
  const [privateJobForm, setPrivateJobForm] = React.useState<PrivateJobFormState>(EMPTY_PRIVATE_JOB);
  const [savingPrivateJob, setSavingPrivateJob] = React.useState(false);
  // Set true to open private job modal right after a blockout is saved
  const [blockoutThenAddPrivateJob, setBlockoutThenAddPrivateJob] = React.useState(false);

  // ── Overlap confirmation modal (replaces window.confirm) ──────────────
  const [confirmOverlap, setConfirmOverlap] = React.useState<{
    message: string;
    payload: Omit<CalendarBlock, 'id' | 'createdAt' | 'updatedAt'>;
    isEdit: boolean;
  } | null>(null);

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

  const blocksForDay = (d: Date) => getActiveBlocksForDate(activeBlocks, keyOf(d));
  const privateJobsForDay = (d: Date) => privateJobs.filter((j) => j.date === keyOf(d));

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

  // ── Schedule entry handlers ────────────────────────────────────────────

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
    // ── Block-out conflict check ────────────────────────────────────────
    const conflict = checkBlockConflict(
      activeBlocks,
      form.scheduledDate,
      form.runType,
      form.scheduledTime
    );
    if (conflict) {
      const proceed = window.confirm(
        `⚠️ This time is blocked out.\n\nReason: ${conflict.reason || formatBlockLabel(conflict)}\n\nContinue anyway?`
      );
      if (!proceed) return;
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

  // ── Block-out handlers ─────────────────────────────────────────────────

  const openBlockout = (date?: Date) => {
    setBlockoutForm({ ...EMPTY_BLOCKOUT, date: keyOf(date ?? anchor) });
    setEditingBlockId(null);
    setBlockoutFormOpen(true);
  };

  const openEditBlockout = (b: CalendarBlock) => {
    setBlockoutForm({
      slot: b.slot,
      date: b.date,
      reason: b.reason,
      publicLabel: b.publicLabel,
      showPublic: b.showPublic,
      startTime: b.startTime || '09:00',
      endTime: b.endTime || '17:00',
      repeat: b.repeat ?? 'none',
      repeatDays: (b.repeatDays ?? []) as WeekDay[],
      repeatEndDate: b.repeatEndDate ?? '',
    });
    setEditingBlockId(b.id);
    setBlockoutFormOpen(true);
  };

  const delBlockout = async (b: Pick<CalendarBlock, 'id'>) => {
    if (window.confirm('Remove this block-out?')) {
      try {
        await blockoutStore.remove(b.id);
        toast.success('Block-out removed.');
        if (editingBlockId === b.id) setBlockoutFormOpen(false);
      } catch {
        toast.error('Failed to remove block-out.');
      }
    }
  };

  // ── Private job handlers ──────────────────────────────────────────────────

  const openAddPrivateJob = (date?: Date, prefill?: Partial<PrivateJobFormState>) => {
    setPrivateJobForm({ ...EMPTY_PRIVATE_JOB, date: keyOf(date ?? anchor), ...prefill });
    setEditingPrivateJobId(null);
    setPrivateJobFormOpen(true);
  };

  const openEditPrivateJob = (j: PrivateJob) => {
    setPrivateJobForm({
      title:        j.title,
      date:         j.date,
      timeSlot:     j.timeSlot ?? 'morning',
      startTime:    j.startTime ?? '08:00',
      endTime:      j.endTime   ?? '10:00',
      address:      j.address      ?? '',
      contactName:  j.contactName  ?? '',
      phone:        j.phone        ?? '',
      price:        j.price != null ? String(j.price) : '',
      privateNotes: j.privateNotes ?? '',
      category:     j.category,
    });
    setEditingPrivateJobId(j.id);
    setPrivateJobFormOpen(true);
  };

  const savePrivateJob = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!privateJobForm.title.trim()) {
      toast.error('Title is required for a private job.');
      return;
    }
    setSavingPrivateJob(true);
    try {
      const priceNum = privateJobForm.price.trim() ? parseFloat(privateJobForm.price) : undefined;
      const payload: Omit<PrivateJob, 'id' | 'createdAt' | 'updatedAt'> = {
        entryType:    'private_job',
        visibility:   'admin_only',
        isPrivate:    true,
        title:        privateJobForm.title.trim(),
        date:         privateJobForm.date,
        timeSlot:     privateJobForm.timeSlot,
        startTime:    privateJobForm.timeSlot === 'custom' ? privateJobForm.startTime : undefined,
        endTime:      privateJobForm.timeSlot === 'custom' ? privateJobForm.endTime   : undefined,
        address:      privateJobForm.address.trim()      || undefined,
        contactName:  privateJobForm.contactName.trim()  || undefined,
        phone:        privateJobForm.phone.trim()        || undefined,
        price:        !isNaN(priceNum as number) ? priceNum : undefined,
        privateNotes: privateJobForm.privateNotes.trim() || undefined,
        category:     privateJobForm.category,
        status:       'active',
        createdBy:    'admin',
      };
      if (editingPrivateJobId) {
        await privateJobStore.update(editingPrivateJobId, payload);
        toast.success('Private job updated.');
      } else {
        await privateJobStore.add(payload);
        toast.success('Private job saved. Public blockout remains active.');
      }
      setPrivateJobFormOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save private job.');
    } finally {
      setSavingPrivateJob(false);
    }
  };

  const delPrivateJob = async (j: PrivateJob) => {
    if (window.confirm(`Delete private job "${j.title}"?`)) {
      try {
        await privateJobStore.remove(j.id);
        toast.success('Private job deleted.');
        if (editingPrivateJobId === j.id) setPrivateJobFormOpen(false);
      } catch {
        toast.error('Failed to delete private job.');
      }
    }
  };

  // ── Execute a blockout save (called directly or after overlap confirm) ─
  const commitBlockout = async (
    payload: Omit<CalendarBlock, 'id' | 'createdAt' | 'updatedAt'>,
    isEdit: boolean,
    isWeekly: boolean
  ) => {
    setSavingBlockout(true);
    try {
      if (isEdit && editingBlockId) {
        await blockoutStore.update(editingBlockId, payload);
        toast.success('Block-out updated.');
        setBlockoutFormOpen(false);
      } else {
        await blockoutStore.add(payload);
        toast.success(isWeekly ? 'Recurring block-out saved.' : 'Time blocked out.');
        if (blockoutThenAddPrivateJob) {
          setBlockoutThenAddPrivateJob(false);
          setBlockoutFormOpen(false);
          // Pre-fill the private job modal with the same date
          setPrivateJobForm({ ...EMPTY_PRIVATE_JOB, date: payload.date });
          setEditingPrivateJobId(null);
          setPrivateJobFormOpen(true);
        } else {
          setBlockoutFormOpen(false);
        }
      }
    } catch {
      toast.error('Failed to save block-out.');
    } finally {
      setSavingBlockout(false);
    }
  };

  const saveBlockout = async (ev: React.FormEvent) => {
    ev.preventDefault();

    const isWeekly = blockoutForm.repeat === 'weekly';

    // ── Validate weekly block has at least one day selected ────────────
    if (isWeekly && blockoutForm.repeatDays.length === 0) {
      toast.error('Please select at least one day of the week for the recurring block.');
      return;
    }

    // ── Build payload early so it can be passed to confirm modal ──────
    const payload: Omit<CalendarBlock, 'id' | 'createdAt' | 'updatedAt'> = {
      type: 'blockout',
      title: blockoutForm.reason || formatBlockLabel({ slot: blockoutForm.slot, repeat: blockoutForm.repeat }),
      reason: blockoutForm.reason,
      publicLabel: blockoutForm.publicLabel || 'Unavailable',
      showPublic: blockoutForm.showPublic,
      date: blockoutForm.date,
      slot: blockoutForm.slot,
      startTime: blockoutForm.slot === 'custom' ? blockoutForm.startTime : undefined,
      endTime: blockoutForm.slot === 'custom' ? blockoutForm.endTime : undefined,
      status: 'active',
      // ── Recurring fields ─────────────────────────────────────────────
      repeat: blockoutForm.repeat,
      repeatDays: isWeekly ? blockoutForm.repeatDays : [],
      repeatStartDate: isWeekly ? blockoutForm.date : undefined,
      repeatEndDate: isWeekly && blockoutForm.repeatEndDate ? blockoutForm.repeatEndDate : undefined,
    };

    // ── Check for overlap with existing bookings ───────────────────────
    const slotMatchesEntry = (e: typeof entries[0]) => {
      if (blockoutForm.slot === 'full_day') return true;
      if (blockoutForm.slot === 'morning' && e.runType === 'Morning Run') return true;
      if (blockoutForm.slot === 'afternoon' && e.runType === 'Afternoon Run') return true;
      if (blockoutForm.slot === 'flexible' && e.runType === 'Flexible') return true;
      if (blockoutForm.slot === 'custom' && blockoutForm.startTime && blockoutForm.endTime) {
        return (
          e.scheduledTime >= blockoutForm.startTime && e.scheduledTime <= blockoutForm.endTime
        );
      }
      return false;
    };

    let overlapping: typeof entries;
    if (!isWeekly) {
      // One-off: check entries on the exact date
      overlapping = entries.filter(
        (e) => e.scheduledDate === blockoutForm.date && slotMatchesEntry(e)
      );
    } else {
      // Weekly: check all entries whose weekday is in repeatDays and within range
      const dayNameMap: Record<number, string> = {
        0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
        4: 'thursday', 5: 'friday', 6: 'saturday',
      };
      overlapping = entries.filter((e) => {
        if (e.scheduledDate < blockoutForm.date) return false;
        if (blockoutForm.repeatEndDate && e.scheduledDate > blockoutForm.repeatEndDate) return false;
        const dayName = dayNameMap[new Date(e.scheduledDate + 'T00:00:00').getDay()];
        if (!blockoutForm.repeatDays.includes(dayName as WeekDay)) return false;
        return slotMatchesEntry(e);
      });
    }

    if (overlapping.length > 0) {
      // ── Show non-blocking React confirm instead of window.confirm() ──
      const msg = isWeekly
        ? `This recurring block-out overlaps ${overlapping.length} existing booking(s). The existing bookings will NOT be moved or changed. Continue anyway?`
        : `This block-out overlaps ${overlapping.length} existing booking(s). The existing bookings will NOT be moved or changed. Continue anyway?`;
      setConfirmOverlap({ message: msg, payload, isEdit: !!editingBlockId });
      return;
    }

    await commitBlockout(payload, !!editingBlockId, isWeekly);
  };

  // ── Rendering helpers ──────────────────────────────────────────────────

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

  /** Compact chip for Weekly view — schedule entry */
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

  /** Compact chip for Weekly view — block-out */
  const renderBlockChip = (b: CalendarBlock) => (
    <div
      key={b.id}
      onClick={() => openEditBlockout(b)}
      className={
        'w-full text-left rounded-lg border px-2 py-1.5 cursor-pointer hover:bg-red-100 transition-all ' +
        (b.repeat === 'weekly'
          ? 'bg-orange-50 border-orange-300 text-orange-800'
          : 'bg-red-50 border-red-200 text-red-700')
      }
      title={b.reason || formatBlockLabel(b)}
    >
      <p className="text-[10px] font-black truncate flex items-center gap-1">
        <Ban className="h-2.5 w-2.5 flex-shrink-0" />
        {formatBlockLabel(b)}
      </p>
      {b.reason && <p className="text-[9px] opacity-70 truncate">{b.reason}</p>}
    </div>
  );

  /** Compact chip for Weekly view — private admin job */
  const renderPrivateJobChip = (j: PrivateJob) => (
    <button
      key={j.id}
      onClick={() => openEditPrivateJob(j)}
      className="w-full text-left rounded-lg border px-2 py-1.5 hover:shadow-sm transition-all bg-violet-50 border-violet-300 text-violet-800"
      title={`PRIVATE — ${j.title}`}
    >
      <p className="text-[10px] font-black truncate flex items-center gap-1">
        <Lock className="h-2.5 w-2.5 flex-shrink-0" />
        {j.timeSlot === 'custom' && j.startTime ? j.startTime + ' ' : ''}
        {j.title}
      </p>
      <p className="text-[9px] opacity-70 truncate">PRIVATE · {PRIVATE_JOB_CATEGORIES.find(c => c.key === j.category)?.label ?? j.category}</p>
    </button>
  );

  /** Expanded card for Daily view — schedule entry */
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

  /** Expanded card for Daily view — private admin job */
  function privateJobCard(j: PrivateJob) {
    const catLabel = PRIVATE_JOB_CATEGORIES.find(c => c.key === j.category)?.label ?? j.category;
    return (
      <div
        key={j.id}
        className="border rounded-2xl p-4 flex flex-col md:flex-row md:items-start gap-3 border-violet-300 bg-violet-50/60"
      >
        <div className="md:w-28 flex-shrink-0">
          <p className="text-sm font-black flex items-center gap-1 text-violet-800">
            <Lock className="h-4 w-4" />
            PRIVATE
          </p>
          <p className="text-[10px] text-violet-600 font-bold mt-0.5 uppercase tracking-wide">
            Admin Only
          </p>
          {j.timeSlot === 'custom' && j.startTime && j.endTime && (
            <p className="text-[10px] text-violet-500 mt-0.5">{j.startTime} – {j.endTime}</p>
          )}
          {j.timeSlot && j.timeSlot !== 'custom' && (
            <p className="text-[10px] text-violet-500 mt-0.5 uppercase">{PRIVATE_JOB_TIME_SLOT_LABELS[j.timeSlot]}</p>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-black text-sm text-violet-900">{j.title}</p>
            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-violet-300 bg-violet-100 text-violet-700">
              {catLabel}
            </span>
          </div>
          {j.address && (
            <p className="text-xs text-violet-600 mt-1 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {j.address}
            </p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-violet-500">
            {j.contactName && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />{j.contactName}
              </span>
            )}
            {j.phone && <span>{j.phone}</span>}
            {j.price != null && <span>${j.price.toFixed(2)}</span>}
          </div>
          {j.privateNotes && (
            <p className="text-sm text-violet-700 mt-2 whitespace-pre-wrap">{j.privateNotes}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openEditPrivateJob(j)}
            className="p-2 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-700"
            title="Edit private job"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => delPrivateJob(j)}
            className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-deep-red"
            title="Delete private job"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  /** Expanded card for Daily view — block-out */
  function blockCard(b: CalendarBlock) {
    const isRecurring = b.repeat === 'weekly';
    return (
      <div
        key={b.id}
        className={
          'border rounded-2xl p-4 flex flex-col md:flex-row md:items-start gap-3 ' +
          (isRecurring ? 'border-orange-300 bg-orange-50/60' : 'border-red-200 bg-red-50/50')
        }
      >
        <div className="md:w-28 flex-shrink-0">
          <p className={'text-sm font-black flex items-center gap-1 ' + (isRecurring ? 'text-orange-700' : 'text-red-700')}>
            <Ban className="h-4 w-4" />
            {isRecurring ? 'RECURRING' : 'BLOCKED'}
          </p>
          {isRecurring && (
            <p className="text-[10px] text-orange-600 font-bold mt-0.5 uppercase tracking-wide">
              Weekly
            </p>
          )}
          {b.slot === 'custom' && b.startTime && b.endTime && (
            <p className="text-[10px] text-red-500 mt-0.5">{b.startTime} – {b.endTime}</p>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={'font-black text-sm ' + (isRecurring ? 'text-orange-800' : 'text-red-800')}>
            {formatBlockLabel(b)}
          </p>
          {isRecurring && b.repeatDays && b.repeatDays.length > 0 && (
            <p className="text-[10px] text-orange-600 mt-0.5 capitalize">
              Every {b.repeatDays.join(', ')}{b.repeatEndDate ? ` until ${b.repeatEndDate}` : ' (no end date)'}
            </p>
          )}
          {b.reason && (
            <p className="text-xs text-red-600 mt-1">{b.reason}</p>
          )}
          {b.publicLabel && (
            <p className="text-[10px] text-stone-400 uppercase tracking-widest mt-1">
              Public label: {b.publicLabel}
            </p>
          )}
          <p className="text-[10px] text-stone-400 uppercase tracking-widest mt-0.5">
            {b.showPublic ? 'Visible on public calendar' : 'Admin only — hidden from public'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openEditBlockout(b)}
            className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200"
            title="Edit block-out"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => delBlockout(b)}
            className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-deep-red"
            title="Remove block-out"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Views ──────────────────────────────────────────────────────────────

  function DailyView() {
    const dayEntries = entriesForDay(anchor);
    const dayBlocks = blocksForDay(anchor);
    const dayPrivateJobs = privateJobsForDay(anchor);
    const fullDayBlocks = dayBlocks.filter((b) => b.slot === 'full_day');
    const customBlocks = dayBlocks.filter((b) => b.slot === 'custom');
    const isDayBlocked = fullDayBlocks.length > 0;

    return (
      <div aria-label="Daily View" data-view="Daily View" className="earth-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black italic uppercase text-charcoal">{format(anchor, 'EEEE, d MMM')}</h2>
          <div className="flex gap-2">
            <button
              onClick={() => openAddPrivateJob(anchor)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-800 text-[11px] font-black uppercase tracking-widest"
            >
              <Lock className="h-3.5 w-3.5" /> Private Job
            </button>
            <button
              onClick={() => openAdd(anchor)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-[11px] font-black uppercase tracking-widest"
            >
              <Plus className="h-3.5 w-3.5" /> Add Entry
            </button>
          </div>
        </div>

        {/* Public blockout status banner */}
        {isDayBlocked && (
          <div className="mb-3 px-4 py-2 rounded-xl border border-red-200 bg-red-50 flex items-center gap-2">
            <Ban className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
            <span className="text-[11px] font-black uppercase tracking-widest text-red-700">
              Public Status: Unavailable — Full Day Blocked
            </span>
          </div>
        )}

        {/* Full-day and custom blocks shown at the top */}
        {(fullDayBlocks.length > 0 || customBlocks.length > 0) && (
          <div className="space-y-2 mb-4">
            {[...fullDayBlocks, ...customBlocks].map((b) => blockCard(b))}
          </div>
        )}

        {/* Private admin entries */}
        {dayPrivateJobs.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-violet-600 mb-2 flex items-center gap-1">
              <Lock className="h-3 w-3" /> Private Entries ({dayPrivateJobs.length})
            </p>
            <div className="space-y-2">
              {dayPrivateJobs.map((j) => privateJobCard(j))}
            </div>
          </div>
        )}

        {dayEntries.length === 0 && dayBlocks.length === 0 && dayPrivateJobs.length === 0 && (
          <p className="text-sm text-stone-500 italic mb-4">No schedule entries for this day.</p>
        )}

        <div className="space-y-6">
          {RUN_TYPES.map((run) => {
            const group = dayEntries.filter((e) => e.runType === run);
            const runSlot =
              run === 'Morning Run' ? 'morning' : run === 'Afternoon Run' ? 'afternoon' : 'flexible';
            const slotBlocks = dayBlocks.filter((b) => b.slot === runSlot);

            return (
              <div key={run}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={'text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ' + RUN_STYLE[run]}>{run}</span>
                  <span className="text-[11px] font-bold text-stone-400">{group.length} job{group.length === 1 ? '' : 's'}</span>
                </div>
                {/* Per-slot block-outs */}
                {slotBlocks.length > 0 && (
                  <div className="space-y-2 mb-2">
                    {slotBlocks.map((b) => blockCard(b))}
                  </div>
                )}
                {group.length === 0 && slotBlocks.length === 0 ? (
                  <p className="text-xs text-stone-400 italic pl-1">{RUN_EMPTY[run]}</p>
                ) : group.length > 0 ? (
                  <div className="space-y-3">{group.map((e) => dayCard(e))}</div>
                ) : null}
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
            const dayBlocks = blocksForDay(d);
            const fullDayBlocks = dayBlocks.filter((b) => b.slot === 'full_day');
            const customBlocks = dayBlocks.filter((b) => b.slot === 'custom');
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
                  <div className="flex gap-1">
                    <button onClick={() => openAddPrivateJob(d)} className="p-1.5 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-700" title="Add private job">
                      <Lock className="h-3 w-3" />
                    </button>
                    <button onClick={() => openAdd(d)} className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200" title="Add entry">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Full-day / custom block chips at top of card */}
                {(fullDayBlocks.length > 0 || customBlocks.length > 0) && (
                  <div className="space-y-1 mb-1">
                    {[...fullDayBlocks, ...customBlocks].map((b) => renderBlockChip(b))}
                  </div>
                )}

                {/* Private job chips */}
                {(() => { const pj = privateJobsForDay(d); return pj.length > 0 ? (
                  <div className="space-y-1 mb-1">
                    {pj.map((j) => renderPrivateJobChip(j))}
                  </div>
                ) : null; })()}

                <div className="space-y-2 flex-1">
                  {RUN_TYPES.map((run) => {
                    const g = list.filter((e) => e.runType === run);
                    const runSlot =
                      run === 'Morning Run' ? 'morning' : run === 'Afternoon Run' ? 'afternoon' : 'flexible';
                    const slotBlocks = dayBlocks.filter((b) => b.slot === runSlot);
                    return (
                      <div key={run}>
                        <p className={'text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded inline-block border ' + RUN_STYLE[run]}>{run}</p>
                        {/* Per-slot block chips */}
                        {slotBlocks.length > 0 && (
                          <div className="space-y-1 mt-1">
                            {slotBlocks.map((b) => renderBlockChip(b))}
                          </div>
                        )}
                        {g.length === 0 && slotBlocks.length === 0 ? (
                          <p className="text-[8px] text-stone-400 italic mt-1">{RUN_EMPTY[run]}</p>
                        ) : g.length > 0 ? (
                          <div className="space-y-1 mt-1">{g.map((e) => renderChip(e))}</div>
                        ) : null}
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
              const dayBlocks = blocksForDay(d);
              const inMonth = isSameMonth(d, anchor);
              const isToday = isSameDay(d, new Date());
              const c = runCounts(list);
              const hasFullDayBlock = dayBlocks.some((b) => b.slot === 'full_day');
              const hasAnyBlock = dayBlocks.length > 0;
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => { setAnchor(d); setView('daily'); }}
                  className={
                    'text-left rounded-xl border p-2 min-h-[92px] transition-all hover:shadow-sm ' +
                    (inMonth ? 'bg-white border-stone-200' : 'bg-stone-50 border-stone-100 opacity-60') +
                    (isToday ? ' ring-2 ring-deep-red' : '') +
                    (hasFullDayBlock ? ' bg-red-50/60' : '')
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
                    {hasAnyBlock && (
                      <p className="text-[9px] font-black text-red-600 leading-tight flex items-center gap-0.5">
                        <Ban className="h-2.5 w-2.5" />
                        {hasFullDayBlock ? 'Day blocked' : `${dayBlocks.length} block${dayBlocks.length > 1 ? 's' : ''}`}
                      </p>
                    )}
                    {(() => { const pc = privateJobsForDay(d).length; return pc > 0 ? (
                      <p className="text-[9px] font-black text-violet-600 leading-tight flex items-center gap-0.5">
                        <Lock className="h-2.5 w-2.5" />
                        {pc} private
                      </p>
                    ) : null; })()}
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

  // ── Render ─────────────────────────────────────────────────────────────

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
            onClick={() => openBlockout()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-700 text-white font-black uppercase text-xs tracking-widest hover:bg-stone-800 transition-colors"
          >
            <Ban className="h-4 w-4" /> Block Out Time
          </button>
          <button
            onClick={() => openAddPrivateJob()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-700 text-white font-black uppercase text-xs tracking-widest hover:bg-violet-800 transition-colors"
          >
            <Lock className="h-4 w-4" /> Add Private Job
          </button>
          <button
            onClick={() => openAdd()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-deep-red text-white font-black uppercase text-xs tracking-widest hover:bg-deep-red/90"
          >
            <Plus className="h-4 w-4" /> Add Schedule Entry
          </button>
        </div>
      </div>

      {/* Booking Availability Settings — admin only */}
      {profile?.role === 'admin' && <BookingSettingsPanel />}

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

      {/* ── Existing Schedule Entry Modal ──────────────────────────────── */}
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

      {/* ── Block-Out Modal ────────────────────────────────────────────── */}
      {/* ── Overlap confirmation modal (non-blocking, replaces window.confirm) ── */}
      {confirmOverlap && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 space-y-4">
            <p className="text-sm font-semibold text-stone-800 leading-relaxed">
              ⚠️ {confirmOverlap.message}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmOverlap(null)}
                className="px-5 py-2.5 rounded-xl border border-stone-300 font-black uppercase text-xs tracking-widest hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const { payload, isEdit } = confirmOverlap;
                  setConfirmOverlap(null);
                  commitBlockout(payload, isEdit, payload.repeat === 'weekly');
                  setBlockoutThenAddPrivateJob(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-stone-700 text-white font-black uppercase text-xs tracking-widest hover:bg-stone-800"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {blockoutFormOpen && (
        <div className="fixed inset-0 z-[90] bg-black/40 flex items-start justify-center overflow-y-auto p-4">
          <form onSubmit={saveBlockout} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl mt-10 mb-10">
            <div className="flex items-center justify-between p-6 border-b border-stone-100">
              <h2 className="text-xl font-black italic uppercase text-charcoal flex items-center gap-2">
                <Ban className="h-5 w-5 text-stone-600" />
                {editingBlockId ? 'Edit Block-Out' : 'Block Out Time'}
              </h2>
              <button type="button" onClick={() => setBlockoutFormOpen(false)} className="p-2 rounded-lg hover:bg-stone-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Block type */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-clay">Block Type</label>
                <select
                  value={blockoutForm.slot}
                  onChange={(e) => setBlockoutForm((f) => ({ ...f, slot: e.target.value as BlockSlot }))}
                  className={inputCls}
                >
                  <option value="full_day">Full Day</option>
                  <option value="morning">Morning Run Only</option>
                  <option value="afternoon">Afternoon Run Only</option>
                  <option value="flexible">Flexible Only</option>
                  <option value="custom">Custom Time Range</option>
                </select>
              </div>

              {/* Date / Start Date */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-clay">
                  {blockoutForm.repeat === 'weekly' ? 'Start Date' : 'Date'}
                </label>
                <input
                  type="date"
                  value={blockoutForm.date}
                  onChange={(e) => setBlockoutForm((f) => ({ ...f, date: e.target.value }))}
                  className={inputCls}
                  required
                />
              </div>

              {/* Repeat */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-clay">Repeat</label>
                <select
                  value={blockoutForm.repeat}
                  onChange={(e) =>
                    setBlockoutForm((f) => ({
                      ...f,
                      repeat: e.target.value as BlockRepeat,
                      repeatDays: [],
                      repeatEndDate: '',
                    }))
                  }
                  className={inputCls}
                >
                  <option value="none">Does not repeat</option>
                  <option value="weekly">Weekly (every week)</option>
                </select>
              </div>

              {/* Weekly options — only visible when repeat === 'weekly' */}
              {blockoutForm.repeat === 'weekly' && (
                <>
                  {/* Day picker */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-clay">
                      Repeat on
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAYS.map(({ key, short }) => {
                        const selected = blockoutForm.repeatDays.includes(key);
                                                return (
                          <button
                            key={key}
                            type="button"
                            onClick={() =>
                              setBlockoutForm((f) => ({
                                ...f,
                                repeatDays: selected
                                  ? f.repeatDays.filter((d) => d !== key)
                                  : [...f.repeatDays, key],
                              }))
                            }
                            className={
                              'px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest border transition-all ' +
                              (selected
                                ? 'bg-stone-700 text-white border-stone-700'
                                : 'bg-white text-stone-500 border-stone-300 hover:border-stone-500')
                            }
                          >
                            {short}
                          </button>
                        );
                      })}
                    </div>
                    {blockoutForm.repeatDays.length === 0 && (
                      <p className="text-[10px] text-red-500">Select at least one day.</p>
                    )}
                  </div>

                  {/* Optional end date */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-clay">
                      End Date{' '}
                      <span className="text-stone-400 normal-case font-normal">(optional — leave blank to repeat forever)</span>
                    </label>
                    <input
                      type="date"
                      value={blockoutForm.repeatEndDate}
                      min={blockoutForm.date}
                      onChange={(e) => setBlockoutForm((f) => ({ ...f, repeatEndDate: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                </>
              )}

              {/* Custom time range — only visible when slot === 'custom' */}
              {blockoutForm.slot === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-clay">Start Time</label>
                    <input
                      type="time"
                      value={blockoutForm.startTime}
                      onChange={(e) => setBlockoutForm((f) => ({ ...f, startTime: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-clay">End Time</label>
                    <input
                      type="time"
                      value={blockoutForm.endTime}
                      onChange={(e) => setBlockoutForm((f) => ({ ...f, endTime: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                </div>
              )}

              {/* Private reason — admin only */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-clay">
                  Private Reason <span className="text-stone-400 normal-case font-normal">(admin only — never shown to customers)</span>
                </label>
                <input
                  value={blockoutForm.reason}
                  onChange={(e) => setBlockoutForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="e.g. Family event, Equipment maintenance, Public holiday, Weather delay"
                  className={inputCls}
                />
              </div>

              {/* Public label */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-clay">
                  Public Label <span className="text-stone-400 normal-case font-normal">(shown to customers if visible)</span>
                </label>
                <input
                  value={blockoutForm.publicLabel}
                  onChange={(e) => setBlockoutForm((f) => ({ ...f, publicLabel: e.target.value }))}
                  placeholder="e.g. Unavailable, Fully booked, Limited availability"
                  className={inputCls}
                />
              </div>

              {/* Show publicly toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={blockoutForm.showPublic}
                  onChange={(e) => setBlockoutForm((f) => ({ ...f, showPublic: e.target.checked }))}
                  className="w-4 h-4 rounded accent-deep-red"
                />
                <span className="text-[10px] font-black uppercase tracking-widest text-clay">
                  Show on public booking calendar
                </span>
              </label>
            </div>

            <div className="flex items-center justify-between gap-3 p-6 border-t border-stone-100">
              <div>
                {editingBlockId && (
                  <button
                    type="button"
                    onClick={() => delBlockout({ id: editingBlockId })}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-deep-red font-black uppercase text-xs tracking-widest hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4" /> Remove Block
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setBlockoutFormOpen(false)}
                  disabled={savingBlockout}
                  className="px-5 py-2.5 rounded-xl border border-stone-300 font-black uppercase text-xs tracking-widest hover:bg-stone-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBlockout}
                  className="px-5 py-2.5 rounded-xl bg-stone-700 text-white font-black uppercase text-xs tracking-widest hover:bg-stone-800 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {savingBlockout && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editingBlockId ? 'Save Changes' : 'Block Time'}
                </button>
                {!editingBlockId && (
                  <button
                    type="submit"
                    disabled={savingBlockout}
                    onClick={() => setBlockoutThenAddPrivateJob(true)}
                    className="px-5 py-2.5 rounded-xl bg-violet-700 text-white font-black uppercase text-xs tracking-widest hover:bg-violet-800 disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {savingBlockout && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <Lock className="h-3.5 w-3.5" /> Block & Add Private Job
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ── Private Job Form Modal ──────────────────────────────────── */}
      {privateJobFormOpen && (
        <div className="fixed inset-0 z-[90] bg-black/40 flex items-start justify-center overflow-y-auto p-4">
          <form onSubmit={savePrivateJob} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl mt-10 mb-10">
            <div className="flex items-center justify-between p-6 border-b border-stone-100">
              <h2 className="text-xl font-black italic uppercase text-charcoal flex items-center gap-2">
                <Lock className="h-5 w-5 text-violet-600" />
                {editingPrivateJobId ? 'Edit Private Job' : 'New Private Job'}
              </h2>
              <button type="button" onClick={() => setPrivateJobFormOpen(false)} className="p-2 rounded-lg hover:bg-stone-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Admin-only badge */}
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-50 border border-violet-200">
                <Lock className="h-3.5 w-3.5 text-violet-600 flex-shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-widest text-violet-700">
                  Admin Only — Hidden from public and customers
                </span>
              </div>

              {/* Warning if date is blocked */}
              {getActiveBlocksForDate(activeBlocks, privateJobForm.date).length > 0 && (
                <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-black text-amber-800 uppercase tracking-wide">
                      This date is blocked from public bookings.
                    </p>
                    <p className="text-[10px] text-amber-700 mt-0.5">
                      This private job will remain visible to admin only. The public blockout stays active.
                    </p>
                  </div>
                </div>
              )}

              {/* Title */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-clay">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  value={privateJobForm.title}
                  onChange={(e) => setPrivateJobForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Mow family property, Equipment collection"
                  className={inputCls}
                  required
                />
              </div>

              {/* Date */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-clay">Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={privateJobForm.date}
                  onChange={(e) => setPrivateJobForm((f) => ({ ...f, date: e.target.value }))}
                  className={inputCls}
                  required
                />
              </div>

              {/* Time slot */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-clay">Time Slot</label>
                <select
                  value={privateJobForm.timeSlot}
                  onChange={(e) => setPrivateJobForm((f) => ({ ...f, timeSlot: e.target.value as PrivateJobTimeSlot }))}
                  className={inputCls}
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="full_day">Full Day</option>
                  <option value="custom">Custom Time</option>
                </select>
              </div>

              {/* Custom time range */}
              {privateJobForm.timeSlot === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-clay">Start Time</label>
                    <input
                      type="time"
                      value={privateJobForm.startTime}
                      onChange={(e) => setPrivateJobForm((f) => ({ ...f, startTime: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-clay">End Time</label>
                    <input
                      type="time"
                      value={privateJobForm.endTime}
                      onChange={(e) => setPrivateJobForm((f) => ({ ...f, endTime: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                </div>
              )}

              {/* Category */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-clay">Category</label>
                <select
                  value={privateJobForm.category}
                  onChange={(e) => setPrivateJobForm((f) => ({ ...f, category: e.target.value as PrivateJobCategory }))}
                  className={inputCls}
                >
                  {PRIVATE_JOB_CATEGORIES.map(({ key, label }) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Address */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-clay">Address <span className="text-stone-400 normal-case font-normal">(optional)</span></label>
                <input
                  value={privateJobForm.address}
                  onChange={(e) => setPrivateJobForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="e.g. 12 Example Street"
                  className={inputCls}
                />
              </div>

              {/* Contact + Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-clay">Contact Name</label>
                  <input
                    value={privateJobForm.contactName}
                    onChange={(e) => setPrivateJobForm((f) => ({ ...f, contactName: e.target.value }))}
                    placeholder="e.g. Mum"
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-clay">Phone</label>
                  <input
                    value={privateJobForm.phone}
                    onChange={(e) => setPrivateJobForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="0400 000 000"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Price */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-clay">Amount <span className="text-stone-400 normal-case font-normal">(optional, admin reference only)</span></label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={privateJobForm.price}
                  onChange={(e) => setPrivateJobForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="e.g. 150"
                  className={inputCls}
                />
              </div>

              {/* Private notes */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-clay">
                  Private Notes <span className="text-stone-400 normal-case font-normal">(admin only)</span>
                </label>
                <textarea
                  value={privateJobForm.privateNotes}
                  onChange={(e) => setPrivateJobForm((f) => ({ ...f, privateNotes: e.target.value }))}
                  placeholder="Internal notes, access info, special requirements..."
                  className="w-full min-h-[80px] rounded-xl border border-stone-300 px-3 py-2 text-sm focus:ring-2 focus:ring-deep-red outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 p-6 border-t border-stone-100">
              <div>
                {editingPrivateJobId && (
                  <button
                    type="button"
                    onClick={() => {
                      const j = privateJobs.find(j => j.id === editingPrivateJobId);
                      if (j) delPrivateJob(j);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-deep-red font-black uppercase text-xs tracking-widest hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPrivateJobFormOpen(false)}
                  disabled={savingPrivateJob}
                  className="px-5 py-2.5 rounded-xl border border-stone-300 font-black uppercase text-xs tracking-widest hover:bg-stone-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPrivateJob}
                  className="px-5 py-2.5 rounded-xl bg-violet-700 text-white font-black uppercase text-xs tracking-widest hover:bg-violet-800 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {savingPrivateJob && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editingPrivateJobId ? 'Save Changes' : 'Save Private Job'}
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
