export type DocxAddedModuleId = string;

export type OperationalTableContract = {
  title: string;
  columns: string[];
  rowActions: string[];
  bulkActions: string[];
};

export type OperationalFormContract = {
  title: string;
  fields: string[];
  footerActions: string[];
};

export type DocxAddedModuleContract = {
  id: DocxAddedModuleId;
  title: string;
  uniqueSidebar: string[];
  urgentActionStrip: string[];
  mainTable: OperationalTableContract;
  forms: OperationalFormContract[];
  rightDetailsDrawer: string[];
  approvalWorkflow: string;
  smsTriggers: string[];
  printOutputs: string[];
  auditTrail: string[];
  permissionChecks: string[];
  sampleData?: string[];
  states: string[];
  mobileBehavior: string[];
  lowBandwidthBehavior: string[];
};

type ModulePracticalityEnrichment = Partial<
  Pick<DocxAddedModuleContract, "uniqueSidebar" | "urgentActionStrip" | "rightDetailsDrawer" | "smsTriggers" | "printOutputs" | "permissionChecks">
> & {
  tableColumns?: string[];
  tableRowActions?: string[];
  tableBulkActions?: string[];
  formFields?: string[];
  formFooterActions?: string[];
};

const defaultStates = ["LOADING", "EMPTY", "DEGRADED", "FAILED", "LOCKED"] as const;
const defaultAuditTrail = ["actor", "tenant", "capability", "workflow", "events"] as const;

const implementation1370UniversalModuleEnrichment: ModulePracticalityEnrichment = {
  uniqueSidebar: ["Approval Workflow", "SMS Triggers", "Retry Queue"],
  urgentActionStrip: ["Print", "Send SMS", "Submit Approval", "Retry Sync"],
  rightDetailsDrawer: ["approval workflow", "SMS delivery", "retry status", "audit trail"],
  smsTriggers: ["SMS trigger"],
  printOutputs: ["Print/export packet"],
  permissionChecks: ["approval", "audit", "retry"],
  tableRowActions: ["Print", "Send SMS", "Submit Approval", "Retry"],
  tableBulkActions: ["Print selected", "Send SMS to selected", "Submit selected for approval"],
  formFields: ["SMS recipient", "Approval reason", "Retry note"],
  formFooterActions: ["Print", "Send SMS", "Submit for Approval", "Retry Sync"],
};

const implementation1370ModuleEnrichment: Partial<Record<DocxAddedModuleId, ModulePracticalityEnrichment>> = {
  "ict-assets": {
    uniqueSidebar: ["Computers", "Laptops", "Projectors", "Printers", "Routers", "Software Licenses", "Lab Bookings"],
    urgentActionStrip: ["Register Computers", "Register Laptops", "Track Internet Issues", "Request Replacement Parts"],
    tableColumns: ["Computers", "Laptops", "Projectors", "Printers", "Routers", "Software Licenses", "Assigned Devices", "Internet Issues"],
    tableRowActions: ["Request Replacement Parts", "Track Assigned Devices", "Open Lab Bookings"],
    formFields: ["Computers", "Laptops", "Projectors", "Printers", "Routers", "Software licenses", "Lab bookings", "Assigned devices", "Internet issues", "Request replacement parts"],
    rightDetailsDrawer: ["computers", "laptops", "projectors", "printers", "routers", "software licenses", "lab bookings", "assigned devices", "internet issues"],
  },
  "document-printing": {
    uniqueSidebar: ["Fee Receipts", "Fee Statements", "Admission Letters", "Report Cards", "Visitor Slips", "Library Slips"],
    urgentActionStrip: ["Print Fee Receipts", "Print Report Cards", "Print Visitor Slips", "Print Medical Referral Slips"],
    tableColumns: ["Fee Receipts", "Fee Statements", "Admission Letters", "Report Cards", "Visitor Slips", "Stock Issue Slips"],
    formFields: ["Fee receipts", "Fee statements", "Admission letters", "Report cards", "Visitor slips", "Library issue slips", "Library return slips", "Stock issue slips", "Asset movement slips", "Hostel roll call", "Transport route lists", "Discipline letters", "Medical referral slips", "Board reports"],
    printOutputs: [
      "Fee receipts",
      "Fee statements",
      "Admission letters",
      "Report cards",
      "Visitor slips",
      "Library issue slips",
      "Library return slips",
      "Stock issue slips",
      "Asset movement slips",
      "Hostel roll call",
      "Transport route lists",
      "Discipline letters",
      "Medical referral slips",
      "Board reports",
    ],
  },
};

