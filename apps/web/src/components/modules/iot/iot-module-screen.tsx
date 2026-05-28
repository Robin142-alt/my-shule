"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Activity, AlertTriangle, Cpu, KeyRound, RadioTower, RefreshCw, Send, ShieldCheck, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { getCsrfToken } from "@/lib/auth/csrf-client";
import type { StatusTone } from "@/lib/dashboard/types";

type IotDeviceRow = {
  id: string;
  name: string;
  device_type?: string;
  location_name?: string | null;
  status?: string;
  health_status?: string;
};

type IotReadingRow = {
  id: string;
  device_name?: string;
  metric_name?: string;
  metric_value?: number;
  unit?: string | null;
  severity?: string;
};

type IotCommandRow = {
  id: string;
  device_name?: string;
  command_type?: string;
  priority?: string;
  status?: string;
};

type IotAlertRow = {
  id: string;
  device_name?: string | null;
  title: string;
  message?: string;
  severity?: "info" | "warning" | "critical";
  status?: string;
};

export type IotDashboard = {
  registered_devices: number;
  online_devices: number;
  offline_devices: number;
  open_alerts: number;
  commands_pending: number;
  readings_today: number;
  gateway_credentials: number;
  gateway_ingestions_today: number;
  devices: IotDeviceRow[];
  readings: IotReadingRow[];
  commands: IotCommandRow[];
  alerts: IotAlertRow[];
};

type IotAction = "device" | "telemetry" | "command" | "credential";

type IssuedCredential = {
  id?: string;
  device_id?: string;
  key_id?: string;
  secret?: string;
  expires_at?: string | null;
};

const emptyDashboard: IotDashboard = {
  registered_devices: 0,
  online_devices: 0,
  offline_devices: 0,
  open_alerts: 0,
  commands_pending: 0,
  readings_today: 0,
  gateway_credentials: 0,
  gateway_ingestions_today: 0,
  devices: [],
  readings: [],
  commands: [],
  alerts: [],
};

const fieldClassName =
  "w-full rounded-[var(--radius-sm)] border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent/50 focus:shadow-[var(--shadow-focus)]";

function normalizeDashboard(payload: unknown): IotDashboard {
  const source = payload && typeof payload === "object" && "data" in payload
    ? (payload as { data?: unknown }).data
    : payload;
  const value = source && typeof source === "object" ? source as Partial<IotDashboard> : {};

  return {
    ...emptyDashboard,
    ...value,
    devices: Array.isArray(value.devices) ? value.devices : [],
    readings: Array.isArray(value.readings) ? value.readings : [],
    commands: Array.isArray(value.commands) ? value.commands : [],
    alerts: Array.isArray(value.alerts) ? value.alerts : [],
  };
}

function formatStatus(value: string | undefined) {
  return (value ?? "pending").replaceAll("_", " ");
}

function toneFor(value: string | undefined): StatusTone {
  if (["critical", "offline", "failed"].includes(value ?? "")) {
    return "critical";
  }

  if (["warning", "maintenance", "queued", "sent", "open"].includes(value ?? "")) {
    return "warning";
  }

  return "ok";
}

function formValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </span>
      {children}
    </label>
  );
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
  icon: typeof Cpu;
  tone?: StatusTone;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
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

function DataPanel<T extends { id: string }>({
  title,
  icon: Icon,
  rows,
  emptyLabel,
  renderRow,
}: {
  title: string;
  icon: typeof Cpu;
  rows: T[];
  emptyLabel: string;
  renderRow: (row: T) => React.ReactNode;
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
        ) : rows.slice(0, 6).map((row) => (
          <div key={row.id} className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3">
            {renderRow(row)}
          </div>
        ))}
      </div>
    </Card>
  );
}

