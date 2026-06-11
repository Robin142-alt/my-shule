const fs = require('fs');

// Fix school-data.ts schoolNavMap
let sd = fs.readFileSync('apps/web/src/lib/experiences/school-data.ts', 'utf-8');
if (!sd.includes('"procurement-officer": [\n    { id: "procurement-desk"')) {
    const replacement = `  admissions: [
    { id: "admissions-desk", label: "Admissions Desk", href: toSchoolPath("admissions", "overview"), icon: Users, badge: "14" },
    { id: "applications", label: "Applications", href: toSchoolPath("admissions", "applications"), icon: FileText, group: "Operations" },
    { id: "interviews", label: "Interviews", href: toSchoolPath("admissions", "interviews"), icon: UserPlus, group: "Operations" },
  ],
  "procurement-officer": [
    { id: "procurement-desk", label: "Procurement Desk", href: toSchoolPath("procurement-officer", "overview"), icon: FileText },
  ],`;
    
    // Attempt replace
    sd = sd.replace(/admissions:\s*\[\s*\{\s*id:\s*"admissions-desk"[\s\S]*?\}\s*,\s*\]\s*,/, replacement);
    fs.writeFileSync('apps/web/src/lib/experiences/school-data.ts', sd, 'utf-8');
}

// Fix time-aware-greeting.ts
let tg = fs.readFileSync('apps/web/src/lib/greetings/time-aware-greeting.ts', 'utf-8');
if (!tg.includes('"procurement-officer":')) {
    tg = tg.replace(/admissions:\s*"Admissions Team",/, 'admissions: "Admissions Team",\n  "procurement-officer": "Procurement Officer",');
    fs.writeFileSync('apps/web/src/lib/greetings/time-aware-greeting.ts', tg, 'utf-8');
}

console.log('Final fixes applied.');
