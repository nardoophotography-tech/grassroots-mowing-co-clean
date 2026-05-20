import * as React from 'react';
import { Bell, Check, Trash2, Info, CheckCircle2, AlertTriangle, XCircle, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { notificationService } from '@/services/notificationService';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useFirebase';
import { AppNotification } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export function NotificationCenter() {
  const { user } = useAuth();
  const { notifications, loading } = useNotifications();
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Browser Permission on mount
  React.useEffect(() => {
    notificationService.requestPermission();
  }, []);

  // Browser Push side-effect
  const prevCountRef = React.useRef(notifications.length);
  React.useEffect(() => {
    if (notifications.length > prevCountRef.current) {
      const latest = notifications[0];
      if (latest && !latest.read) {
        notificationService.sendLocalNotification(latest.title, { body: latest.message });
      }
    }
    prevCountRef.current = notifications.length;
  }, [notifications]);

  // Close on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const handleMarkAllRead = () => {
    if (!user) return;
    const unread = notifications.filter(n => !n.read);
    notificationService.markAllAsRead(user.uid, unread);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => setIsOpen(!isOpen)}
        className="relative hover:bg-slate-100 rounded-full h-10 w-10 transition-all duration-300"
      >
        <Bell className={cn("h-5 w-5", unreadCount > 0 ? "text-orange-600 animate-pulse" : "text-slate-500")} />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-600 text-[10px] font-black text-white italic border-2 border-white shadow-sm"
            >
              {unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-50 origin-top-right"
          >
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 italic">Central Intelligence</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllRead}
                  className="text-[10px] font-black text-orange-600 uppercase hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-medium italic uppercase">Signal is quiet. No active alerts.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={cn(
                        "p-4 transition-colors relative group",
                        n.read ? "bg-white opacity-60" : "bg-orange-50/30 border-l-4 border-orange-500"
                      )}
                    >
                      <div className="flex gap-3">
                        <div className="mt-0.5">{getTypeIcon(n.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <p className={cn("text-xs font-black uppercase text-slate-900", !n.read && "italic")}>{n.title}</p>
                            <span className="text-[8px] font-bold text-slate-400 whitespace-nowrap">
                              {formatDistanceToNow(n.createdAt)} ago
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                            {n.message}
                          </p>
                          {n.link && (
                            <Link 
                              to={n.link} 
                              onClick={() => {
                                setIsOpen(false);
                                notificationService.markAsRead(n.id);
                              }}
                              className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-1 mt-2 group-hover:gap-2 transition-all"
                            >
                              View Intel <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                          )}
                        </div>
                        {!n.read && (
                          <button 
                            onClick={() => notificationService.markAsRead(n.id)}
                            className="text-slate-300 hover:text-orange-600"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-900 text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 italic">GrassRoots Operations Control</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
