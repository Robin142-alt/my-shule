"use client";

import { RecordTable } from "@/components/ui/record-table";

import { Activity, ClipboardCheck, HeartPulse, ShieldCheck, UsersRound } from "lucide-react";

import { Card } from "@/components/ui/card";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { WorkspaceQueryFailure } from "../workspace-query-failure";

type VisitorOversightData = {
  status: "active" | "setup_required";
  metrics: {
    checkedInToday: number;
    currentlyOnPremises: number;
    checkedOutToday: number;
    flagged: number;
  };
  visitors: Array<{
    id: string;
    name: string;
    purpose: string;
    host: string;
    checkedInAt: string;
    checkedOutAt: string | null;
    status: string;
  }>;
};

type HealthOversightData = {
  status: "active" | "setup_required";
  metrics: {
    visitsToday: number;
    openCases: number;
    referredToday: number;
    lowStockMedicines: number;
    outOfStockMedicines: number;
    expiringSoon: number;
  };
  stockAlerts: Array<{
    id: string;
    medicine: string;
    quantity: number;
    reorderLevel: number;
    expiryDate: string | null;
    status: string;
  }>;
};

type AuditOversightData = {
  status: "active" | "setup_required";
  metrics: {
    actionsToday: number;
    sensitiveChanges: number;
    failedActions: number;
  };
  events: Array<{
    id: string;
    action: string;
    actor: string;
    resourceType: string;
    createdAt: string;
    result: string;
  }>;
};

function OversightMetric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="border-white/10 bg-white/5 p-4 text-white">
      <p className="text-sm font-semibold text-white/65">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </Card>
  );
}

function LoadingOversight({ label }: { label: string }) {
  return (
    <section aria-label={label} className="space-y-4">
      <div className="h-20 animate-pulse rounded-xl border border-white/10 bg-white/5" />
      <div className="h-56 animate-pulse rounded-xl border border-white/10 bg-white/5" />
    </section>
  );
}

function WorkspaceHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Activity;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="rounded-xl border border-cyan-200/25 bg-cyan-200/10 p-2 text-cyan-100">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <h2 className="text-2xl font-black text-white">{title}</h2>
        <p className="mt-1 text-sm font-semibold text-white/65">{description}</p>
      </div>
    </div>
  );
}

export function PrincipalVisitorsOversightWorkspace() {
  const { data, error, isLoading, refetch } = useSchoolQuery<VisitorOversightData>(
    "/admin-command/principal/visitors",
  );

  if (isLoading) return <LoadingOversight label="Principal visitors workspace" />;
  if (error || !data) {
    return (
      <section aria-label="Principal visitors workspace">
        <WorkspaceQueryFailure
          title="Visitor oversight could not be loaded"
          error={error ?? new Error("The Principal visitor contract returned no data")}
          onRetry={() => void refetch()}
        />
      </section>
    );
  }

  return (
    <section aria-label="Principal visitors workspace" className="space-y-5">
      <WorkspaceHeading
        icon={UsersRound}
        title="Parents & Visitors"
        description="Tenant-scoped reception and gate movement. Contact details and identity numbers remain with authorized front-office staff."
      />
      <div className="app-metric-grid grid gap-3 md:grid-cols-4">
        <OversightMetric label="Checked in today" value={data.metrics.checkedInToday} />
        <OversightMetric label="On premises" value={data.metrics.currentlyOnPremises} />
        <OversightMetric label="Checked out today" value={data.metrics.checkedOutToday} />
        <OversightMetric label="Flagged visits" value={data.metrics.flagged} />
      </div>
      {data.visitors.length === 0 ? (
        <Card className="border-white/10 bg-white/5 p-5 text-white">
          <p className="font-black">No visitor movement recorded yet today.</p>
          <p className="mt-2 text-sm font-semibold text-white/65">
            Secretary or Security staff can register the first visitor; the verified movement will appear here automatically.
          </p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <RecordTable className="app-record-table-dark w-full min-w-[720px] text-left text-sm text-white">
            <thead className="bg-white/10 text-cyan-100">
              <tr>
                <th className="px-4 py-3 font-black">Visitor</th>
                <th className="px-4 py-3 font-black">Purpose</th>
                <th className="px-4 py-3 font-black">Host</th>
                <th className="px-4 py-3 font-black">Checked in</th>
                <th className="px-4 py-3 font-black">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.visitors.map((visitor) => (
                <tr key={visitor.id} className="border-t border-white/10">
                  <td className="px-4 py-3 font-bold">{visitor.name}</td>
                  <td className="px-4 py-3 text-white/70">{visitor.purpose}</td>
                  <td className="px-4 py-3 text-white/70">{visitor.host || "Not assigned"}</td>
                  <td className="px-4 py-3 text-white/70">{visitor.checkedInAt}</td>
                  <td className="px-4 py-3 font-bold">{visitor.status}</td>
                </tr>
              ))}
            </tbody>
          </RecordTable>
        </div>
      )}
    </section>
  );
}

