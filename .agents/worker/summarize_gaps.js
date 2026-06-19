const fs = require('fs');
const path = require('path');

const PROJECT_DIR = 'C:\\Users\\user\\Desktop\\PROJECTS\\Shule hub';
const scanResultsFile = path.join(PROJECT_DIR, '.agents', 'worker', 'audit_scan_results.json');
const data = JSON.parse(fs.readFileSync(scanResultsFile, 'utf8'));

const missing = data.missingEndpoints;

function extractCleanPath(rawPath) {
  const quoteMatch = rawPath.match(/['"`]((?:\/api|\/admin-command)?\/[a-zA-Z0-9_\-\/:\$#\{\}\[\]\.\+]+)['"`]/);
  if (quoteMatch) {
    return quoteMatch[1];
  }
  
  const pathMatch = rawPath.match(/((?:\/api|\/admin-command)?\/[a-zA-Z0-9_\-\/:\$#\{\}\[\]\.\+]+)/);
  if (pathMatch) {
    return pathMatch[1];
  }
  
  return rawPath;
}

const uniqueCleanMissing = new Map();

missing.forEach(m => {
  const method = m.expected.method;
  const rawPath = m.expected.path;
  const cleanPath = extractCleanPath(rawPath);
  
  let norm = cleanPath.trim();
  const queryIdx = norm.indexOf('?');
  if (queryIdx !== -1) {
    norm = norm.substring(0, queryIdx);
  }
  norm = norm.replace(/^['"`]+|['"`]+$/g, '');
  if (norm.startsWith('/api/v1/')) norm = norm.substring(7);
  else if (norm.startsWith('/api/')) norm = norm.substring(4);
  else if (norm.startsWith('api/v1/')) norm = '/' + norm.substring(7);
  else if (norm.startsWith('api/')) norm = '/' + norm.substring(4);
  
  if (!norm.startsWith('/')) norm = '/' + norm;
  if (norm.endsWith('/') && norm.length > 1) norm = norm.slice(0, -1);
  
  norm = norm.replace(/\$\{baseUrl\}/g, '');
  norm = norm.replace(/\$\{apiBase\}/g, '');
  norm = norm.replace(/\$\{apiBaseUrl\}/g, '');
  norm = norm.replace(/\$\{baseUrlSchool\}/g, '');
  norm = norm.replace(/\$\{tenantId\}/g, '');
  norm = norm.replace(/\$\{tenant_id\}/g, '');
  norm = norm.replace(/\$\{[^}]+\}/g, ':param');
  norm = norm.replace(/\/:[a-zA-Z0-9_]+/g, '/:param');
  norm = norm.replace(/\/+/g, '/');
  
  if (
    norm.includes('}') || 
    norm.includes('{') || 
    norm.includes('?') || 
    norm.includes('`') || 
    norm.includes(' ') ||
    norm === '/:param' ||
    norm === '/' ||
    norm.length < 3 ||
    norm.includes('useSchoolQuery') ||
    norm.includes('fetch')
  ) {
    return;
  }
  
  const key = `${method} ${norm}`;
  if (!uniqueCleanMissing.has(key)) {
    uniqueCleanMissing.set(key, { method, path: norm, rawPaths: new Set() });
  }
  uniqueCleanMissing.get(key).rawPaths.add(rawPath);
});

console.log('Total Clean Reconciled Missing Endpoints:', uniqueCleanMissing.size);

const actualRoutesMap = new Map();
data.extraBackendRoutes.concat(data.wiredEndpoints.map(w => w.actual)).forEach(r => {
  const key = `${r.httpMethod} ${r.normalizedPath}`;
  actualRoutesMap.set(key, r);
});

const finalMissing = [];
uniqueCleanMissing.forEach((val, key) => {
  if (!actualRoutesMap.has(key)) {
    finalMissing.push(val);
  }
});

console.log('Verified Clean Missing Endpoints (not in backend at all):', finalMissing.length);

const groups = {};
finalMissing.forEach(m => {
  const segments = m.path.split('/').filter(Boolean);
  const moduleName = segments[0] || 'other';
  if (!groups[moduleName]) {
    groups[moduleName] = [];
  }
  groups[moduleName].push(m);
});

const serializedGroups = {};
for (const [mod, list] of Object.entries(groups)) {
  serializedGroups[mod] = list.map(item => ({
    method: item.method,
    path: item.path,
    rawPaths: Array.from(item.rawPaths)
  }));
}

fs.writeFileSync(
  path.join(PROJECT_DIR, '.agents', 'worker', 'clean_gaps.json'),
  JSON.stringify({
    summary: {
      totalMissing: finalMissing.length,
      modulesCount: Object.keys(groups).length
    },
    modules: serializedGroups
  }, null, 2),
  'utf8'
);
