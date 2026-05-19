import * as React from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ArrowRight, CalendarDays, Clock3, MapPin, Phone, User, BadgeCheck, Leaf } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { db, getFirestoreErrorMessage } from '../firebase';
import { GrassRootsLogo } from '../components/GrassRootsLogo';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

type BookingForm = {
  name: string;
  phone: string;
  email: string;
  address: string;
  suburb: string;
  serviceDate: string;
  timeSlot: 'morning' | 'afternoon';
  notes: string;
};

const initialForm: BookingForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  suburb: '',
  serviceDate: '',
  timeSlot: 'morning',
  notes: '',
};

function withTimeout<T>(promise: Promise<T>, timeoutMs = 12000) {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('Firestore write timed out. Check Firebase rules and network access.'));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

const summaryItems = [
  { label: 'Service', value: 'Residential mowing, tidy-up, and regular maintenance' },
  { label: 'Coverage', value: 'Town blocks, suburban lots, and larger properties' },
  { label: 'Update path', value: 'Bookings write straight into Firestore' },
];

export function Booking() {
  const navigate = useNavigate();
  const [form, setForm] = React.useState<BookingForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const updateField = (field: keyof BookingForm) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.name || !form.phone || !form.address || !form.suburb || !form.serviceDate) {
      setError('Please complete your name, phone, address, suburb, and preferred date.');
      return;
    }

    setIsSubmitting(true);
    try {
      const docRef = await withTimeout(
        addDoc(collection(db, 'bookings'), {
          ...form,
          status: 'pending',
          createdAt: serverTimestamp(),
          createdAtMs: Date.now(),
        })
      );

      setForm(initialForm);
      navigate(`/booking-success?bookingId=${docRef.id}`);
    } catch (err) {
      console.error('[Booking]: Failed to save booking', err);
      setError(getFirestoreErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-charcoal">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 subtle-grid opacity-30" />
        <div className="absolute inset-x-0 top-0 h-[22rem] bg-[linear-gradient(180deg,rgba(31,77,58,0.14),rgba(244,233,216,0.92),rgba(244,233,216,1))]" />

        <div className="relative mx-auto max-w-7xl px-6 py-6 lg:px-10 lg:py-8">
          <div className="flex items-center justify-between gap-4">
            <GrassRootsLogo showText className="scale-110" />
            <Link
              to="/"
              className="text-xs font-black uppercase tracking-[0.2em] text-primary transition-colors hover:text-secondary"
            >
              Back to home
            </Link>
          </div>

          <div className="grid gap-8 py-10 lg:grid-cols-[0.88fr_1.12fr] lg:gap-10 lg:py-16">
            <Card className="glass-card bg-surface/92">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white">
                    <Leaf className="h-5 w-5" />
                  </span>
                  Book a mowing service
                </CardTitle>
                <p className="text-sm leading-7 text-clay">
                  Use this form to send a booking request directly into the GrassRoots workflow. The admin dashboard reads the same booking collection.
                </p>
              </CardHeader>

              <CardContent className="space-y-4">
                {summaryItems.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-border/60 bg-background/80 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">{item.label}</p>
                    <p className="mt-1 text-sm leading-6 text-clay">{item.value}</p>
                  </div>
                ))}

                <div className="rounded-2xl border border-border/60 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.15em] text-primary">
                    <BadgeCheck className="h-4 w-4" />
                    What to expect
                  </div>
                  <p className="mt-2 text-sm leading-6 text-clay">
                    A saved booking will be visible to the admin view after Firestore writes complete.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button variant="outline" size="sm" onClick={() => navigate('/')}>
                    Home
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
                    Admin
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card bg-surface/95">
              <CardHeader className="border-b border-border/60 bg-white/30">
                <CardTitle className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-white">
                    <CalendarDays className="h-5 w-5" />
                  </span>
                  Booking details
                </CardTitle>
                <p className="text-sm leading-7 text-clay">
                  Tell us what needs mowing and when you want the job done.
                </p>
              </CardHeader>

              <CardContent className="space-y-5">
                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
                    {error}
                  </div>
                )}

                <form onSubmit={submit} className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm font-semibold">
                      Name
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-clay" />
                        <input className="w-full rounded-2xl border border-border/70 bg-white px-10 py-3 outline-none transition focus:border-primary" value={form.name} onChange={updateField('name')} />
                      </div>
                    </label>
                    <label className="grid gap-2 text-sm font-semibold">
                      Phone
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-clay" />
                        <input className="w-full rounded-2xl border border-border/70 bg-white px-10 py-3 outline-none transition focus:border-primary" value={form.phone} onChange={updateField('phone')} />
                      </div>
                    </label>
                    <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
                      Email
                      <input className="w-full rounded-2xl border border-border/70 bg-white px-4 py-3 outline-none transition focus:border-primary" type="email" value={form.email} onChange={updateField('email')} />
                    </label>
                    <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
                      Address
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-clay" />
                        <input className="w-full rounded-2xl border border-border/70 bg-white px-10 py-3 outline-none transition focus:border-primary" value={form.address} onChange={updateField('address')} />
                      </div>
                    </label>
                    <label className="grid gap-2 text-sm font-semibold">
                      Suburb
                      <input className="w-full rounded-2xl border border-border/70 bg-white px-4 py-3 outline-none transition focus:border-primary" value={form.suburb} onChange={updateField('suburb')} />
                    </label>
                    <label className="grid gap-2 text-sm font-semibold">
                      Preferred date
                      <div className="relative">
                        <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-clay" />
                        <input className="w-full rounded-2xl border border-border/70 bg-white px-10 py-3 outline-none transition focus:border-primary" type="date" value={form.serviceDate} onChange={updateField('serviceDate')} />
                      </div>
                    </label>
                    <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
                      Time slot
                      <div className="relative">
                        <Clock3 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-clay" />
                        <select className="w-full rounded-2xl border border-border/70 bg-white px-10 py-3 outline-none transition focus:border-primary" value={form.timeSlot} onChange={updateField('timeSlot')}>
                          <option value="morning">Morning</option>
                          <option value="afternoon">Afternoon</option>
                        </select>
                      </div>
                    </label>
                    <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
                      Notes
                      <textarea className="min-h-28 rounded-2xl border border-border/70 bg-white px-4 py-3 outline-none transition focus:border-primary" value={form.notes} onChange={updateField('notes')} />
                    </label>
                  </div>

                  <Button
                    className="w-full shadow-premium"
                    disabled={isSubmitting}
                    type="submit"
                    size="lg"
                  >
                    {isSubmitting ? 'Saving booking...' : 'Submit booking'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Booking;
