import {
  DOCX_ADDED_MODULE_CONTRACTS,
  MYSHULE_OPERATIONAL_ROLE_BLUEPRINTS,
  getDocxAddedModuleContract,
  getOperationalRoleBlueprint,
} from "@/lib/operational/myshule-extreme-operating-system";

function combinedRoleText(roleId: string) {
  const blueprint = getOperationalRoleBlueprint(roleId);

  expect(blueprint).toBeDefined();

  return [
    blueprint?.identity,
    ...(blueprint?.firstViewport ?? []),
    ...(blueprint?.sidebar ?? []),
    ...(blueprint?.primaryActions ?? []),
    ...(blueprint?.queues.flatMap((queue) => [queue.title, queue.owner, queue.workflow, queue.auditEvent, queue.sla, ...queue.actions]) ?? []),
    ...(blueprint?.tables.flatMap((table) => [table.title, ...table.columns, ...table.rowActions, ...table.bulkActions]) ?? []),
    ...(blueprint?.forms.flatMap((form) => [form.title, ...form.fields, ...form.footerActions]) ?? []),
    ...(blueprint?.workflows ?? []),
    ...(blueprint?.communicationTriggers ?? []),
    ...(blueprint?.printOutputs ?? []),
    ...(blueprint?.dependencies ?? []),
    ...(blueprint?.states ?? []),
    ...(blueprint?.mobileBehavior ?? []),
    ...(blueprint?.lowBandwidthBehavior ?? []),
  ].join(" | ").toLowerCase();
}

function combinedModuleText(moduleId: string) {
  const contract = getDocxAddedModuleContract(moduleId);

  expect(contract).toBeDefined();

  return [
    contract?.title,
    ...(contract?.uniqueSidebar ?? []),
    ...(contract?.urgentActionStrip ?? []),
    contract?.mainTable.title,
    ...(contract?.mainTable.columns ?? []),
    ...(contract?.mainTable.rowActions ?? []),
    ...(contract?.mainTable.bulkActions ?? []),
    ...(contract?.forms.flatMap((form) => [form.title, ...form.fields, ...form.footerActions]) ?? []),
    ...(contract?.rightDetailsDrawer ?? []),
    contract?.approvalWorkflow,
    ...(contract?.smsTriggers ?? []),
    ...(contract?.printOutputs ?? []),
    ...(contract?.auditTrail ?? []),
    ...(contract?.permissionChecks ?? []),
    ...(contract?.states ?? []),
    ...(contract?.mobileBehavior ?? []),
    ...(contract?.lowBandwidthBehavior ?? []),
  ].join(" | ").toLowerCase();
}

function expectCoverage(text: string, requiredTerms: string[]) {
  for (const term of requiredTerms) {
    expect(text).toContain(term.toLowerCase());
  }
}

