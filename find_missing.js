const fs = require('fs');

const rawBlueprint = fs.readFileSync('blueprint-raw.txt', 'utf-8');
const generatedFile = fs.readFileSync('apps/web/src/lib/operational/generated-workspace-definitions.ts', 'utf-8');

const lines = rawBlueprint.split('\n');

let currentWorkspace = null;
let currentSection = null;

const blueprintMap = {};

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  const lowerLine = line.toLowerCase();
  
  if (line.startsWith('## ') && line.includes('Workspace')) {
    currentWorkspace = line.replace('## ', '').trim();
    if (!blueprintMap[currentWorkspace]) {
      blueprintMap[currentWorkspace] = { buttons: [], columns: [], rowActions: [] };
    }
  } else if (lowerLine.startsWith('buttons:')) {
    currentSection = 'buttons';
  } else if (lowerLine.startsWith('table:') || lowerLine.startsWith('table columns:') || lowerLine.match(/table$/)) {
    currentSection = 'columns';
  } else if (lowerLine.startsWith('row actions:')) {
    currentSection = 'rowActions';
  } else if (line.match(/^[A-Za-z0-9\s\/&]+:/) && !line.startsWith('*') && !line.startsWith('-')) {
    currentSection = null;
  }

  if (currentWorkspace && currentSection && (line.startsWith('* ') || line.startsWith('- '))) {
    const item = line.replace(/^[\*\-]\s*/, '').trim();
    blueprintMap[currentWorkspace][currentSection].push(item.toLowerCase());
  }
}

const workspaceRegex = /id:\s*"([^"]+)",\s*title:\s*"([^"]+)"([\s\S]*?)(?=(?:id:\s*"[^"]+",\s*title:\s*"[^"]+")|$)/gs;

const generatedMap = {};
let match;
while ((match = workspaceRegex.exec(generatedFile)) !== null) {
  const wsId = match[1];
  const wsName = match[2];
  const content = match[3];
  
  const buttonsMatch = content.match(/urgentActionStrip:\s*\[(.*?)\]/s);
  const tableMatch = content.match(/mainTable:\s*table\([^,]+,\s*\[(.*?)\],\s*\[(.*?)\]/s);
  
  const buttons = [];
  if (buttonsMatch) {
    const items = buttonsMatch[1].split(',').map(x => x.replace(/['"]/g, '').trim().toLowerCase()).filter(x => x.length > 0 && x !== 'refresh');
    buttons.push(...items);
  }
  
  const columns = [];
  const rowActions = [];
  if (tableMatch) {
    const cols = tableMatch[1].split(',').map(x => x.replace(/['"]/g, '').trim().toLowerCase()).filter(x => x.length > 0 && x !== 'name' && x !== 'actions');
    columns.push(...cols);
    
    const acts = tableMatch[2].split(',').map(x => x.replace(/['"]/g, '').trim().toLowerCase()).filter(x => x.length > 0 && x !== 'view');
    rowActions.push(...acts);
  }
  
  generatedMap[wsName.toLowerCase()] = { buttons, columns, rowActions };
}

let missingCount = 0;
let extraCount = 0;
let matchCount = 0;

for (const [wsName, bpData] of Object.entries(blueprintMap)) {
  const cleanBpName = wsName.replace(/^[0-9\.]+\s+/, '').replace(/\s+Workspace$/i, '').toLowerCase().trim();
  
  let foundKey = Object.keys(generatedMap).find(k => k.trim() === cleanBpName);
  
  if (foundKey) {
    matchCount++;
    const genData = generatedMap[foundKey];
    
    const missingButtons = bpData.buttons.filter(b => !genData.buttons.includes(b));
    const missingColumns = bpData.columns.filter(c => !genData.columns.includes(c));
    const missingActions = bpData.rowActions.filter(a => !genData.rowActions.includes(a));
    
    if (missingButtons.length > 0 || missingColumns.length > 0 || missingActions.length > 0) {
      console.log(`\nWorkspace [${cleanBpName}] Missing Items:`);
      if (missingButtons.length) console.log(`  Buttons: ${missingButtons.join(', ')}`);
      if (missingColumns.length) console.log(`  Columns: ${missingColumns.join(', ')}`);
      if (missingActions.length) console.log(`  RowActions: ${missingActions.join(', ')}`);
      missingCount += missingButtons.length + missingColumns.length + missingActions.length;
    }
  } else {
    console.log(`Could not find generated workspace for: ${cleanBpName}`);
  }
}

console.log(`\nMatched Workspaces: ${matchCount}`);
console.log(`Total Missing: ${missingCount}`);
