/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SuperadminPageHeader } from "@/components/platform/superadmin-pages";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { fetchPlatformPaymentGateways } from "@/lib/platform/school-onboarding-client";

export function PaymentGatewaysWorkspace() {
  const router = useRouter();
  const [gateways, setGateways] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("providers");
  const [isAddOpen, setIsAddOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setIsLoading(true);
      try {
        const liveRows = await fetchPlatformPaymentGateways();
        if (!cancelled) setGateways(liveRows);
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void loadData();
    return () => { cancelled = true; };
  }, [router]);

  const providerColumns: DataTableColumn<any>[] = [
    { id: "name", header: "Gateway", render: (row) => row.name },
    { id: "type", header: "Type", render: (row) => "M-Pesa Paybill" },
    { id: "environment", header: "Environment", render: (row) => "Production" },
    { id: "status", header: "Status", render: (row) => "Active" },
    { id: "actions", header: "Actions", render: (row) => <Button variant="ghost" size="sm">Edit</Button> }
  ];

  return (
    <div className="space-y-6">
      <SuperadminPageHeader 
        title="Payment Gateways" 
        description="Manage M-Pesa, Stripe, and bank integrations for all schools." 
      />
      <div className="space-y-4">
        <div className="flex gap-2 border-b">
          <button className={`px-4 py-2 border-b-2 ${activeTab === "providers" ? "border-primary font-semibold" : "border-transparent text-muted-foreground"}`} onClick={() => setActiveTab("providers")}>Gateway Providers</button>
          <button className={`px-4 py-2 border-b-2 ${activeTab === "mapping" ? "border-primary font-semibold" : "border-transparent text-muted-foreground"}`} onClick={() => setActiveTab("mapping")}>School Mappings</button>
          <button className={`px-4 py-2 border-b-2 ${activeTab === "callbacks" ? "border-primary font-semibold" : "border-transparent text-muted-foreground"}`} onClick={() => setActiveTab("callbacks")}>Callback Logs</button>
        </div>
        {activeTab === "providers" && <div className="pt-4 space-y-4">
          <div className="flex justify-end"><Button onClick={() => setIsAddOpen(true)}>Add Gateway</Button></div>
          <DataTable title="Configured Gateways" subtitle="Available endpoints." columns={providerColumns} rows={gateways} getRowKey={(row) => row.id} emptyMessage={isLoading ? "Loading..." : "No gateways found."} />
        </div>}
        {activeTab === "mapping" && <div className="pt-4">
          <DataTable title="School Gateway Mappings" subtitle="Which school uses which gateway." columns={[]} rows={[] as any[]} getRowKey={(row) => row.id} emptyMessage="No mappings found." />
        </div>}
        {activeTab === "callbacks" && <div className="pt-4">
          <DataTable title="Recent Callbacks" subtitle="IPN logs from payment providers." columns={[]} rows={[] as any[]} getRowKey={(row) => row.id} emptyMessage="No logs found." />
        </div>}
      </div>
      
      <Modal open={isAddOpen} title="Add Gateway" onClose={() => setIsAddOpen(false)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setIsAddOpen(false); }}>
          <label className="block space-y-1"><span className="text-sm font-semibold">Gateway Name</span><input className="input-base w-full" required /></label>
          <label className="block space-y-1"><span className="text-sm font-semibold">Type</span>
            <select className="input-base w-full"><option>M-Pesa Daraja</option><option>Stripe</option></select>
          </label>
          <label className="block space-y-1"><span className="text-sm font-semibold">Environment</span>
            <select className="input-base w-full"><option>Sandbox</option><option>Production</option></select>
          </label>
          <label className="block space-y-1"><span className="text-sm font-semibold">Shortcode / ID</span><input className="input-base w-full" required /></label>
          <label className="block space-y-1"><span className="text-sm font-semibold">Consumer Key</span><input type="password" className="input-base w-full" required /></label>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setIsAddOpen(false)} type="button">Cancel</Button>
            <Button type="submit">Save Gateway</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
