import * as React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  FileText,
  DollarSign,
  ArrowLeft,
  Home
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { cn } from '@/src/lib/utils';
import { useAuth } from '@/src/contexts/AuthContext';
import AppLogo from '@/src/components/AppLogo';

export const NavItem = ({ to, icon: Icon, label, active, onClick }: { to: string, icon: any, label: string, active: boolean, onClick?: () => void }) => (
  <Link
    to={to}
    onClick={onClick}
    className={cn(
      'flex items-center space-x-3 rounded-xl px-4 py-3 transition-all duration-300 relative group truncate',
      active 
        ? 'bg-primary text-white shadow-md shadow-primary/20 font-bold' 
        : 'text-clay hover:bg-ochre/10 hover:text-charcoal'
    )}
  >
    <Icon className={cn("h-5 w-5 flex-shrink-0", active ? "text-white" : "text-clay group-hover:text-primary")} />
    <span className="text-sm tracking-tight">{label}</span>
    {active && (
      <motion.div 
        layoutId="active-accent" 
        className="absolute -right-1 w-1.5 h-6 bg-secondary rounded-l-full" 
      />
    )}
  </Link>
);

export const GlobalHeader = ({ onMenuClick, profile }: { onMenuClick: () => void, profile: any }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <header className="h-16 bg-surface shadow-premium border-b border-border flex items-center justify-between px-6 lg:px-10 flex-shrink-0 relative z-20">
      <div className="flex items-center space-x-4">
        <button 
          onClick={onMenuClick}
          className="p-2 text-primary hover:bg-ochre/10 rounded-xl lg:hidden transition-colors border border-transparent hover:border-ochre/20"
        >
          <Menu className="h-6 w-6" />
        </button>
        
        <div className="flex items-center space-x-1.5 p-1 bg-surface-2/30 rounded-full border border-border shadow-inner">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-8 w-8 text-clay hover:text-primary transition-colors rounded-full"
            title="Go Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="w-px h-4 bg-border/60 mx-0.5" />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className={cn(
              "h-8 w-8 transition-colors rounded-full",
              location.pathname === '/' ? "bg-primary text-white shadow-premium" : "text-clay hover:text-primary"
            )}
            title="Public Website"
          >
            <Home className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
            className={cn(
               "h-8 w-8 transition-all rounded-full",
               location.pathname === '/dashboard' 
                ? "bg-primary text-white shadow-premium" 
                : "text-clay hover:text-primary"
            )}
            title="Operations Hub"
          >
            <LayoutDashboard className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="hidden sm:flex flex-col items-end mr-3">
          <p className="text-[9px] font-black text-secondary uppercase tracking-[0.2em] italic">{profile?.role} Clearance</p>
          <p className="text-xs font-black text-charcoal uppercase tracking-tight italic">{profile?.displayName || 'Regional User'}</p>
        </div>
        <div className="h-10 w-10 rounded-xl bg-primary border-2 border-surface shadow-premium flex items-center justify-center text-white font-black text-sm group relative overflow-hidden">
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
          {profile?.displayName?.split(' ').map((n: string) => n[0]).join('') || 'U'}
        </div>
      </div>
    </header>
  );
};

export const Sidebar = ({ isOpen, onClose, variant = 'sidebar' }: { isOpen: boolean, onClose: () => void, variant?: 'sidebar' | 'drawer' }) => {
  const location = useLocation();
  const { logout, profile } = useAuth();
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isActuallyMobile = isMobile || variant === 'drawer';
  
  return (
    <>
      <AnimatePresence>
        {isOpen && isActuallyMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-charcoal/60 backdrop-blur-sm lg:z-[60]"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={isActuallyMobile ? { x: isOpen ? 0 : -280 } : { x: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[280px] bg-surface border-r border-border h-full shadow-premium',
          variant === 'sidebar' ? 'lg:static lg:translate-x-0' : 'lg:fixed lg:z-[70]'
        )}
      >
        <div className="flex h-full flex-col relative overflow-hidden">
          <div className="flex h-24 items-center justify-between px-8 border-b border-border/50 bg-white/50">
            <Link to="/dashboard" className="flex items-center" onClick={onClose}>
              <AppLogo className="scale-110 origin-left" />
            </Link>
            <button onClick={onClose} className="lg:hidden p-2 text-clay hover:bg-ochre/10 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1.5 p-6 overflow-y-auto">
            <NavItem to="/" icon={Home} label="Public Website" active={location.pathname === '/'} onClick={onClose} />
            <div className="h-px bg-border/40 my-6 mx-2" />
            
            <p className="px-4 mb-2 text-[10px] font-black text-clay/40 uppercase tracking-[0.2em] italic">Operations Center</p>
            <NavItem to="/dashboard" icon={LayoutDashboard} label="Deployment Hub" active={location.pathname === '/dashboard'} onClick={onClose} />
            
            {profile?.role !== 'client' && (
              <>
                <NavItem to="/jobs" icon={ClipboardList} label="Job Queue" active={location.pathname === '/jobs'} onClick={onClose} />
                <NavItem to="/schedule" icon={Calendar} label="Regional Schedule" active={location.pathname === '/schedule'} onClick={onClose} />
              </>
            )}
            
            {profile?.role === 'admin' && (
              <>
                <p className="px-4 mt-8 mb-2 text-[10px] font-black text-clay/40 uppercase tracking-[0.2em] italic">Command & Control</p>
                <NavItem to="/invoices" icon={FileText} label="Financial Center" active={location.pathname === '/invoices'} onClick={onClose} />
                <NavItem to="/clients" icon={Users} label="Client Directory" active={location.pathname === '/clients'} onClick={onClose} />
                <NavItem to="/admin/staff" icon={Users} label="Team Roster" active={location.pathname === '/admin/staff'} onClick={onClose} />
                <NavItem to="/admin/pricing" icon={DollarSign} label="Pricing Engine" active={location.pathname === '/admin/pricing'} onClick={onClose} />
                <NavItem to="/admin/access" icon={PlusCircle} label="System Security" active={location.pathname === '/admin/access'} onClick={onClose} />
              </>
            )}
            
            <div className="mt-8 border-t border-border/40 pt-4">
              <NavItem to="/settings" icon={Settings} label="System Config" active={location.pathname === '/settings'} onClick={onClose} />
            </div>
          </nav>

          <div className="p-6 border-t border-border/50 relative z-10 bg-white/30 backdrop-blur-sm">
            <div className="mb-6 px-4 py-4 bg-background rounded-2xl border border-border shadow-premium relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                <MapPin className="h-12 w-12 text-primary" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="text-[9px] font-black border-secondary/20 text-secondary bg-secondary/5 px-2 py-0.5 uppercase tracking-widest italic">
                  {profile?.role} Rank
                </Badge>
                <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--color-primary),0.5)]" />
              </div>
              <p className="text-sm font-black text-charcoal truncate uppercase tracking-tight italic">{profile?.displayName || 'Regional User'}</p>
              <p className="text-[10px] text-clay/60 truncate font-medium">{profile?.email}</p>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-clay/60 hover:text-secondary hover:bg-secondary/5 rounded-xl transition-all font-black uppercase tracking-[0.1em] text-[10px]"
              onClick={logout}
            >
              <LogOut className="mr-3 h-4 w-4" />
              Deauthorize Session
            </Button>
          </div>
        </div>
      </motion.aside>
    </>
  );
};
