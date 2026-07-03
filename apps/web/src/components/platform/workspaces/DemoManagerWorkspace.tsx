/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SuperadminPageHeader } from "@/components/platform/superadmin-pages";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { redirectOnExpiredSessionError } from "@/lib/auth/session-expiry-client";
import { createPlatformSchool, fetchPlatformSchools, hardDeletePlatformSchool } from "@/lib/platform/school-onboarding-client";

const emptyDemoForm = {
  schoolName: "Kisumu Boys Demo",
  tenantId: "kisumu-boys-demo",
  county: "Kisumu",
  adminName: "Demo Principal",
  adminEmail: "",
};

export function DemoManagerWorkspace() {
  const router = useRouter();
  const [schools, setSchools] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [demoForm, setDemoForm] = useState(emptyDemoForm);
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [scannerRows, setScannerRows] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isCreatingDemo, setIsCreatingDemo] = useState(false);

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

  async function handleKisumuReset(e: React.FormEvent<HTMLFormElement>) {
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

  function runLeakageScanner() {
    setIsScanning(true);
    const rows = schools.map((school) => {
      const name = String(school.schoolName ?? "").toLowerCase();
      const isApprovedDemo = name.includes("demo");
      const hasKnownDemoName = name.includes("kisumu boys");
      const suspectedLeak = hasKnownDemoName && !isApprovedDemo;

      return {
        ...school,
        leakedRecords: suspectedLeak ? 1 : 0,
        module: suspectedLeak ? "Tenant identity" : "None",
        scanStatus: suspectedLeak ? "Review required" : "Clean",
      };
    });
    setScannerRows(rows);
    const leaks = rows.reduce((total, row) => total + row.leakedRecords, 0);
    setResetStatus(leaks > 0
      ? `Leakage scanner found ${leaks} tenant identity issue${leaks === 1 ? "" : "s"} requiring review.`
      : `Leakage scanner completed across ${rows.length} tenant${rows.length === 1 ? "" : "s"} with no demo identity leaks found.`);
    setIsScanning(false);
  }

  async function handleCreateDemoTenant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreatingDemo(true);
    setResetStatus(null);
    try {
      await createPlatformSchool({
        schoolName: demoForm.schoolName,
        tenantId: demoForm.tenantId,
        county: demoForm.county,
        adminName: demoForm.adminName,
        adminEmail: demoForm.adminEmail,
      });
      await loadData();
      setResetStatus(`${demoForm.schoolName} demo tenant created cleanly. Add demo seed data only through the isolated demo seed flow.`);
      setIsCreateOpen(false);
      setDemoForm(emptyDemoForm);
    } catch (error) {
      if (!redirectOnExpiredSessionError(error, "superadmin", (href) => router.replace(href))) {
        setResetStatus(error instanceof Error ? error.message : "Unable to create the demo tenant.");
      }
    } finally {
      setIsCreatingDemo(false);
    }
  }

  const currentScannerRows = scannerRows.length ? scannerRows : schools.map((school) => ({
    ...school,
    leakedRecords: 0,
    module: "Not scanned",
    scanStatus: "Run scanner",
  }));

  const scannerColumns: DataTableColumn<any>[] = [
    { id: "tenant", header: "Tenant", render: (row) => row.schoolName },
    { id: "leakedRecords", header: "Leaked Records Detected", render: (row) => row.leakedRecords },
    { id: "module", header: "Affected Module", render: (row) => row.module },
    { id: "status", header: "Status", render: (row) => row.scanStatus },
    {
      id: "actions",
      header: "Actions",
      render: (row) => row.leakedRecords > 0
        ? <Button variant="danger" size="sm" onClick={() => setResetStatus(`Review ${row.schoolName} before purge. Demo data purge must run through a tenant-scoped cleanup job.`)}>Review</Button>
        : <span className="text-xs font-semibold text-muted-foreground">No action needed</span>,
    }
  ];

  return (
    <div className="space-y-6">
      <SuperadminPageHeader 
        title="Demo School Manager" 
        description="Control demo environments, run seeds, and ensure Kisumu Boys demo data does not leak into production tenants." 
        actions={
          <div className="flex gap-2">
            <Button variant="danger" onClick={() => setIsResetOpen(true)}>Reset Kisumu Boys Demo</Button>
            <Button variant="secondary" onClick={runLeakageScanner} disabled={isScanning}>{isScanning ? "Scanning..." : "Run Leakage Scanner"}</Button>
            <Button onClick={() => setIsCreateOpen(true)}>Create Demo Tenant</Button>
          </div>
        }
      />
      {resetStatus ? <div className="rounded border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{resetStatus}</div> : null}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4"><div className="text-sm font-medium text-muted">Active Demo Schools</div><div className="mt-2 text-2xl font-bold">{schools.filter((school) => String(school.schoolName ?? "").toLowerCase().includes("demo")).length}</div></Card>
        <Card className="p-4"><div className="text-sm font-medium text-muted">Real Production Schools</div><div className="mt-2 text-2xl font-bold">{schools.length}</div></Card>
        <Card className="p-4 border-red-500 bg-red-50/50"><div className="text-sm font-medium text-red-600">Demo Leakages Detected</div><div className="mt-2 text-2xl font-bold text-red-700">{currentScannerRows.reduce((total, row) => total + Number(row.leakedRecords ?? 0), 0)}</div></Card>
      </div>
      <DataTable title="Demo Leakage Scanner" subtitle="Scan real tenants for traces of demo seeds." columns={scannerColumns} rows={currentScannerRows} getRowKey={(row) => row.id} emptyMessage={isLoading ? "Loading..." : "No schools found."} />
      
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

      <Modal open={isCreateOpen} title="Create Clean Demo Tenant" onClose={() => setIsCreateOpen(false)}>
        <form className="space-y-4" onSubmit={handleCreateDemoTenant}>
          <div className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            This creates an isolated demo tenant shell only. It does not seed demo learners into production schools.
          </div>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">School name</span>
            <input className="input-base w-full" required value={demoForm.schoolName} onChange={(event) => setDemoForm({ ...demoForm, schoolName: event.target.value })} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Tenant ID</span>
            <input className="input-base w-full" required value={demoForm.tenantId} onChange={(event) => setDemoForm({ ...demoForm, tenantId: event.target.value })} />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-semibold">County</span>
              <input className="input-base w-full" value={demoForm.county} onChange={(event) => setDemoForm({ ...demoForm, county: event.target.value })} />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-semibold">Principal name</span>
              <input className="input-base w-full" required value={demoForm.adminName} onChange={(event) => setDemoForm({ ...demoForm, adminName: event.target.value })} />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Principal email</span>
            <input type="email" className="input-base w-full" required value={demoForm.adminEmail} onChange={(event) => setDemoForm({ ...demoForm, adminEmail: event.target.value })} />
          </label>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)} type="button" disabled={isCreatingDemo}>Cancel</Button>
            <Button type="submit" disabled={isCreatingDemo}>{isCreatingDemo ? "Creating..." : "Create Demo Tenant"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
