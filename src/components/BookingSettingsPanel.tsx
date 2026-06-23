import * as React from 'react';
import { toast } from 'react-hot-toast';
import { Save, Trash2, Plus, Calendar, Clock, Ban } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { cn } from '@/lib/utils';
import { useBookingSettings } from '@/hooks/useFirebase';
import { BookingSettings, BookingBlockedDate, BookingBlockedSlot } from '@/types';

const DAYS: { key: keyof BookingSettings['workingDays']; label: string; short: string }[] = [
  { key: 'monday',    label: 'Monday',    short: 'Mon' },
  { key: 'tuesday',   label: 'Tuesday',   short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday',  label: 'Thursday',  short: 'Thu' },
  { key: 'friday',    label: 'Friday',    short: 'Fri' },
  { key: 'saturday',  label: 'Saturday',  short: 'Sat' },
  { key: 'sunday',    label: 'Sunday',    short: 'Sun' },
];

export const BookingSettingsPanel: React.FC = () => {
  const { bookingSettings, updateBookingSettings } = useBookingSettings();

  // Local state mirrors Firestore — saves are explicit
  const [intakeDate, setIntakeDate] = React.useState(bookingSettings.bookingIntakeOpenDate);
  const [firstDate, setFirstDate] = React.useState(bookingSettings.firstAvailableServiceDate);
  const [workingDays, setWorkingDays] = React.useState({ ...bookingSettings.workingDays });
  const [morningMax, setMorningMax] = React.useState(
    bookingSettings.timeSlots.find(s => s.id === 'morning')?.maxBookings ?? 3
  );
  const [afternoonMax, setAfternoonMax] = React.useState(
    bookingSettings.timeSlots.find(s => s.id === 'afternoon')?.maxBookings ?? 3
  );
  const [isSaving, setIsSaving] = React.useState(false);

  // Block date form
  const [blockDate, setBlockDate] = React.useState('');
  const [blockType, setBlockType] = React.useState<'full' | 'morning' | 'afternoon'>('full');
  const [blockReason, setBlockReason] = React.useState('');
  const [isBlocking, setIsBlocking] = React.useState(false);

  // Sync local state if Firestore updates externally
  React.useEffect(() => {
    setIntakeDate(bookingSettings.bookingIntakeOpenDate);
    setFirstDate(bookingSettings.firstAvailableServiceDate);
    setWorkingDays({ ...bookingSettings.workingDays });
    setMorningMax(bookingSettings.timeSlots.find(s => s.id === 'morning')?.maxBookings ?? 3);
    setAfternoonMax(bookingSettings.timeSlots.find(s => s.id === 'afternoon')?.maxBookings ?? 3);
  }, [bookingSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    const newSlots = bookingSettings.timeSlots.map(s => ({
      ...s,
      maxBookings: s.id === 'morning' ? morningMax : afternoonMax,
    }));
    const ok = await updateBookingSettings({
      bookingIntakeOpenDate: intakeDate,
      firstAvailableServiceDate: firstDate,
      workingDays,
      timeSlots: newSlots,
      maxBookingsPerDay: morningMax + afternoonMax,
    });
    setIsSaving(false);
    ok ? toast.success('Booking settings saved.') : toast.error('Save failed.');
  };

  const handleAddBlock = async () => {
    if (!blockDate) { toast.error('Select a date to block.'); return; }
    setIsBlocking(true);
    const reason = blockReason.trim() || 'Unavailable';

    let ok = false;
    if (blockType === 'full') {
      const newBlocked: BookingBlockedDate[] = [
        ...bookingSettings.blockedDates.filter(b => b.date !== blockDate),
        { date: blockDate, reason },
      ];
      ok = await updateBookingSettings({ blockedDates: newBlocked });
    } else {
      const slotId = blockType as 'morning' | 'afternoon';
      const newSlotBlocks: BookingBlockedSlot[] = [
        ...bookingSettings.blockedSlots.filter(b => !(b.date === blockDate && b.slotId === slotId)),
        { date: blockDate, slotId, reason },
      ];
      ok = await updateBookingSettings({ blockedSlots: newSlotBlocks });
    }

    setIsBlocking(false);
    if (ok) {
      toast.success('Date blocked.');
      setBlockDate('');
      setBlockReason('');
    } else {
      toast.error('Failed to block date.');
    }
  };

  const removeBlockedDate = async (date: string) => {
    const newBlocked = bookingSettings.blockedDates.filter(b => b.date !== date);
    const ok = await updateBookingSettings({ blockedDates: newBlocked });
    ok ? toast.success('Block removed.') : toast.error('Failed.');
  };

  const removeBlockedSlot = async (date: string, slotId: 'morning' | 'afternoon') => {
    const newSlots = bookingSettings.blockedSlots.filter(b => !(b.date === date && b.slotId === slotId));
    const ok = await updateBookingSettings({ blockedSlots: newSlots });
    ok ? toast.success('Block removed.') : toast.error('Failed.');
  };

  return (
    <Card className="border-border rounded-2xl overflow-hidden mb-6">
      <CardHeader className="bg-deep-red/5 py-3 border-b border-border">
        <CardTitle className="flex items-center gap-2 text-xs font-black text-deep-red uppercase tracking-widest">
          <Calendar className="h-4 w-4" />
          Booking Availability Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-6">

        {/* ── Dates ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-[9px] font-black text-clay/50 uppercase tracking-[0.2em]">
              Bookings Open Date
            </Label>
            <Input
              type="date"
              value={intakeDate}
              onChange={e => setIntakeDate(e.target.value)}
              className="h-9 text-xs font-bold rounded-xl"
            />
            <p className="text-[9px] text-clay/40">Submit blocked before this date</p>
          </div>
          <div className="space-y-1">
            <Label className="text-[9px] font-black text-clay/50 uppercase tracking-[0.2em]">
              First Service Date
            </Label>
            <Input
              type="date"
              value={firstDate}
              onChange={e => setFirstDate(e.target.value)}
              className="h-9 text-xs font-bold rounded-xl"
            />
            <p className="text-[9px] text-clay/40">Earliest selectable date</p>
          </div>
        </div>

        {/* ── Working Days ───────────────────────────────────── */}
        <div className="space-y-2">
          <Label className="text-[9px] font-black text-clay/50 uppercase tracking-[0.2em]">Working Days</Label>
          <div className="flex gap-1 flex-wrap">
            {DAYS.map(day => (
              <button
                key={day.key}
                type="button"
                onClick={() => setWorkingDays(prev => ({ ...prev, [day.key]: !prev[day.key] }))}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight border-2 transition-all",
                  workingDays[day.key]
                    ? "bg-primary text-white border-primary"
                    : "bg-background text-clay/40 border-border"
                )}
              >
                {day.short}
              </button>
            ))}
          </div>
        </div>

        {/* ── Run Limits ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-[9px] font-black text-clay/50 uppercase tracking-[0.2em] flex items-center gap-1">
              <Clock className="h-3 w-3 text-amber-600" /> Morning Run max
            </Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={morningMax}
              onChange={e => setMorningMax(Number(e.target.value))}
              className="h-9 text-xs font-bold rounded-xl w-24"
            />
            <p className="text-[9px] text-clay/40">8:00 AM start</p>
          </div>
          <div className="space-y-1">
            <Label className="text-[9px] font-black text-clay/50 uppercase tracking-[0.2em] flex items-center gap-1">
              <Clock className="h-3 w-3 text-indigo-600" /> Afternoon Run max
            </Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={afternoonMax}
              onChange={e => setAfternoonMax(Number(e.target.value))}
              className="h-9 text-xs font-bold rounded-xl w-24"
            />
            <p className="text-[9px] text-clay/40">1:00 PM start</p>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleSave}
          isLoading={isSaving}
          className="w-full h-10 bg-primary text-white rounded-xl font-black uppercase text-[10px] tracking-widest"
        >
          <Save className="h-4 w-4 mr-2" /> Save Settings
        </Button>

        {/* ── Block a Date / Run ─────────────────────────────── */}
        <div className="border-t border-border pt-4 space-y-3">
          <Label className="text-[9px] font-black text-clay/50 uppercase tracking-[0.2em] flex items-center gap-1">
            <Ban className="h-3 w-3 text-deep-red" /> Block a Date or Run
          </Label>
          <div className="grid grid-cols-3 gap-2">
            <Input
              type="date"
              value={blockDate}
              onChange={e => setBlockDate(e.target.value)}
              className="h-9 text-xs font-bold rounded-xl col-span-1"
            />
            <div className="flex gap-1 col-span-2">
              {(['full', 'morning', 'afternoon'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setBlockType(t)}
                  className={cn(
                    "flex-1 rounded-xl text-[9px] font-black uppercase tracking-tight border-2 py-1.5 transition-all",
                    blockType === t
                      ? t === 'full' ? "bg-deep-red text-white border-deep-red"
                        : t === 'morning' ? "bg-amber-500 text-white border-amber-500"
                        : "bg-indigo-500 text-white border-indigo-500"
                      : "bg-background text-clay/40 border-border"
                  )}
                >
                  {t === 'full' ? 'Full Day' : t === 'morning' ? 'AM Only' : 'PM Only'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              value={blockReason}
              onChange={e => setBlockReason(e.target.value)}
              placeholder="Reason (e.g. Personal, Maintenance)"
              className="h-9 text-xs font-bold rounded-xl flex-1"
            />
            <Button
              type="button"
              onClick={handleAddBlock}
              isLoading={isBlocking}
              className="h-9 bg-deep-red text-white rounded-xl font-black uppercase text-[9px] px-3 flex items-center gap-1 whitespace-nowrap"
            >
              <Plus className="h-3 w-3" /> Block
            </Button>
          </div>
        </div>

        {/* ── Blocked Dates List ─────────────────────────────── */}
        {(bookingSettings.blockedDates.length > 0 || bookingSettings.blockedSlots.length > 0) && (
          <div className="space-y-2">
            <Label className="text-[9px] font-black text-clay/50 uppercase tracking-[0.2em]">Active Blocks</Label>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {bookingSettings.blockedDates.map(b => (
                <div key={b.date} className="flex items-center justify-between bg-deep-red/5 border border-deep-red/20 rounded-xl px-3 py-2">
                  <div>
                    <span className="text-[10px] font-black text-deep-red uppercase">{b.date}</span>
                    <span className="text-[9px] text-clay/60 ml-2">Full Day — {b.reason}</span>
                  </div>
                  <button type="button" onClick={() => removeBlockedDate(b.date)} className="text-deep-red/50 hover:text-deep-red transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {bookingSettings.blockedSlots.map(b => (
                <div key={`${b.date}-${b.slotId}`} className="flex items-center justify-between bg-ochre/5 border border-ochre/20 rounded-xl px-3 py-2">
                  <div>
                    <span className="text-[10px] font-black text-ochre uppercase">{b.date}</span>
                    <span className="text-[9px] text-clay/60 ml-2">
                      {b.slotId === 'morning' ? 'Morning Run' : 'Afternoon Run'} — {b.reason}
                    </span>
                  </div>
                  <button type="button" onClick={() => removeBlockedSlot(b.date, b.slotId)} className="text-ochre/50 hover:text-ochre transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
};
