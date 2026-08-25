"use client";

import { useState } from "react";
import { Map, Plus } from "lucide-react";
import { toast } from "sonner";

import { usePermissions } from "@/components/providers/permission-context";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";

import { Panel, StatusChip, type Tone } from "./shared";

type RoutesRecord = {
  id: string;
  route_name: string;
  pickup_points: number;
  students_count: number;
  driver: string;
  vehicle: string;
  status: string;
};

type RoutesData = {
  metrics: {
    total_routes: number;
    active_routes: number;
  };
  routesList: RoutesRecord[];
};

type CreateRoutePayload = {
  name: string;
  code?: string;
  direction: "morning" | "afternoon" | "round_trip";
  zone?: string;
  fare_amount_minor: number;
};

const emptyRoute: CreateRoutePayload = {
  name: "",
  code: "",
  direction: "round_trip",
  zone: "",
  fare_amount_minor: 0,
};

export function RoutesWorkspace() {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const { data, error, isLoading, refetch } = useSchoolQuery<RoutesData>(
    "/admin-command/transport-manager/routes",
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateRoutePayload>(emptyRoute);
  const canWrite = hasPermission("transport:write");
  const createRoute = useSchoolMutation<unknown, CreateRoutePayload>(
    "/admin-command/transport-manager/routes",
    "POST",
    {
      onSuccess: async () => {
        toast.success("Transport route created.");
        setForm(emptyRoute);
        setShowForm(false);
        await refetch();
      },
      onError: (mutationError) => {
        toast.error("Route was not created", { description: mutationError.message });
      },
    },
  );
  const items = data?.routesList ?? [];

  const getStatusTone = (status: string): Tone => {
    const normalized = status.toLowerCase();
    if (normalized === "active") return "success";
    if (normalized === "draft" || normalized === "paused") return "warning";
    if (normalized === "retired") return "danger";
    return "neutral";
  };

  function submitRoute() {
    if (!form.name.trim()) {
      toast.error("Route name is required.");
      return;
    }

    createRoute.mutate({
      ...form,
      name: form.name.trim(),
      code: form.code?.trim() || undefined,
      zone: form.zone?.trim() || undefined,
      fare_amount_minor: Math.max(0, Number(form.fare_amount_minor) || 0),
    });
  }

  return (
    <Panel
      title="Routes"
      description="Manage school transport routes."
      icon={Map}
      actions={
        <button
          type="button"
          disabled={permissionsLoading || !canWrite}
          onClick={() => setShowForm(true)}
          title={!permissionsLoading && !canWrite ? "Transport write permission is required" : undefined}
          className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Add Route
        </button>
      }
    >
      {showForm ? (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-sm font-black text-[#071D49]">Create transport route</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-xs font-bold text-[#334155]">
              Route name *
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm"
              />
            </label>
            <label className="text-xs font-bold text-[#334155]">
              Route code
              <input
                value={form.code}
                onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm"
              />
            </label>
            <label className="text-xs font-bold text-[#334155]">
              Direction
              <select
                value={form.direction}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  direction: event.target.value as CreateRoutePayload["direction"],
                }))}
                className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm"
              >
                <option value="round_trip">Round trip</option>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
              </select>
            </label>
            <label className="text-xs font-bold text-[#334155]">
              Zone
              <input
                value={form.zone}
                onChange={(event) => setForm((current) => ({ ...current, zone: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm"
              />
            </label>
            <label className="text-xs font-bold text-[#334155] md:col-span-2">
              Fare in minor units
              <input
                type="number"
                min="0"
                value={form.fare_amount_minor}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  fare_amount_minor: Number(event.target.value),
                }))}
                className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm"
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg px-4 py-2 text-sm font-bold text-[#64748B]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={createRoute.isPending}
              onClick={submitRoute}
              className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50"
            >
              {createRoute.isPending ? "Saving…" : "Save Route"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Routes</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total_routes ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Active Routes</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.active_routes ?? 0}</div>
        </div>
      </div>

      {error ? (
        <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <p className="font-black">Routes could not be loaded.</p>
          <p className="mt-1">{error.message}</p>
          <button type="button" onClick={() => void refetch()} className="mt-3 font-black underline">Retry</button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <thead className="bg-[#F8FAFC] text-[#071D49]">
              <tr>
                <th className="px-4 py-3 font-bold">Route Name</th>
                <th className="px-4 py-3 font-bold">Pickup Points</th>
                <th className="px-4 py-3 font-bold">Students Count</th>
                <th className="px-4 py-3 font-bold">Driver</th>
                <th className="px-4 py-3 font-bold">Vehicle</th>
                <th className="px-4 py-3 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">Loading routes…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">No routes exist for this school. Add the first route before assigning vehicles or learners.</td></tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-semibold text-[#071D49]">{row.route_name}</td>
                    <td className="px-4 py-3 text-[#64748B]">{row.pickup_points}</td>
                    <td className="px-4 py-3 text-[#64748B]">{row.students_count}</td>
                    <td className="px-4 py-3 text-[#64748B]">{row.driver || "Unassigned"}</td>
                    <td className="px-4 py-3 text-[#64748B]">{row.vehicle || "Unassigned"}</td>
                    <td className="px-4 py-3"><StatusChip label={row.status} tone={getStatusTone(row.status)} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
