import * as React from 'react';
import { Bell, Check, Trash2, Info, CheckCircle2, AlertTriangle, XCircle, ExternalLink, Settings, MailOpen, RotateCcw, Eraser } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { notificationService } from '@/services/notificationService';
import { notificationStore, useLocalNotifications } from '@/data/notificationStore';
import { Button } from '@/components/ui/Button';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export function NotificationCenter() {
  // Temporary browser storage — Firebase notification storage required for production.
  const notifications = useLocalNotifications();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const readCount = notifications.filter((n) => n.read).length;

  // Ask for browser notification permission once (best-effort, harmless).
  React.useEffect(() => {
    notificationService.requestPermission();
  }, []);

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

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative hover:bg-slate-100 rounded-full h-10 w-10 transition-all duration-300"
        title="Notifications"
      >
        <Bell className={cn('h-5 w-5', unreadCount > 0 ? 'text-orange-600 animate-pulse' : 'text-slate-500')} />
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
            className="absolute right-0 mt-2 w-[22rem] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-50 origin-top-right"
          >
            {/* Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 italic">Notifications</h3>
                <span className="text-[10px] font-black text-orange-600 uppercase">{unreadCount} unread</span>
              </div>
              {/* Top-level actions */}
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() => notificationStore.markAllRead()}
                  disabled={unreadCount === 0}
                  className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                >
                  <MailOpen className="w-3 h-3" /> Mark all read
                </button>
                <button
                  onClick={() => notificationStore.clearRead()}
                  disabled={readCount === 0}
                  className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                >
                  <Eraser className="w-3 h-3" /> Clear read
                </button>
                <button
                  onClick={() => { setIsOpen(false); navigate('/admin/automations'); }}
                  className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-black"
                >
                  <Settings className="w-3 h-3" /> Manage
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-10 text-center">
                  <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-bold italic uppercase">No notifications yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        'p-4 transition-colors relative group',
                        n.read ? 'bg-white' : 'bg-orange-50/40 border-l-4 border-orange-500'
                      )}
                    >
                      <div className="flex gap-3">
                        <div className="mt-0.5">{getTypeIcon(n.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <p className={cn('text-xs font-black uppercase text-slate-900', !n.read && 'italic')}>{n.title}</p>
                            <span className="text-[8px] font-bold text-slate-400 whitespace-nowrap">
                              {formatDistanceToNow(n.createdAt)} ago
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={cn(
                                'text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded',
                                n.read ? 'bg-slate-100 text-slate-400' : 'bg-orange-100 text-orange-700'
                              )}
                            >
                              {n.read ? 'Read' : 'Unread'}
                            </span>
                            <span className="text-[8px] text-slate-400">{new Date(n.createdAt).toLocaleString()}</span>
                          </div>

                          {n.link && (
                            <Link
                              to={n.link}
                              onClick={() => { setIsOpen(false); notificationStore.markRead(n.id); }}
                              className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-1 mt-2 group-hover:gap-2 transition-all"
                            >
                              Open <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                          )}

                          {/* Per-notification actions */}
                          <div className="flex items-center gap-3 mt-2">
                            {n.read ? (
                              <button
                                onClick={() => notificationStore.markUnread(n.id)}
                                className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-orange-600"
                              >
                                <RotateCcw className="w-3 h-3" /> Mark unread
                              </button>
                            ) : (
                              <button
                                onClick={() => notificationStore.markRead(n.id)}
                                className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-green-600"
                              >
                                <Check className="w-3 h-3" /> Mark read
                              </button>
                            )}
                            <button
                              onClick={() => notificationStore.remove(n.id)}
                              className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-red-600"
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-900 text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 italic">
                Local notifications — Firebase storage required for production
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
