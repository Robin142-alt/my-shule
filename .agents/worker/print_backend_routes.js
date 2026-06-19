const fs = require('fs');
const path = require('path');

const PROJECT_DIR = 'C:\\Users\\user\\Desktop\\PROJECTS\\Shule hub';
const scanResultsFile = path.join(PROJECT_DIR, '.agents', 'worker', 'audit_scan_results.json');

const data = JSON.parse(fs.readFileSync(scanResultsFile, 'utf8'));
const actuals = data.wiredEndpoints || [];
console.log('Total Actual Backend Endpoints Registered:', data.summary.totalActualBackendEndpoints);
console.log('\n--- SAMPLE WIRED ENDPOINTS (First 30) ---');
actuals.slice(0, 30).forEach(w => {
  console.log(`- ${w.key} -> controller: ${w.actual.controller}, method: ${w.actual.method}`);
});
