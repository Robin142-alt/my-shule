const fs = require('fs');

// Fix school-data.ts
let sd = fs.readFileSync('apps/web/src/lib/experiences/school-data.ts', 'utf-8');
sd = sd.replace(/href: toSchoolPath\("procurement-officer", "overview"\), icon: FileText/, 'href: toSchoolPath("overview"), icon: LayoutGrid');
fs.writeFileSync('apps/web/src/lib/experiences/school-data.ts', sd, 'utf-8');

// Fix time-aware-greeting.ts
let tg = fs.readFileSync('apps/web/src/lib/greetings/time-aware-greeting.ts', 'utf-8');
if (!tg.includes('"procurement-officer"')) {
    tg = tg.replace(/admissions: "Admissions Officer",/, 'admissions: "Admissions Officer",\n  "procurement-officer": "Procurement Officer",');
    fs.writeFileSync('apps/web/src/lib/greetings/time-aware-greeting.ts', tg, 'utf-8');
}

console.log('Fixed syntax and type in time-aware-greeting and school-data');