describe("Implementation 1370 frontend practicality certification", () => {
  it("makes principal/deputy command views practical for morning school operations", () => {
    expectCoverage(combinedRoleText("principal"), [
      "students present today",
      "teachers present",
      "visitors currently inside",
      "fees received today",
      "pending parent complaints",
      "sick-bay cases today",
      "boarding roll call status",
      "transport route status",
      "failed sms",
      "m-pesa callbacks",
    ]);

    expectCoverage(combinedRoleText("deputy-principal"), [
      "discipline",
      "attendance",
      "teacher movement",
      "duty roster",
      "missing student",
      "security",
    ]);
  });

  it("covers daily practical workflows for front office, finance, library, clinic, security, store, boarding, discipline, academics, and admissions", () => {
    const roleRequirements: Record<string, string[]> = {
      secretary: [
        "parent phone",
        "fee balance preview",
        "print fee statement",
        "print transfer letter",
        "visitor pass",
        "document request queue",
        "book appointment",
        "escalate issue",
      ],
      accountant: [
        "vote heads",
        "boarding fees",
        "transport fees",
        "lunch fees",
        "bursary",
        "partial payments",
        "overpayments",
        "refund",
        "m-pesa confirmation",
        "payment reversal",
        "principal dashboard",
      ],
      librarian: [
        "barcode scanner",
        "bulk upload",
        "generate barcode labels",
        "scan student id",
        "scan book to return",
        "damaged book",
        "lost book",
        "overdue sms",
        "book stock count",
      ],
      nurse: [
        "symptoms",
        "temperature",
        "vitals",
        "medicine given",
        "quantity dispensed",
        "auto-deduct",
        "expired medicine",
        "supplier",
        "batch",
        "expiry",
        "notify class teacher",
        "notify boarding master",
      ],
      "security-officer": [
        "returning visitor",
        "id/passport",
        "vehicle number",
        "currently inside",
        "mark visitor exited",
        "overstayed visitors",
        "blocklisted visitor",
        "emergency visitor list",
      ],
      storekeeper: [
        "consumable",
        "asset",
        "supplier",
        "unit cost",
        "high-value",
        "stock movement",
        "stock take",
        "chalk",
        "toners",
        "mattresses",
        "sports equipment",
      ],
      "boarding-master": [
        "dormitory setup",
        "bed allocation",
        "morning roll call",
        "evening roll call",
        "exeat",
        "sick referral",
        "discipline referral",
        "dorm supplies",
        "mattress asset",
      ],
      "discipline-master": [
        "teacher creates case",
        "class teacher reviews",
        "parent is notified",
        "deputy principal approves",
        "counsellor referral",
        "boarding master notified",
        "security notified",
        "attach evidence",
        "repeat cases",
      ],
      "exams-manager": [
        "subject setup",
        "class/grade setup",
        "stream setup",
        "teacher-subject allocation",
        "bulk marks upload",
        "grade calculation",
        "report card generation",
        "missing marks alert",
        "print report cards",
      ],
      "dean-academics": [
        "report card",
        "missing marks",
        "subject performance",
        "teacher performance",
        "principal academic overview",
      ],
      admissions: [
        "inquiry registration",
        "document upload",
        "interview",
        "fee structure assignment",
        "class/stream assignment",
        "parent account creation",
        "admission number",
        "first invoice",
        "parent sms onboarding",
      ],
    };

    for (const [role, terms] of Object.entries(roleRequirements)) {
      expectCoverage(combinedRoleText(role), terms);
    }
  });

  it("covers parent, student, superadmin, system monitor, ICT, asset, printing, and offline practicality", () => {
    expectCoverage(combinedRoleText("parent"), [
      "fee statement",
      "receipts",
      "student attendance",
      "academic reports",
      "medical alerts",
      "library borrowed books",
      "transport route",
      "boarding status",
      "downloads/letters",
    ]);

    expectCoverage(combinedRoleText("student"), [
      "timetable",
      "assignments",
      "exam results",
      "library books borrowed",
      "discipline status",
      "club",
      "teacher messages",
      "academic progress",
    ]);

    expectCoverage(combinedRoleText("superadmin"), [
      "academic years",
      "terms",
      "classes/grades/forms",
      "streams",
      "subjects",
      "departments",
      "roles",
      "permissions",
      "sms provider",
      "sms templates",
      "m-pesa settings",
      "receipt settings",
      "report card templates",
      "backup settings",
    ]);

    expectCoverage(combinedRoleText("system-monitor"), [
      "server status",
      "database status",
      "failed background jobs",
      "failed sms",
      "failed m-pesa callbacks",
      "failed report generation",
      "backup status",
      "offline devices",
      "sync status",
      "error logs",
      "api health",
    ]);

    expectCoverage(combinedModuleText("ict-assets"), [
      "computers",
      "laptops",
      "projectors",
      "printers",
      "routers",
      "software licenses",
      "lab bookings",
      "assigned devices",
      "internet issues",
      "request replacement parts",
    ]);

    expectCoverage(combinedModuleText("document-printing"), [
      "fee receipts",
      "fee statements",
      "admission letters",
      "report cards",
      "visitor slips",
      "library issue slips",
      "library return slips",
      "stock issue slips",
      "asset movement slips",
      "hostel roll call",
      "transport route lists",
      "discipline letters",
      "medical referral slips",
      "board reports",
    ]);
  });

  it("gives every dashboard the scorecard primitives needed to avoid decorative UI", () => {
    for (const blueprint of MYSHULE_OPERATIONAL_ROLE_BLUEPRINTS) {
      const text = combinedRoleText(blueprint.id);

      expectCoverage(text, [
        "sidebar",
        "queue",
        "search",
        "print",
        "sms",
        "approval",
        "audit",
        "report",
        "offline",
        "retry",
      ]);
      expect(blueprint.primaryActions.length).toBeGreaterThanOrEqual(6);
      expect(blueprint.forms[0]?.fields.length).toBeGreaterThanOrEqual(5);
      expect(blueprint.tables[0]?.rowActions.length).toBeGreaterThanOrEqual(4);
      expect(blueprint.tables[0]?.bulkActions.length).toBeGreaterThanOrEqual(2);
      expect(blueprint.dependencies.length).toBeGreaterThanOrEqual(4);
    }

    for (const moduleContract of DOCX_ADDED_MODULE_CONTRACTS) {
      const text = combinedModuleText(moduleContract.id);

      expectCoverage(text, ["print", "sms", "approval", "audit", "retry"]);
    }
  });
});
