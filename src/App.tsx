import * as React from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Booking from './pages/Booking';
import AdminAccess from './pages/services/AdminAccess';
import { BookingSuccess } from './pages/BookingSuccess';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[App]: Unhandled render error', error);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="min-h-screen bg-slate-50 p-8 text-slate-900">
          <div className="mx-auto max-w-2xl rounded-lg border border-red-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-red-700">
              Something went wrong
            </p>
            <h1 className="mt-2 text-2xl font-bold">The page could not be rendered.</h1>
            <p className="mt-3 text-slate-600">
              Refresh the page or return home. The error has been logged in the console.
            </p>
            <Link className="mt-5 inline-flex rounded-md bg-green-700 px-4 py-2 font-semibold text-white" to="/">
              Back home
            </Link>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <section className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
          GrassRoots Mowing Co
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Lawn mowing bookings</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">
          Book a mowing service and manage incoming booking requests from one local app.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="rounded-md bg-green-700 px-5 py-3 font-semibold text-white" to="/booking">
            Make a booking
          </Link>
          <Link className="rounded-md border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900" to="/admin">
            Admin dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}

function NotFound() {
  return (
    <main className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <div className="mx-auto max-w-2xl rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Page not found</h1>
        <Link className="mt-4 inline-flex rounded-md bg-green-700 px-4 py-2 font-semibold text-white" to="/">
          Back home
        </Link>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/booking-success" element={<BookingSuccess />} />
          <Route path="/admin" element={<AdminAccess />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
