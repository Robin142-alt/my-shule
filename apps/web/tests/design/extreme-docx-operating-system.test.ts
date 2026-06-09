import {
  DOCX_ADDED_MODULE_IDS,
  GLOBAL_OPERATING_SYSTEM_CONTRACT,
  KENYAN_OPERATIONAL_EXAMPLES,
  MYSHULE_OPERATIONAL_ROLE_IDS,
  getDocxAddedModuleContract,
  getOperationalRoleBlueprint,
} from "@/lib/operational/myshule-extreme-operating-system";

describe("MYSHULE EXTREME FRONTEND ERP RECONSTRUCTION docx coverage", () => {
  it("defines the full Kenyan school operating-system shell, search, states, buttons, forms, tables, and workflows", () => {
    expect(GLOBAL_OPERATING_SYSTEM_CONTRACT.layout).toEqual(
      expect.arrayContaining([
        "left sidebar navigation",
        "top header",
        "global search",
        "notification bell",
        "urgent action counter",
        "sync status indicator",
        "quick action menu",
        "optional right activity drawer",
      ]),
    );
    expect(GLOBAL_OPERATING_SYSTEM_CONTRACT.search.entities).toEqual(
      expect.arrayContaining([
        "students",
        "parents",
        "staff",
        "receipts",
        "M-Pesa transactions",
        "incidents",
        "books",
        "buses",
        "visitors",
        "documents",
      ]),
    );
    expect(GLOBAL_OPERATING_SYSTEM_CONTRACT.uiStates).toEqual(
      expect.arrayContaining([
        "loading",
        "success",
        "error",
        "empty",
        "degraded",
        "offline/draft",
        "permission denied",
        "validation failed",
        "retry",
      ]),
    );
    expect(GLOBAL_OPERATING_SYSTEM_CONTRACT.buttonCategories.danger.requirements).toEqual(
      expect.arrayContaining(["confirmation modal", "reason field", "audit log", "permission check"]),
    );
    expect(GLOBAL_OPERATING_SYSTEM_CONTRACT.formSystem.footer).toEqual(
      expect.arrayContaining(["Cancel", "Save Draft", "Submit"]),
    );
    expect(GLOBAL_OPERATING_SYSTEM_CONTRACT.tableSystem.everyTableMustInclude).toEqual(
      expect.arrayContaining(["search box", "filters", "pagination", "row actions", "bulk actions", "export", "empty state", "error state"]),
    );
    expect(GLOBAL_OPERATING_SYSTEM_CONTRACT.workflow.standard).toBe("Draft -> Submitted -> Under Review -> Approved -> Executed -> Archived");
    expect(KENYAN_OPERATIONAL_EXAMPLES).toEqual(
      expect.arrayContaining([
        "Admission No: MYS/2026/001",
        "Student Name: Brian Otieno",
        "Parent Phone: 07XXXXXXXX",
        "M-Pesa Code: QEX7ABC123",
        "County: Kiambu",
        "Class: Grade 7 East",
        "Fee Balance: KES 18,500",
      ]),
    );
  });

  it("registers every role in the document as an action-first dashboard blueprint", () => {
    expect(MYSHULE_OPERATIONAL_ROLE_IDS).toEqual(
      expect.arrayContaining([
        "principal",
        "deputy-principal",
        "secretary",
        "accountant",
        "teacher",
        "dean-academics",
        "exams-manager",
        "hod",
        "class-teacher",
        "grade-master",
        "nurse",
        "guidance-counselling",
        "discipline-master",
        "librarian",
        "parent",
        "student",
        "storekeeper",
        "boarding-master",
        "security-officer",
        "transport-manager",
        "laboratory-technician",
        "admissions",
        "superadmin",
        "system-monitor",
      ]),
    );

    for (const roleId of MYSHULE_OPERATIONAL_ROLE_IDS) {
      const blueprint = getOperationalRoleBlueprint(roleId);

      expect(blueprint).toBeDefined();
      expect(blueprint?.identity).toMatch(/\S/);
      expect(blueprint?.firstViewport.length).toBeGreaterThanOrEqual(5);
      expect(blueprint?.sidebar.length).toBeGreaterThanOrEqual(5);
      expect(blueprint?.primaryActions.length).toBeGreaterThanOrEqual(5);
      expect(blueprint?.tables.length).toBeGreaterThan(0);
      expect(blueprint?.forms.length).toBeGreaterThan(0);
      expect(blueprint?.workflows.length).toBeGreaterThan(0);
      expect(blueprint?.communicationTriggers.length).toBeGreaterThan(0);
      expect(blueprint?.printOutputs.length).toBeGreaterThan(0);
      expect(blueprint?.dependencies.length).toBeGreaterThan(0);
    }
  });

  it("turns every added module into a complete operational workspace contract", () => {
    expect(DOCX_ADDED_MODULE_IDS).toEqual(
      expect.arrayContaining([
        "school-admin",
        "hr-payroll",
        "timetable-builder",
        "communication-center",
        "procurement",
        "school-calendar",
        "canteen-meals",
        "co-curricular",
        "data-security",
        "setup-wizard",
        "ict-assets",
        "document-printing",
        "reports-analytics",
        "universal-approvals",
      ]),
    );

    for (const moduleId of DOCX_ADDED_MODULE_IDS) {
      const contract = getDocxAddedModuleContract(moduleId);

      expect(contract).toBeDefined();
      expect(contract?.uniqueSidebar.length).toBeGreaterThanOrEqual(6);
      expect(contract?.urgentActionStrip.length).toBeGreaterThanOrEqual(4);
      expect(contract?.mainTable.columns.length).toBeGreaterThanOrEqual(5);
      expect(contract?.mainTable.rowActions.length).toBeGreaterThanOrEqual(4);
      expect(contract?.mainTable.bulkActions.length).toBeGreaterThanOrEqual(2);
      expect(contract?.forms.length).toBeGreaterThan(0);
      expect(contract?.rightDetailsDrawer.length).toBeGreaterThanOrEqual(4);
      expect(contract?.approvalWorkflow).toMatch(/->/);
      expect(contract?.smsTriggers.length).toBeGreaterThan(0);
      expect(contract?.printOutputs.length).toBeGreaterThan(0);
      expect(contract?.auditTrail).toEqual(expect.arrayContaining(["actor", "tenant", "capability", "workflow", "events"]));
      expect(contract?.permissionChecks.length).toBeGreaterThan(0);
      expect(contract?.states).toEqual(expect.arrayContaining(["LOADING", "EMPTY", "DEGRADED", "FAILED", "LOCKED"]));
      expect(contract?.mobileBehavior.length).toBeGreaterThan(0);
      expect(contract?.lowBandwidthBehavior.length).toBeGreaterThan(0);
    }
  });
});
