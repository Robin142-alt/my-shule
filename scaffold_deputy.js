const fs = require('fs');

const text = fs.readFileSync('blueprint-deputy-principal.txt', 'utf-8');
const lines = text.split('\n');

const workspaces = [];
let currentWorkspace = null;
let currentRole = "Deputy Principal";
let currentSection = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  // Match Workspace e.g., "# 1. Overview Workspace" or "## 3.1 Overview"
  const workspaceMatch = line.match(/^# \d+\.\s+(.*?)(?:\s+Workspace)?$/i) || line.match(/^## \d+\.\d+\s+(.*?)(?:\s+Workspace)?$/i);
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
  
  if (lowerLine.startsWith("cards:") || lowerLine.startsWith("summary cards:") || lowerLine.startsWith("## top summary cards")) {
    currentSection = "cards";
    continue;
  } else if (lowerLine.startsWith("buttons:") || lowerLine.startsWith("primary buttons:")) {
    currentSection = "buttons";
    continue;
  } else if (lowerLine.startsWith("table:") || lowerLine.startsWith("table columns:") || lowerLine.match(/table$/) || lowerLine.startsWith("## main table")) {
    currentSection = "table";
    continue;
  } else if (lowerLine.startsWith("row actions:") || lowerLine.startsWith("## row actions")) {
    currentSection = "row_actions";
    continue;
  } else if (lowerLine.includes("form:") || lowerLine.startsWith("## create") || lowerLine.includes("modal:") || lowerLine.includes("drawer:")) {
    currentSection = "form";
    currentWorkspace.forms.push({
      title: line.replace(/#/g, "").replace(/:/g, "").trim(),
      fields: [],
      actions: ["Save", "Cancel"]
    });
    continue;
  } else if (lowerLine.startsWith("reports:") || lowerLine.startsWith("downloads:") || lowerLine.startsWith("reports/downloads:")) {
    currentSection = "reports";
    continue;
  } else if (line.match(/^[A-Za-z\s]+:/) && !line.startsWith("*") && !line.startsWith("-")) {
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

  // Also parse markdown tables
  if (currentSection === "table" && line.startsWith("|") && !line.includes("---")) {
    const cols = line.split("|").map(s => s.trim()).filter(s => s !== "");
    if (cols.length > 0 && cols[0].toLowerCase() !== "column" && cols[0].toLowerCase() !== "actions") {
        if (currentWorkspace.mainTable.columns.length === 0 || !currentWorkspace.mainTable.columns.includes(cols[0])) {
             cols.forEach(c => currentWorkspace.mainTable.columns.push(c));
        }
    }
  }
}

if (currentWorkspace) workspaces.push(currentWorkspace);

let output = "";

workspaces.forEach(ws => {
  if (ws.mainTable.columns.length === 0) ws.mainTable.columns = ["Name", "Status", "Actions"];
  if (ws.mainTable.rowActions.length === 0) ws.mainTable.rowActions = ["View", "Edit"];
  if (ws.urgentActionStrip.length === 0) ws.urgentActionStrip = ["Refresh"];
  if (ws.sampleData.length === 0) ws.sampleData = ["No active items"];
  
  const formsStr = ws.forms.map((f) => `form(${JSON.stringify(f.title)}, ${JSON.stringify(f.fields)}, ${JSON.stringify(f.actions)})`).join(', ');

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

const targetFile = 'apps/web/src/lib/operational/generated-workspace-definitions.ts';
let targetContent = fs.readFileSync(targetFile, 'utf-8');

// Insert the new workspace definitions right before the last closing bracket "];"
const insertionIndex = targetContent.lastIndexOf("];");
if (insertionIndex !== -1) {
    targetContent = targetContent.substring(0, insertionIndex) + output + targetContent.substring(insertionIndex);
    fs.writeFileSync(targetFile, targetContent);
    console.log("Successfully appended " + workspaces.length + " workspaces to " + targetFile);
} else {
    console.log("Could not find closing bracket in generated-workspace-definitions.ts");
}
