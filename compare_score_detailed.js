const fs = require('fs');

const rawBlueprint = fs.readFileSync('blueprint-raw.txt', 'utf-8');
const generatedFile = fs.readFileSync('apps/web/src/lib/operational/generated-workspace-definitions.ts', 'utf-8');

const lines = rawBlueprint.split('\n');

let totalButtons = 0;
let totalColumns = 0;
let totalRowActions = 0;

let currentSection = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  const lowerLine = line.toLowerCase();
  
  if (lowerLine.startsWith("buttons:")) {
    currentSection = "buttons";
    continue;
  } else if (lowerLine.startsWith("table:") || lowerLine.startsWith("table columns:") || lowerLine.match(/table$/)) {
    currentSection = "table";
    continue;
  } else if (lowerLine.startsWith("row actions:")) {
    currentSection = "row_actions";
    continue;
  } else if (line.match(/^[A-Za-z0-9\s\/&]+:/) && !line.startsWith("*") && !line.startsWith("-")) {
    currentSection = null;
  }

  if (line.startsWith("*") || line.startsWith("-")) {
    if (currentSection === "buttons") totalButtons++;
    else if (currentSection === "table") totalColumns++;
    else if (currentSection === "row_actions") totalRowActions++;
  }
}

// Check in generated file
// `urgentActionStrip` corresponds to buttons
// `mainTable.columns` to columns
// `mainTable.rowActions` to row actions

const matchButtons = [...generatedFile.matchAll(/urgentActionStrip:\s*\[(.*?)\]/gs)];
const matchColumns = [...generatedFile.matchAll(/mainTable:\s*table\([^,]+,\s*\[(.*?)\],\s*\[(.*?)\]/gs)];

let genButtons = 0;
matchButtons.forEach(m => {
  const items = m[1].split(',').filter(x => x.trim().length > 0);
  // remove default "Refresh"
  if (!(items.length === 1 && items[0].includes('Refresh'))) {
    genButtons += items.length;
  }
});

let genColumns = 0;
let genRowActions = 0;
matchColumns.forEach(m => {
  const cols = m[1].split(',').filter(x => x.trim().length > 0);
  if (!(cols.length === 3 && cols[0].includes('Name') && cols[2].includes('Actions'))) {
    genColumns += cols.length;
  }
  
  const actions = m[2].split(',').filter(x => x.trim().length > 0);
  if (!(actions.length === 2 && actions[0].includes('View'))) {
    genRowActions += actions.length;
  }
});

console.log(`=== In-Depth Feature Comparison ===`);
console.log(`Required Buttons (Blueprint): ${totalButtons}`);
console.log(`Implemented Buttons: ${genButtons}`);
console.log(`Required Table Columns (Blueprint): ${totalColumns}`);
console.log(`Implemented Table Columns: ${genColumns}`);
console.log(`Required Row Actions (Blueprint): ${totalRowActions}`);
console.log(`Implemented Row Actions: ${genRowActions}`);

const blueprintTotal = totalButtons + totalColumns + totalRowActions;
const implementedTotal = genButtons + genColumns + genRowActions;

let percentage = 0;
if (blueprintTotal > 0) {
  percentage = Math.round((implementedTotal / blueprintTotal) * 100);
}

console.log(`\nDetailed Adherence Score: ${percentage}% (${implementedTotal}/${blueprintTotal} interactive elements mapped)`);

