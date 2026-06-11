const fs = require('fs');

let sd = fs.readFileSync('apps/web/src/lib/experiences/school-data.ts', 'utf-8');

// Ensure procurement-officer is in schoolNavMap. We know admissions is there.
const toInsertNav = `  "procurement-officer": [
    { id: "procurement-desk", label: "Procurement Desk", href: toSchoolPath("procurement-officer", "overview"), icon: FileText },
  ],
`;

if (!sd.includes('"procurement-officer": [\n    { id: "procurement-desk"')) {
    sd = sd.replace(/};\s*const roleToDashboardRole/, match => toInsertNav + match);
}

// Add procurement-officer to roleToDashboardRole
if (!sd.includes('"procurement-officer": "storekeeper",')) {
    sd = sd.replace(/admissions: "admissions",/, 'admissions: "admissions",\n  "procurement-officer": "storekeeper",');
}

// Add procurement-officer to buildSchoolProfile
if (!sd.includes('name: "Procurement Officer"')) {
    const toInsertProfile = `    "procurement-officer": {
      name: "Procurement Officer",
      roleLabel: "Procurement officer",
      contextLabel: schoolName,
    },
`;
    sd = sd.replace(/admissions:\s*\{\s*name:\s*"Admissions Officer",\s*roleLabel:\s*"Admissions officer",\s*contextLabel:\s*schoolName,\s*\},/, match => match + '\n' + toInsertProfile);
}

fs.writeFileSync('apps/web/src/lib/experiences/school-data.ts', sd, 'utf-8');
console.log('Fixed school-data.ts.');

// Fix time-aware-greeting.ts
let tg = fs.readFileSync('apps/web/src/lib/greetings/time-aware-greeting.ts', 'utf-8');
if (!tg.includes('"procurement-officer"')) {
    tg = tg.replace(/admissions:\s*"Admissions Team",/, 'admissions: "Admissions Team",\n  "procurement-officer": "Procurement Officer",');
    fs.writeFileSync('apps/web/src/lib/greetings/time-aware-greeting.ts', tg, 'utf-8');
}
console.log('Fixed time-aware-greeting.ts.');
