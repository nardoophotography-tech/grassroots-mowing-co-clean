import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import Booking from './pages/Booking';
import AdminAccess from './pages/services/AdminAccess';
import { BookingSuccess } from './pages/BookingSuccess';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen flex items-center justify-center bg-red-50">
          <div className="rounded-xl bg-white p-10 shadow-xl">
            <h1 className="text-2xl font-bold text-red-700">
              Something went wrong.
            </h1>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/booking-success" element={<BookingSuccess />} />
          <Route path="/admin" element={<AdminAccess />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}