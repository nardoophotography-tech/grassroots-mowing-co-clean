import * as React from 'react';
import { Bell, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications } from '../hooks/useFirebase';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export function NotificationBell() {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = React.useState(false);
  const navigate = useNavigate();
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = async (id: string, link?: string) => {
    await markAsRead(id);
    if (link) {
      navigate(link);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-green-600 transition-colors rounded-full hover:bg-green-50"
        id="notification-bell"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={() => markAllAsRead()}
                    className="text-xs text-green-600 hover:text-green-700 font-medium"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n.id, n.link)}
                        className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer relative ${!n.read ? 'bg-green-50/30' : ''}`}
                      >
                        {!n.read && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500" />
                        )}
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-xs font-bold uppercase tracking-wider ${
                            n.type === 'alert' ? 'text-red-500' : 
                            n.type === 'success' ? 'text-green-600' : 'text-blue-500'
                          }`}>
                            {n.type}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {formatDistanceToNow(n.createdAt)} ago
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-1">{n.title}</h4>
                        <p className="text-xs text-gray-600 line-clamp-2">{n.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {notifications.length > 0 && (
                <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                  <button 
                    className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                    onClick={() => {
                      navigate('/admin/notifications');
                      setIsOpen(false);
                    }}
                  >
                    View all notifications
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
