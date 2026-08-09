import fs from "node:fs";
import path from "node:path";

const webRoot = path.resolve(__dirname, "../..");
const repoRoot = path.resolve(webRoot, "../..");

function readWeb(relativePath: string) {
  return fs.readFileSync(path.join(webRoot, relativePath), "utf8");
}

function readRepo(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("Kenyan school Laboratory Technician usability layer", () => {
  it("keeps the seven daily actions visible and routes each workspace", () => {
    const shared = readWeb("src/components/school/laboratory-technician/shared.tsx");
    const sidebar = readWeb("src/lib/experiences/school-data.ts");
    const commandCenter = readWeb("src/components/school/live-role-command-center.tsx");
    const schoolPages = readWeb("src/components/school/school-pages.tsx");

    for (const action of [
      "Add Item",
      "Add Stock",
      "Prepare a Practical",
      "Issue Items",
      "Receive Returns",
      "Record Breakage or Loss",
      "Start Stocktake",
    ]) {
      expect(shared).toContain(action);
    }
    for (const label of [
      "Today",
      "Stock Book",
      "Practicals",
      "Issue & Return",
      "Chemicals Register",
      "Stocktake",
      "Safety & Breakages",
      "Registers & Reports",
    ]) {
      expect(sidebar).toContain(`label: "${label}"`);
    }
    expect(commandCenter).toContain("LaboratoryStocktakeWorkspace");
    expect(schoolPages).toContain('"lab-inventory"');
    expect(schoolPages).toContain('"stocktake"');
  });

  it("supports Scenario A morning practical preparation without re-entering lesson details", () => {
    const overview = readWeb("src/components/school/laboratory-technician/overview-workspace.tsx");
    const practicals = readWeb("src/components/school/laboratory-technician/lab-timetable-workspace.tsx");

    expect(overview).toContain('useSchoolQuery<LabHomeData>("/labs/home")');
    expect(overview).toContain("Today’s Practicals");
    expect(overview).toContain("Items Awaiting Return");
    expect(overview).toContain("Attention Required");
    expect(practicals).toContain('useSchoolQuery<PracticalRequest[]>("/labs/requests")');
    expect(practicals).toContain("Available:");
    expect(practicals).toContain("Shortage or Review Note");
    expect(practicals).toContain("Mark Practical Ready");
    expect(practicals).toContain("Add Necessary Item");
    expect(practicals).toContain("Substitute");
    expect(practicals).toContain("preparation_note");
    expect(practicals.match(/mobileFullScreen/g)?.length).toBe(3);
    expect(practicals).toContain("submission_id: reviewSubmissionId");
    expect(practicals).toContain("submission_id: preparationSubmissionId");
  });

  it("keeps assessment practical preparation restricted and aligned with official KNEC instructions", () => {
    const practicals = readWeb("src/components/school/laboratory-technician/lab-timetable-workspace.tsx");
    const repository = readRepo("apps/api/src/modules/labs/repositories/labs.repository.ts");
    const requestCards = practicals.slice(
      practicals.indexOf("requests.map"),
      practicals.indexOf('open={mode === "new"}'),
    );

    expect(practicals).toContain("Secure assessment or examination practical");
    expect(practicals).toContain("Confidential Preparation Notes");
    expect(practicals).toContain("Authorized staff only");
    expect(practicals).toContain("official KNEC instructions");
    expect(practicals).toContain("is_assessment: isAssessment");
    expect(practicals).toContain("is_assessment: false");
    expect(practicals).toContain("confidential_notes: confidentialNotes.trim()");
    expect(practicals).toContain("authorized_roles: [...SECURE_ASSESSMENT_ROLES]");
    expect(practicals).toContain("setRequestForm(newRequestForm())");
    expect(requestCards).not.toContain("confidential_notes");
    expect(repository).toContain("upper($2) = ANY(r.authorized_roles)");
  });

  it("supports Scenario B fast stock entry with school-friendly fields and no procurement burden", () => {
    const inventory = readWeb("src/components/school/laboratory-technician/lab-inventory-workspace.tsx");

    for (const choice of [
      "Chemical or Reagent",
      "Apparatus or Equipment",
      "Consumable",
      "Safety Equipment",
    ]) {
      expect(inventory).toContain(choice);
    }
    for (const unit of [
      "Pieces", "Bottles", "Packets", "Boxes", "Sets", "Pairs", "Litres",
      "Millilitres", "Kilograms", "Grams", "Metres", "Rolls", "Containers", "Custom",
    ]) {
      expect(readWeb("src/components/school/laboratory-technician/types.ts")).toContain(`"${unit}"`);
    }
    expect(inventory).toContain("Where Is It Stored?");
    expect(inventory).toContain("Minimum Quantity");
    expect(inventory).toContain("Add More Details");
    expect(inventory).toContain("Add New Location");
    expect(inventory).toContain("Add to Existing Stock");
    expect(inventory).toContain("Track by Quantity");
    expect(inventory).toContain('searchParams.get("type")');
    expect(inventory).toContain("itemKinds.some((item) => item.type === requestedType)");
    expect(inventory).toContain('setItemStage("details")');
    expect(inventory).toContain("STOCK_PAGE_SIZE = 40");
    expect(inventory).toContain("pagedItems.map");
    expect(inventory).toContain('aria-label="Stock book pages"');
    expect(inventory).toContain("Showing {stockPageStart + 1}");
    expect(inventory).toContain("setStockPage(1)");
    expect(inventory).not.toMatch(/Supplier|Unit Cost|Purchase Price|Procurement Reference|Invoice Number|Total Stock Value|Batch Number/);
  });

  it("imports an existing CSV stock list only after preview with partial-result recovery", () => {
    const inventory = readWeb("src/components/school/laboratory-technician/lab-inventory-workspace.tsx");
    const controller = readRepo("apps/api/src/modules/labs/labs.controller.ts");

    expect(inventory).toContain("Import Stock List");
    expect(inventory).toContain('accept=".csv,text/csv"');
    expect(inventory).toContain("Preview Stock List");
    expect(inventory).toContain("Download Blank CSV Template");
    expect(inventory).toContain("Download Error Report");
    expect(inventory).toContain("Import Valid Rows");
    expect(inventory).toContain('path: "/labs/items/import"');
    expect(inventory).toContain("submission_id: importSubmissionId");
    expect(inventory).toContain("source_row: sourceRow");
    expect(inventory).toContain('(raw.tracking_method ?? "").trim()');
    expect(inventory).toContain("imported_count");
    expect(inventory).toContain("duplicate_count");
    expect(inventory).toContain("failed_count");
    expect(inventory).toContain("fixed inset-0");
    for (const column of [
      "item_name",
      "item_type",
      "category",
      "quantity",
      "unit",
      "storage_location",
      "minimum_stock_level",
    ]) {
      expect(inventory).toContain(`"${column}"`);
    }
    expect(controller).toContain("@Post('items/import')");
  });

  it("supports Scenarios C and D through one-screen issue and reconciled return workflows", () => {
    const issueReturn = readWeb("src/components/school/laboratory-technician/apparatus-issue-workspace.tsx");

    expect(issueReturn).toContain("Practicals Ready for Issue");
    expect(issueReturn).toContain("Person Receiving the Items");
    expect(issueReturn).toContain("Confirm Issue");
    expect(issueReturn).toContain("Returnable");
    expect(issueReturn).toContain("Consumable or chemical");
    expect(issueReturn).toContain("Good Condition");
    expect(issueReturn).toContain("Used or Consumed");
    expect(issueReturn).toContain("Broken");
    expect(issueReturn).toContain("Missing");
    expect(issueReturn).toContain("Still With Teacher");
    expect(issueReturn).toContain("Sent for Maintenance");
    expect(issueReturn).toContain("Spilled or Wasted");
    expect(issueReturn).toContain("Figures Reconcile");
    expect(issueReturn).toContain("Receive Return");
    expect(issueReturn).toContain("Send Reminder");
    expect(issueReturn.match(/mobileFullScreen/g)?.length).toBe(2);
  });

  it("supports Scenario E stocktake location by location with saved progress and review", () => {
    const stocktake = readWeb("src/components/school/laboratory-technician/stocktake-workspace.tsx");

    expect(stocktake).toContain('useSchoolQuery<LabStocktake[]>("/labs/stocktakes")');
    expect(stocktake).toContain("Choose the exact place you are about to count.");
    expect(stocktake).toContain("Expected:");
    expect(stocktake).toContain("Counted Quantity");
    expect(stocktake).toContain("Previous");
    expect(stocktake).toContain("Next");
    expect(stocktake).toContain("Save and Continue Later");
    expect(stocktake).toContain("Review Differences");
    expect(stocktake).toContain("Submit Stocktake");
    expect(stocktake).toContain("localStorage");
    expect(stocktake).toContain("All categories");
    expect(stocktake).toContain("All item types");
    expect(stocktake).toContain("category: categoryFilter || undefined");
    expect(stocktake).toContain("item_type: itemTypeFilter || undefined");
    expect(stocktake).toContain("mobileFullScreen");
  });

  it("supports Scenario F slow connections without a false server success or duplicate submission", () => {
    const mutation = readWeb("src/components/school/laboratory-technician/use-laboratory-mutation.ts");
    const laboratorySync = readWeb("src/components/school/laboratory-technician/laboratory-sync.ts");
    const offline = readWeb("src/lib/offline/use-offline-mutation.ts");
    const syncQueue = readWeb("src/lib/offline/sync-queue.ts");
    const shared = readWeb("src/components/school/laboratory-technician/shared.tsx");
    const inventory = readWeb("src/components/school/laboratory-technician/lab-inventory-workspace.tsx");
    const schema = readRepo("apps/api/src/modules/labs/labs-schema.service.ts");

    expect(mutation).toContain("useOfflineMutation");
    expect(mutation).toContain("createSubmissionId");
    expect(mutation).toContain("queueDedupeKey");
    expect(mutation).toContain("createLaboratoryQueueDedupeKey");
    expect(mutation).toContain("stableRequestBody");
    expect(mutation).toContain("requireAuthenticatedQueueActor: true");
    expect(mutation).toContain("syncPendingLaboratoryOperations(");
    expect(mutation).toContain("activeAuthorizationRoleCode");
    expect(offline).toContain("Request timed out");
    expect(offline).toContain("Request failed: 5");
    expect(syncQueue).toContain("dedupeKey");
    expect(syncQueue).toContain("statusUpdatedAt");
    expect(laboratorySync).toContain('getRecordsBySchoolAndStatus(schoolId, "Syncing")');
    expect(laboratorySync).toContain("record.userId === userId");
    expect(shared).toContain("Pending Sync");
    expect(shared).toContain("waiting for a confirmed server response");
    expect(inventory).toContain("disabled={createItemMutation.isPending}");
    expect(inventory).toContain("localStorage");
    expect(inventory).toContain("activeSchoolId && activeUserId");
    expect(inventory).toContain("localStorage.getItem(itemDraftKey)");
    expect(inventory).toContain("localStorage.removeItem(itemDraftKey)");
    expect(schema).toContain("uq_lab_stock_movements_submission");
  });

  it("provides safety, breakage, and all printable school registers from live APIs", () => {
    const safety = readWeb("src/components/school/laboratory-technician/safety-incidents-workspace.tsx");
    const reports = readWeb("src/components/school/laboratory-technician/reports-workspace.tsx");
    const printExport = readWeb("src/lib/dashboard/export.ts");

    for (const classification of [
      "Accidental Breakage", "Wear and Tear", "Equipment Failure", "Missing",
      "Chemical Spill", "Improper Use", "Unknown",
    ]) {
      expect(safety).toContain(classification);
    }
    expect(safety).toMatch(/no charge/i);
    expect(safety).toContain("Safety Checklist");
    expect(safety).toContain("Recorded By");
    expect(safety.match(/mobileFullScreen/g)?.length).toBe(2);
    expect(safety).toContain("submission_id: safetySubmissionId");
    for (const report of [
      "Current Stock Book", "Chemicals Register", "Apparatus Register", "Consumables Register",
      "Issue and Return Register", "Breakage and Loss Register", "Expired Chemicals Register",
      "Stocktake Sheet", "Practical Preparation Checklist", "Low-Stock List",
    ]) {
      expect(reports).toContain(report);
    }
    expect(reports).toContain('path: "/labs/registers"');
    expect(reports).toContain("openPrintDocument");
    expect(reports).toContain("downloadCsvFile");
    expect(reports).toContain("Signature");
    expect(reports).toContain("Page");
    expect(reports).toContain("location_filter");
    expect(reports).toContain("Leave blank to include records from every laboratory location.");
    expect(reports).toContain("logoUrl: report.school_logo");
    expect(printExport).toContain("renderedLogo");
    expect(printExport).toContain('counter(page)');
    expect(printExport).toContain('counter(pages)');
    expect(printExport).toContain('iframe?.contentWindow?.print?.()');
  });

  it("enforces tenant scope, permissions, audit logs, events, and transactional stock movements in the API", () => {
    const controller = readRepo("apps/api/src/modules/labs/labs.controller.ts");
    const repository = readRepo("apps/api/src/modules/labs/repositories/labs.repository.ts");
    const service = readRepo("apps/api/src/modules/labs/labs.service.ts");
    const schema = readRepo("apps/api/src/modules/labs/labs-schema.service.ts");

    expect(controller).toContain("@RequiresModule('lab_management')");
    expect(controller).toContain("@Permissions('labs:inventory')");
    expect(controller).toContain("@Permissions('labs:request')");
    expect(repository).toContain("WHERE tenant_id = $1");
    expect(repository).toContain("this.withRequestTransaction");
    expect(repository).toContain("recordLabStockMovement");
    expect(repository).toContain("FOR UPDATE");
    expect(repository).toContain("already been submitted and cannot be changed");
    expect(repository).toContain("appendAuditLog");
    expect(service).toContain("school.operation.recorded");
    expect(service).toContain("lab.request.submitted");
    expect(service).toContain("laboratory.safety_check.follow_up_required");
    expect(schema).toContain("FORCE ROW LEVEL SECURITY");
    expect(schema).toContain("lab_practical_requests");
    expect(schema).toContain("lab_breakage_loss_records");
    expect(schema).toContain("lab_stocktakes");
  });
});
