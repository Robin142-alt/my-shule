const fs = require('fs');

let text = fs.readFileSync('apps/web/src/lib/experiences/school-data.ts', 'utf-8');

// Fix Library import
if (!text.includes('Library,')) {
    text = text.replace(/LayoutGrid,/, 'LayoutGrid,\n  Library,');
}

// Add procurement-officer to roleToDashboardRole
if (!text.includes('"procurement-officer": "storekeeper"')) {
    text = text.replace(/"admissions": "admissions",\n};/m, '"admissions": "admissions",\n  "procurement-officer": "storekeeper",\n};');
}

// Add procurement-officer to profileMap
if (!text.includes('"procurement-officer": {')) {
    text = text.replace(/admissions: \{\n      name: "Admissions Officer",\n      roleLabel: "Admissions officer",\n      contextLabel: schoolName,\n    \},/m, 'admissions: {\n      name: "Admissions Officer",\n      roleLabel: "Admissions officer",\n      contextLabel: schoolName,\n    },\n    "procurement-officer": {\n      name: "Procurement Officer",\n      roleLabel: "Procurement officer",\n      contextLabel: schoolName,\n    },');
}

fs.writeFileSync('apps/web/src/lib/experiences/school-data.ts', text, 'utf-8');
console.log('Fixed Library import and procurement-officer mappings.');
