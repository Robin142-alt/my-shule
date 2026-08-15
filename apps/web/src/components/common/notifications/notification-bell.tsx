"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";

import type { NotificationBadges } from "@/hooks/useNotifications";
import { NotificationDrawer } from "./notification-drawer";

export type BadgesResponse = NotificationBadges;

export function NotificationBell({
  basePath,
  badges,
  badgesError,
  badgesLoading = false,
  onBadgesRefresh,
}: {
  basePath: string;
  badges: BadgesResponse | null;
  badgesError?: Error | null;
  badgesLoading?: boolean;
  onBadgesRefresh?: () => void | Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasUnread = Boolean(badges && badges.unreadCount > 0);
  const hasUrgent = Boolean(badges && badges.urgentCount > 0);
  const buttonLabel = badgesError
    ? "Open school notifications; notification count unavailable"
    : badgesLoading
      ? "Open school notifications; loading notification count"
      : "Open school notifications";

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-label={buttonLabel}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="relative rounded-xl border border-[#e8eaed] p-2.5 text-[#5a5e6a] transition hover:bg-[#f3f4f6]"
      >
        <Bell className="h-4 w-4" />
        {hasUnread ? (
          <span
            className={`absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white ${
              hasUrgent ? "bg-red-500" : "bg-emerald-500"
            }`}
          >
            {badges!.unreadCount > 9 ? "9+" : badges!.unreadCount}
          </span>
        ) : badgesError ? (
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" aria-hidden="true" />
        ) : null}
      </button>

      {open ? (
        <NotificationDrawer
          basePath={basePath}
          onClose={() => setOpen(false)}
          onNotificationUpdate={() => onBadgesRefresh?.()}
        />
      ) : null}
    </div>
  );
}
