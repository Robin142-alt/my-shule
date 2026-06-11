const fs = require('fs');

let schoolCode = fs.readFileSync('apps/web/src/lib/experiences/school-data.ts', 'utf-8');

// 1. Update roleToDashboardRole
if (!schoolCode.includes('"procurement-officer":')) {
    schoolCode = schoolCode.replace(/admissions: "admissions",\n};/, 'admissions: "admissions",\n  "procurement-officer": "storekeeper",\n};');
}

// 2. Update buildSchoolProfile
if (!schoolCode.includes('name: "Procurement Officer"')) {
    schoolCode = schoolCode.replace(/admissions: \{\n      name: "Admissions Officer",\n      roleLabel: "Admissions officer",\n      contextLabel: schoolName,\n    \},\n  \};\n\n  return \{/m, 
    'admissions: {\n      name: "Admissions Officer",\n      roleLabel: "Admissions officer",\n      contextLabel: schoolName,\n    },\n    "procurement-officer": {\n      name: "Procurement Officer",\n      roleLabel: "Procurement officer",\n      contextLabel: schoolName,\n    },\n  };\n\n  return {');
}

fs.writeFileSync('apps/web/src/lib/experiences/school-data.ts', schoolCode);
console.log('Successfully updated role mappings');
