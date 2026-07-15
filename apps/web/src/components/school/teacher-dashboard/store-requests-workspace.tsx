import { FormEvent, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Panel, RecordTable } from "./shared-components";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

type StoreRequestForm = {
  item: string;
  quantity: string;
  needed_by: string;
  priority: "normal" | "high" | "urgent";
  notes: string;
};

const emptyStoreRequestForm: StoreRequestForm = {
  item: "",
  quantity: "1",
  needed_by: "",
  priority: "normal",
  notes: "",
};

export function StoreRequestsWorkspace() {
  const liveSession = useLiveTenantSession("school");
  const [form, setForm] = useState<StoreRequestForm>(emptyStoreRequestForm);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["teacher-store-requests", liveSession.session?.tenantId],
    queryFn: () => requestDashboardApi<any>("/admin-command/teacher/store-requests", {
      tenantId: liveSession.session!.tenantId,
      accessToken: (liveSession.session as any)?.accessToken,
    }),
    enabled: !!liveSession.session,
  });
  const createRequest = useMutation({
    mutationFn: (payload: StoreRequestForm) =>
      requestDashboardApi<{ success: boolean; message?: string }>("/admin-command/teacher/store-requests", {
        method: "POST",
        tenantId: liveSession.session!.tenantId,
        accessToken: (liveSession.session as any)?.accessToken,
        body: {
          ...payload,
          quantity: Number(payload.quantity),
        },
      }),
    onSuccess: async () => {
      toast.success("Store request sent to the storekeeper queue.");
      setForm(emptyStoreRequestForm);
      setFormError(null);
      await refetch();
    },
    onError: () => {
      setFormError("Store request could not be sent. Check the item and quantity, then retry.");
      toast.error("Store request could not be sent.");
    },
  });

  const stats = data?.metrics || {};
  const rows = (data?.items || []).map((c: any) => [
      c.item,
      c.quantity,
      c.needed_by || "Not set",
      c.priority || "Normal",
      c.date,
      c.status
  ]);

  function updateField(field: keyof StoreRequestForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const item = form.item.trim();
    const quantity = Number(form.quantity);
    if (!item) {
      setFormError("Requested item is required.");
      return;
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setFormError("Quantity must be a positive whole number.");
      return;
    }
    if (!liveSession.session) {
      setFormError("Teacher session is not ready. Refresh and try again.");
      return;
    }
    setFormError(null);
    createRequest.mutate({
      ...form,
      item,
      quantity: String(quantity),
      notes: form.notes.trim(),
    });
  }

  return (
    <Panel title="Store Requests" description="Request supplies and track store requisitions." icon={ShoppingBag}>
      <form onSubmit={handleSubmit} className="mb-4 rounded-2xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
        <div className="mb-3">
          <h3 className="text-sm font-black uppercase tracking-[0.12em] text-[#071D49]">Request teaching materials</h3>
          <p className="mt-1 text-sm font-semibold text-[#64748B]">
            This sends a tenant-scoped requisition to the storekeeper queue and keeps the request visible here.
          </p>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1.4fr_0.6fr_0.8fr_0.8fr]">
          <label className="text-sm font-bold text-[#071D49]">
            Item
            <input
              name="item"
              value={form.item}
              onChange={(event) => updateField("item", event.target.value)}
              placeholder="e.g. exercise books"
              className="mt-1 w-full rounded-xl border border-[#D8E0EC] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-300"
            />
          </label>
          <label className="text-sm font-bold text-[#071D49]">
            Quantity
            <input
              name="quantity"
              type="number"
              min="1"
              value={form.quantity}
              onChange={(event) => updateField("quantity", event.target.value)}
              className="mt-1 w-full rounded-xl border border-[#D8E0EC] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-300"
            />
          </label>
          <label className="text-sm font-bold text-[#071D49]">
            Needed by
            <input
              name="needed_by"
              type="date"
              value={form.needed_by}
              onChange={(event) => updateField("needed_by", event.target.value)}
              className="mt-1 w-full rounded-xl border border-[#D8E0EC] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-300"
            />
          </label>
          <label className="text-sm font-bold text-[#071D49]">
            Priority
            <select
              name="priority"
              value={form.priority}
              onChange={(event) => updateField("priority", event.target.value)}
              className="mt-1 w-full rounded-xl border border-[#D8E0EC] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-300"
            >
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
        </div>
        <label className="mt-3 block text-sm font-bold text-[#071D49]">
          Reason or class use
          <textarea
            name="notes"
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            placeholder="Explain the class, subject, or activity needing the materials"
            className="mt-1 min-h-20 w-full rounded-xl border border-[#D8E0EC] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-300"
          />
        </label>
        {formError && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
            {formError}
          </div>
        )}
        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            disabled={createRequest.isPending || !liveSession.session}
            className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-[#0B2B6A] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createRequest.isPending ? "Sending..." : "Send store request"}
          </button>
        </div>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 mb-4">
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Pending</p>
          <p className="text-2xl font-black text-[#071D49]">{isLoading ? "..." : stats?.pending ?? 0}</p>
        </article>
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Fulfilled</p>
          <p className="text-2xl font-black text-[#071D49]">{isLoading ? "..." : stats?.fulfilled ?? 0}</p>
        </article>
      </div>
      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          Failed to load data. Please retry.
        </div>
      ) : (
        <RecordTable
          columns={["Item","Quantity","Needed By","Priority","Date","Status"]}
          rows={rows}
          emptyState={isLoading ? "Loading..." : "No store requests yet. Request teaching materials once inventory items are available."}
        />
      )}
    </Panel>
  );
}
