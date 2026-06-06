"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  BusFront,
  CheckCircle2,
  MapPinned,
  RefreshCw,
  Route,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { getCsrfToken } from "@/lib/auth/csrf-client";
import type { StatusTone } from "@/lib/dashboard/types";
import { fetchLearnerLookup, type LearnerLookupItem } from "@/lib/students/student-lookup";

type TransportRouteRow = {
  id: string;
  name: string;
  direction?: string;
  zone?: string | null;
  status?: string;
  active_stops?: number;
  learner_count?: number;
};

type TransportVehicleRow = {
  id: string;
  registration_number: string;
  capacity?: number;
  ownership_type?: string;
  status?: string;
  service_status?: string;
  service_due_date?: string | null;
};

type TransportManifestRow = {
  id: string;
  route_name?: string;
  learner_count?: number;
  status?: string;
  effective_from?: string | null;
};

type TransportTripRow = {
  id: string;
  route_name?: string;
  vehicle_registration?: string;
  driver_name?: string | null;
  status?: string;
  learner_count?: number;
};

type TransportAlertRow = {
  id: string;
  title: string;
  message?: string;
  severity?: "info" | "warning" | "critical";
  status?: string;
};

export type TransportDashboard = {
  active_routes: number;
  active_vehicles: number;
  active_manifests: number;
  trips_today: number;
  open_alerts: number;
  service_due_vehicles: number;
  routes: TransportRouteRow[];
  vehicles: TransportVehicleRow[];
  manifests: TransportManifestRow[];
  trips: TransportTripRow[];
  alerts: TransportAlertRow[];
};

type SaveState = "idle" | "saving";
type TransportAction = "route" | "vehicle" | "manifest" | "trip" | "event" | "service";

const emptyDashboard: TransportDashboard = {
  active_routes: 0,
  active_vehicles: 0,
  active_manifests: 0,
  trips_today: 0,
  open_alerts: 0,
  service_due_vehicles: 0,
  routes: [],
  vehicles: [],
  manifests: [],
  trips: [],
  alerts: [],
};

const fieldClassName =
  "w-full rounded-[var(--radius-sm)] border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent/50 focus:shadow-[var(--shadow-focus)]";

function normalizeDashboard(payload: unknown): TransportDashboard {
  const source = payload && typeof payload === "object" && "data" in payload
    ? (payload as { data?: unknown }).data
    : payload;
  const value = source && typeof source === "object" ? source as Partial<TransportDashboard> : {};

  return {
    ...emptyDashboard,
    ...value,
    routes: Array.isArray(value.routes) ? value.routes : [],
    vehicles: Array.isArray(value.vehicles) ? value.vehicles : [],
    manifests: Array.isArray(value.manifests) ? value.manifests : [],
    trips: Array.isArray(value.trips) ? value.trips : [],
    alerts: Array.isArray(value.alerts) ? value.alerts : [],
  };
}

function formatStatus(value: string | undefined) {
  return (value ?? "pending").replaceAll("_", " ");
}

function statusTone(value: string | undefined): StatusTone {
  if (["critical", "incident", "cancelled", "suspended", "due"].includes(value ?? "")) {
    return "critical";
  }

  if (["warning", "soon", "scheduled", "in_progress", "open"].includes(value ?? "")) {
    return "warning";
  }

  return "ok";
}

