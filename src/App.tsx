import * as React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  ClipboardList, 
  Settings, 
  PlusCircle,
  Menu,
  X,
  LogOut,
  MapPin,
  ExternalLink,
  TrendingUp,
  Clock,
  CheckCircle2,
  FileText,
  DollarSign,
  ArrowLeft,
  Home
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { useJobs, useClients } from '@/hooks/useFirebase';
import { JOB_STATUS_LABELS, JOB_STATUS_COLORS, TIME_SLOT_LABELS } from '@/constants';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { JobList } from '@/pages/JobList';
import { NewJob } from '@/pages/NewJob';
import { ClientList } from '@/pages/ClientList';
import { ClientDetail } from '@/pages/ClientDetail';
import { JobDetail } from '@/pages/JobDetail';
import { ScheduleManager } from '@/pages/ScheduleManager';
import { CalendarPage } from '@/pages/CalendarPage';
import { Booking } from '@/pages/Booking';
import { BookingSuccess } from '@/pages/BookingSuccess';
import { InvoiceList } from '@/pages/InvoiceList';
import { InvoicePayment } from '@/pages/InvoicePayment';
import { LandingPage } from '@/pages/LandingPage';
import { Login } from '@/pages/Login';
import { Packages } from '@/pages/Packages';
import { QuoteApproval } from '@/pages/QuoteApproval';
import { LockScreen } from '@/components/LockScreen';
import { GrassRootsLogo } from '@/components/GrassRootsLogo';
import AppLogo from '@/components/AppLogo';
import { ImagePlaceholder } from '@/components/ImagePlaceholder';
import { GrassRootsGuardian } from '@/components/GrassRootsGuardian';
import { Dashboard } from '@/pages/Dashboards';
import { EmployeeOnboarding } from '@/pages/EmployeeOnboarding';
import { PricingManagement } from '@/pages/admin/PricingManagement';
import { AdminAccess } from '@/pages/admin/AdminAccess';
import { AdminPortal } from '@/pages/admin/AdminPortal';
import { StaffList } from '@/pages/admin/StaffList';
import { StaffOnboardingPortal } from '@/pages/StaffOnboardingPortal';
import { TechnicianDashboard } from '@/pages/TechnicianDashboard';
import { AutomationsManager } from '@/pages/admin/AutomationsManager';
import { AssetManager } from '@/pages/admin/AssetManager';
import { SystemSettings } from '@/pages/admin/SystemSettings';
import { AuditLogs } from '@/pages/admin/AuditLogs';

import { NavItem, GlobalHeader, Sidebar } from '@/components/Navigation';

import { useSyncEngine } from '@/hooks/useSyncEngine';
import { APIProvider } from '@vis.gl/react-google-maps';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_PLATFORM_KEY || '';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const { profile } = useAuth();

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <GlobalHeader profile={profile} onMenuClick={() => setIsSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto bg-background/30 relative">
          {/* Decorative outback gradient overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_top_right,var(--color-ochre),transparent_40%),radial-gradient(circle_at_bottom_left,var(--color-primary),transparent_40%)]" />
          
          {/* Brand Overlay Texture */}
          <div className="absolute inset-0 cultural-pattern opacity-[0.03] pointer-events-none mix-blend-multiply" />
          <div className="absolute inset-0 bg-noise opacity-[0.05] pointer-events-none contrast-150 brightness-100" />
          
          <div className="relative p-6 lg:p-12 max-w-7xl mx-auto z-10">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
};

