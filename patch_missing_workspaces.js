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
      blueprintMap[currentWorkspace] = { buttons: [], columns: [], rowActions: [], rawButtons: [], rawColumns: [], rawActions: [] };
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
    
    // Store original casing for insertion
    if (currentSection === 'buttons') blueprintMap[currentWorkspace].rawButtons.push(item);
    if (currentSection === 'columns') blueprintMap[currentWorkspace].rawColumns.push(item);
    if (currentSection === 'rowActions') blueprintMap[currentWorkspace].rawActions.push(item);
  }
}

const workspaceRegex = /(id:\s*"([^"]+)",\s*title:\s*"([^"]+)"([\s\S]*?))(?=(?:id:\s*"[^"]+",\s*title:\s*"[^"]+")|$)/g;

let newContent = generatedFile;
const replacements = [];

let match;
while ((match = workspaceRegex.exec(generatedFile)) !== null) {
  const fullMatch = match[0];
  const wsId = match[2];
  const wsName = match[3];
  const content = match[4];
  
  const cleanBpName = wsName.toLowerCase().trim();
  
  // Find matching blueprint
  const foundBpKey = Object.keys(blueprintMap).find(k => {
    return k.replace(/^[0-9\.]+\s+/, '').replace(/\s+Workspace$/i, '').toLowerCase().trim() === cleanBpName;
  });
  
  if (foundBpKey) {
    const bpData = blueprintMap[foundBpKey];
    
    let newFullMatch = fullMatch;
    
    // 1. Patch urgentActionStrip
    const buttonsMatch = fullMatch.match(/urgentActionStrip:\s*\[(.*?)\]/s);
    if (buttonsMatch) {
      const existingItemsLower = buttonsMatch[1].split(',').map(x => x.replace(/['"]/g, '').trim().toLowerCase()).filter(x => x);
      const toAdd = bpData.rawButtons.filter((b, i) => !existingItemsLower.includes(bpData.buttons[i]));
      
      if (toAdd.length > 0) {
        let existingStr = buttonsMatch[1].trim();
        if (existingStr.endsWith(',')) existingStr = existingStr.slice(0, -1);
        const addStr = toAdd.map(a => `"${a.replace(/"/g, '\\"')}"`).join(',');
        const newStrip = existingStr ? `${existingStr},${addStr}` : addStr;
        newFullMatch = newFullMatch.replace(buttonsMatch[0], `urgentActionStrip: [${newStrip}]`);
      }
    }
    
    // 2. Patch mainTable
    const tableMatch = fullMatch.match(/mainTable:\s*table\(([^,]+),\s*\[(.*?)\],\s*\[(.*?)\]/s);
    if (tableMatch) {
      const tableName = tableMatch[1];
      const colsStr = tableMatch[2];
      const actsStr = tableMatch[3];
      
      const existingColsLower = colsStr.split(',').map(x => x.replace(/['"]/g, '').trim().toLowerCase()).filter(x => x);
      const existingActsLower = actsStr.split(',').map(x => x.replace(/['"]/g, '').trim().toLowerCase()).filter(x => x);
      
      const toAddCols = bpData.rawColumns.filter((c, i) => !existingColsLower.includes(bpData.columns[i]));
      const toAddActs = bpData.rawActions.filter((a, i) => !existingActsLower.includes(bpData.rowActions[i]));
      
      let newColsStr = colsStr.trim();
      if (newColsStr.endsWith(',')) newColsStr = newColsStr.slice(0, -1);
      if (toAddCols.length > 0) {
        const addStr = toAddCols.map(a => `"${a.replace(/"/g, '\\"')}"`).join(',');
        newColsStr = newColsStr ? `${newColsStr},${addStr}` : addStr;
      }
      
      let newActsStr = actsStr.trim();
      if (newActsStr.endsWith(',')) newActsStr = newActsStr.slice(0, -1);
      if (toAddActs.length > 0) {
        const addStr = toAddActs.map(a => `"${a.replace(/"/g, '\\"')}"`).join(',');
        newActsStr = newActsStr ? `${newActsStr},${addStr}` : addStr;
      }
      
      if (toAddCols.length > 0 || toAddActs.length > 0) {
        newFullMatch = newFullMatch.replace(tableMatch[0], `mainTable: table(${tableName}, [${newColsStr}], [${newActsStr}]`);
      }
    }
    
    if (newFullMatch !== fullMatch) {
      replacements.push({ old: fullMatch, new: newFullMatch });
    }
  }
}

for (const rep of replacements) {
  newContent = newContent.replace(rep.old, rep.new);
}

fs.writeFileSync('apps/web/src/lib/operational/generated-workspace-definitions.ts', newContent, 'utf-8');
console.log(`Patched ${replacements.length} workspaces with missing components.`);