function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "ok",
}: {
  label: string;
  value: number;
  helper: string;
  icon: typeof BusFront;
  tone?: StatusTone;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            {label}
          </p>
          <p className="mt-3 text-2xl font-bold leading-none text-foreground">{value}</p>
        </div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-primary text-white">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[13px] leading-5 text-muted">{helper}</p>
        <StatusPill label={tone} tone={tone} compact />
      </div>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function recordOptionLabel(row: TransportRouteRow | TransportVehicleRow | TransportTripRow) {
  if ("registration_number" in row) {
    return `${row.registration_number}${row.capacity ? ` - ${row.capacity} seats` : ""}`;
  }

  if ("name" in row) {
    return `${row.name}${row.direction ? ` - ${formatStatus(row.direction)}` : ""}`;
  }

  return `${row.route_name ?? "Transport trip"}${row.vehicle_registration ? ` - ${row.vehicle_registration}` : ""}`;
}

function RecordSelect<TRecord extends { id: string }>({
  label,
  name,
  rows,
  required,
  emptyLabel,
  optionalLabel,
  getLabel,
}: {
  label: string;
  name: string;
  rows: TRecord[];
  required?: boolean;
  emptyLabel: string;
  optionalLabel?: string;
  getLabel: (row: TRecord) => string;
}) {
  const disabled = rows.length === 0;

  return (
    <Field label={label}>
      <select
        aria-label={label}
        className={fieldClassName}
        name={name}
        required={required}
        disabled={disabled}
        defaultValue={required ? rows[0]?.id ?? "" : ""}
      >
        {required ? null : <option value="">{optionalLabel ?? "None"}</option>}
        {disabled ? <option value="">{emptyLabel}</option> : null}
        {rows.map((row) => (
          <option key={row.id} value={row.id}>
            {getLabel(row)}
          </option>
        ))}
      </select>
      {disabled ? (
        <span className="block text-xs font-medium text-danger">{emptyLabel}</span>
      ) : null}
    </Field>
  );
}

function LearnerLookupPicker({
  tenantSlug,
  mode,
  selectedIds,
  onSelectedIdsChange,
}: {
  tenantSlug?: string | null;
  mode: "single" | "multi";
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LearnerLookupItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const selectedSet = new Set(selectedIds);

  async function searchLearners() {
    if (!tenantSlug) {
      setLookupError("School workspace is required before learner search.");
      return;
    }

    if (query.trim().length < 2) {
      setLookupError("Enter at least two characters to search learners.");
      return;
    }

    setIsSearching(true);
    setLookupError(null);

    try {
      setResults(await fetchLearnerLookup({ tenantSlug, query, limit: 8 }));
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : "Learner search is unavailable.");
    } finally {
      setIsSearching(false);
    }
  }

  function toggleLearner(learner: LearnerLookupItem) {
    if (mode === "single") {
      onSelectedIdsChange(selectedSet.has(learner.id) ? [] : [learner.id]);
      return;
    }

    onSelectedIdsChange(
      selectedSet.has(learner.id)
        ? selectedIds.filter((id) => id !== learner.id)
        : [...selectedIds, learner.id],
    );
  }

  return (
    <div className="space-y-3 md:col-span-2">
      <Field label="Search learners">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            aria-label="Search learners"
            className={fieldClassName}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search name or admission no."
          />
          <Button type="button" variant="secondary" onClick={searchLearners} disabled={isSearching}>
            {isSearching ? "Searching..." : "Search learners"}
          </Button>
        </div>
      </Field>
      <input type="hidden" name={mode === "multi" ? "student_ids" : "student_id"} value={selectedIds.join(",")} />
      <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">
            {mode === "multi" ? `${selectedIds.length} learner${selectedIds.length === 1 ? "" : "s"} selected` : selectedIds.length === 1 ? "1 learner selected" : "No learner selected"}
          </p>
          {selectedIds.length > 0 ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => onSelectedIdsChange([])}>
              Clear
            </Button>
          ) : null}
        </div>
        {lookupError ? <p className="mt-2 text-sm font-semibold text-danger">{lookupError}</p> : null}
        <div className="mt-3 space-y-2">
          {results.length === 0 ? (
            <p className="text-sm text-muted">Search for learners to attach exact records.</p>
          ) : results.map((learner) => (
            <label key={learner.id} className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2">
              <input
                type={mode === "multi" ? "checkbox" : "radio"}
                name={mode === "multi" ? `learner-${learner.id}` : "selected-learner"}
                checked={selectedSet.has(learner.id)}
                onChange={() => toggleLearner(learner)}
                aria-label={`Select ${learner.name}`}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-semibold text-foreground">{learner.name}</span>
                <span className="block text-xs text-muted">
                  {learner.admissionNumber}{learner.classLabel ? ` - ${learner.classLabel}` : ""}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActionPanel({
  action,
  saveState,
  dashboard,
  tenantSlug,
  onSubmit,
}: {
  action: TransportAction;
  saveState: SaveState;
  dashboard: TransportDashboard;
  tenantSlug?: string | null;
  onSubmit: (action: TransportAction, formData: FormData) => void;
}) {
  const saving = saveState === "saving";
  const [manifestStudentIds, setManifestStudentIds] = useState<string[]>([]);
  const [eventStudentIds, setEventStudentIds] = useState<string[]>([]);
  const titleMap: Record<TransportAction, string> = {
    route: "Route control",
    vehicle: "Vehicle readiness",
    manifest: "Learner manifests",
    trip: "Trip board",
    event: "Trip event",
    service: "Service log",
  };
  const missingRequiredSelection =
    (["manifest", "trip"].includes(action) && dashboard.routes.length === 0)
    || (["trip", "service"].includes(action) && dashboard.vehicles.length === 0)
    || (action === "event" && dashboard.trips.length === 0)
    || (action === "manifest" && manifestStudentIds.length === 0);

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Operations
          </p>
          <h3 className="mt-2 text-lg font-semibold text-foreground">{titleMap[action]}</h3>
        </div>
        <StatusPill label={saving ? "Posting" : "Ready"} tone={saving ? "warning" : "ok"} />
      </div>

      <form
        className="mt-5 grid gap-4 md:grid-cols-2"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          onSubmit(action, new FormData(event.currentTarget));
        }}
      >
        {action === "route" ? (
          <>
            <Field label="Route name">
              <input className={fieldClassName} name="name" placeholder="Eastlands AM" required />
            </Field>
            <Field label="Direction">
              <select className={fieldClassName} name="direction" defaultValue="morning">
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="round_trip">Round trip</option>
              </select>
            </Field>
            <Field label="Zone">
              <input className={fieldClassName} name="zone" placeholder="Eastlands" />
            </Field>
            <Field label="Stops">
              <input className={fieldClassName} name="stops" placeholder="Donholm, Umoja, Buruburu" />
            </Field>
          </>
        ) : null}

        {action === "vehicle" ? (
          <>
            <Field label="Registration">
              <input className={fieldClassName} name="registration_number" placeholder="KDA 123A" required />
            </Field>
            <Field label="Capacity">
              <input className={fieldClassName} name="capacity" placeholder="33" type="number" min="1" required />
            </Field>
            <Field label="Ownership">
              <select className={fieldClassName} name="ownership_type" defaultValue="school_owned">
                <option value="school_owned">School owned</option>
                <option value="leased">Leased</option>
                <option value="contracted">Contracted</option>
              </select>
            </Field>
            <Field label="Service due">
              <input className={fieldClassName} name="service_due_date" type="date" />
            </Field>
          </>
        ) : null}

        {action === "manifest" ? (
          <>
            <RecordSelect
              label="Route"
              name="route_id"
              rows={dashboard.routes}
              required
              emptyLabel="No transport routes loaded."
              getLabel={recordOptionLabel}
            />
            <LearnerLookupPicker
              tenantSlug={tenantSlug}
              mode="multi"
              selectedIds={manifestStudentIds}
              onSelectedIdsChange={setManifestStudentIds}
            />
            <Field label="Effective from">
              <input className={fieldClassName} name="effective_from" type="date" />
            </Field>
            <Field label="Effective to">
              <input className={fieldClassName} name="effective_to" type="date" />
            </Field>
          </>
        ) : null}

        {action === "trip" ? (
          <>
            <RecordSelect
              label="Route"
              name="route_id"
              rows={dashboard.routes}
              required
              emptyLabel="No transport routes loaded."
              getLabel={recordOptionLabel}
            />
            <RecordSelect
              label="Vehicle"
              name="vehicle_id"
              rows={dashboard.vehicles}
              required
              emptyLabel="No transport vehicles loaded."
              getLabel={recordOptionLabel}
            />
            <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3 text-sm font-semibold text-muted">
              Driver assignment will attach from the live driver roster when the transport dashboard exposes driver records.
            </div>
            <Field label="Trip date">
              <input className={fieldClassName} name="trip_date" type="date" />
            </Field>
          </>
        ) : null}

        {action === "event" ? (
          <>
            <RecordSelect
              label="Trip"
              name="trip_id"
              rows={dashboard.trips}
              required
              emptyLabel="No transport trips loaded."
              getLabel={recordOptionLabel}
            />
            <Field label="Event">
              <select className={fieldClassName} name="event_type" defaultValue="pickup">
                <option value="departed">Departed</option>
                <option value="pickup">Pickup</option>
                <option value="dropoff">Dropoff</option>
                <option value="delay">Delay</option>
                <option value="incident">Incident</option>
                <option value="arrived">Arrived</option>
              </select>
            </Field>
            <LearnerLookupPicker
              tenantSlug={tenantSlug}
              mode="single"
              selectedIds={eventStudentIds}
              onSelectedIdsChange={setEventStudentIds}
            />
            <Field label="Notes">
              <input className={fieldClassName} name="notes" placeholder="Boarded at Donholm" />
            </Field>
          </>
        ) : null}

        {action === "service" ? (
          <>
            <RecordSelect
              label="Vehicle"
              name="vehicle_id"
              rows={dashboard.vehicles}
              required
              emptyLabel="No transport vehicles loaded."
              getLabel={recordOptionLabel}
            />
            <Field label="Service date">
              <input className={fieldClassName} name="service_date" type="date" />
            </Field>
            <Field label="Next service">
              <input className={fieldClassName} name="next_service_date" type="date" />
            </Field>
            <Field label="Cost">
              <input className={fieldClassName} name="cost_minor" placeholder="0" type="number" min="0" />
            </Field>
          </>
        ) : null}

        <div className="md:col-span-2">
          {missingRequiredSelection ? (
            <p className="mb-3 text-sm font-semibold text-danger">
              Load or select the required transport records before posting this workflow.
            </p>
          ) : null}
          <Button type="submit" disabled={saving || missingRequiredSelection}>
            <CheckCircle2 className="h-4 w-4" />
            {saving ? "Posting..." : `Post ${titleMap[action].toLowerCase()}`}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function DataPanel({
  title,
  icon: Icon,
  rows,
  emptyLabel,
  renderRow,
}: {
  title: string;
  icon: typeof BusFront;
  rows: Array<{ id: string }>;
  emptyLabel: string;
  renderRow: (row: { id: string }) => React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-accent" />
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
        </div>
        <StatusPill label={`${rows.length}`} tone={rows.length > 0 ? "ok" : "warning"} />
      </div>
      <div className="mt-4 space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3 text-sm text-muted">
            {emptyLabel}
          </div>
        ) : (
          rows.slice(0, 5).map((row) => (
            <div key={row.id} className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3">
              {renderRow(row)}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

export function TransportModuleScreen({
  tenantSlug,
  initialDashboard,
}: {
  tenantSlug?: string | null;
  initialDashboard?: TransportDashboard;
}) {
  const [dashboard, setDashboard] = useState<TransportDashboard>(
    () => initialDashboard ?? emptyDashboard,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<TransportAction>("route");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const statTone = useMemo<StatusTone>(
    () => dashboard.open_alerts > 0 || dashboard.service_due_vehicles > 0 ? "warning" : "ok",
    [dashboard.open_alerts, dashboard.service_due_vehicles],
  );

  const refreshDashboard = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      const response = await fetch("/api/transport/dashboard", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Transport dashboard could not be loaded.");
      }

      const payload = await response.json().catch(() => ({}));
      setDashboard(normalizeDashboard(payload));
      setMessage("Live transport API connected");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Transport dashboard could not be loaded.");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const refreshTimer = window.setTimeout(() => {
      void refreshDashboard();
    }, 0);

    return () => window.clearTimeout(refreshTimer);
  }, [refreshDashboard]);

  async function postJson(path: string, body: Record<string, unknown>, method = "POST") {
    const csrfToken = await getCsrfToken();
    const response = await fetch(`/api/transport${path}`, {
      method,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...(csrfToken ? { "x-myshule-csrf": csrfToken } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error("Transport action was not accepted.");
    }

    return response.json().catch(() => ({}));
  }

  function formValue(formData: FormData, key: string) {
    return String(formData.get(key) ?? "").trim();
  }

  function buildPayload(action: TransportAction, formData: FormData) {
    if (action === "route") {
      const stops = formValue(formData, "stops")
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name, index) => ({ name, sequence: index + 1 }));

      return {
        path: "/routes",
        body: {
          name: formValue(formData, "name"),
          direction: formValue(formData, "direction"),
          zone: formValue(formData, "zone") || undefined,
          stops,
        },
      };
    }

    if (action === "vehicle") {
      return {
        path: "/vehicles",
        body: {
          registration_number: formValue(formData, "registration_number"),
          capacity: Number(formValue(formData, "capacity")),
          ownership_type: formValue(formData, "ownership_type"),
          service_due_date: formValue(formData, "service_due_date") || undefined,
        },
      };
    }

    if (action === "manifest") {
      return {
        path: "/manifests",
        body: {
          route_id: formValue(formData, "route_id"),
          student_ids: formValue(formData, "student_ids").split(",").map((item) => item.trim()).filter(Boolean),
          effective_from: formValue(formData, "effective_from") || undefined,
          effective_to: formValue(formData, "effective_to") || undefined,
        },
      };
    }

    if (action === "trip") {
      return {
        path: "/trips",
        body: {
          route_id: formValue(formData, "route_id"),
          vehicle_id: formValue(formData, "vehicle_id"),
          trip_date: formValue(formData, "trip_date") || undefined,
        },
      };
    }

    if (action === "event") {
      const tripId = formValue(formData, "trip_id");

      return {
        path: `/trips/${tripId}/events`,
        body: {
          event_type: formValue(formData, "event_type"),
          student_id: formValue(formData, "student_id") || undefined,
          notes: formValue(formData, "notes") || undefined,
        },
      };
    }

    const vehicleId = formValue(formData, "vehicle_id");

    return {
      path: `/vehicles/${vehicleId}/service-logs`,
      body: {
        service_date: formValue(formData, "service_date") || undefined,
        next_service_date: formValue(formData, "next_service_date") || undefined,
        cost_minor: Number(formValue(formData, "cost_minor") || 0),
      },
    };
  }

  async function submitAction(action: TransportAction, formData: FormData) {
    setSaveState("saving");
    setError(null);
    setMessage(null);

    try {
      const { path, body } = buildPayload(action, formData);
      await postJson(path, body);
      setMessage("Transport operation posted");
      await refreshDashboard();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Transport action was not accepted.");
    } finally {
      setSaveState("idle");
    }
  }

  async function resolveAlert(alertId: string) {
    setSaveState("saving");
    setError(null);

    try {
      await postJson(`/alerts/${alertId}/resolve`, {}, "PATCH");
      setMessage("Transport alert resolved");
      await refreshDashboard();
    } catch (alertError) {
      setError(alertError instanceof Error ? alertError.message : "Transport alert could not be resolved.");
    } finally {
      setSaveState("idle");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius)] border border-border bg-surface px-5 py-5 shadow-[0_18px_50px_rgba(2,6,23,0.24)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill label={message ?? (error ? "API attention" : "Transport")} tone={error ? "critical" : "ok"} />
              <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary">
          {tenantSlug || "school"}
              </span>
            </div>
            <h2 className="mt-4 text-2xl font-bold leading-tight text-foreground md:text-3xl">
              Transport operations
            </h2>
          </div>
          <Button variant="secondary" onClick={refreshDashboard} disabled={isRefreshing}>
            <RefreshCw className="h-4 w-4" />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
        {error ? (
          <div className="mt-4 rounded-[var(--radius-sm)] border border-danger/20 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
            {error}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Routes" value={dashboard.active_routes} helper="Active routes" icon={Route} />
        <StatCard label="Vehicles" value={dashboard.active_vehicles} helper="Fleet ready" icon={BusFront} />
        <StatCard label="Manifests" value={dashboard.active_manifests} helper="Learner lists" icon={Users} />
        <StatCard label="Trips today" value={dashboard.trips_today} helper="Trip records" icon={MapPinned} />
        <StatCard label="Alerts" value={dashboard.open_alerts} helper="Open alerts" icon={AlertTriangle} tone={statTone} />
        <StatCard label="Service" value={dashboard.service_due_vehicles} helper="Service due" icon={Wrench} tone={statTone} />
      </section>

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {(["route", "vehicle", "manifest", "trip", "event", "service"] as TransportAction[]).map((action) => (
          <button
            key={action}
            type="button"
            onClick={() => setActiveAction(action)}
            className={`rounded-[var(--radius-sm)] border px-4 py-3 text-left text-sm font-semibold transition ${
              activeAction === action
                ? "border-accent/30 bg-accent-soft text-accent"
                : "border-border bg-surface-muted text-foreground hover:border-accent/20"
            }`}
          >
            {formatStatus(action)}
          </button>
        ))}
      </section>

      <ActionPanel action={activeAction} saveState={saveState} dashboard={dashboard} tenantSlug={tenantSlug} onSubmit={submitAction} />

      <section className="grid gap-5 xl:grid-cols-2">
        <DataPanel
          title="Route control"
          icon={Route}
          rows={dashboard.routes}
          emptyLabel="No active transport routes."
          renderRow={(row) => {
            const route = row as TransportRouteRow;

            return (
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{route.name}</p>
                  <p className="mt-1 text-[13px] text-muted">
                    {formatStatus(route.direction)} - {route.active_stops ?? 0} stops - {route.learner_count ?? 0} learners
                  </p>
                </div>
                <StatusPill label={formatStatus(route.status)} tone={statusTone(route.status)} />
              </div>
            );
          }}
        />
        <DataPanel
          title="Vehicle readiness"
          icon={BusFront}
          rows={dashboard.vehicles}
          emptyLabel="No active transport vehicles."
          renderRow={(row) => {
            const vehicle = row as TransportVehicleRow;

            return (
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{vehicle.registration_number}</p>
                  <p className="mt-1 text-[13px] text-muted">
                    {vehicle.capacity ?? 0} seats - {formatStatus(vehicle.ownership_type)}
                  </p>
                </div>
                <StatusPill label={formatStatus(vehicle.service_status)} tone={statusTone(vehicle.service_status)} />
              </div>
            );
          }}
        />
        <DataPanel
          title="Learner manifests"
          icon={Users}
          rows={dashboard.manifests}
          emptyLabel="No active learner manifests."
          renderRow={(row) => {
            const manifest = row as TransportManifestRow;

            return (
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{manifest.route_name ?? "Route manifest"}</p>
                  <p className="mt-1 text-[13px] text-muted">{manifest.learner_count ?? 0} learners</p>
                </div>
                <StatusPill label={formatStatus(manifest.status)} tone={statusTone(manifest.status)} />
              </div>
            );
          }}
        />
        <DataPanel
          title="Trip board"
          icon={MapPinned}
          rows={dashboard.trips}
          emptyLabel="No trips have been started today."
          renderRow={(row) => {
            const trip = row as TransportTripRow;

            return (
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{trip.route_name ?? "Transport trip"}</p>
                  <p className="mt-1 text-[13px] text-muted">
                    {trip.vehicle_registration ?? "Vehicle pending"} - {trip.driver_name ?? "Driver pending"}
                  </p>
                </div>
                <StatusPill label={formatStatus(trip.status)} tone={statusTone(trip.status)} />
              </div>
            );
          }}
        />
      </section>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-accent" />
            <h3 className="text-base font-semibold text-foreground">Route alerts</h3>
          </div>
          <StatusPill label={`${dashboard.alerts.length}`} tone={dashboard.alerts.length > 0 ? "warning" : "ok"} />
        </div>
        <div className="mt-4 space-y-3">
          {dashboard.alerts.length === 0 ? (
            <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3 text-sm text-muted">
              No open transport alerts.
            </div>
          ) : dashboard.alerts.map((alert) => (
            <div key={alert.id} className="flex flex-col gap-3 rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{alert.title}</p>
                <p className="mt-1 text-[13px] text-muted">{alert.message ?? formatStatus(alert.status)}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill label={formatStatus(alert.severity)} tone={statusTone(alert.severity)} />
                <Button size="sm" variant="secondary" onClick={() => void resolveAlert(alert.id)} disabled={saveState === "saving"}>
                  Resolve
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