const RoleGuard = ({ children, roles }: { children: React.ReactNode, roles: string[] }) => {
  const { user, profile, loading } = useAuth();
  
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
    </div>
  );

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (!profile || !roles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

const ScrollToTop = () => {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const AppContent = () => {
  const { user, loading, isLocked, profile } = useAuth();
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);
  const location = useLocation();

  // Initialize background sync engine
  useSyncEngine();

  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-deep-red border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <ScrollToTop />
      <AnimatePresence>
        {isOffline && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-deep-red text-white text-[10px] font-black uppercase tracking-[0.2em] py-2 text-center relative z-[100]"
          >
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-3 w-3 animate-pulse" />
              Lost Connection: Working Offline
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {isLocked && <LockScreen />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/welcome" element={<LandingPage />} />
        <Route path="/onboarding" element={<EmployeeOnboarding />} />
        <Route path="/staff-entry" element={<Navigate to="/login?intendedRole=staff" replace />} />
        <Route path="/client-booking" element={<Navigate to="/booking" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/quote/:jobId" element={<QuoteApproval />} />
        <Route path="/booking-success" element={<BookingSuccess />} />
        <Route path="/packages" element={<Packages />} />
        <Route path="/pay/:id" element={<InvoicePayment />} />
        <Route path="/tech" element={<RoleGuard roles={['admin', 'staff']}><Layout><TechnicianDashboard /></Layout></RoleGuard>} />
        
        {/* Protected Routes */}
        <Route path="/dashboard" element={user && profile ? <Layout><Dashboard /></Layout> : <Navigate to="/login" replace />} />
        <Route path="/settings" element={user && profile ? <Layout><ScheduleManager /></Layout> : <Navigate to="/login" replace />} />

        {/* Public Utility Routes */}
        <Route path="/onboarding/:token" element={<StaffOnboardingPortal />} />
        
        {/* Admin & Staff Shared */}
        <Route path="/jobs" element={<RoleGuard roles={['admin', 'staff']}><Layout><JobList /></Layout></RoleGuard>} />
        <Route path="/jobs/new" element={<RoleGuard roles={['admin', 'staff']}><Layout><NewJob /></Layout></RoleGuard>} />
        <Route path="/jobs/:id" element={<RoleGuard roles={['admin', 'staff']}><Layout><JobDetail /></Layout></RoleGuard>} />
        <Route path="/schedule" element={<RoleGuard roles={['admin', 'staff']}><Layout><CalendarPage /></Layout></RoleGuard>} />

        {/* Admin Only */}
        <Route path="/admin" element={<RoleGuard roles={['admin']}><Layout><AdminPortal /></Layout></RoleGuard>} />
        <Route path="/invoices" element={<RoleGuard roles={['admin']}><Layout><InvoiceList /></Layout></RoleGuard>} />
        <Route path="/clients" element={<RoleGuard roles={['admin']}><Layout><ClientList /></Layout></RoleGuard>} />
        <Route path="/clients/:id" element={<RoleGuard roles={['admin']}><Layout><ClientDetail /></Layout></RoleGuard>} />
        <Route path="/admin/staff" element={<RoleGuard roles={['admin']}><Layout><StaffList /></Layout></RoleGuard>} />
        <Route path="/admin/pricing" element={<RoleGuard roles={['admin']}><Layout><PricingManagement /></Layout></RoleGuard>} />
        <Route path="/admin/automations" element={<RoleGuard roles={['admin']}><Layout><AutomationsManager /></Layout></RoleGuard>} />
        <Route path="/admin/assets" element={<RoleGuard roles={['admin']}><Layout><AssetManager /></Layout></RoleGuard>} />
        <Route path="/admin/settings" element={<RoleGuard roles={['admin']}><Layout><SystemSettings /></Layout></RoleGuard>} />
        <Route path="/admin/logs" element={<RoleGuard roles={['admin']}><Layout><AuditLogs /></Layout></RoleGuard>} />
        <Route path="/admin/access" element={<RoleGuard roles={['admin']}><Layout><AdminAccess /></Layout></RoleGuard>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default function App() {
  return (
    <APIProvider 
      apiKey={GOOGLE_MAPS_API_KEY} 
      version="weekly"
      libraries={['places', 'drawing', 'geometry', 'geocoding', 'marker']}
    >
      <Router>
        <AuthProvider>
          <Toaster position="top-right" />
          <AppContent />
        </AuthProvider>
      </Router>
    </APIProvider>
  );
}
