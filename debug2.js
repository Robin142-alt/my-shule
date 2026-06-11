const fs = require('fs');

const rawBlueprint = fs.readFileSync('blueprint-raw.txt', 'utf-8');
const generatedFile = fs.readFileSync('apps/web/src/lib/operational/generated-workspace-definitions.ts', 'utf-8');

const lines = rawBlueprint.split('\n');

let bpButtons = [];
let bpColumns = [];

let currentSection = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  const lowerLine = line.toLowerCase();
  
  if (lowerLine.startsWith('buttons:')) {
    currentSection = 'buttons';
    continue;
  } else if (lowerLine.startsWith('table:') || lowerLine.startsWith('table columns:') || lowerLine.match(/table$/)) {
    currentSection = 'table';
    continue;
  } else if (lowerLine.startsWith('row actions:')) {
    currentSection = 'row_actions';
    continue;
  } else if (line.match(/^[A-Za-z\s]+:/) && !line.startsWith('*') && !line.startsWith('-')) {
    currentSection = null;
  }

  if (line.startsWith('*') || line.startsWith('-')) {
    const item = line.substring(1).trim();
    if (currentSection === 'buttons') bpButtons.push(item);
    else if (currentSection === 'table') bpColumns.push(item);
  }
}

const matchColumns = [...generatedFile.matchAll(/mainTable:\s*table\([^,]+,\s*\[(.*?)\],\s*\[(.*?)\]/gs)];

let genColumns = [];
matchColumns.forEach(m => {
  const cols = m[1].split(',').filter(x => x.trim().length > 0).map(x => x.replace(/['"]/g, '').trim());
  if (!(cols.length === 3 && cols[0].includes('Name') && cols[2].includes('Actions'))) {
    genColumns.push(...cols);
  }
});

console.log('Blueprint columns:', bpColumns.length);
console.log('Generated columns:', genColumns.length);

const bpColsSorted = [...bpColumns].sort();
const genColsSorted = [...genColumns].sort();

fs.writeFileSync('bp_cols.txt', bpColsSorted.join('\n'));
fs.writeFileSync('gen_cols.txt', genColsSorted.join('\n'));
