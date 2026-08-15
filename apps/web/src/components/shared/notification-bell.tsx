"use client";

import React from "react";
import { AlertCircle, Bell, Loader2, RefreshCw } from "lucide-react";

import { useNotifications } from "@/hooks/useNotifications";
import { HeaderPopover } from "./header-popover";

export const NotificationBell: React.FC = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    mutationError,
    pendingIds,
    markAsRead,
    refetch,
  } = useNotifications();
  const visibleError = mutationError ?? error;
  const triggerLabel = visibleError
    ? "Notifications unavailable"
    : isLoading
      ? "Loading notifications"
      : unreadCount > 0
        ? `${unreadCount} unread notifications`
        : "No unread notifications";

  return (
    <HeaderPopover
      label="Notifications"
      triggerLabel={triggerLabel}
      title="Notifications"
      icon={<Bell size={24} aria-hidden="true" />}
      badge={!visibleError && unreadCount > 0 ? (
        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : visibleError ? (
        <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" aria-hidden="true" />
      ) : undefined}
      headerAccessory={!visibleError && unreadCount > 0 ? (
        <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-600">
          {unreadCount} new
        </span>
      ) : undefined}
    >
      <div>
        {visibleError ? (
          <div role="alert" className="m-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Notifications could not be refreshed.</p>
                <p className="mt-1 break-words text-xs">{visibleError.message}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-800"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Retry
            </button>
          </div>
        ) : null}

        {isLoading && notifications.length === 0 ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading notifications...
          </div>
        ) : !visibleError && notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Bell className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => {
            const content = (
              <>
                <p className={`text-sm ${!notification.is_read ? "font-semibold text-slate-900" : "text-slate-700"}`}>
                  {notification.title}
                </p>
                {notification.message ? <p className="mt-1 line-clamp-2 text-xs text-slate-500">{notification.message}</p> : null}
              </>
            );

            return notification.is_read ? (
              <div key={notification.id} className="min-h-11 border-b border-slate-50 p-4 last:border-0">
                {content}
              </div>
            ) : (
              <button
                type="button"
                key={notification.id}
                disabled={pendingIds.has(notification.id)}
                className="block min-h-11 w-full border-b border-slate-50 bg-indigo-50/30 p-4 text-left transition-colors last:border-0 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
                onClick={() => void markAsRead(notification.id).catch(() => undefined)}
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
