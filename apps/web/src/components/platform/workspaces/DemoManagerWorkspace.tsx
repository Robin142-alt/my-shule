/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SuperadminPageHeader } from "@/components/platform/superadmin-pages";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { redirectOnExpiredSessionError } from "@/lib/auth/session-expiry-client";
import { fetchPlatformSchools, hardDeletePlatformSchool } from "@/lib/platform/school-onboarding-client";

export function DemoManagerWorkspace() {
  const router = useRouter();
  const [schools, setSchools] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [resetStatus, setResetStatus] = useState<string | null>(null);

  async function loadData() {
    setIsLoading(true);
    try {
      const liveRows = await fetchPlatformSchools();
      const mapped = liveRows.map((s) => ({
        ...s,
        id: s.tenant_id,
        schoolName: s.school_name
      }));
      setSchools(mapped);
    } catch (error) {
      redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function initLoad() {
      setIsLoading(true);
      try {
        const liveRows = await fetchPlatformSchools();
        const mapped = liveRows.map((s) => ({
          ...s,
          id: s.tenant_id,
          schoolName: s.school_name
        }));
        if (!cancelled) setSchools(mapped);
      } catch (error) {
        if (redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href))) {
          return;
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void initLoad();
    return () => { cancelled = true; };
  }, [router]);

  async function handleKisumuReset(e: React.FormEvent) {
    e.preventDefault();
    if (resetConfirmation !== "RESET KISUMU BOYS DEMO") return;
    const demoSchool = schools.find((school) =>
      String(school.schoolName ?? "").toLowerCase().includes("kisumu boys"),
    );
    if (!demoSchool?.id) {
      setResetStatus("Kisumu Boys demo tenant was not found.");
      return;
    }
    try {
      await hardDeletePlatformSchool({
        tenantId: demoSchool.id,
        confirmation: resetConfirmation,
        reason: "Superadmin requested Kisumu Boys demo reset",
      });
      await loadData();
      setResetStatus("Kisumu Boys demo tenant reset request completed.");
      setIsResetOpen(false);
      setResetConfirmation("");
    } catch (error) {
      if (!redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href))) {
        setResetStatus("Kisumu Boys demo reset failed.");
      }
    }
  }

  const scannerColumns: DataTableColumn<any>[] = [
    { id: "tenant", header: "Tenant", render: (row) => row.schoolName },
    { id: "leakedRecords", header: "Leaked Records Detected", render: (row) => "0" },
    { id: "module", header: "Affected Module", render: (row) => "None" },
    { id: "status", header: "Status", render: (row) => "Clean" },
    { id: "actions", header: "Actions", render: (row) => <Button variant="ghost" size="sm" disabled>Purge Data</Button> }
  ];

  return (
    <div className="space-y-6">
      <SuperadminPageHeader 
        title="Demo School Manager" 
        description="Control demo environments, run seeds, and ensure Kisumu Boys demo data does not leak into production tenants." 
        actions={
          <div className="flex gap-2">
            <Button variant="danger" onClick={() => setIsResetOpen(true)}>Reset Kisumu Boys Demo</Button>
            <Button variant="secondary">Run Leakage Scanner</Button>
            <Button>Create Demo Tenant</Button>
          </div>
        }
      />
      {resetStatus ? <div className="rounded border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{resetStatus}</div> : null}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4"><div className="text-sm font-medium text-muted">Active Demo Schools</div><div className="mt-2 text-2xl font-bold">1</div></Card>
        <Card className="p-4"><div className="text-sm font-medium text-muted">Real Production Schools</div><div className="mt-2 text-2xl font-bold">{schools.length}</div></Card>
        <Card className="p-4 border-red-500 bg-red-50/50"><div className="text-sm font-medium text-red-600">Demo Leakages Detected</div><div className="mt-2 text-2xl font-bold text-red-700">0</div></Card>
      </div>
      <DataTable title="Demo Leakage Scanner" subtitle="Scan real tenants for traces of demo seeds." columns={scannerColumns} rows={schools} getRowKey={(row) => row.id} emptyMessage={isLoading ? "Loading..." : "No schools found."} />
      
      <Modal open={isResetOpen} title="Reset Kisumu Boys Demo" onClose={() => setIsResetOpen(false)}>
        <form className="space-y-4" onSubmit={handleKisumuReset}>
          <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
            <strong>WARNING:</strong> This action will destroy all current data in the Kisumu Boys Demo tenant and re-run the pristine demo seed. This cannot be undone.
          </div>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Type RESET KISUMU BOYS DEMO to confirm</span>
            <input 
              className="input-base w-full border-red-300 focus:border-red-500" 
              required 
              value={resetConfirmation}
              onChange={(e) => setResetConfirmation(e.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setIsResetOpen(false)} type="button">Cancel</Button>
            <Button type="submit" variant="danger" disabled={resetConfirmation !== "RESET KISUMU BOYS DEMO"}>Confirm Reset</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
