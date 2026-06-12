/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SuperadminPageHeader } from "@/components/platform/superadmin-pages";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { fetchPlatformSchools } from "@/lib/platform/school-onboarding-client";

export function ModuleAccessWorkspace() {
  const router = useRouter();
  const [schools, setSchools] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setIsLoading(true);
      try {
        const liveRows = await fetchPlatformSchools();
        if (!cancelled) setSchools(liveRows);
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void loadData();
    return () => { cancelled = true; };
  }, [router]);

  const schoolColumns: DataTableColumn<any>[] = [
    { id: "schoolName", header: "School Name", render: (row) => row.schoolName },
    { id: "activeModules", header: "Active Modules", render: (row) => "5 / 24" },
    { id: "status", header: "Status", render: (row) => "Active" },
    {
      id: "actions",
      header: "Actions",
      render: (row) => (
        <Button variant="ghost" size="sm" onClick={() => { setSelectedSchool(row); setIsManageOpen(true); }}>
          Manage Access
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <SuperadminPageHeader 
        title="Module Access Control" 
        description="Enable or disable specific features (e.g. Finance, Library, CBC) for individual tenants." 
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4"><div className="text-sm font-medium text-muted">Total Available Modules</div><div className="mt-2 text-2xl font-bold">24</div></Card>
        <Card className="p-4"><div className="text-sm font-medium text-muted">Schools Using Finance</div><div className="mt-2 text-2xl font-bold">0</div></Card>
        <Card className="p-4"><div className="text-sm font-medium text-muted">Schools Using CBC</div><div className="mt-2 text-2xl font-bold">0</div></Card>
      </div>

      <DataTable 
        title="School Module Assignments" 
        subtitle="Manage features per tenant." 
        columns={schoolColumns} 
        rows={schools} 
        getRowKey={(row) => row.id} 
        emptyMessage={isLoading ? "Loading..." : "No schools found."} 
      />

      <Modal open={isManageOpen} title={`Manage Modules: ${selectedSchool?.schoolName || ""}`} onClose={() => setIsManageOpen(false)}>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant="secondary" size="sm">Enable Starter Set</Button>
            <Button variant="secondary" size="sm">Enable Finance Set</Button>
            <Button variant="secondary" size="sm">Enable Full Suite</Button>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 max-h-[50vh] overflow-y-auto">
            {["Admissions", "Attendance", "Exams", "Finance", "Library", "CBC", "Transport", "Hostel", "Discipline", "Inventory"].map(mod => (
              <label key={mod} className="flex items-center gap-2 p-2 border rounded hover:bg-muted/50 cursor-pointer">
                <input type="checkbox" className="rounded" />
                <span className="text-sm font-medium">{mod}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsManageOpen(false)}>Cancel</Button>
            <Button onClick={() => setIsManageOpen(false)}>Save Modules</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