function ActionPanel({
  action,
  saving,
  onSubmit,
}: {
  action: IotAction;
  saving: boolean;
  onSubmit: (action: IotAction, formData: FormData) => void;
}) {
  const titleMap: Record<IotAction, string> = {
    device: "Device registry",
    telemetry: "Telemetry stream",
    command: "Command center",
    credential: "Gateway credentials",
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Smart campus
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
        {action === "device" ? (
          <>
            <Field label="Device name">
              <input className={fieldClassName} name="name" placeholder="Smart meter A1" required />
            </Field>
            <Field label="Device type">
              <select className={fieldClassName} name="device_type" defaultValue="smart_meter">
                <option value="smart_meter">Smart meter</option>
                <option value="gate_scanner">Gate scanner</option>
                <option value="gps_tracker">GPS tracker</option>
                <option value="lab_sensor">Lab sensor</option>
                <option value="biometric_device">Biometric device</option>
              </select>
            </Field>
            <Field label="Location">
              <input className={fieldClassName} name="location_name" placeholder="Administration block" />
            </Field>
            <Field label="External id">
              <input className={fieldClassName} name="external_device_id" placeholder="meter-a1" />
            </Field>
          </>
        ) : null}

        {action === "telemetry" ? (
          <>
            <Field label="Device id">
              <input className={fieldClassName} name="device_id" placeholder="device uuid" required />
            </Field>
            <Field label="Metric">
              <input className={fieldClassName} name="metric_name" placeholder="power_kw" required />
            </Field>
            <Field label="Value">
              <input className={fieldClassName} name="metric_value" type="number" step="0.01" placeholder="8.4" required />
            </Field>
            <Field label="Unit">
              <input className={fieldClassName} name="unit" placeholder="kw" />
            </Field>
            <Field label="Severity">
              <select className={fieldClassName} name="severity" defaultValue="normal">
                <option value="normal">Normal</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </Field>
          </>
        ) : null}

        {action === "command" ? (
          <>
            <Field label="Device id">
              <input className={fieldClassName} name="device_id" placeholder="device uuid" required />
            </Field>
            <Field label="Command">
              <select className={fieldClassName} name="command_type" defaultValue="sync">
                <option value="sync">Sync</option>
                <option value="restart">Restart</option>
                <option value="calibrate">Calibrate</option>
                <option value="test_signal">Test signal</option>
                <option value="lock">Lock</option>
                <option value="unlock">Unlock</option>
              </select>
            </Field>
            <Field label="Priority">
              <select className={fieldClassName} name="priority" defaultValue="normal">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </Field>
            <Field label="Reason">
              <input className={fieldClassName} name="reason" placeholder="Manual refresh" />
            </Field>
          </>
        ) : null}

        {action === "credential" ? (
          <>
            <Field label="Device id">
              <input className={fieldClassName} name="device_id" placeholder="device uuid" required />
            </Field>
            <Field label="Credential label">
              <input className={fieldClassName} name="label" placeholder="Gate gateway" />
            </Field>
            <Field label="Expires at">
              <input className={fieldClassName} name="expires_at" type="datetime-local" />
            </Field>
            <div className="rounded-[var(--radius-sm)] border border-accent/20 bg-accent-soft px-4 py-3 text-sm font-semibold text-accent">
              Device gateway
            </div>
          </>
        ) : null}

        <div className="md:col-span-2">
          <Button type="submit" disabled={saving}>
            <Send className="h-4 w-4" />
            {saving ? "Posting..." : `Post ${titleMap[action].toLowerCase()}`}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function IotModuleScreen({
  tenantSlug,
  initialDashboard,
}: {
  tenantSlug?: string | null;
  initialDashboard?: IotDashboard;
}) {
  const [dashboard, setDashboard] = useState<IotDashboard>(() => initialDashboard ?? emptyDashboard);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<IotAction>("device");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [issuedCredential, setIssuedCredential] = useState<IssuedCredential | null>(null);
  const attentionTone = useMemo<StatusTone>(
    () => dashboard.open_alerts > 0 || dashboard.offline_devices > 0 ? "warning" : "ok",
    [dashboard.offline_devices, dashboard.open_alerts],
  );

  const refreshDashboard = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      const response = await fetch("/api/iot/dashboard", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("IoT dashboard could not be loaded.");
      }

      const payload = await response.json().catch(() => ({}));
      setDashboard(normalizeDashboard(payload));
      setMessage("Live IoT API connected");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "IoT dashboard could not be loaded.");
    } finally {
      setRefreshing(false);
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
    const response = await fetch(`/api/iot${path}`, {
      method,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...(csrfToken ? { "x-myshule-csrf": csrfToken } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error("IoT action was not accepted.");
    }

    return response.json().catch(() => ({}));
  }

  function buildPayload(action: IotAction, formData: FormData) {
    if (action === "device") {
      return {
        path: "/devices",
        body: {
          name: formValue(formData, "name"),
          device_type: formValue(formData, "device_type"),
          location_name: formValue(formData, "location_name") || undefined,
          external_device_id: formValue(formData, "external_device_id") || undefined,
        },
      };
    }

    if (action === "telemetry") {
      return {
        path: "/telemetry",
        body: {
          device_id: formValue(formData, "device_id"),
          metric_name: formValue(formData, "metric_name"),
          metric_value: Number(formValue(formData, "metric_value")),
          unit: formValue(formData, "unit") || undefined,
          severity: formValue(formData, "severity") || "normal",
        },
      };
    }

    return {
      path: "/commands",
      body: {
        device_id: formValue(formData, "device_id"),
        command_type: formValue(formData, "command_type"),
        priority: formValue(formData, "priority") || "normal",
        payload: { reason: formValue(formData, "reason") || "manual" },
      },
    };
  }

  function buildCredentialPayload(formData: FormData) {
    const deviceId = formValue(formData, "device_id");

    return {
      path: `/devices/${encodeURIComponent(deviceId)}/credentials`,
      body: {
        label: formValue(formData, "label") || undefined,
        expires_at: formValue(formData, "expires_at") || undefined,
      },
    };
  }

  async function submitAction(action: IotAction, formData: FormData) {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const { path, body } = action === "credential"
        ? buildCredentialPayload(formData)
        : buildPayload(action, formData);
      const payload = await postJson(path, body);
      const issued = payload && typeof payload === "object" && "data" in payload
        ? (payload as { data?: IssuedCredential }).data
        : payload as IssuedCredential;

      if (action === "credential") {
        setIssuedCredential(issued ?? null);
      }

      setMessage("IoT operation posted");
      await refreshDashboard();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "IoT action was not accepted.");
    } finally {
      setSaving(false);
    }
  }

  async function resolveAlert(alertId: string) {
    setSaving(true);
    setError(null);

    try {
      await postJson(`/alerts/${alertId}/resolve`, {}, "PATCH");
      setMessage("IoT alert resolved");
      await refreshDashboard();
    } catch (alertError) {
      setError(alertError instanceof Error ? alertError.message : "IoT alert could not be resolved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius)] border border-border bg-surface px-5 py-5 shadow-[0_18px_50px_rgba(2,6,23,0.24)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill label={message ?? (error ? "API attention" : "IoT")} tone={error ? "critical" : "ok"} />
              <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary">
          {tenantSlug || "school"}
              </span>
            </div>
            <h2 className="mt-4 text-2xl font-bold leading-tight text-foreground md:text-3xl">
              IoT and Smart Campus
            </h2>
            <p className="mt-2 text-sm font-semibold text-accent">
              Device gateway - Command delivery
            </p>
          </div>
          <Button variant="secondary" onClick={refreshDashboard} disabled={refreshing}>
            <RefreshCw className="h-4 w-4" />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
        {error ? (
          <div className="mt-4 rounded-[var(--radius-sm)] border border-danger/20 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
            {error}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        <StatCard label="Devices" value={dashboard.registered_devices} helper="Registered" icon={Cpu} />
        <StatCard label="Online" value={dashboard.online_devices} helper="Reporting now" icon={RadioTower} />
        <StatCard label="Offline" value={dashboard.offline_devices} helper="Needs attention" icon={AlertTriangle} tone={attentionTone} />
        <StatCard label="Readings" value={dashboard.readings_today} helper="Today" icon={Activity} />
        <StatCard label="Commands" value={dashboard.commands_pending} helper="Pending" icon={Send} tone={dashboard.commands_pending > 0 ? "warning" : "ok"} />
        <StatCard label="Alerts" value={dashboard.open_alerts} helper="Open" icon={ShieldCheck} tone={attentionTone} />
        <StatCard label="Gateway" value={dashboard.gateway_credentials} helper="Credentials" icon={KeyRound} />
        <StatCard label="Ingestions" value={dashboard.gateway_ingestions_today} helper="Today" icon={RadioTower} />
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {(["device", "telemetry", "command", "credential"] as IotAction[]).map((action) => (
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
            {action === "device"
              ? "Device registry"
              : action === "telemetry"
                ? "Telemetry stream"
                : action === "command"
                  ? "Command center"
                  : "Gateway credentials"}
          </button>
        ))}
      </section>

      <ActionPanel action={activeAction} saving={saving} onSubmit={submitAction} />

      {issuedCredential ? (
        <Card className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-accent" />
                <h3 className="text-base font-semibold text-foreground">Device gateway credential</h3>
              </div>
              <p className="mt-2 text-sm text-muted">{issuedCredential.key_id ?? "New gateway key"}</p>
            </div>
            <StatusPill label="visible once" tone="warning" />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Key id</p>
              <p className="mt-2 break-all font-mono text-sm text-foreground">{issuedCredential.key_id ?? "-"}</p>
            </div>
            <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Device token</p>
              <p className="mt-2 break-all font-mono text-sm text-foreground">{issuedCredential.secret ?? "-"}</p>
            </div>
          </div>
        </Card>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-3">
        <DataPanel
          title="Device registry"
          icon={Cpu}
          rows={dashboard.devices}
          emptyLabel="No IoT devices registered."
          renderRow={(device) => (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{device.name}</p>
                <p className="mt-1 text-[13px] text-muted">
                  {formatStatus(device.device_type)} - {device.location_name ?? "No location"}
                </p>
              </div>
              <StatusPill label={formatStatus(device.health_status ?? device.status)} tone={toneFor(device.health_status ?? device.status)} />
            </div>
          )}
        />
        <DataPanel
          title="Telemetry stream"
          icon={Zap}
          rows={dashboard.readings}
          emptyLabel="No telemetry readings yet."
          renderRow={(reading) => (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{reading.device_name ?? "Device reading"}</p>
                <p className="mt-1 text-[13px] text-muted">
                  {reading.metric_name}: {reading.metric_value ?? 0}{reading.unit ? ` ${reading.unit}` : ""}
                </p>
              </div>
              <StatusPill label={formatStatus(reading.severity)} tone={toneFor(reading.severity)} />
            </div>
          )}
        />
        <DataPanel
          title="Command center"
          icon={Send}
          rows={dashboard.commands}
          emptyLabel="No device commands queued."
          renderRow={(command) => (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{command.device_name ?? "Device command"}</p>
                <p className="mt-1 text-[13px] text-muted">{formatStatus(command.command_type)}</p>
              </div>
              <StatusPill label={formatStatus(command.status)} tone={toneFor(command.status)} />
            </div>
          )}
        />
      </section>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-accent" />
            <h3 className="text-base font-semibold text-foreground">Smart campus alerts</h3>
          </div>
          <StatusPill label={`${dashboard.alerts.length}`} tone={dashboard.alerts.length > 0 ? "warning" : "ok"} />
        </div>
        <div className="mt-4 space-y-3">
          {dashboard.alerts.length === 0 ? (
            <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3 text-sm text-muted">
              No open IoT alerts.
            </div>
          ) : dashboard.alerts.map((alert) => (
            <div key={alert.id} className="flex flex-col gap-3 rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{alert.title}</p>
                <p className="mt-1 text-[13px] text-muted">
                  {alert.device_name ?? "Smart campus"} - {alert.message ?? formatStatus(alert.status)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill label={formatStatus(alert.severity)} tone={toneFor(alert.severity)} />
                <Button size="sm" variant="secondary" onClick={() => void resolveAlert(alert.id)} disabled={saving}>
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
