import * as React from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db, getFirestoreErrorMessage } from '../firebase';

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
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <form onSubmit={submit} className="mx-auto max-w-2xl rounded-lg border bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
          GrassRoots Mowing Co
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Book a mowing service</h1>

        {error && (
          <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
            {error}
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">
            Name
            <input className="rounded-md border px-3 py-2" value={form.name} onChange={updateField('name')} />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Phone
            <input className="rounded-md border px-3 py-2" value={form.phone} onChange={updateField('phone')} />
          </label>
          <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
            Email
            <input className="rounded-md border px-3 py-2" type="email" value={form.email} onChange={updateField('email')} />
          </label>
          <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
            Address
            <input className="rounded-md border px-3 py-2" value={form.address} onChange={updateField('address')} />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Suburb
            <input className="rounded-md border px-3 py-2" value={form.suburb} onChange={updateField('suburb')} />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Preferred date
            <input className="rounded-md border px-3 py-2" type="date" value={form.serviceDate} onChange={updateField('serviceDate')} />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Time slot
            <select className="rounded-md border px-3 py-2" value={form.timeSlot} onChange={updateField('timeSlot')}>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
            Notes
            <textarea className="min-h-24 rounded-md border px-3 py-2" value={form.notes} onChange={updateField('notes')} />
          </label>
        </div>

        <button
          className="mt-6 w-full rounded-md bg-green-700 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? 'Saving booking...' : 'Submit booking'}
        </button>
      </form>
    </main>
  );
}

export default Booking;
