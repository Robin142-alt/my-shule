const fs = require('fs');

let code = fs.readFileSync('apps/web/src/lib/experiences/school-data.ts', 'utf-8');

const p1 = code.indexOf('roleToDashboardRole:');
const p2 = code.indexOf('admissions:', p1);
const p3 = code.indexOf('\n};', p2);

if (!code.slice(p1, p3).includes('procurement-officer')) {
  code = code.slice(0, p3) + ',\n  "procurement-officer": "storekeeper"' + code.slice(p3);
}

const p4 = code.indexOf('const profileMap:');
const p5 = code.indexOf('admissions: {', p4);
const p6 = code.indexOf('  };\n\n  return', p5);

if (p6 !== -1 && !code.slice(p4, p6).includes('procurement-officer')) {
  const insert = '\n    "procurement-officer": {\n      name: "Procurement Officer",\n      roleLabel: "Procurement officer",\n      contextLabel: schoolName,\n    },';
  code = code.slice(0, p6) + insert + '\n' + code.slice(p6);
}

fs.writeFileSync('apps/web/src/lib/experiences/school-data.ts', code, 'utf-8');
console.log('Fixed procurement-officer');
