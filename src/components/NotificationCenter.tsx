import * as React from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  Check,
  Trash2,
  Info,
  Calendar,
  CreditCard,
  Wrench,
  ShieldCheck,
  ClipboardList,
  ExternalLink,
  Settings,
  MailOpen,
  RotateCcw,
  Eraser,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import {
  useNotificationsLocal,
  markNotificationRead,
  markNotificationUnread,
  deleteNotification,
  markAllNotificationsRead,
  clearReadNotifications,
  NotificationType,
} from '@/data/notificationStore';

function typeIcon(type: NotificationType) {
  switch (type) {
    case 'schedule': return <Calendar className="w-4 h-4 text-indigo-500" />;
    case 'payment': return <CreditCard className="w-4 h-4 text-green-600" />;
    case 'equipment': return <Wrench className="w-4 h-4 text-orange-500" />;
    case 'admin': return <ShieldCheck className="w-4 h-4 text-red-500" />;
    case 'booking': return <ClipboardList className="w-4 h-4 text-blue-500" />;
    default: return <Info className="w-4 h-4 text-slate-500" />;
  }
}

export function NotificationCenter() {
  // Temporary browser storage — Firebase notification storage required for production.
  const notifications = useNotificationsLocal();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);
  const [coords, setCoords] = React.useState<{ top: number; right: number }>({ top: 64, right: 16 });
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const readCount = notifications.filter((n) => n.read).length;

  // Position the (portalled) panel relative to the bell button.
  const place = React.useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setCoords({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
  }, []);

  const open = () => {
    place();
    setIsOpen(true);
  };
  const toggle = () => (isOpen ? setIsOpen(false) : open());

  // Close on Escape, outside click, scroll/resize reposition.
  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setIsOpen(false);
    };
    const onMove = () => place();
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [isOpen, place]);

  const panel = (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Notifications"
      className="fixed w-[22rem] max-w-[92vw] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-[9999]"
      style={{ top: coords.top, right: coords.right }}
    >
      {/* Header */}
      <div className="p-4 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 italic">Notifications</h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-orange-600 uppercase">{unreadCount} unread</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">/ {notifications.length} total</span>
            <button type="button" aria-label="Close notifications" onClick={() => setIsOpen(false)} className="p-1 rounded-lg hover:bg-slate-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            type="button"
            onClick={() => markAllNotificationsRead()}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            <MailOpen className="w-3 h-3" /> Mark all read
          </button>
          <button
            type="button"
            onClick={() => clearReadNotifications()}
            disabled={readCount === 0}
            className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            <Eraser className="w-3 h-3" /> Clear read
          </button>
          <button
            type="button"
            onClick={() => { setIsOpen(false); navigate('/admin/automations'); }}
            className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-black"
          >
            <Settings className="w-3 h-3" /> Manage
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-[420px] overflow-y-auto">
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
                className={cn('p-4 transition-colors relative', n.read ? 'bg-white' : 'bg-orange-50/40 border-l-4 border-orange-500')}
              >
                <div className="flex gap-3">
                  <div className="mt-0.5">{typeIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <p className={cn('text-xs font-black uppercase text-slate-900', !n.read && 'italic')}>{n.title}</p>
                      <span className="text-[8px] font-bold text-slate-400 whitespace-nowrap">{formatDistanceToNow(n.createdAt)} ago</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{n.type}</span>
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

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {n.link && (
                        <button
                          type="button"
                          onClick={() => { setIsOpen(false); markNotificationRead(n.id); navigate(n.link!); }}
                          className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800"
                        >
                          {n.actionLabel || 'View'} <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}
                      {n.read ? (
                        <button type="button" onClick={() => markNotificationUnread(n.id)} className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-orange-600">
                          <RotateCcw className="w-3 h-3" /> Mark unread
                        </button>
                      ) : (
                        <button type="button" onClick={() => markNotificationRead(n.id)} className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-green-600">
                          <Check className="w-3 h-3" /> Mark read
                        </button>
                      )}
                      <button type="button" onClick={() => deleteNotification(n.id)} className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-red-600">
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

      <div className="p-3 bg-slate-900 text-center">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 italic">
          Local notifications — Firebase storage required for production
        </p>
      </div>
    </div>
  );

  return (
    <>
      <Button
        ref={btnRef}
        type="button"
        variant="ghost"
        size="icon"
        onClick={toggle}
        aria-label="Open notifications"
        aria-expanded={isOpen}
        className="relative hover:bg-slate-100 rounded-full h-10 w-10 transition-all duration-300"
      >
        <Bell className={cn('h-5 w-5', unreadCount > 0 ? 'text-orange-600 animate-pulse' : 'text-slate-500')} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-600 text-[10px] font-black text-white italic border-2 border-white shadow-sm">
            {unreadCount}
          </span>
        )}
      </Button>

      {isOpen && typeof document !== 'undefined' && createPortal(panel, document.body)}
    </>
  );
}
