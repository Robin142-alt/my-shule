import React from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { HeaderPopover } from './header-popover';

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead } = useNotifications();

  return (
    <HeaderPopover
      label="Notifications"
      triggerLabel={unreadCount > 0 ? `${unreadCount} unread notifications` : "No unread notifications"}
      title="Notifications"
      icon={<Bell size={24} aria-hidden="true" />}
      badge={unreadCount > 0 ? (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : undefined}
      headerAccessory={unreadCount > 0 ? (
              <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                {unreadCount} new
              </span>
            ) : undefined}
    >
          <div>
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Bell className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const content = (
                  <>
                    <p className={`text-sm ${!notif.is_read ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                      {notif.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{notif.message}</p>
                  </>
                );

                return notif.is_read ? (
                  <div key={notif.id} className="min-h-11 border-b border-slate-50 p-4 last:border-0">
                    {content}
                  </div>
                ) : (
                  <button
                    type="button"
                    key={notif.id}
                    className="block min-h-11 w-full border-b border-slate-50 bg-indigo-50/30 p-4 text-left transition-colors last:border-0 hover:bg-slate-50"
                    onClick={() => markAsRead(notif.id)}
                  >
                    {content}
                  </button>
                );
              })
            )}
          </div>
    </HeaderPopover>
  );
};
