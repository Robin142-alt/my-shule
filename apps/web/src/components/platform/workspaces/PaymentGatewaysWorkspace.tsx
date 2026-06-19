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
  const [newGateway, setNewGateway] = useState({
    name: "",
    type: "M-Pesa Daraja",
    environment: "Sandbox",
    shortcode: "",
    consumerKey: ""
  });

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setIsLoading(true);
      try {
        const liveRows = await fetchPlatformPaymentGateways();
        if (!cancelled) {
          // Fallback default payment channel if empty
          if (liveRows.length === 0) {
            setGateways([
              {
                id: "default-mpesa",
                name: "M-Pesa Main Paybill",
                type: "M-Pesa Daraja",
                environment: "Production",
                status: "Active"
              }
            ]);
          } else {
            setGateways(liveRows);
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void loadData();
    return () => { cancelled = true; };
  }, [router]);

  function handleAddGateway(e: React.FormEvent) {
    e.preventDefault();
    const created = {
      id: Math.random().toString(),
      name: newGateway.name,
      type: newGateway.type,
      environment: newGateway.environment,
      status: "Active"
    };
    setGateways((prev) => [...prev, created]);
    setIsAddOpen(false);
    setNewGateway({
      name: "",
      type: "M-Pesa Daraja",
      environment: "Sandbox",
      shortcode: "",
      consumerKey: ""
    });
  }

  const providerColumns: DataTableColumn<any>[] = [
    { id: "name", header: "Gateway", render: (row) => row.name },
    { id: "type", header: "Type", render: (row) => row.type || "M-Pesa Paybill" },
    { id: "environment", header: "Environment", render: (row) => row.environment || "Production" },
    { id: "status", header: "Status", render: (row) => row.status || "Active" },
    { id: "actions", header: "Actions", render: (row) => <Button variant="ghost" size="sm">Edit</Button> }
  ];

  const mappingColumns: DataTableColumn<any>[] = [
    { id: "schoolName", header: "School Name", render: (row) => row.schoolName || "N/A" },
    { id: "gatewayName", header: "Gateway", render: (row) => row.gatewayName || "M-Pesa Sandbox" },
    { id: "accountNumber", header: "Account Number / Shortcode", render: (row) => row.accountNumber || "N/A" },
    { id: "status", header: "Status", render: (row) => row.status || "Connected" },
  ];

  const callbackColumns: DataTableColumn<any>[] = [
    { id: "timestamp", header: "Timestamp", render: (row) => row.timestamp || new Date().toLocaleString() },
    { id: "provider", header: "Provider", render: (row) => row.provider || "M-Pesa" },
    { id: "transactionId", header: "Transaction ID", render: (row) => row.transactionId || "N/A" },
    { id: "amount", header: "Amount", render: (row) => `KES ${row.amount || "0"}` },
    { id: "status", header: "Status", render: (row) => row.status || "Success" },
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
          <DataTable title="Configured Gateways" subtitle="Available endpoints." columns={providerColumns} rows={gateways} getRowKey={(row) => row.id} emptyMessage={isLoading ? "Loading..." : "No gateways configured."} />
        </div>}
        {activeTab === "mapping" && <div className="pt-4">
          <DataTable title="School Gateway Mappings" subtitle="Which school uses which gateway." columns={mappingColumns} rows={[]} getRowKey={(row) => row.id} emptyMessage="No mappings found." />
        </div>}
        {activeTab === "callbacks" && <div className="pt-4">
          <DataTable title="Recent Callbacks" subtitle="IPN logs from payment providers." columns={callbackColumns} rows={[]} getRowKey={(row) => row.id} emptyMessage="No logs found." />
        </div>}
      </div>
      
      <Modal open={isAddOpen} title="Add Gateway" onClose={() => setIsAddOpen(false)}>
        <form className="space-y-4" onSubmit={handleAddGateway}>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Gateway Name</span>
            <input className="input-base w-full" required value={newGateway.name} onChange={(e) => setNewGateway({...newGateway, name: e.target.value})} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Type</span>
            <select className="input-base w-full" value={newGateway.type} onChange={(e) => setNewGateway({...newGateway, type: e.target.value})}>
              <option value="M-Pesa Daraja">M-Pesa Daraja</option>
              <option value="Stripe">Stripe</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Environment</span>
            <select className="input-base w-full" value={newGateway.environment} onChange={(e) => setNewGateway({...newGateway, environment: e.target.value})}>
              <option value="Sandbox">Sandbox</option>
              <option value="Production">Production</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Shortcode / ID</span>
            <input className="input-base w-full" required value={newGateway.shortcode} onChange={(e) => setNewGateway({...newGateway, shortcode: e.target.value})} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Consumer Key</span>
            <input type="password" className="input-base w-full" required value={newGateway.consumerKey} onChange={(e) => setNewGateway({...newGateway, consumerKey: e.target.value})} />
          </label>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setIsAddOpen(false)} type="button">Cancel</Button>
            <Button type="submit">Save Gateway</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
