"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, AlertTriangle, Check, ExternalLink, Info, Loader2, RefreshCw, X } from "lucide-react";

import { useNotifications, type DashboardNotification } from "@/hooks/useNotifications";
import { resolvePaymentSetupNotificationHref } from "@/lib/notification-link-resolver";
import { StaffConversations } from "./staff-conversations";
import { useOptionalSchoolDashboardRole } from "@/lib/auth/school-dashboard-role-context";

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
  const role = useOptionalSchoolDashboardRole();
  const staffInbox = Boolean(
    role?.activeAuthorizationRoleCode &&
      [
        "owner",
        "admin",
        "staff",
        "principal",
        "deputy_principal",
        "secretary",
        "bursar",
        "accountant",
        "teacher",
        "class_teacher",
        "grade_master",
        "hod",
        "head_of_subject",
        "dean_academics",
        "exams_manager",
        "nurse",
        "clinic_staff",
        "school_counsellor",
        "discipline_master",
        "librarian",
        "storekeeper",
        "boarding_master",
        "security_officer",
        "transport_manager",
        "lab_technician",
        "admissions_officer",
        "ict_manager",
      ].includes(role.activeAuthorizationRoleCode),
  );
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showMessages, setShowMessages] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "ALL" | "UNREAD" | "ACTION_REQUIRED"
  >("UNREAD");
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
      case "URGENT":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "HIGH":
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case "LOW":
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-emerald-500" />;
    }
  };

  return (
    <div className="fixed left-3 right-3 top-20 z-50 flex max-h-[min(500px,75dvh)] flex-col rounded-xl border border-border bg-white shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+8px)] sm:w-[360px]">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="font-semibold text-foreground">Notifications</h3>
        <div className="flex items-center gap-2">
          {activeTab === "UNREAD" && notifications.length > 0 ? (
            <button
              type="button"
              disabled={isMarkingAllRead}
              onClick={() => void handleMarkAllAsRead()}
              className="min-h-10 text-xs font-medium text-emerald-600 hover:text-success disabled:cursor-wait disabled:opacity-60"
            >
              {isMarkingAllRead ? "Marking..." : "Mark all as read"}
            </button>
          ) : null}
          <button
            type="button"
            aria-label="Close notifications"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center text-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 border-b border-border px-4 pt-2">
        {(["UNREAD", "ACTION_REQUIRED", "ALL"] as const).map((tab) => (
          <button
            type="button"
            key={tab}
            onClick={() => {
              setShowMessages(false);
              setActiveTab(tab);
            }}
            className={`min-h-10 border-b-2 pb-2 text-xs font-medium transition ${
              !showMessages && activeTab === tab
                ? "border-emerald-500 text-success"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {tab.replace("_", " ")}
          </button>
        ))}
        {staffInbox && (
          <button
            type="button"
            onClick={() => {
              setConversationId(null);
              setShowMessages(true);
            }}
            className={`min-h-10 border-b-2 pb-2 text-xs font-medium ${showMessages ? "border-emerald-500 text-success" : "border-transparent text-muted"}`}
          >
            Messages
          </button>
        )}
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto p-2">
        {showMessages ? (
          <StaffConversations
            key={conversationId}
            initialThread={conversationId}
            compact
            onRead={() => void onNotificationUpdate()}
          />
        ) : (
          <>
            {visibleError ? (
              <div
                role="alert"
                className="mb-2 rounded-lg border border-danger-border bg-danger-soft p-3 text-sm text-danger"
              >
                <p className="font-semibold">
                  Notifications could not be refreshed.
                </p>
                <p className="mt-1 break-words text-xs">
                  {visibleError.message}
                </p>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-lg border border-danger-border bg-white px-3 text-xs font-semibold"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Retry
                </button>
              </div>
            ) : null}

            {isLoading && notifications.length === 0 ? (
              <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading
                notifications...
              </div>
            ) : !visibleError && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <Check className="mb-2 h-8 w-8 text-emerald-200" />
                <p className="text-sm font-medium text-foreground">
                  All caught up!
                </p>
                <p className="text-xs text-muted">
                  No notifications match this view.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`group flex items-start gap-3 rounded-lg p-3 transition ${
                      notification.status === "UNREAD" ||
                      notification.status === "ACTION_REQUIRED"
                        ? "bg-[#f9fafc] hover:bg-background"
                        : "hover:bg-[#f9fafc]"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {getPriorityIcon(notification.priority)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-semibold text-foreground">
                          {notification.title}
                        </p>
                        {notification.createdAt ? (
                          <span className="ml-2 shrink-0 text-[10px] text-muted">
                            {new Date(
                              notification.createdAt,
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        ) : null}
                      </div>
                      {notification.message ? (
                        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted">
                          {notification.message}
                        </p>
                      ) : null}

                      {notification.conversationId && staffInbox ? (
                        <button
                          type="button"
                          onClick={() => {
                            setConversationId(notification.conversationId!);
                            setShowMessages(true);
                          }}
                          className="mt-2 min-h-10 text-xs font-semibold text-accent"
                        >
                          Open staff messages
                        </button>
                      ) : notification.actionUrl ? (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            const targetUrl =
                              notification.actionUrl!.startsWith("/")
                                ? notification.actionUrl!
                                : `${basePath}/${notification.actionUrl!}`;
                            router.push(
                              resolvePaymentSetupNotificationHref(
                                targetUrl,
                                basePath,
                              ).replace(/\/{2,}/g, "/"),
                            );
                          }}
                          className="mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-emerald-100 bg-success-soft px-2.5 py-1 text-[10px] font-bold text-success transition hover:border-success-border hover:bg-emerald-100"
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
          </>
        )}
      </div>
    </div>
  );
}
