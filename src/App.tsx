import * as React from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Booking from './pages/Booking';
import AdminAccess from './pages/services/AdminAccess';
import { BookingSuccess } from './pages/BookingSuccess';
import { LandingPage } from './pages/LandingPage';

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
          <Route path="/" element={<LandingPage />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/booking-success" element={<BookingSuccess />} />
          <Route path="/admin" element={<AdminAccess />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
