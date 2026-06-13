"use client";

import { useEffect, useState, useRef } from "react";
import { Bell } from "lucide-react";
import { NotificationDrawer } from "./notification-drawer";

export interface BadgesResponse {
  unreadCount: number;
  urgentCount: number;
  byModule: Record<string, number>;
}

export function NotificationBell({ 
  basePath, 
  badges, 
  onBadgesUpdate 
}: { 
  basePath: string;
  badges: BadgesResponse | null;
  onBadgesUpdate?: (badges: BadgesResponse | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close drawer when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasUnread = badges && badges.unreadCount > 0;
  const hasUrgent = badges && badges.urgentCount > 0;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-label="Open school notifications"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="relative rounded-xl border border-[#e8eaed] p-2.5 text-[#5a5e6a] transition hover:bg-[#f3f4f6]"
      >
        <Bell className="h-4 w-4" />
        {hasUnread && (
          <span
            className={`absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white ${
              hasUrgent ? "bg-red-500" : "bg-emerald-500"
            }`}
          >
            {badges.unreadCount > 9 ? "9+" : badges.unreadCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationDrawer 
          basePath={basePath} 
          onClose={() => setOpen(false)} 
          onNotificationUpdate={() => {
            if (onBadgesUpdate && badges) {
              onBadgesUpdate({ ...badges, unreadCount: Math.max(0, badges.unreadCount - 1) });
            }
          }}
        />
      )}
    </div>
  );
}
