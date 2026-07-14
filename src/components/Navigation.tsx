import * as React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  ClipboardList, 
  Settings, 
  PlusCircle,
  ShieldCheck,
  Menu,
  X,
  LogOut,
  MapPin,
  FileText,
  DollarSign,
  ArrowLeft,
  Home,
  Zap,
  Navigation,
  Star,
  Building2,
  PhoneCall,
  History,
  CreditCard,
  Target,
  Truck,
  Image as ImageIcon,
  Film
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import AppLogo from '@/components/AppLogo';
import { NotificationCenter } from '@/components/NotificationCenter';
import { ClientType } from '@/types';

// Role-aware identity label so admin/staff are never shown as a client type.
// Admin must always read ADMIN, staff STAFF; clients show their client type.
const identityLabel = (profile: any): string => {
  if (!profile) return 'guest';
  if (profile.role === 'admin') return 'admin';
  if (profile.role === 'staff') return 'staff';
  return (profile.clientType || 'one_off').replace('_', ' ');
};

export const NavItem = ({ to, icon: Icon, label, active, onClick }: { to: string, icon: any, label: string, active: boolean, onClick?: () => void }) => (
  <Link
    to={to}
    onClick={onClick}
    className={cn(
      'flex items-center space-x-3 rounded-xl px-4 py-3 transition-all duration-300 relative group truncate',
      active
        ? 'bg-primary text-white shadow-md shadow-primary/20 font-bold'
        : 'text-stone-300 hover:bg-white/10 hover:text-white'
    )}
  >
    <Icon className={cn("h-5 w-5 flex-shrink-0", active ? "text-white" : "text-stone-400 group-hover:text-white")} />
    <span className="text-sm tracking-tight">{label}</span>
    {active && (
      <motion.div 
        layoutId="active-accent" 
        className="absolute -right-1 w-1.5 h-6 bg-secondary rounded-l-full" 
        style={{ originY: 0.5 }}
      />
    )}
  </Link>
);

