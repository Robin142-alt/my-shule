"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Info, AlertTriangle, AlertCircle, X, ExternalLink } from "lucide-react";

interface NotificationData {
  id: string;
  title: string;
  message: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  status: "UNREAD" | "READ" | "ACTION_REQUIRED" | "ACTION_TAKEN" | "DISMISSED" | "EXPIRED" | "FAILED";
  module: string;
  actionUrl: string | null;
  actionLabel: string | null;
  createdAt: string;
}

function fallbackNotifications(): NotificationData[] {
  return [
    {
      id: "local-attendance-registers",
      title: "Attendance registers",
      message: "Open the attendance registers desk to review current attendance follow-up work.",
      priority: "NORMAL",
      status: "UNREAD",
      module: "attendance",
      actionUrl: "attendance",
      actionLabel: "Attendance registers",
      createdAt: new Date().toISOString(),
    },
  ];
}

export function NotificationDrawer({
  basePath,
  onClose,
  onNotificationUpdate,
}: {
  basePath: string;
  onClose: () => void;
  onNotificationUpdate: () => void;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"ALL" | "UNREAD" | "ACTION_REQUIRED">("UNREAD");
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    if (typeof fetch !== "function") {
      setNotifications(fallbackNotifications());
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("auth_token") || "";
      const statusQuery = activeTab === "ALL" ? "" : activeTab;
      const res = await fetch(`/api/v1/notifications?status=${statusQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) && data.length > 0 ? data : fallbackNotifications());
      }
    } catch {
      setNotifications(fallbackNotifications());
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    const fetchTimer = window.setTimeout(() => {
      void fetchNotifications();
    }, 0);
    return () => window.clearTimeout(fetchTimer);
  }, [fetchNotifications]);

  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (typeof fetch !== "function") {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      onNotificationUpdate();
      return;
    }

    try {
      const token = localStorage.getItem("auth_token") || "";
      await fetch(`/api/v1/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      onNotificationUpdate();
    } catch {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      onNotificationUpdate();
    }
  };

  const markAllAsRead = async () => {
    if (typeof fetch !== "function") {
      setNotifications([]);
      onNotificationUpdate();
      return;
    }

    try {
      const token = localStorage.getItem("auth_token") || "";
      await fetch(`/api/v1/notifications/read-all`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (activeTab === "UNREAD") setNotifications([]);
      else fetchNotifications();
      onNotificationUpdate();
    } catch {
      setNotifications([]);
      onNotificationUpdate();
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "URGENT": return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "HIGH": return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case "LOW": return <Info className="h-4 w-4 text-blue-500" />;
      default: return <Info className="h-4 w-4 text-emerald-500" />;
    }
  };

  return (
    <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-[360px] rounded-xl border border-[#e8eaed] bg-white shadow-xl flex flex-col max-h-[500px]">
      <div className="flex items-center justify-between border-b border-[#e8eaed] px-4 py-3">
        <h3 className="font-semibold text-[#1a1d26]">Notifications</h3>
        <div className="flex items-center gap-2">
          {activeTab === "UNREAD" && notifications.length > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
            >
              Mark all as read
            </button>
          )}
          <button onClick={onClose} className="text-[#8b8f9a] hover:text-[#1a1d26]">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 border-b border-[#e8eaed] px-4 pt-2">
        {(["UNREAD", "ACTION_REQUIRED", "ALL"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-xs font-medium border-b-2 transition ${
              activeTab === tab
                ? "border-emerald-500 text-emerald-700"
                : "border-transparent text-[#5a5e6a] hover:text-[#1a1d26]"
            }`}
          >
            {tab.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {loading ? (
          <div className="flex items-center justify-center p-6 text-sm text-[#8b8f9a]">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Check className="mb-2 h-8 w-8 text-emerald-200" />
            <p className="text-sm font-medium text-[#1a1d26]">All caught up!</p>
            <p className="text-xs text-[#8b8f9a]">No new notifications to display.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`group flex items-start gap-3 rounded-lg p-3 transition ${
                  notif.status === "UNREAD" || notif.status === "ACTION_REQUIRED"
                    ? "bg-[#f9fafc] hover:bg-[#f3f4f6]"
                    : "hover:bg-[#f9fafc]"
                }`}
              >
                <div className="mt-0.5 shrink-0">{getPriorityIcon(notif.priority)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-semibold text-[#1a1d26]">{notif.title}</p>
                    <span className="text-[10px] text-[#8b8f9a] shrink-0 ml-2">
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[#5a5e6a] leading-relaxed line-clamp-2">
                    {notif.message}
                  </p>
                  
                  {notif.actionUrl ? (
                    <button
                      onClick={() => {
                        onClose();
                        const targetUrl = notif.actionUrl!.startsWith("/")
                          ? notif.actionUrl!
                          : `${basePath}/${notif.actionUrl!}`;
                        router.push(targetUrl.replace(/\/{2,}/g, "/"));
                      }}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 transition hover:border-emerald-200 hover:bg-emerald-100"
                    >
                      {notif.actionLabel || "View Details"}
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  ) : null}
                </div>
                
                {notif.status === "UNREAD" && (
                  <button
                    onClick={(e) => markAsRead(notif.id, e)}
                    className="opacity-0 group-hover:opacity-100 shrink-0 mt-0.5 rounded-full p-1 text-emerald-600 hover:bg-emerald-100 transition"
                    title="Mark as read"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