export function PrincipalHealthOversightWorkspace() {
  const { data, error, isLoading, refetch } = useSchoolQuery<HealthOversightData>(
    "/admin-command/principal/health",
  );

  if (isLoading) return <LoadingOversight label="Principal sick bay workspace" />;
  if (error || !data) {
    return (
      <section aria-label="Principal sick bay workspace">
        <WorkspaceQueryFailure
          title="Health oversight could not be loaded"
          error={error ?? new Error("The Principal health contract returned no data")}
          onRetry={() => void refetch()}
        />
      </section>
    );
  }

  return (
    <section aria-label="Principal sick bay workspace" className="space-y-5">
      <WorkspaceHeading
        icon={HeartPulse}
        title="Sick Bay"
        description="Summary-only clinic oversight. Diagnoses, confidential notes, and individual treatment details stay restricted to authorized health staff."
      />
      <div className="app-metric-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <OversightMetric label="Visits today" value={data.metrics.visitsToday} />
        <OversightMetric label="Open cases" value={data.metrics.openCases} />
        <OversightMetric label="Referred today" value={data.metrics.referredToday} />
        <OversightMetric label="Low stock" value={data.metrics.lowStockMedicines} />
        <OversightMetric label="Out of stock" value={data.metrics.outOfStockMedicines} />
        <OversightMetric label="Expiring soon" value={data.metrics.expiringSoon} />
      </div>
      {data.stockAlerts.length === 0 ? (
        <Card className="border-white/10 bg-white/5 p-5 text-white">
          <p className="font-black">No medicine stock alerts.</p>
          <p className="mt-2 text-sm font-semibold text-white/65">
            The nurse inventory currently has no low-stock, out-of-stock, or near-expiry item requiring leadership follow-up.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.stockAlerts.map((alert) => (
            <Card key={alert.id} className="border-white/10 bg-white/5 p-4 text-white">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-black">{alert.medicine}</p>
                  <p className="mt-1 text-sm font-semibold text-white/65">
                    {alert.quantity} available; reorder level {alert.reorderLevel}
                    {alert.expiryDate ? `; earliest expiry ${alert.expiryDate}` : ""}
                  </p>
                </div>
                <span className="rounded-full border border-amber-200/30 bg-amber-200/10 px-3 py-1 text-xs font-black text-amber-100">
                  {alert.status}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

export function PrincipalAuditOversightWorkspace() {
  const { data, error, isLoading, refetch } = useSchoolQuery<AuditOversightData>(
    "/admin-command/principal/audit-logs",
  );

  if (isLoading) return <LoadingOversight label="Principal audit logs workspace" />;
  if (error || !data) {
    return (
      <section aria-label="Principal audit logs workspace">
        <WorkspaceQueryFailure
          title="Audit oversight could not be loaded"
          error={error ?? new Error("The Principal audit contract returned no data")}
          onRetry={() => void refetch()}
        />
      </section>
    );
  }

  return (
    <section aria-label="Principal audit logs workspace" className="space-y-5">
      <WorkspaceHeading
        icon={ClipboardCheck}
        title="Audit Logs"
        description="Recent tenant-scoped actions for accountability, security follow-up, and governed workflow review."
      />
      <div className="app-metric-grid grid gap-3 md:grid-cols-3">
        <OversightMetric label="Actions today" value={data.metrics.actionsToday} />
        <OversightMetric label="Sensitive changes" value={data.metrics.sensitiveChanges} />
        <OversightMetric label="Failed actions" value={data.metrics.failedActions} />
      </div>
      {data.events.length === 0 ? (
        <Card className="border-white/10 bg-white/5 p-5 text-white">
          <p className="font-black">No audit events recorded for this school yet.</p>
          <p className="mt-2 text-sm font-semibold text-white/65">
            Audited mutations and governed workflow decisions will appear here after the first school operation is completed.
          </p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <RecordTable className="app-record-table-dark w-full min-w-[760px] text-left text-sm text-white">
            <thead className="bg-white/10 text-cyan-100">
              <tr>
                <th className="px-4 py-3 font-black">Time</th>
                <th className="px-4 py-3 font-black">Actor</th>
                <th className="px-4 py-3 font-black">Action</th>
                <th className="px-4 py-3 font-black">Resource</th>
                <th className="px-4 py-3 font-black">Result</th>
              </tr>
            </thead>
            <tbody>
              {data.events.map((event) => (
                <tr key={event.id} className="border-t border-white/10">
                  <td className="px-4 py-3 text-white/70">{event.createdAt}</td>
                  <td className="px-4 py-3 text-white/70">{event.actor}</td>
                  <td className="px-4 py-3 font-bold">{event.action}</td>
                  <td className="px-4 py-3 text-white/70">{event.resourceType}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 font-bold">
                      <ShieldCheck className="h-4 w-4 text-cyan-200" aria-hidden="true" />
                      {event.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </RecordTable>
        </div>
      )}
    </section>
  );
}
