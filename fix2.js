const fs = require('fs');
let lines = fs.readFileSync('apps/web/src/lib/experiences/school-data.ts', 'utf-8').split('\n');
let code = '';
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('admissions: "admissions",')) {
    code += lines[i] + '\n  "procurement-officer": "storekeeper",\n';
  } else if (lines[i].includes('admissions: {')) {
    let insert = '    "procurement-officer": {\n      name: "Procurement Officer",\n      roleLabel: "Procurement officer",\n      contextLabel: schoolName,\n    },';
    code += lines[i] + '\n';
    let endAdmissions = i + 4;
    for (let j = i + 1; j <= endAdmissions; j++) {
       code += lines[j] + '\n';
    }
    code += insert + '\n';
    i = endAdmissions;
  } else if (lines[i].includes('"setup-checklist": "Setup Checklist",') && i > 575) {
    // skip
  } else if (lines[i].includes('"finance-overview": "Finance Overview",') && i > 575) {
    // skip
  } else {
    code += lines[i] + '\n';
  }
}
fs.writeFileSync('apps/web/src/lib/experiences/school-data.ts', code.slice(0, -1), 'utf-8');
console.log('Fixed procurement-officer and duplicate labels');
