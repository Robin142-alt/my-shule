"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, AlertTriangle, Check, ExternalLink, Info, Loader2, RefreshCw, X } from "lucide-react";

import { useNotifications, type DashboardNotification } from "@/hooks/useNotifications";

export function NotificationDrawer({
  basePath,
  onClose,
  onNotificationUpdate,
}: {
  basePath: string;
  onClose: () => void;
  onNotificationUpdate: () => void | Promise<unknown>;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"ALL" | "UNREAD" | "ACTION_REQUIRED">("UNREAD");
  const status = activeTab === "ALL" ? undefined : activeTab;
  const {
    notifications,
    isLoading,
    error,
    mutationError,
    pendingIds,
    isMarkingAllRead,
    markAsRead,
    markAllAsRead,
    refetch,
  } = useNotifications(status);
  const visibleError = mutationError ?? error;

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
      await onNotificationUpdate();
    } catch {
      // The hook retains the record and exposes the mutation error in this drawer.
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      await onNotificationUpdate();
    } catch {
      // The hook retains all records and exposes the mutation error in this drawer.
    }
  };

  const getPriorityIcon = (priority: DashboardNotification["priority"]) => {
    switch (priority) {
      case "URGENT": return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "HIGH": return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case "LOW": return <Info className="h-4 w-4 text-blue-500" />;
      default: return <Info className="h-4 w-4 text-emerald-500" />;
    }
  };

  return (
    <div className="absolute right-0 top-[calc(100%+8px)] z-30 flex max-h-[500px] w-[360px] flex-col rounded-xl border border-[#e8eaed] bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-[#e8eaed] px-4 py-3">
        <h3 className="font-semibold text-[#1a1d26]">Notifications</h3>
        <div className="flex items-center gap-2">
          {activeTab === "UNREAD" && notifications.length > 0 ? (
            <button
              type="button"
              disabled={isMarkingAllRead}
              onClick={() => void handleMarkAllAsRead()}
              className="min-h-10 text-xs font-medium text-emerald-600 hover:text-emerald-700 disabled:cursor-wait disabled:opacity-60"
            >
              {isMarkingAllRead ? "Marking..." : "Mark all as read"}
            </button>
          ) : null}
          <button type="button" aria-label="Close notifications" onClick={onClose} className="grid h-10 w-10 place-items-center text-[#8b8f9a] hover:text-[#1a1d26]">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 border-b border-[#e8eaed] px-4 pt-2">
        {(["UNREAD", "ACTION_REQUIRED", "ALL"] as const).map((tab) => (
          <button
            type="button"
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`min-h-10 border-b-2 pb-2 text-xs font-medium transition ${
              activeTab === tab
                ? "border-emerald-500 text-emerald-700"
                : "border-transparent text-[#5a5e6a] hover:text-[#1a1d26]"
            }`}
          >
            {tab.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto p-2">
        {visibleError ? (
          <div role="alert" className="mb-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <p className="font-semibold">Notifications could not be refreshed.</p>
            <p className="mt-1 break-words text-xs">{visibleError.message}</p>
            <button type="button" onClick={() => void refetch()} className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        ) : null}

        {isLoading && notifications.length === 0 ? (
          <div className="flex items-center justify-center gap-2 p-6 text-sm text-[#8b8f9a]"><Loader2 className="h-4 w-4 animate-spin" /> Loading notifications...</div>
        ) : !visibleError && notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Check className="mb-2 h-8 w-8 text-emerald-200" />
            <p className="text-sm font-medium text-[#1a1d26]">All caught up!</p>
            <p className="text-xs text-[#8b8f9a]">No notifications match this view.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`group flex items-start gap-3 rounded-lg p-3 transition ${
                  notification.status === "UNREAD" || notification.status === "ACTION_REQUIRED"
                    ? "bg-[#f9fafc] hover:bg-[#f3f4f6]"
                    : "hover:bg-[#f9fafc]"
                }`}
              >
                <div className="mt-0.5 shrink-0">{getPriorityIcon(notification.priority)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-semibold text-[#1a1d26]">{notification.title}</p>
                    {notification.createdAt ? (
                      <span className="ml-2 shrink-0 text-[10px] text-[#8b8f9a]">
                        {new Date(notification.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    ) : null}
                  </div>
                  {notification.message ? <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[#5a5e6a]">{notification.message}</p> : null}

                  {notification.actionUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        const targetUrl = notification.actionUrl!.startsWith("/")
                          ? notification.actionUrl!
                          : `${basePath}/${notification.actionUrl!}`;
                        router.push(targetUrl.replace(/\/{2,}/g, "/"));
                      }}
                      className="mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 transition hover:border-emerald-200 hover:bg-emerald-100"
                    >
                      {notification.actionLabel || "View details"}
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  ) : null}
                </div>

                {notification.status === "UNREAD" ? (
                  <button
                    type="button"
                    disabled={pendingIds.has(notification.id)}
                    onClick={() => void handleMarkAsRead(notification.id)}
                    className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full text-emerald-600 opacity-0 transition hover:bg-emerald-100 group-hover:opacity-100 focus-visible:opacity-100 disabled:cursor-wait disabled:opacity-60"
                    title="Mark as read"
                    aria-label={`Mark ${notification.title} as read`}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
