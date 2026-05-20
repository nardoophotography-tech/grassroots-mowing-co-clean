import * as React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { 
  LayoutDashboard, Calendar, Users, ClipboardList, Settings, PlusCircle,
  Menu, X, LogOut, MapPin, ExternalLink, TrendingUp, Clock, CheckCircle2,
  FileText, DollarSign, ArrowLeft, Home
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/src/components/ui/Button';
import { cn } from '@/src/lib/utils';

import { AuthProvider, useAuth } from '@/src/contexts/AuthContext';
import { useJobs, useClients } from '@/src/hooks/useFirebase';
import { JOB_STATUS_LABELS, JOB_STATUS_COLORS, TIME_SLOT_LABELS } from '@/src/constants';
import { format } from 'date-fns';
import { Badge } from '@/src/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/Card';
import { JobList } from '@/src/pages/JobList';
import { NewJob } from '@/src/pages/NewJob';
import { ClientList } from '@/src/pages/ClientList';
import { ClientDetail } from '@/src/pages/ClientDetail';
import { JobDetail } from '@/src/pages/JobDetail';
import { ScheduleManager } from '@/src/pages/ScheduleManager';
import { CalendarPage } from '@/src/pages/CalendarPage';
import { Booking } from '@/src/pages/Booking';
import { BookingSuccess } from '@/src/pages/BookingSuccess';
import { InvoiceList } from '@/src/pages/InvoiceList';
import { InvoicePayment } from '@/src/pages/InvoicePayment';
import { LandingPage } from '@/src/pages/LandingPage';
import { Login } from '@/src/pages/Login';
import { Packages } from '@/src/pages/Packages';
import { QuoteApproval } from '@/src/pages/QuoteApproval';
import { LockScreen } from '@/src/components/LockScreen';
import { Dashboard } from '@/src/pages/Dashboards';
import { EmployeeOnboarding } from '@/src/pages/EmployeeOnboarding';
import { PricingManagement } from '@/src/pages/admin/PricingManagement';
import { AdminAccess } from '@/src/pages/admin/AdminAccess';
import { StaffList } from '@/src/pages/admin/StaffList';
import { StaffOnboardingPortal } from '@/src/pages/StaffOnboardingPortal';

// --- NEW ADMIN PAGE IMPORTS ---
import { AdminSettings } from '@/src/pages/admin/AdminSettings';
import { Analytics } from '@/src/pages/admin/Analytics';
import { MediaManager } from '@/src/pages/admin/MediaManager';
import { NotificationsCenter } from '@/src/pages/admin/NotificationsCenter';
import { SimulationEngine } from '@/src/pages/admin/SimulationEngine';

import { NavItem, GlobalHeader, Sidebar } from '@/src/components/Navigation';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const { profile } = useAuth();

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <GlobalHeader profile={profile} onMenuClick={() => setIsSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto bg-background/30 relative">
          <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_top_right,var(--color-ochre),transparent_40%),radial-gradient(circle_at_bottom_left,var(--color-primary),transparent_40%)]" />
          
          <div className="relative p-4 md:p-6 lg:p-12 max-w-7xl mx-auto">
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
  const { profile, loading } = useAuth();
  
  if (loading) return null;
  if (!profile || !roles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

const AppContent = () => {
  const { user, loading, isLocked, profile } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-deep-red border-t-transparent" />
      </div>
    );
  }

  return (
    <>
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
        
        <Route path="/dashboard" element={user && profile ? <Layout><Dashboard /></Layout> : <Navigate to="/login" replace />} />
        <Route path="/settings" element={user && profile ? <Layout><ScheduleManager /></Layout> : <Navigate to="/login" replace />} />
        <Route path="/onboarding/:token" element={<StaffOnboardingPortal />} />
        
        <Route path="/jobs" element={<RoleGuard roles={['admin', 'staff']}><Layout><JobList /></Layout></RoleGuard>} />
        <Route path="/jobs/new" element={<RoleGuard roles={['admin', 'staff']}><Layout><NewJob /></Layout></RoleGuard>} />
        <Route path="/jobs/:id" element={<RoleGuard roles={['admin', 'staff']}><Layout><JobDetail /></Layout></RoleGuard>} />
        <Route path="/schedule" element={<RoleGuard roles={['admin', 'staff']}><Layout><CalendarPage /></Layout></RoleGuard>} />

        <Route path="/invoices" element={<RoleGuard roles={['admin']}><Layout><InvoiceList /></Layout></RoleGuard>} />
        <Route path="/clients" element={<RoleGuard roles={['admin']}><Layout><ClientList /></Layout></RoleGuard>} />
        <Route path="/clients/:id" element={<RoleGuard roles={['admin']}><Layout><ClientDetail /></Layout></RoleGuard>} />
        
        {/* EXISTING ADMIN PAGES */}
        <Route path="/admin/staff" element={<RoleGuard roles={['admin']}><Layout><StaffList /></Layout></RoleGuard>} />
        <Route path="/admin/pricing" element={<RoleGuard roles={['admin']}><Layout><PricingManagement /></Layout></RoleGuard>} />
        <Route path="/admin/access" element={<RoleGuard roles={['admin']}><Layout><AdminAccess /></Layout></RoleGuard>} />

        {/* NEW ADMIN CAPABILITY PAGES */}
        <Route path="/admin/settings" element={<RoleGuard roles={['admin']}><Layout><AdminSettings /></Layout></RoleGuard>} />
        <Route path="/analytics" element={<RoleGuard roles={['admin']}><Layout><Analytics /></Layout></RoleGuard>} />
        <Route path="/admin/media" element={<RoleGuard roles={['admin']}><Layout><MediaManager /></Layout></RoleGuard>} />
        <Route path="/admin/notifications" element={<RoleGuard roles={['admin']}><Layout><NotificationsCenter /></Layout></RoleGuard>} />
        <Route path="/admin/simulator" element={<RoleGuard roles={['admin']}><Layout><SimulationEngine /></Layout></RoleGuard>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-right" />
        <AppContent />
      </AuthProvider>
    </Router>
  );
}
