import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const docsDir = join(rootDir, "docs");
const generatedAt = new Date().toISOString();

const routeSetNames = [
  "supportWorkspaceSectionIds",
  "admissionsDashboardSectionIds",
  "teacherDashboardSectionIds",
  "examsManagerDashboardSectionIds",
  "roleOperationalWorkspaceSectionIds",
  "deanAcademicsWorkspaceSectionIds",
  "hodWorkspaceSectionIds",
  "financeRoleDedicatedSectionIds",
];

const manualVerificationJourneys = [
  {
    title: "School Creation And Principal Activation",
    actor: "Super Admin",
    outcome: "A clean school is created, the first principal receives an invite, accepts it, and lands on that school's activation checklist.",
  },
  {
    title: "Staff Invitation And Acceptance",
    actor: "Principal",
    outcome: "A school-scoped staff invite is delivered, accepted once, and routes the new staff member to the correct role dashboard.",
  },
  {
    title: "Admissions To Student Activation",
    actor: "Admissions Officer",
    outcome: "An applicant moves through inquiry, application, acceptance, admission, class placement, parent linking, and active student status.",
  },
  {
    title: "Academic Setup, Subjects, Classes, And Streams",
    actor: "Deputy Principal",
    outcome: "The school defines terms, classes/forms/grades, streams, subjects, departments, and teacher assignments used by admissions and exams.",
  },
  {
    title: "Fees, Invoicing, Receipts, And Parent Balances",
    actor: "Accountant",
    outcome: "Fee structures generate invoices, payments allocate correctly, receipts preview/download, and balances appear in parent and principal views.",
  },
  {
    title: "Attendance Register And Absence Notification",
    actor: "Teacher",
    outcome: "A class register is marked, absence signals are visible to leadership, and parent notifications are queued or delivered truthfully.",
  },
  {
    title: "Exams, Marks, Report Cards, And Publication",
    actor: "Teacher, HOD, Dean, Exams Manager, Principal",
    outcome: "Exams are configured, subjects are assigned, marks are entered and moderated, report cards are generated, approved, published, and visible to parents/students.",
  },
  {
    title: "Library Issue, Return, Overdue, And Fine",
    actor: "Librarian",
    outcome: "Books are catalogued, issued, returned, marked overdue or lost, and any fine appears in finance where billable.",
  },
  {
    title: "Health Visit And Parent Alert",
    actor: "Nurse",
    outcome: "A health visit is recorded, medicine stock updates if dispensed, and urgent parent/principal alerts are created where required.",
  },
  {
    title: "Inventory And Stores Issue",
    actor: "Storekeeper",
    outcome: "Stock is received, requested, approved, issued, and reflected in stock ledgers and requester notifications.",
  },
  {
    title: "Security Visitor Check-In And Check-Out",
    actor: "Security Officer",
    outcome: "Visitor entry is recorded, host/secretary/principal visibility updates, a visitor slip can be printed, and checkout closes the visit.",
  },
  {
    title: "Discipline, Counselling, And Parent Summons",
    actor: "Discipline Master and Counsellor",
    outcome: "An incident can be logged, escalated, linked to counselling, and parent summons/report documents are truthful.",
  },
  {
    title: "Boarding, Transport, And Laboratory Operations",
    actor: "Boarding Master, Transport Manager, Laboratory Technician",
    outcome: "Boarding roll call, route assignment, lab inventory/requests, and related reports persist and remain school-scoped.",
  },
  {
    title: "Parent And Student Portal Publication",
    actor: "Parent and Student",
    outcome: "Only published school-scoped records are visible to linked parents/students; unpublished marks or other private records remain hidden.",
  },
  {
    title: "System Monitor Failure Recovery",
    actor: "System Monitor",
    outcome: "Failed email/SMS/jobs/payment callbacks are visible, retryable, and audited without fake success.",
  },
  {
    title: "Cross-Tenant Denial And Clean School Data",
    actor: "Any role",
    outcome: "A user cannot reach another school's records by route or ID changes, and a new school has no demo school data.",
  },
];

function readText(relativePath) {
  return readFileSync(join(rootDir, relativePath), "utf8");
}

