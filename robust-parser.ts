import fs from 'fs';

const text = fs.readFileSync('blueprint-raw.txt', 'utf-8');
const lines = text.split('\n');

const workspaces: any[] = [];
let currentWorkspace: any = null;
let currentRole: string | null = null;
let currentSection: string | null = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  // Match Role e.g., "# 1. Super Admin Dashboard"
  const roleMatch = line.match(/^# \d+\. (.+) Dashboard/);
  if (roleMatch) {
    currentRole = roleMatch[1].trim();
    continue;
  }
  
  // Match Workspace e.g., "## 1.1 Platform Overview Workspace"
  const workspaceMatch = line.match(/^## \d+\.\d+\s+(.*?)(?:\s+Workspace)?$/i);
  if (workspaceMatch) {
    if (currentWorkspace) workspaces.push(currentWorkspace);
    
    let title = workspaceMatch[1].trim();
    if (title.toLowerCase().endsWith(" workspace")) title = title.substring(0, title.length - 10).trim();
    
    currentWorkspace = {
      id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title: title,
      role: currentRole,
      uniqueSidebar: [title],
      urgentActionStrip: [],
      mainTable: {
        title: title + " Table",
        columns: [],
        rowActions: [],
        bulkActions: ["Export selected"]
      },
      forms: [],
      printOutputs: [],
      sampleData: [],
      states: ["LOADING", "EMPTY", "DEGRADED", "FAILED", "LOCKED"]
    };
    currentSection = null;
    continue;
  }
  
  if (!currentWorkspace) continue;
  
  const lowerLine = line.toLowerCase();
  
  if (lowerLine.startsWith("cards:") || lowerLine.startsWith("summary cards:")) {
    currentSection = "cards";
    continue;
  } else if (lowerLine.startsWith("buttons:")) {
    currentSection = "buttons";
    continue;
  } else if (lowerLine.startsWith("table:") || lowerLine.startsWith("table columns:") || lowerLine.match(/table$/)) {
    currentSection = "table";
    continue;
  } else if (lowerLine.startsWith("row actions:")) {
    currentSection = "row_actions";
    continue;
  } else if (lowerLine.includes("form:")) {
    currentSection = "form";
    currentWorkspace.forms.push({
      title: line.replace(":", ""),
      fields: [],
      actions: ["Save", "Cancel"]
    });
    continue;
  } else if (lowerLine.startsWith("reports:") || lowerLine.startsWith("downloads:") || lowerLine.startsWith("reports/downloads:")) {
    currentSection = "reports";
    continue;
  } else if (line.match(/^[A-Za-z\s]+:/) && !line.startsWith("*") && !line.startsWith("-")) {
    // Reset section if it's a new unrecognized header like "Purpose:", "Main areas:", etc.
    currentSection = null;
  }

  // Parse list items
  if (line.startsWith("*") || line.startsWith("-")) {
    const item = line.replace(/^[* -]+\s*/, "");
    if (currentSection === "cards") {
      currentWorkspace.sampleData.push(item);
    } else if (currentSection === "buttons") {
      currentWorkspace.urgentActionStrip.push(item);
    } else if (currentSection === "table") {
      currentWorkspace.mainTable.columns.push(item);
    } else if (currentSection === "row_actions") {
      currentWorkspace.mainTable.rowActions.push(item);
    } else if (currentSection === "form") {
      const currentForm = currentWorkspace.forms[currentWorkspace.forms.length - 1];
      if (currentForm) currentForm.fields.push(item);
    } else if (currentSection === "reports") {
      currentWorkspace.printOutputs.push(item);
    }
  }
}

if (currentWorkspace) workspaces.push(currentWorkspace);

// Convert to ExtremeErpBlueprint structure string
let output = `import { type DocxAddedModuleContract, moduleContract, table, form } from "./myshule-extreme-operating-system";

export const generatedWorkspaceDefinitions: DocxAddedModuleContract[] = [
`;

workspaces.forEach(ws => {
  // Fix empty arrays
  if (ws.mainTable.columns.length === 0) ws.mainTable.columns = ["Name", "Status", "Actions"];
  if (ws.mainTable.rowActions.length === 0) ws.mainTable.rowActions = ["View", "Edit"];
  if (ws.urgentActionStrip.length === 0) ws.urgentActionStrip = ["Refresh"];
  if (ws.sampleData.length === 0) ws.sampleData = ["No active items"];
  
  const formsStr = ws.forms.map((f: any) => `form(${JSON.stringify(f.title)}, ${JSON.stringify(f.fields)}, ${JSON.stringify(f.actions)})`).join(', ');

  output += `  moduleContract({
    id: ${JSON.stringify(ws.id)},
    title: ${JSON.stringify(ws.title)},
    uniqueSidebar: ${JSON.stringify(ws.uniqueSidebar)},
    urgentActionStrip: ${JSON.stringify(ws.urgentActionStrip)},
    mainTable: table(${JSON.stringify(ws.mainTable.title)}, ${JSON.stringify(ws.mainTable.columns)}, ${JSON.stringify(ws.mainTable.rowActions)}, ${JSON.stringify(ws.mainTable.bulkActions)}),
    forms: [${formsStr}],
    rightDetailsDrawer: ["audit history", "recent activity"],
    approvalWorkflow: "Draft -> Submitted -> Approved",
    smsTriggers: [],
    printOutputs: ${JSON.stringify(ws.printOutputs)},
    permissionChecks: [],
    sampleData: ${JSON.stringify(ws.sampleData)}
  }),\n`;
});

output += `];\n`;

fs.writeFileSync("apps/web/src/lib/operational/generated-workspace-definitions.ts", output);
console.log("Successfully generated " + workspaces.length + " workspaces.");