export const GlobalHeader = ({ onMenuClick, profile, loading = false }: { onMenuClick: () => void, profile: any, loading?: boolean }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const role = profile?.role;

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  // isOneOff: true only when profile is fully loaded AND the user is a one_off client.
  // Do NOT treat loading state (profile=null, loading=true) as one_off — that causes
  // the guest buttons to flash for admin users on slow connections.
  // Admin and staff are ALWAYS exempt, even if their profile carries a stale clientType.
  const isOneOff =
    !loading &&
    (!profile ||
      (profile.role !== 'admin' && profile.role !== 'staff' && profile.clientType === 'one_off'));

  return (
    <header className="h-20 shadow-premium border-b flex items-center justify-between px-4 sm:px-6 lg:px-10 flex-shrink-0 relative z-20 overflow-hidden" style={{ background: 'linear-gradient(90deg, #111111 0%, #1c3a25 60%, #234F2E 100%)', borderColor: 'rgba(255,255,255,0.10)' }}>
      {/* Thin red / ochre / green cultural strip along the header's base */}
      <div className="cultural-values-strip absolute bottom-0 left-0 z-20" />
      {/* Brand accent line */}
      <div className="absolute top-0 left-0 w-full h-0.5" style={{ backgroundColor: 'rgba(198,134,45,0.5)' }} />

      <div className="flex items-center space-x-4 relative z-10">
        {!isOneOff && (
          <button
            onClick={onMenuClick}
            className="p-3 text-white/80 hover:bg-white/10 rounded-xl lg:hidden transition-colors border border-transparent hover:border-white/20"
          >
            <Menu className="h-6 w-6" />
          </button>
        )}

        <Link to="/" className="flex items-center gap-2 group mr-2">
          <AppLogo className="h-16 w-auto group-hover:rotate-3 transition-transform" showText={false} />
        </Link>

        <div className="flex items-center space-x-1.5 sm:space-x-2 p-1.5 bg-white/10 rounded-full border border-white/15 shadow-inner max-w-[55vw] sm:max-w-none overflow-x-auto no-scrollbar backdrop-blur-sm">
          {isOneOff ? (
            <>
              {/* ONE OFF CLIENTS → Portal/Login (not booking form — users must be able to sign in) */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/login')}
                className="text-[10px] sm:text-xs font-black uppercase tracking-widest px-3 sm:px-5 h-9 sm:h-10 bg-secondary text-white rounded-full italic hover:scale-105 transition-transform whitespace-nowrap"
              >
                one off clients
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/login?intendedRole=client')}
                className="text-[10px] sm:text-xs font-black uppercase tracking-widest px-3 sm:px-5 h-9 sm:h-10 text-white/80 rounded-full italic hover:bg-white/10 whitespace-nowrap"
              >
                returning clients
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/login?intendedRole=client')}
                className="hidden xs:block text-[10px] sm:text-xs font-black uppercase tracking-widest px-3 sm:px-5 h-9 sm:h-10 text-white/60 rounded-full italic hover:bg-white/10 whitespace-nowrap"
              >
                asset management
              </Button>
            </>
          ) : (
<>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="h-10 w-10 text-white/70 hover:text-white transition-colors rounded-full"
                title="Go Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>

              <div className="w-px h-4 bg-white/20 mx-0.5" />

              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className={cn(
                  "h-10 w-10 transition-colors rounded-full",
                  location.pathname === '/' ? "bg-primary text-white shadow-premium" : "text-clay hover:text-primary"
                )}
                title="Public Website"
              >
                <Home className="h-5 w-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/dashboard')}
                className={cn(
                  "h-10 w-10 transition-all rounded-full",
                  location.pathname === '/dashboard'
                    ? "bg-primary text-white shadow-premium"
                    : "text-white/70 hover:text-white"
                )}
                title="Operations Hub"
              >
                <LayoutDashboard className="h-5 w-5" />
              </Button>

              {role === 'admin' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/admin')}
                  className={cn(
                    "h-10 w-10 transition-all rounded-full border border-white/20",
                    location.pathname === '/admin'
                      ? "bg-primary text-white shadow-premium"
                      : "text-white hover:bg-white/10"
                  )}
                  title="Admin Portal"
                >
                  <ShieldCheck className="h-5 w-5" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {profile && <NotificationCenter />}
        
        {profile ? (
          <>
            <div className="hidden sm:flex flex-col items-end mr-3">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] italic" style={{ color: 'var(--color-yellow-ochre)' }}>
                {identityLabel(profile)} Access
              </p>
              <p className="text-xs font-black text-white uppercase tracking-tight italic">{profile?.displayName || 'Client'}</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-primary border-2 border-white/20 shadow-premium flex items-center justify-center text-white font-black text-sm group relative overflow-hidden">
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
              {profile?.displayName?.split(' ').map((n: string) => n[0]).join('') || 'U'}
            </div>
          </>
        ) : (
          <Button
            onClick={() => navigate('/login')}
            className="bg-slate-900 hover:bg-black text-[10px] sm:text-xs font-black uppercase tracking-widest px-4 sm:px-5 h-10 sm:h-11 rounded-xl italic"
          >
            Sign In
          </Button>
        )}
      </div>
    </header>
  );
};

export const Sidebar = ({ isOpen, onClose, variant = 'sidebar' }: { isOpen: boolean, onClose: () => void, variant?: 'sidebar' | 'drawer' }) => {
  const location = useLocation();
  const { logout, profile } = useAuth();
  const [isMobile, setIsMobile] = React.useState(() => window.innerWidth < 1024);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Prevent touch bleed-through: on mobile, a tap on the hamburger button causes
  // the browser to fire a synthetic click at the same coordinates AFTER React
  // renders the overlay. The overlay sits at z-40 (above the header's z-20),
  // so that click lands on the overlay and immediately calls onClose().
  // Guard: overlay is non-closeable for 350ms after the sidebar opens.
  const closeable = React.useRef(false);
  React.useEffect(() => {
    if (isOpen) {
      closeable.current = false;
      const t = setTimeout(() => { closeable.current = true; }, 350);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const isActuallyMobile = isMobile || variant === 'drawer';
  
  React.useEffect(() => {
    if (isOpen && isActuallyMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isActuallyMobile]);

  const clientType: ClientType = profile?.clientType || 'one_off';
  const role = profile?.role;

  return (
    <>
      <AnimatePresence>
        {isOpen && isActuallyMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { if (closeable.current) onClose(); }}
            className="fixed inset-0 z-40 bg-charcoal/60 backdrop-blur-sm lg:z-[60]"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={isActuallyMobile ? { x: isOpen ? 0 : -280 } : { x: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        style={{ background: 'linear-gradient(180deg, #14130f 0%, #1c2a1e 100%)', borderRight: '1px solid rgba(255,255,255,0.08)' }}
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[280px] h-full shadow-premium overflow-hidden',
          variant === 'sidebar' ? 'lg:static lg:translate-x-0' : 'lg:fixed lg:z-[70]'
        )}
      >
        {/* Brand Background Texture */}
        <div className="absolute inset-0 cultural-pattern opacity-[0.05] pointer-events-none" />
        {/* Faint rock-art impression behind the sidebar */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 rock-impression-soft pointer-events-none" style={{ backgroundImage: "url('/cultural/rock-impression-set-transparent.png')", backgroundSize: 'cover', backgroundPosition: 'bottom' }} aria-hidden="true" />

        <div className="flex h-full flex-col relative overflow-hidden text-stone-200 z-10">
          <div className="flex h-24 items-center justify-between px-8 border-b relative" style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
            <div className="absolute bottom-0 left-8 right-8 h-1 rounded-full" style={{ background: 'linear-gradient(90deg, rgba(198,134,45,0.5), transparent)' }} />
            <Link to="/dashboard" className="flex items-center" onClick={onClose}>
              <AppLogo className="scale-125 origin-left" />
            </Link>
            <button onClick={onClose} className="lg:hidden p-2 text-white/70 hover:bg-white/10 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1.5 p-6 overflow-y-auto">
            <NavItem to="/" icon={Home} label="Public Website" active={location.pathname === '/'} onClick={onClose} />
            <div className="h-px bg-white/10 my-6 mx-2" />
            
            {/* ONE-OFF (Usually won't see sidebar as they aren't logged in, but just in case) */}
            {clientType === 'one_off' && role === 'client' && (
              <>
                <p className="px-4 mb-2 text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic">Quick Access</p>
                <NavItem to="/booking" icon={PlusCircle} label="Instant Booking" active={location.pathname === '/booking'} onClick={onClose} />
                <NavItem to="/welcome" icon={PhoneCall} label="Support Line" active={location.pathname === '/welcome'} onClick={onClose} />
              </>
            )}

            {/* RETURNING */}
            {clientType === 'returning' && role !== 'admin' && role !== 'staff' && (
              <>
                <p className="px-4 mb-2 text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic">Client Menu</p>
                <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" active={location.pathname === '/dashboard'} onClick={onClose} />
                <NavItem to="/booking" icon={PlusCircle} label="Rebook Service" active={location.pathname === '/booking'} onClick={onClose} />
                <NavItem to="/jobs" icon={History} label="Job History" active={location.pathname === '/jobs'} onClick={onClose} />
                <NavItem to="/invoices" icon={CreditCard} label="Payments" active={location.pathname === '/invoices'} onClick={onClose} />
              </>
            )}

            {/* PREMIUM */}
            {clientType === 'premium' && role !== 'admin' && role !== 'staff' && (
              <>
                <p className="px-4 mb-2 text-[10px] font-black text-secondary uppercase tracking-[0.2em] italic">Priority Access</p>
                <NavItem to="/dashboard" icon={Star} label="Priority Dashboard" active={location.pathname === '/dashboard'} onClick={onClose} />
                <NavItem to="/booking" icon={Zap} label="Priority Booking" active={location.pathname === '/booking'} onClick={onClose} />
                <NavItem to="/packages" icon={ClipboardList} label="Mowing Plans" active={location.pathname === '/packages'} onClick={onClose} />
                <NavItem to="/jobs" icon={FileText} label="Detailed Reports" active={location.pathname === '/jobs'} onClick={onClose} />
                <NavItem to="/welcome" icon={PhoneCall} label="Fast Support" active={location.pathname === '/welcome'} onClick={onClose} />
              </>
            )}

            {/* ASSET MANAGEMENT */}
            {clientType === 'asset_management' && role !== 'admin' && role !== 'staff' && (
              <>
                <p className="px-4 mb-2 text-[10px] font-black text-primary uppercase tracking-[0.2em] italic">Business Portal</p>
                <NavItem to="/dashboard" icon={Building2} label="Asset Dashboard" active={location.pathname === '/dashboard'} onClick={onClose} />
                <NavItem to="/bulk-booking" icon={PlusCircle} label="Bulk Booking" active={location.pathname === '/bulk-booking'} onClick={onClose} />
                <NavItem to="/jobs" icon={Truck} label="Crew Tracking" active={location.pathname === '/jobs'} onClick={onClose} />
                <NavItem to="/invoices" icon={DollarSign} label="Invoice Center" active={location.pathname === '/invoices'} onClick={onClose} />
                <NavItem to="/reports" icon={FileText} label="Property Reports" active={location.pathname === '/reports'} onClick={onClose} />
              </>
            )}

            {/* STAFF / ADMIN */}
            {(role === 'staff' || role === 'admin') && (
              <>
                <p className="px-4 mb-2 text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic">Operations</p>
                <NavItem to="/dashboard" icon={LayoutDashboard} label="Jobs Dashboard" active={location.pathname === '/dashboard'} onClick={onClose} />
                <NavItem to="/jobs" icon={ClipboardList} label="Job Queue" active={location.pathname === '/jobs'} onClick={onClose} />
                <NavItem to="/tech" icon={Navigation} label="Field View" active={location.pathname === '/tech'} onClick={onClose} />
                <NavItem to="/schedule" icon={Calendar} label="Schedule" active={location.pathname === '/schedule'} onClick={onClose} />
              </>
            )}
            
            {role === 'admin' && (
              <>
                <p className="px-4 mt-8 mb-2 text-[10px] font-black text-white/40 uppercase tracking-[0.2em] italic">Admin Centre</p>
                <NavItem to="/admin" icon={ShieldCheck} label="ADMIN PORTAL" active={location.pathname === '/admin'} onClick={onClose} />
                <NavItem to="/invoices" icon={FileText} label="Invoicing & Finance" active={location.pathname === '/invoices'} onClick={onClose} />
                <NavItem to="/clients" icon={Users} label="Client Management" active={location.pathname === '/clients'} onClick={onClose} />
                <NavItem to="/admin/staff" icon={Users} label="Team Roster" active={location.pathname === '/admin/staff'} onClick={onClose} />
                <NavItem to="/admin/pricing" icon={DollarSign} label="Pricing" active={location.pathname === '/admin/pricing'} onClick={onClose} />
                <NavItem to="/admin/assets" icon={ImageIcon} label="Photos" active={location.pathname === '/admin/assets'} onClick={onClose} />
                <NavItem to="/admin/media" icon={Film} label="Media Centre" active={location.pathname === '/admin/media'} onClick={onClose} />
                <NavItem to="/admin/automations" icon={Zap} label="Notifications" active={location.pathname === '/admin/automations'} onClick={onClose} />
                <NavItem to="/admin/settings" icon={Settings} label="System Settings" active={location.pathname === '/admin/settings'} onClick={onClose} />
                <NavItem to="/admin/access" icon={PlusCircle} label="Admin Access" active={location.pathname === '/admin/access'} onClick={onClose} />
              </>
            )}
            
            <div className="mt-8 border-t border-white/10 pt-4">
              <NavItem to="/settings" icon={Settings} label="Account Management" active={location.pathname === '/settings'} onClick={onClose} />
            </div>
          </nav>

          <div className="p-6 border-t relative z-10 bg-black/20 backdrop-blur-sm" style={{ borderColor: 'rgba(255,255,255,0.10)' }}>
            <div className="mb-6 px-4 py-4 bg-white/5 rounded-2xl border border-white/10 shadow-premium relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                {clientType === 'premium' ? <Star className="h-12 w-12 text-primary" /> : <MapPin className="h-12 w-12 text-primary" />}
              </div>
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="text-[9px] font-black border-white/20 bg-white/5 text-[#F4C430] px-2 py-0.5 uppercase tracking-widest italic">
                  {identityLabel(profile)}
                </Badge>
                <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--color-primary),0.5)]" />
              </div>
              <p className="text-sm font-black text-white truncate uppercase tracking-tight italic">{profile?.displayName || 'Client'}</p>
              <p className="text-[10px] text-stone-400 truncate font-medium">{profile?.email}</p>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-stone-300 hover:text-white hover:bg-white/10 rounded-xl transition-all font-black uppercase tracking-[0.1em] text-[10px]"
              onClick={logout}
            >
              <LogOut className="mr-3 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </motion.aside>
    </>
  );
};
