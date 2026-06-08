"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { fetchDashboardSnapshot, fetchTenantOptions } from "@/lib/dashboard/dashboard-source";
import {
  type ActivityItem,
  type DashboardRole,
  type DashboardSnapshot,
  type QuickActionItem,
} from "@/lib/dashboard/types";
import { getDashboardWorkspaceHref } from "@/lib/dashboard/workspace-routes";

function useOnlineStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(window.navigator.onLine);

    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return online;
}

export function useDashboardState(role: DashboardRole) {
  const queryClient = useQueryClient();
  const online = useOnlineStatus();
  const tenantOptionsQuery = useQuery({
    queryKey: ["tenant-options"],
    queryFn: fetchTenantOptions,
    staleTime: 5 * 60_000,
  });

  const [tenantId, setTenantId] = useState("");

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", role, tenantId, online],
    queryFn: () => fetchDashboardSnapshot(role, tenantId, online),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
    enabled: tenantOptionsQuery.isSuccess,
  });

  const actionMutation = useMutation({
    mutationFn: async (action: QuickActionItem) => {
      await new Promise((resolve) => setTimeout(resolve, 140));
      return action;
    },
    onMutate: async (action) => {
      await queryClient.cancelQueries({ queryKey: ["dashboard", role, tenantId, online] });

      const previous = queryClient.getQueryData<DashboardSnapshot>([
        "dashboard",
        role,
        tenantId,
        online,
      ]);

      if (previous) {
        const queuedOffline = !online && action.offlineAllowed;
        const optimisticActivity: ActivityItem = {
          id: `optimistic-${action.id}`,
          title: `${action.label} started`,
          detail: queuedOffline
            ? "Action queued locally and will sync once the network returns."
            : "Quick action workspace selected from the rail.",
          actor: "You",
          href: getDashboardWorkspaceHref(role, action.href),
          timeLabel: "now",
          category:
            action.id === "record-payment" || action.id === "create-invoice"
                ? "payment"
                : action.id === "send-sms"
                  ? "communication"
                  : "student",
        };

        queryClient.setQueryData<DashboardSnapshot>(
          ["dashboard", role, tenantId, online],
          {
            ...previous,
            activityFeed: [optimisticActivity, ...previous.activityFeed].slice(0, 6),
            sync: queuedOffline
              ? {
                  ...previous.sync,
                  state: "pending",
                  pendingCount: previous.sync.pendingCount + 1,
                  label: "Offline work queued",
                }
              : previous.sync,
          },
        );
      }

      return { previous };
    },
    onError: (_error, _action, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["dashboard", role, tenantId, online],
          context.previous,
        );
      }
    },
  });

  return {
    online,
    tenantId,
    setTenantId,
    tenantOptionsQuery,
    dashboardQuery,
    actionMutation,
  };
}
