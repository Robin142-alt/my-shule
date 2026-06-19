const fs = require('fs');
const path = require('path');

const rawFile = 'C:\\Users\\user\\Desktop\\PROJECTS\\Shule hub\\.agents\\explorer_frontend_1\\raw_endpoints.json';
const outFile = 'C:\\Users\\user\\Desktop\\PROJECTS\\Shule hub\\.agents\\explorer_frontend_1\\analysis.md';

const data = JSON.parse(fs.readFileSync(rawFile, 'utf8'));

// Normalization function matching the API proxy client
function normalizeApiPath(p) {
  let normalized = p.startsWith('/') ? p : '/' + p;
  return normalized.replace(/^\/api(?=\/)/, '');
}

const groups = {};

for (const ref of data) {
  const normPath = normalizeApiPath(ref.path);
  const key = `${ref.method} ${normPath}`;

  if (!groups[key]) {
    groups[key] = {
      normalizedPath: normPath,
      originalPaths: new Set(),
      method: ref.method,
      params: new Set(),
      usages: []
    };
  }

  groups[key].originalPaths.add(ref.path);
  if (ref.params) {
    ref.params.forEach(p => groups[key].params.add(p));
  }
  groups[key].usages.push({
    file: ref.file,
    line: ref.line,
    keyword: ref.keyword,
    raw: ref.raw
  });
}

// Sort groups by normalizedPath then method
const sortedKeys = Object.keys(groups).sort((a, b) => {
  const gA = groups[a];
  const gB = groups[b];
  if (gA.normalizedPath < gB.normalizedPath) return -1;
  if (gA.normalizedPath > gB.normalizedPath) return 1;
  if (gA.method < gB.method) return -1;
  if (gA.method > gB.method) return 1;
  return 0;
});

let md = `# Expected Backend API Endpoints Analysis Report\n\n`;
md += `This report lists all expected backend API endpoints extracted programmatically from the React frontend codebase (\`apps/web/src\`).\n\n`;
md += `## Summary of Findings\n\n`;
md += `- **Total Raw References Found**: ${data.length}\n`;
md += `- **Unique Endpoints Identified**: ${sortedKeys.length}\n\n`;

md += `## Unique Endpoints List\n\n`;
md += `| Method | Normalized Backend Path | Parameters | Frontend Usages (Count) |\n`;
md += `|---|---|---|---|\n`;

for (const key of sortedKeys) {
  const g = groups[key];
  const paramStr = Array.from(g.params).join(', ') || 'None';
  const usagesCount = g.usages.length;
  md += `| **${g.method}** | \`${g.normalizedPath}\` | ${paramStr} | ${usagesCount} |\n`;
}

md += `\n## Detailed Endpoints Reference\n\n`;
md += `Below is the detailed list of every unique endpoint, showing original paths referenced in the code, parameters, and the exact files and lines where they are used.\n\n`;

for (const key of sortedKeys) {
  const g = groups[key];
  md += `### ${g.method} \`${g.normalizedPath}\`\n\n`;
  md += `- **Original path(s)**: ${Array.from(g.originalPaths).map(p => `\`${p}\``).join(', ')}\n`;
  md += `- **Parameters**: ${Array.from(g.params).map(p => `\`${p}\``).join(', ') || 'None'}\n`;
  md += `- **Usages** (${g.usages.length}):\n`;
  
  // Group by file and show line numbers
  const fileUsages = {};
  for (const u of g.usages) {
    if (!fileUsages[u.file]) {
      fileUsages[u.file] = [];
    }
    fileUsages[u.file].push(u.line);
  }
  
  for (const file in fileUsages) {
    md += `  - \`${file}\`: line(s) ${fileUsages[file].join(', ')}\n`;
  }
  md += `\n---\n\n`;
}

fs.writeFileSync(outFile, md, 'utf8');
console.log(`Summary report written to ${outFile}`);