function walkFiles(startDir, predicate, result = []) {
  if (!existsSync(startDir)) {
    return result;
  }

  for (const entry of readdirSync(startDir)) {
    const fullPath = join(startDir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walkFiles(fullPath, predicate, result);
    } else if (predicate(fullPath)) {
      result.push(fullPath);
    }
  }

  return result.sort((a, b) => a.localeCompare(b));
}

function extractSetValues(source, setName) {
  const marker = `const ${setName} = new Set([`;
  const start = source.indexOf(marker);
  if (start === -1) {
    return [];
  }

  const end = source.indexOf("]);", start);
  if (end === -1) {
    return [];
  }

  return Array.from(source.slice(start, end).matchAll(/"([^"]+)"/g), (match) => match[1]);
}

function humanizeSlug(value) {
  return value
    .replace(/\.tsx$/, "")
    .replace(/-command-center$/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function commandCenterInventory() {
  const commandCenterDir = join(rootDir, "apps", "web", "src", "components", "school");
  return walkFiles(commandCenterDir, (file) => file.endsWith("-command-center.tsx")).map((file) => {
    const relativePath = relative(rootDir, file).replace(/\\/g, "/");
    return {
      role: humanizeSlug(file.split(/[\\/]/).pop()),
      file: relativePath,
    };
  });
}

function extractNavItemCandidates(source) {
  const seen = new Set();
  const candidates = [];
  const navItemPattern = /\{\s*id:\s*"([^"]+)"\s*,\s*label:\s*"([^"]+)"/g;

  for (const match of source.matchAll(navItemPattern)) {
    const id = match[1].trim();
    const label = match[2].trim();
    const key = `${id}:${label}`;

    if (!id || !label || seen.has(key)) {
      continue;
    }

    seen.add(key);
    candidates.push({ id, label });
  }

  return candidates;
}

function roleSidebarWorkspaceInventory(commandCenters) {
  const inventories = [];

  for (const center of commandCenters) {
    const primarySourcePath = join(rootDir, center.file);
    const sourcePaths = [primarySourcePath];

    if (center.file.endsWith("teacher-command-center.tsx")) {
      sourcePaths.push(join(rootDir, "apps/web/src/components/school/teacher-dashboard/nav-config.ts"));
    }

    const candidates = sourcePaths.flatMap((sourcePath) => {
      if (!existsSync(sourcePath)) {
        return [];
      }

      return extractNavItemCandidates(readFileSync(sourcePath, "utf8")).map((item) => ({
        ...item,
        source: relative(rootDir, sourcePath).replace(/\\/g, "/"),
      }));
    });

    const seen = new Set();
    for (const item of candidates) {
      const key = `${center.role}:${item.id}:${item.label}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      inventories.push({
        role: center.role,
        label: item.label,
        workspaceId: item.id,
        source: item.source,
        status: "DISCOVERED_NOT_MANUALLY_VERIFIED",
      });
    }
  }

  return inventories.sort((a, b) =>
    `${a.role}:${a.workspaceId}:${a.label}`.localeCompare(`${b.role}:${b.workspaceId}:${b.label}`),
  );
}

function extractStringArrayValues(value) {
  return Array.from(value.matchAll(/"([^"]+)"/g), (match) => match[1].trim()).filter(Boolean);
}

function summarizeActionLabel(label) {
  if (label === "primaryAction") {
    return "Primary action";
  }

  return label.trim();
}

function extractActionRowCandidates(source, sourcePath) {
  const actions = [];
  const actionRowPattern = /<ActionRow\b([\s\S]*?)(?:\/>|>\s*<\/ActionRow>)/g;

  for (const match of source.matchAll(actionRowPattern)) {
    const props = match[1];
    const labelsProp = props.match(/labels=\{([\s\S]*?)\}/)?.[1] ?? "";
    const labels = labelsProp.includes("primaryAction")
      ? ["Primary action", ...extractStringArrayValues(labelsProp)]
      : extractStringArrayValues(labelsProp);

    const handler = /\bonAction=/.test(props) ? "onAction" : "missing-handler";

    for (const label of labels) {
      actions.push({
        component: "ActionRow",
        label: summarizeActionLabel(label),
        handler,
        source: sourcePath,
        status: handler === "missing-handler" ? "DISCOVERED_NEEDS_HANDLER_REVIEW" : "DISCOVERED_NOT_MANUALLY_VERIFIED",
      });
    }
  }

  return actions;
}

function extractButtonCandidates(source, sourcePath) {
  const actions = [];
  const buttonPattern = /<button\b([\s\S]*?)>([\s\S]*?)<\/button>/g;

  for (const match of source.matchAll(buttonPattern)) {
    const props = match[1];
    const body = match[2]
      .replace(/<[^>]+>/g, " ")
      .replace(/\{[^}]+\}/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const label = body || props.match(/aria-label="([^"]+)"/)?.[1] || "Unlabeled button";
    const handler = /\bonClick=/.test(props)
      ? "onClick"
      : /\btype=(?:"submit"|'submit'|\{["']submit["']\})/.test(props)
        ? "form-submit"
        : /\bdisabled\b/.test(props)
          ? "disabled"
          : "missing-handler";

    actions.push({
      component: "button",
      label,
      handler,
      source: sourcePath,
      status: handler === "missing-handler" ? "DISCOVERED_NEEDS_HANDLER_REVIEW" : handler === "disabled" ? "DISCOVERED_DISABLED_REVIEW" : "DISCOVERED_NOT_MANUALLY_VERIFIED",
    });
  }

  return actions;
}

function extractFormCandidates(source, sourcePath) {
  const actions = [];
  const formPattern = /<form\b([\s\S]*?)>/g;

  for (const match of source.matchAll(formPattern)) {
    const props = match[1];
    const handler = /\bonSubmit=/.test(props) ? "onSubmit" : "missing-handler";
    actions.push({
      component: "form",
      label: "Form submission",
      handler,
      source: sourcePath,
      status: handler === "missing-handler" ? "DISCOVERED_NEEDS_HANDLER_REVIEW" : "DISCOVERED_NOT_MANUALLY_VERIFIED",
    });
  }

  return actions;
}

function buttonActionInventory(commandCenters) {
  const actions = [];

  for (const center of commandCenters) {
    const sourcePath = join(rootDir, center.file);
    if (!existsSync(sourcePath)) {
      continue;
    }

    const source = readFileSync(sourcePath, "utf8");
    const discovered = [
      ...extractActionRowCandidates(source, center.file),
      ...extractButtonCandidates(source, center.file),
      ...extractFormCandidates(source, center.file),
    ];

    for (const action of discovered) {
      actions.push({
        role: center.role,
        ...action,
      });
    }
  }

  return actions.sort((a, b) =>
    `${a.role}:${a.source}:${a.component}:${a.label}:${a.handler}`.localeCompare(`${b.role}:${b.source}:${b.component}:${b.label}:${b.handler}`),
  );
}

function routeSectionInventory() {
  const routeSource = readText("apps/web/src/components/school/school-pages.tsx");
  return routeSetNames.map((name) => ({
    name,
    sections: extractSetValues(routeSource, name),
  }));
}

function apiControllerInventory() {
  const apiRoot = join(rootDir, "apps", "api", "src");
  return walkFiles(apiRoot, (file) => file.endsWith(".controller.ts")).map((file) => {
    const source = readFileSync(file, "utf8");
    const controllerPath = source.match(/@Controller\(([^)]*)\)/)?.[1]?.replaceAll("'", "").replaceAll('"', "") ?? "";
    const className = source.match(/export\s+class\s+(\w+)/)?.[1] ?? "UnknownController";
    const methods = Array.from(source.matchAll(/@(Get|Post|Put|Patch|Delete)\(([^)]*)\)/g), (match) => ({
      method: match[1].toUpperCase(),
      path: match[2].replaceAll("'", "").replaceAll('"', "") || "/",
    }));
    return {
      file: relative(rootDir, file).replace(/\\/g, "/"),
      className,
      controllerPath,
      methods,
    };
  });
}

function moduleBackendContractInventory() {
  const modulesRoot = join(rootDir, "apps", "api", "src", "modules");
  if (!existsSync(modulesRoot)) {
    return [];
  }

  return readdirSync(modulesRoot)
    .map((name) => {
      const modulePath = join(modulesRoot, name);
      if (!statSync(modulePath).isDirectory()) {
        return null;
      }

      const moduleFiles = walkFiles(modulePath, () => true);
      return {
        module: name,
        controllers: moduleFiles.filter((file) => file.endsWith(".controller.ts")).length,
        services: moduleFiles.filter((file) => file.endsWith(".service.ts")).length,
        tests: moduleFiles.filter((file) => file.endsWith(".test.ts") || file.endsWith(".spec.ts")).length,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.module.localeCompare(b.module));
}

function automatedTestCoverageInventory() {
  const testRoots = [
    join(rootDir, "apps", "web", "tests"),
    join(rootDir, "apps", "api", "src", "modules"),
    join(rootDir, "scripts"),
  ];

  return testRoots
    .flatMap((testRoot) => walkFiles(testRoot, (file) => file.endsWith(".test.ts") || file.endsWith(".test.tsx") || file.endsWith(".spec.ts") || file.endsWith(".spec.tsx") || file.endsWith(".test.mjs")))
    .map((file) => relative(rootDir, file).replace(/\\/g, "/"))
    .sort((a, b) => a.localeCompare(b));
}

function reportPrintInventory() {
  const sourceRoot = join(rootDir, "apps", "web", "src");
  return walkFiles(sourceRoot, (file) => file.endsWith(".tsx") || file.endsWith(".ts"))
    .flatMap((file) => {
      const source = readFileSync(file, "utf8");
      const relativePath = relative(rootDir, file).replace(/\\/g, "/");
      const capabilities = [];

      if (/openPrintDocument/.test(source)) {
        capabilities.push("print-preview");
      }
      if (/downloadCsvFile/.test(source)) {
        capabilities.push("csv-download");
      }
      if (/download|Download|export|Export/.test(source)) {
        capabilities.push("download-or-export-copy");
      }
      if (/report|Report|receipt|Receipt|statement|Statement/.test(source)) {
        capabilities.push("report-document-copy");
      }

      return Array.from(new Set(capabilities)).map((capability) => ({
        file: relativePath,
        capability,
        status: "DISCOVERED_NOT_MANUALLY_VERIFIED",
      }));
    })
    .sort((a, b) => `${a.file}:${a.capability}`.localeCompare(`${b.file}:${b.capability}`));
}

function prismaModelInventory() {
  const schemaPath = join(rootDir, "prisma", "schema.prisma");
  if (!existsSync(schemaPath)) {
    return [];
  }

  const schema = readFileSync(schemaPath, "utf8");
  return Array.from(schema.matchAll(/model\s+(\w+)\s+\{([\s\S]*?)\n\}/g), (match) => {
    const body = match[2];
    const hasSchoolScope = /\bschool_id\b|\bschoolId\b/.test(body);
    const hasTenantScope = /\btenant_id\b|\btenantId\b/.test(body);
    return {
      model: match[1],
      scope: hasSchoolScope && hasTenantScope ? "school_id + tenant_id" : hasSchoolScope ? "school_id" : hasTenantScope ? "tenant_id" : "global-or-needs-review",
    };
  }).sort((a, b) => a.model.localeCompare(b.model));
}

function packageInventory() {
  const appsRoot = join(rootDir, "apps");
  if (!existsSync(appsRoot)) {
    return [];
  }

  return readdirSync(appsRoot)
    .map((name) => join(appsRoot, name, "package.json"))
    .filter(existsSync)
    .map((packagePath) => {
      const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
      return {
        name: pkg.name ?? relative(rootDir, dirname(packagePath)),
        path: relative(rootDir, packagePath).replace(/\\/g, "/"),
        scripts: Object.keys(pkg.scripts ?? {}),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function renderList(items, renderItem) {
  if (items.length === 0) {
    return "- No records discovered.\n";
  }

  return items.map(renderItem).join("\n") + "\n";
}

function renderMatrix() {
  const commandCenters = commandCenterInventory();
  const sidebarWorkspaces = roleSidebarWorkspaceInventory(commandCenters);
  const buttonActions = buttonActionInventory(commandCenters);
  const routeSections = routeSectionInventory();
  const controllers = apiControllerInventory();
  const backendContracts = moduleBackendContractInventory();
  const testCoverage = automatedTestCoverageInventory();
  const reportPrintCoverage = reportPrintInventory();
  const models = prismaModelInventory();
  const packages = packageInventory();
  const globallyScopedModels = models.filter((model) => model.scope === "global-or-needs-review");

  return `# MyShule School Capability Matrix

Generated: ${generatedAt}

Status: NOT_YET_MANUALLY_VERIFIED

This matrix is generated from source code so production-readiness gaps can be reviewed repeatably instead of guessed from screenshots. It is an inventory, not a claim that every listed workflow is complete.

## Apps And Packages
${renderList(packages, (pkg) => `- ${pkg.name} (${pkg.path}) - scripts: ${pkg.scripts.length ? pkg.scripts.join(", ") : "none"}`)}
## Role Dashboard Inventory
${renderList(commandCenters, (center) => `- ${center.role}: ${center.file}`)}
## Role Sidebar And Workspace Inventory
| Role | Sidebar label | Workspace id | Source | Status |
| --- | --- | --- | --- | --- |
${sidebarWorkspaces.length ? sidebarWorkspaces.map((item) => `| ${item.role} | ${item.label} | ${item.workspaceId} | ${item.source} | ${item.status} |`).join("\n") : "| None discovered | - | - | - | - |"}

## Button And Action Inventory
| Role | Component | Label | Source | Handler | Status |
| --- | --- | --- | --- | --- | --- |
${buttonActions.length ? buttonActions.map((item) => `| ${item.role} | ${item.component} | ${item.label} | ${item.source} | ${item.handler} | ${item.status} |`).join("\n") : "| None discovered | - | - | - | - | - |"}

## Frontend Route Section Inventory
${renderList(routeSections, (set) => `- ${set.name}: ${set.sections.length} sections${set.sections.length ? ` - ${set.sections.join(", ")}` : ""}`)}
## API Controller Inventory
${renderList(controllers, (controller) => `- ${controller.className} (${controller.file}) - @Controller(${controller.controllerPath || "root"}) - ${controller.methods.length} route handlers`)}
## Workflow Backend Contract Inventory
${renderList(backendContracts, (contract) => `- ${contract.module} | controllers=${contract.controllers} | services=${contract.services} | tests=${contract.tests}`)}
## Automated Test Coverage Inventory
${renderList(testCoverage, (testFile) => `- ${testFile}`)}
## Report And Print Inventory
${renderList(reportPrintCoverage, (item) => `- ${item.file} | ${item.capability} | ${item.status}`)}
## Database Model Tenant-Scope Inventory
${renderList(models, (model) => `- ${model.model}: ${model.scope}`)}
## Tenant-Scope Review Queue
${renderList(globallyScopedModels.slice(0, 120), (model) => `- ${model.model}: confirm this is truly global or add school/tenant scoping before school-owned use.`)}
${globallyScopedModels.length > 120 ? `- ${globallyScopedModels.length - 120} additional global-or-review models omitted from this summary.\n` : ""}
## Activation Dependency Graph
- 1. Super Admin creates school and invites first Principal.
- 2. Principal accepts invitation and sees a clean school activation checklist.
- 3. Principal confirms enabled modules and basic school profile.
- 4. Deputy/Principal create academic years, terms, classes, streams, departments, subjects, and grading policies.
- 5. Principal invites staff and assigns roles, departments, classes, subjects, dorms, routes, or work areas.
- 6. Admissions Officer creates applicants and admits learners into the school-specific class structure.
- 7. Accountant configures fee structures before invoicing or accepting payments.
- 8. Teachers mark attendance, enter lessons, and later submit marks only for assigned classes/subjects.
- 9. HOD/Dean/Exams Manager moderate marks, generate report cards, and publish only approved results.
- 10. Parent and student portals expose only linked, published, school-scoped records.

## Go-Live Evidence Still Required
- Manual Gmail verification scripts in docs/MANUAL_GMAIL_VERIFICATION_SCRIPTS.md must be executed against production accounts.
- Provider delivery must be verified with real Resend/SMS/M-Pesa credentials and logs.
- Every global-or-review Prisma model above must be confirmed as truly global or hardened with school/tenant scope before being used for school-owned data.
- Every role dashboard listed above still needs route-by-route manual smoke verification after each deployment.
`;
}

function renderManualVerificationScripts() {
  return `# Manual Gmail Verification Scripts

Generated: ${generatedAt}

Status: NOT_YET_MANUALLY_VERIFIED

Use these scripts with real Gmail inboxes and production/staging credentials. Mark a script passed only after the email, link, route, dashboard, data persistence, audit entry, and cross-school isolation expectations are confirmed.

${manualVerificationJourneys
  .map(
    (journey, index) => `## ${journey.title}

- Script ID: MGV-${String(index + 1).padStart(2, "0")}
- Account: manual Gmail account to be supplied by the tester
- Primary actor: ${journey.actor}
- Role: ${journey.actor}
- Invitation sender: ${index === 0 ? "Super Admin" : "Role owner for the workflow"}
- Expected email: recipient-specific MyShule workflow email where the journey sends mail; otherwise not applicable
- Expected email subject: MyShule workflow subject containing the school or action name
- Expected invitation link: must point to the configured PUBLIC_APP_URL or WEB_APP_URL and preserve token, school, role, and expiry where applicable
- Login route: role-specific MyShule login or invitation acceptance route
- Dashboard: role-specific dashboard for ${journey.actor}
- Navigation: open the relevant sidebar workspace for this journey
- Data to enter: realistic Kenyan school test data only; no real student data
- Receiving role: intended downstream role or portal recipient for this journey
- Expected notification: truthful in-app/email/SMS queued, sent, delivered, failed, or not applicable state
- Expected report: preview, download, print, generated artifact, queued job, or not applicable
- Expected audit event: school-scoped event or audit entry for successful mutation; failure event where the workflow fails
- Expected outcome: ${journey.outcome}
- Expected result: completed workflow is visible only in the intended school and relevant receiving dashboards
- Failure symptoms: internal server error, invalid token, wrong school data, fake success, missing audit, missing email, missing report, or cross-tenant visibility
- Screenshot checkpoints: before submit, after submit, received email, accepted link, resulting dashboard record, audit/notification/report evidence
- Pass/fail: NOT_YET_MANUALLY_VERIFIED
- Notes: 
- Defect: 
- Preconditions:
  - Use a non-demo school unless the script explicitly tests the demo tenant.
  - Confirm the actor is logged into the intended role and school.
  - Record the sender, recipient Gmail account, timestamp, and school slug.
- Steps:
  1. Start from the correct role dashboard.
  2. Open the relevant sidebar workspace and confirm it is not a copied generic workspace.
  3. Perform the primary school task with realistic Kenyan school data.
  4. Confirm validation blocks incomplete or invalid fields.
  5. Submit once and confirm the UI shows loading, truthful success or truthful failure, and refreshed data.
  6. If email is expected, open Gmail and confirm the message content, link target, school name, role, expiry, and recipient match.
  7. Click the link and complete the next workflow step from a clean browser profile where appropriate.
  8. Confirm the resulting record is visible only inside the intended school and role-permitted dashboards.
  9. Confirm audit logs, notifications, reports, or printable artifacts exist where required.
  10. Attempt a cross-school route or ID access check and confirm denial or empty scoped data.
- Evidence to capture:
  - Screenshot before submit.
  - Screenshot after submit.
  - Email header and body screenshot if email is involved.
  - Accepted/created record screenshot.
  - Audit or notification screenshot.
  - Any server/provider log IDs.
- Result: NOT_YET_MANUALLY_VERIFIED
- Defect links: none recorded yet.
`,
  )
  .join("\n")}
`;
}

function writeGeneratedDocs() {
  mkdirSync(docsDir, { recursive: true });
  writeFileSync(join(docsDir, "SCHOOL_CAPABILITY_MATRIX.md"), renderMatrix(), "utf8");
  writeFileSync(join(docsDir, "MANUAL_GMAIL_VERIFICATION_SCRIPTS.md"), renderManualVerificationScripts(), "utf8");
}

writeGeneratedDocs();
console.log("Generated docs/SCHOOL_CAPABILITY_MATRIX.md");
console.log("Generated docs/MANUAL_GMAIL_VERIFICATION_SCRIPTS.md");
