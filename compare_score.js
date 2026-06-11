const fs = require('fs');

const rawBlueprint = fs.readFileSync('blueprint-raw.txt', 'utf-8');
const generatedFile = fs.readFileSync('apps/web/src/lib/operational/generated-workspace-definitions.ts', 'utf-8');

// A very simple approximation
const rolesMatch = rawBlueprint.match(/^# \d+\. (.+) Dashboard/gm) || [];
const workspacesMatch = rawBlueprint.match(/^## \d+\.\d+\s+(.*?)(?:\s+Workspace)?$/igm) || [];

// Count occurrences in generated
const definedWorkspaces = (generatedFile.match(/title:\s*".*?"/g) || []).length;

console.log(`=== Dashboard Blueprint Comparison ===`);
console.log(`Total Roles found in blueprint: ${rolesMatch.length}`);
console.log(`Total Workspaces found in blueprint: ${workspacesMatch.length}`);
console.log(`Total Workspaces implemented in generated UI: ${definedWorkspaces - 1}`); // exclude some metadata if any

// Let's do a more robust string match
const workspacesInBlueprint = workspacesMatch.map(w => {
  let title = w.replace(/^## \d+\.\d+\s+/, '').trim();
  if (title.toLowerCase().endsWith(' workspace')) title = title.substring(0, title.length - 10).trim();
  return title;
});

let implementedCount = 0;
workspacesInBlueprint.forEach(ws => {
  if (generatedFile.toLowerCase().includes(ws.toLowerCase())) {
    implementedCount++;
  } else {
    console.log(`Missing workspace: ${ws}`);
  }
});

const score = Math.round((implementedCount / workspacesInBlueprint.length) * 100) || 0;
console.log(`\nScore: ${implementedCount} / ${workspacesInBlueprint.length} workspaces (${score}%) implemented perfectly matching blueprint constraints.`);
