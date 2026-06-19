/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SuperadminPageHeader } from "@/components/platform/superadmin-pages";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { fetchPlatformSchools, fetchPlatformSchoolModules, updatePlatformSchoolModules, type PlatformSchoolModuleAccess } from "@/lib/platform/school-onboarding-client";

export function ModuleAccessWorkspace() {
  const router = useRouter();
  const [schools, setSchools] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [modules, setModules] = useState<PlatformSchoolModuleAccess[]>([]);
  const [isModulesLoading, setIsModulesLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function loadSchools() {
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
      console.error(error);
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
        console.error(error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void initLoad();
    return () => { cancelled = true; };
  }, [router]);

  async function handleOpenManage(school: any) {
    setSelectedSchool(school);
    setIsManageOpen(true);
    setIsModulesLoading(true);
    try {
      const schoolModules = await fetchPlatformSchoolModules(school.id);
      setModules(schoolModules);
    } catch (error) {
      console.error(error);
    } finally {
      setIsModulesLoading(false);
    }
  }

  function handleToggleModule(code: string, enabled: boolean) {
    setModules(prev =>
      prev.map(m => m.code === code ? { ...m, enabled } : m)
    );
  }

  function enableStarterSet() {
    const starterCodes = ["admissions", "academics", "attendance", "staff"];
    setModules(prev => prev.map(m => ({ ...m, enabled: starterCodes.includes(m.code) })));
  }

  function enableFinanceSet() {
    const financeCodes = ["admissions", "academics", "attendance", "staff", "finance"];
    setModules(prev => prev.map(m => ({ ...m, enabled: financeCodes.includes(m.code) })));
  }

  function enableFullSuite() {
    setModules(prev => prev.map(m => ({ ...m, enabled: true })));
  }

  async function handleSaveModules() {
    if (!selectedSchool) return;
    setIsSaving(true);
    try {
      const enabledCodes = modules.filter(m => m.enabled).map(m => m.code);
      await updatePlatformSchoolModules(selectedSchool.id, enabledCodes);
      await loadSchools();
      setIsManageOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }

  const schoolColumns: DataTableColumn<any>[] = [
    { id: "schoolName", header: "School Name", render: (row) => row.schoolName },
    {
      id: "activeModules",
      header: "Active Modules",
      render: (row) => {
        const count = Array.isArray(row.enabled_modules) ? row.enabled_modules.length : 0;
        return `${count} active`;
      }
    },
    { id: "status", header: "Status", render: (row) => row.status === "active" ? "Active" : "Inactive" },
    {
      id: "actions",
      header: "Actions",
      render: (row) => (
        <Button variant="ghost" size="sm" onClick={() => handleOpenManage(row)}>
          Manage Access
        </Button>
      ),
    },
  ];

  const totalSchools = schools.length;
  const financeCount = schools.filter(s => Array.isArray(s.enabled_modules) && s.enabled_modules.includes("finance")).length;
  const cbcCount = schools.filter(s => Array.isArray(s.enabled_modules) && (s.enabled_modules.includes("cbc") || s.enabled_modules.includes("academics"))).length;

  return (
    <div className="space-y-6">
      <SuperadminPageHeader 
        title="Module Access Control" 
        description="Enable or disable specific features (e.g. Finance, Library, CBC) for individual tenants." 
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4"><div className="text-sm font-medium text-muted">Total Schools</div><div className="mt-2 text-2xl font-bold">{totalSchools}</div></Card>
        <Card className="p-4"><div className="text-sm font-medium text-muted">Schools Using Finance</div><div className="mt-2 text-2xl font-bold">{financeCount}</div></Card>
        <Card className="p-4"><div className="text-sm font-medium text-muted">Schools Using CBC/Academics</div><div className="mt-2 text-2xl font-bold">{cbcCount}</div></Card>
      </div>

      <DataTable 
        title="School Module Assignments" 
        subtitle="Manage features per tenant." 
        columns={schoolColumns} 
        rows={schools} 
        getRowKey={(row) => row.id} 
        emptyMessage={isLoading ? "Loading..." : "No schools found."} 
      />

      <Modal open={isManageOpen} title={`Manage Modules: ${selectedSchool?.schoolName || ""}`} onClose={() => !isSaving && setIsManageOpen(false)}>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={enableStarterSet} disabled={isSaving || isModulesLoading}>Enable Starter Set</Button>
            <Button variant="secondary" size="sm" onClick={enableFinanceSet} disabled={isSaving || isModulesLoading}>Enable Finance Set</Button>
            <Button variant="secondary" size="sm" onClick={enableFullSuite} disabled={isSaving || isModulesLoading}>Enable Full Suite</Button>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 max-h-[50vh] overflow-y-auto">
            {isModulesLoading ? (
              <div className="col-span-2 text-center text-sm py-4">Loading modules...</div>
            ) : (
              modules.map(mod => (
                <label key={mod.code} className="flex items-center gap-2 p-2 border rounded hover:bg-muted/50 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={mod.enabled}
                    onChange={(e) => handleToggleModule(mod.code, e.target.checked)}
                    disabled={isSaving}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{mod.name}</span>
                    <span className="text-xs text-muted-foreground">{mod.code}</span>
                  </div>
                </label>
              ))
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsManageOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSaveModules} disabled={isSaving || isModulesLoading}>{isSaving ? "Saving..." : "Save Modules"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
