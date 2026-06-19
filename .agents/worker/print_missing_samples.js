const fs = require('fs');
const path = require('path');

const PROJECT_DIR = 'C:\\Users\\user\\Desktop\\PROJECTS\\Shule hub';
const gapsFile = path.join(PROJECT_DIR, '.agents', 'worker', 'clean_gaps.json');
const data = JSON.parse(fs.readFileSync(gapsFile, 'utf8'));

const list = data.modules['admin-command'] || [];
console.log('Total Missing Admin Command Endpoints:', list.length);
console.log('\n--- SAMPLE MISSING ADMIN COMMANDS ---');
list.slice(0, 40).forEach(m => {
  console.log(`- ${m.method} ${m.path}`);
});
