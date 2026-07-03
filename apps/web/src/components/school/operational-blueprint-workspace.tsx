"use client";
import { AlertTriangle, FileText, ListChecks, Map, Printer, RefreshCw, ShieldCheck } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import type { ExtremeErpBlueprint } from "@/lib/operational/extreme-erp-blueprints";

type OperationalBlueprintData = {
  metrics: Record<string, number>;
  items: any[];
};

export function OperationalBlueprintWorkspace({ blueprint }: { blueprint?: ExtremeErpBlueprint }) {
  const { data, isLoading } = useSchoolQuery<OperationalBlueprintData>("/admin-command/school/operational-blueprint");
  const items = data?.items || [];

  if (blueprint) {
    return (
      <section className="space-y-5 rounded-2xl border border-[#D8E0EC] bg-white p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
        <div className="flex min-w-0 gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EEF5FF] text-[#1D4ED8]">
            <Map className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-black tracking-[-0.01em] text-[#071D49]">{blueprint.title}</h2>
            <p className="mt-1 text-sm leading-6 text-[#64748B]">{blueprint.commandQuestion}</p>
            <p className="mt-2 text-sm leading-6 text-[#64748B]">{blueprint.roleFocus}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {blueprint.urgentActions.map((action) => (
            <button
              key={action}
              type="button"
              className="rounded-xl border border-[#BFD7FF] bg-[#EEF5FF] px-3 py-2 text-sm font-black text-[#1D4ED8]"
            >
              {action}
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {blueprint.queues.map((queue) => (
            <article key={queue.id} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
              <div className="flex items-start gap-3">
                <ListChecks className="mt-1 h-5 w-5 text-[#1D4ED8]" aria-hidden="true" />
                <div>
                  <h3 className="font-black text-[#071D49]">{queue.title}</h3>
                  <p className="mt-1 text-sm text-[#64748B]">Owner: {queue.owner}</p>
                  <p className="mt-1 text-sm text-[#64748B]">Workflow: {queue.workflow}</p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-[#1D4ED8]">{queue.auditEvent}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {queue.actions.map((action) => (
                  <span key={action} className="rounded-full border border-[#D8E0EC] bg-white px-3 py-1 text-xs font-bold text-[#071D49]">
                    {action}
                  </span>
                ))}
              </div>
            </article>
          ))}

          {blueprint.forms.map((form) => (
            <article key={form.id} className="rounded-xl border border-[#D8E0EC] bg-white p-4">
              <div className="flex items-start gap-3">
                <FileText className="mt-1 h-5 w-5 text-[#1D4ED8]" aria-hidden="true" />
                <div>
                  <h3 className="font-black text-[#071D49]">{form.title}</h3>
                  <p className="mt-1 text-sm text-[#64748B]">{form.purpose}</p>
                  <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">{form.auditAction}</p>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {form.fields.map((field) => (
                  <label key={field} className="text-xs font-bold uppercase tracking-[0.12em] text-[#64748B]">
                    {field}
                    <input className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm normal-case tracking-normal" placeholder={field} />
                  </label>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {form.footerActions.map((action) => (
                  <button key={action} type="button" className="rounded-lg border border-[#D8E0EC] bg-[#F8FAFC] px-3 py-2 text-xs font-black text-[#071D49]">
                    {action}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-[#F8FAFC] text-[#071D49]">
              <tr>
                <th className="px-4 py-3 font-bold">Table</th>
                <th className="px-4 py-3 font-bold">Columns</th>
                <th className="px-4 py-3 font-bold">Row actions</th>
                <th className="px-4 py-3 font-bold">Bulk actions</th>
              </tr>
            </thead>
            <tbody>
              {blueprint.tables.map((table) => (
                <tr key={table.id} className="border-t border-[#D8E0EC]">
                  <td className="px-4 py-3 font-bold text-[#071D49]">{table.title}</td>
                  <td className="px-4 py-3 text-[#64748B]">{table.columns.join(", ")}</td>
                  <td className="px-4 py-3 text-[#64748B]">{table.rowActions.join(", ")}</td>
                  <td className="px-4 py-3 text-[#64748B]">{table.bulkActions.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
            <div className="flex items-center gap-2 text-sm font-black text-[#071D49]">
              <Printer className="h-4 w-4" aria-hidden="true" />
              Print outputs
            </div>
            <p className="mt-2 text-sm text-[#64748B]">{blueprint.printOutputs.join(", ")}</p>
          </div>
          <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
            <div className="flex items-center gap-2 text-sm font-black text-[#071D49]">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Permission checks
            </div>
            <p className="mt-2 text-sm text-[#64748B]">actor, tenant, capability, workflow, events</p>
          </div>
          <div className="rounded-xl border border-[#D8E0EC] bg-[#FFF7ED] p-4">
            <div className="flex items-center gap-2 text-sm font-black text-[#9A3412]">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              {blueprint.states.join(" ")}
            </div>
            <p className="mt-2 text-sm text-[#9A3412]">Right details drawer. Low-bandwidth recovery.</p>
            <button
              type="button"
              aria-label="Retry Print"
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#FDBA74] bg-white px-3 py-2 text-xs font-black text-[#9A3412]"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Retry failed print job
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 text-sm font-semibold text-[#64748B]">
          {blueprint.sampleData.join(" | ")}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[#D8E0EC] bg-white p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
      <div className="mb-4 flex min-w-0 gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EEF5FF] text-[#1D4ED8]">
          <Map className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-black tracking-[-0.01em] text-[#071D49]">Operational Blueprint</h2>
          <p className="mt-1 text-sm leading-6 text-[#64748B]">View and manage the school operational blueprint.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Active Modules</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.active_modules ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Pending Setup</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.pending_setup ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Module</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold">Owner</th>
              <th className="px-4 py-3 font-bold">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[#64748B]">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[#64748B]">No records found. Create the first entry to get started.</td></tr>
            ) : (
              items.map((row: any, i: number) => (
                <tr key={row.id || i} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{row.module_name}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold whitespace-nowrap">{row.status}</span></td>
                  <td className="px-4 py-3 text-[#64748B]">{row.owner}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.updated_at}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
