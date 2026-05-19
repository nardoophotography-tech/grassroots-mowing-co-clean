import * as React from 'react';
import { collection, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db, getFirestoreErrorMessage } from '../../firebase';

type BookingRecord = {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  suburb?: string;
  serviceDate?: string;
  timeSlot?: string;
  notes?: string;
  status?: string;
  createdAt?: Timestamp;
  createdAtMs?: number;
};

function formatCreatedAt(booking: BookingRecord) {
  const date = booking.createdAt?.toDate?.() ?? (booking.createdAtMs ? new Date(booking.createdAtMs) : null);
  return date ? date.toLocaleString() : 'Pending sync';
}

export function AdminAccess() {
  const [bookings, setBookings] = React.useState<BookingRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLoading(true);
    const bookingsQuery = query(collection(db, 'bookings'), orderBy('createdAtMs', 'desc'));
    const unsubscribe = onSnapshot(
      bookingsQuery,
      (snapshot) => {
        setBookings(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as BookingRecord)));
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error('[AdminAccess]: Failed to read bookings', err);
        setError(getFirestoreErrorMessage(err));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
              Admin dashboard
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Incoming bookings</h1>
            <p className="mt-2 text-slate-600">Reading from the Firestore bookings collection.</p>
          </div>
          <Link className="rounded-md border border-slate-300 bg-white px-4 py-2 font-semibold" to="/booking">
            New booking
          </Link>
        </div>

        {loading && (
          <div className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
            Loading bookings...
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
            {error}
          </div>
        )}

        {!loading && !error && bookings.length === 0 && (
          <div className="mt-6 rounded-lg border bg-white p-6 text-slate-600 shadow-sm">
            No bookings have been saved yet.
          </div>
        )}

        {!loading && !error && bookings.length > 0 && (
          <div className="mt-6 overflow-hidden rounded-lg border bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Property</th>
                    <th className="px-4 py-3">Preferred time</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="align-top">
                      <td className="px-4 py-4">
                        <div className="font-semibold">{booking.name || 'Unnamed customer'}</div>
                        <div className="text-slate-600">{booking.phone || 'No phone'}</div>
                        {booking.email && <div className="text-slate-500">{booking.email}</div>}
                      </td>
                      <td className="px-4 py-4">
                        <div>{booking.address || 'No address'}</div>
                        <div className="text-slate-600">{booking.suburb || 'No suburb'}</div>
                        {booking.notes && <div className="mt-2 max-w-xs text-slate-500">{booking.notes}</div>}
                      </td>
                      <td className="px-4 py-4">
                        <div>{booking.serviceDate || 'No date'}</div>
                        <div className="capitalize text-slate-600">{booking.timeSlot || 'No slot'}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase text-amber-800">
                          {booking.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{formatCreatedAt(booking)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default AdminAccess;
