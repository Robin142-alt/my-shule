const fs = require('fs');
const path = require('path');

const PROJECT_DIR = 'C:\\Users\\user\\Desktop\\PROJECTS\\Shule hub';
const scanResultsFile = path.join(PROJECT_DIR, '.agents', 'worker', 'audit_scan_results.json');
const data = JSON.parse(fs.readFileSync(scanResultsFile, 'utf8'));

const actuals = data.wiredEndpoints.map(w => w.actual).concat(data.extraBackendRoutes);

console.log('--- ACTUAL INVENTORY ENDPOINTS ---');
actuals.filter(a => a.normalizedPath.includes('inventory')).forEach(a => {
  console.log(`- ${a.httpMethod} ${a.normalizedPath} -> ${a.controller}.${a.method}`);
});
