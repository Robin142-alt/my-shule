const fs = require('fs');

let sd = fs.readFileSync('apps/web/src/lib/experiences/school-data.ts', 'utf-8');

if (!sd.includes('"procurement-officer": "storekeeper"')) {
    sd = sd.replace(/admissions:\s*"admissions",/, 'admissions: "admissions",\n  "procurement-officer": "storekeeper",');
}

if (!sd.includes('name: "Procurement Officer"')) {
    const toInsert = `
    "procurement-officer": {
      name: "Procurement Officer",
      roleLabel: "Procurement officer",
      contextLabel: schoolName,
    },`;
    sd = sd.replace(/admissions:\s*\{\s*name:\s*"Admissions Officer",\s*roleLabel:\s*"Admissions officer",\s*contextLabel:\s*schoolName,\s*\},/, match => match + toInsert);
}

fs.writeFileSync('apps/web/src/lib/experiences/school-data.ts', sd, 'utf-8');

let tg = fs.readFileSync('apps/web/src/lib/greetings/time-aware-greeting.ts', 'utf-8');
if (!tg.includes('"procurement-officer"')) {
    tg = tg.replace(/admissions:\s*"Admissions Team",/, 'admissions: "Admissions Team",\n  "procurement-officer": "Procurement",');
    fs.writeFileSync('apps/web/src/lib/greetings/time-aware-greeting.ts', tg, 'utf-8');
}

console.log('Done mapping.');
