import * as React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
  useNavigate
} from 'react-router-dom';

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

import { Button } from './components/ui/Button';
import { cn } from './lib/utils';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useJobs, useClients } from './hooks/useFirebase';

import { JOB_STATUS_LABELS, JOB_STATUS_COLORS, TIME_SLOT_LABELS } from './constants';

import { format } from 'date-fns';

import { Badge } from './components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/Card';

import { JobList } from './pages/JobList';
import { NewJob } from './pages/NewJob';
import { ClientList } from './pages/ClientList';
import { ClientDetail } from './pages/ClientDetail';
import { JobDetail } from './pages/JobDetail';
import { ScheduleManager } from './pages/ScheduleManager';
import { CalendarPage } from './pages/CalendarPage';
import { Booking } from './pages/Booking';
import { BookingSuccess } from './pages/BookingSuccess';
import { InvoiceList } from './pages/InvoiceList';
import { InvoicePayment } from './pages/InvoicePayment';
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { Packages } from './pages/Packages';
import { QuoteApproval } from './pages/QuoteApproval';
import { LockScreen } from './components/LockScreen';
import { GrassRootsLogo } from './components/GrassRootsLogo';
import AppLogo from './components/AppLogo';
import { ImagePlaceholder } from './components/ImagePlaceholder';
import { WarriorMan } from './components/WarriorMan';
import { Dashboard } from './pages/Dashboards';
import { EmployeeOnboarding } from './pages/EmployeeOnboarding';

import { PricingManagement } from './pages/admin/PricingManagement';
import { AdminAccess } from './pages/admin/AdminAccess';
import { StaffList } from './pages/admin/StaffList';
import { StaffOnboardingPortal } from './pages/StaffOnboardingPortal';

import { NavItem, GlobalHeader, Sidebar } from './components/Navigation';