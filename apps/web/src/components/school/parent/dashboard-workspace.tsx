"use client";
import { RecordTable } from "@/components/ui/record-table";
import { LayoutDashboard } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type DashboardData = {
  metrics: Record<string, number>;
  items: any[];
};

export function DashboardWorkspace() {
  const { data, isLoading } = useSchoolQuery<DashboardData>("/admin-command/parent/dashboard");
  const items = data?.items || [];

  return (
    <section className="app-workspace-panel rounded-2xl border border-border bg-white p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
      <div className="mb-4 flex min-w-0 gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-info-soft text-info">
          <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-black tracking-[-0.01em] text-foreground">Parent Dashboard</h2>
          <p className="mt-1 text-sm leading-6 text-muted">Overview of your children's school activities.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="app-metric-card rounded-xl border border-border bg-primary-soft p-4">
          <div className="text-sm font-semibold text-muted">Children</div>
          <div className="mt-1 text-lg font-black text-foreground">{isLoading ? "..." : data?.metrics?.children ?? 0}</div>
        </div>
        <div className="app-metric-card rounded-xl border border-border bg-primary-soft p-4">
          <div className="text-sm font-semibold text-muted">Pending Fees</div>
          <div className="mt-1 text-lg font-black text-foreground">{isLoading ? "..." : data?.metrics?.pending_fees ?? 0}</div>
        </div>
        <div className="app-metric-card rounded-xl border border-border bg-primary-soft p-4">
          <div className="text-sm font-semibold text-muted">Notifications</div>
          <div className="mt-1 text-lg font-black text-foreground">{isLoading ? "..." : data?.metrics?.notifications ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold">Child</th>
              <th className="px-4 py-3 font-bold">Class</th>
              <th className="px-4 py-3 font-bold">Attendance</th>
              <th className="px-4 py-3 font-bold">Fee Balance</th>
              <th className="px-4 py-3 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">No school-scoped records are loaded for this workspace yet. Use the primary action, import, or connected setup workflow to create the first record.</td></tr>
            ) : (
              items.map((row: any, i: number) => (
                <tr key={row.id || i} className="border-t border-border hover:bg-surface-muted">
                  <td className="px-4 py-3 text-muted">{row.child_name}</td>
                  <td className="px-4 py-3 text-muted">{row.class_name}</td>
                  <td className="px-4 py-3 text-muted">{row.attendance}</td>
                  <td className="px-4 py-3 text-muted">{row.fee_balance}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold whitespace-nowrap">{row.status}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </RecordTable>
      </div>
    </section>
  );
}
