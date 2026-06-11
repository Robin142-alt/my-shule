import fs from "fs";

const text = fs.readFileSync("blueprint.txt", "utf-8");

// We'll parse the blueprint looking for "## X.Y Workspace Name"
// and extract the Cards, Tables, Forms, Buttons, etc.
const lines = text.split("\n");

const workspaces: any[] = [];
let currentWorkspace: any = null;
let currentSection: string | null = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  if (line.match(/^## \d+\.\d+ /)) {
    if (currentWorkspace) workspaces.push(currentWorkspace);
    
    let title = line.replace(/^## \d+\.\d+ /, "").replace(/ Workspace$/i, "").trim();
    currentWorkspace = {
      id: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      title: title,
      commandQuestion: "What would you like to do in " + title + "?",
      roleFocus: "Standard " + title + " operations",
      urgentActions: [],
      queues: [],
      tables: [],
      forms: [],
      printOutputs: [],
      sampleData: ["Active", "Pending", "Resolved"],
      states: ["LOADING", "EMPTY", "DEGRADED", "FAILED", "LOCKED"]
    };
    currentSection = null;
    continue;
  }
  
  if (!currentWorkspace) continue;
  
  if (line.startsWith("Cards:") || line.startsWith("Summary cards:")) {
    currentSection = "cards";
    continue;
  } else if (line.startsWith("Buttons:") || line.startsWith("Urgent Actions:")) {
    currentSection = "buttons";
    continue;
  } else if (line.match(/table:$/i) || line.match(/Table columns:$/i) || line.startsWith("Table:")) {
    currentSection = "table";
    currentWorkspace.tables.push({
      id: currentWorkspace.id + "-table-" + currentWorkspace.tables.length,
      title: line.replace(":", ""),
      columns: [],
      rowActions: ["View", "Edit", "View Audit"],
      bulkActions: ["Export Excel", "Archive Selected"]
    });
    continue;
  } else if (line.match(/form:$/i) || line.match(/Form:$/i)) {
    currentSection = "form";
    currentWorkspace.forms.push({
      id: currentWorkspace.id + "-form-" + currentWorkspace.forms.length,
      title: line.replace(":", ""),
      purpose: "Standard data entry form",
      fields: [],
      footerActions: ["Cancel", "Save Draft", "Submit"],
      auditAction: "FORM_SUBMITTED"
    });
    continue;
  } else if (line.startsWith("Reports:") || line.startsWith("Downloads:")) {
    currentSection = "reports";
    continue;
  } else if (line.startsWith("Row actions:")) {
    currentSection = "row_actions";
    continue;
  } else if (line.startsWith("Queue:")) {
    currentSection = "queue";
    currentWorkspace.queues.push({
      id: currentWorkspace.id + "-queue-" + currentWorkspace.queues.length,
      title: line.replace(":", ""),
      owner: "System",
      priority: "Medium",
      workflow: "Pending -> In Progress -> Resolved",
      actions: ["Review", "Resolve"],
      auditEvent: "QUEUE_ITEM_RESOLVED"
    });
    continue;
  } else if (line.match(/^[A-Za-z]+:/) && !line.startsWith("*")) {
    currentSection = null;
  }

  if (line.startsWith("*") || line.startsWith("-")) {
    const item = line.replace(/^[* -]+\s*/, "");
    if (currentSection === "cards") {
      currentWorkspace.sampleData.push(item);
    } else if (currentSection === "buttons") {
      currentWorkspace.urgentActions.push(item);
    } else if (currentSection === "table") {
      const currentTable = currentWorkspace.tables[currentWorkspace.tables.length - 1];
      if (currentTable) {
        currentTable.columns.push(item);
      }
    } else if (currentSection === "form") {
      const currentForm = currentWorkspace.forms[currentWorkspace.forms.length - 1];
      if (currentForm) {
        currentForm.fields.push(item);
      }
    } else if (currentSection === "reports") {
      currentWorkspace.printOutputs.push(item);
    } else if (currentSection === "row_actions") {
      const currentTable = currentWorkspace.tables[currentWorkspace.tables.length - 1];
      if (currentTable) {
        if (!currentTable.rowActions.includes(item)) {
          currentTable.rowActions.push(item);
        }
      }
    }
  }
}

if (currentWorkspace) workspaces.push(currentWorkspace);

// Output logic to generate TypeScript
const tsOutput = `import { type ExtremeErpBlueprint, type OperationalState, type OperationalQueue, type OperationalFormBlueprint, type OperationalTableBlueprint } from "./extreme-erp-blueprints";

export const generatedBlueprintRegistry: ExtremeErpBlueprint[] = ${JSON.stringify(workspaces, null, 2)};
`;

fs.writeFileSync("apps/web/src/lib/operational/generated-blueprints.ts", tsOutput);
console.log("Successfully generated " + workspaces.length + " workspaces.");
