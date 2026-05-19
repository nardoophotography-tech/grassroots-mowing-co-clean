import { BrowserRouter, Routes, Route } from 'react-router-dom';

import SplashPage from './pages/SplashPage';
import { LandingPage } from './pages/LandingPage';

import Booking from './pages/Booking';
import AdminAccess from './pages/services/AdminAccess';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Splash page */}
        <Route path="/" element={<SplashPage />} />

        {/* Original app landing page */}
        <Route path="/app" element={<LandingPage />} />

        {/* Booking */}
        <Route path="/booking" element={<Booking />} />

        {/* Admin */}
        <Route path="/admin" element={<AdminAccess />} />

      </Routes>
    </BrowserRouter>
  );
}