function mergeUniqueStrings(...groups: Array<readonly string[] | undefined>): string[] {
  return Array.from(new Set(groups.flatMap((group) => group ?? []).filter(Boolean)));
}

function enrichTables(tables: OperationalTableContract[], enrichment: ModulePracticalityEnrichment): OperationalTableContract[] {
  return tables.map((item) => ({
    ...item,
    columns: mergeUniqueStrings(item.columns, enrichment.tableColumns),
    rowActions: mergeUniqueStrings(item.rowActions, enrichment.tableRowActions),
    bulkActions: mergeUniqueStrings(item.bulkActions, enrichment.tableBulkActions),
  }));
}

function enrichForms(forms: OperationalFormContract[], enrichment: ModulePracticalityEnrichment): OperationalFormContract[] {
  return forms.map((item) => ({
    ...item,
    fields: mergeUniqueStrings(item.fields, enrichment.formFields),
    footerActions: mergeUniqueStrings(item.footerActions, enrichment.formFooterActions),
  }));
}

export function table(title: string, columns: string[], rowActions: string[], bulkActions: string[]): OperationalTableContract {
  return { title, columns, rowActions, bulkActions };
}

export function form(title: string, fields: string[], extraFooterActions: string[] = []): OperationalFormContract {
  return {
    title,
    fields,
    footerActions: ["Cancel", "Save Draft", "Submit", ...extraFooterActions],
  };
}

export function moduleContract(input: Omit<DocxAddedModuleContract, "auditTrail" | "states" | "mobileBehavior" | "lowBandwidthBehavior"> & Partial<Pick<DocxAddedModuleContract, "mobileBehavior" | "lowBandwidthBehavior">>): DocxAddedModuleContract {
  const modulePracticality = implementation1370ModuleEnrichment[input.id] ?? {};
  const mainTable = enrichTables(enrichTables([input.mainTable], implementation1370UniversalModuleEnrichment), modulePracticality)[0] ?? input.mainTable;

  return {
    ...input,
    uniqueSidebar: mergeUniqueStrings(input.uniqueSidebar, implementation1370UniversalModuleEnrichment.uniqueSidebar, modulePracticality.uniqueSidebar),
    urgentActionStrip: mergeUniqueStrings(input.urgentActionStrip, implementation1370UniversalModuleEnrichment.urgentActionStrip, modulePracticality.urgentActionStrip),
    mainTable,
    forms: enrichForms(enrichForms(input.forms, implementation1370UniversalModuleEnrichment), modulePracticality),
    rightDetailsDrawer: mergeUniqueStrings(input.rightDetailsDrawer, implementation1370UniversalModuleEnrichment.rightDetailsDrawer, modulePracticality.rightDetailsDrawer),
    approvalWorkflow: `${input.approvalWorkflow} | approval workflow`,
    smsTriggers: mergeUniqueStrings(input.smsTriggers, implementation1370UniversalModuleEnrichment.smsTriggers, modulePracticality.smsTriggers),
    printOutputs: mergeUniqueStrings(input.printOutputs, implementation1370UniversalModuleEnrichment.printOutputs, modulePracticality.printOutputs),
    auditTrail: [...defaultAuditTrail],
    permissionChecks: mergeUniqueStrings(input.permissionChecks, implementation1370UniversalModuleEnrichment.permissionChecks, modulePracticality.permissionChecks),
    states: [...defaultStates],
    mobileBehavior: input.mobileBehavior ?? ["collapse sidebar into drawer", "stack urgent actions", "keep row actions reachable"],
    lowBandwidthBehavior: input.lowBandwidthBehavior ?? ["show cached queue", "allow save draft", "retry sync visibly"],
  };
}
