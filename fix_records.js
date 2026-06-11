const fs = require('fs');

// 1. school-data.ts
let sd = fs.readFileSync('apps/web/src/lib/experiences/school-data.ts', 'utf-8');
if (!sd.includes('"procurement-officer": "storekeeper"')) {
    sd = sd.replace(/admissions:\s*"admissions",\n};/, 'admissions: "admissions",\n  "procurement-officer": "storekeeper",\n};');
}
if (!sd.includes('name: "Procurement Officer"')) {
    sd = sd.replace(/admissions:\s*\{\n\s*name:\s*"Admissions Officer",\n\s*roleLabel:\s*"Admissions officer",\n\s*contextLabel:\s*schoolName,\n\s*\},/g,
    'admissions: {\n      name: "Admissions Officer",\n      roleLabel: "Admissions officer",\n      contextLabel: schoolName,\n    },\n    "procurement-officer": {\n      name: "Procurement Officer",\n      roleLabel: "Procurement officer",\n      contextLabel: schoolName,\n    },');
}
fs.writeFileSync('apps/web/src/lib/experiences/school-data.ts', sd, 'utf-8');

// 2. time-aware-greeting.ts
let tg = fs.readFileSync('apps/web/src/lib/greetings/time-aware-greeting.ts', 'utf-8');
if (!tg.includes('"procurement-officer"')) {
    tg = tg.replace(/admissions:\s*"Admissions Team",/, 'admissions: "Admissions Team",\n  "procurement-officer": "Procurement",');
    fs.writeFileSync('apps/web/src/lib/greetings/time-aware-greeting.ts', tg, 'utf-8');
}

// 3. role-practical-ui.ts
let rp = fs.readFileSync('apps/web/src/lib/school/role-practical-ui.ts', 'utf-8');
if (!rp.includes('"procurement-officer"')) {
    let newEntry = `
  "procurement-officer": {
    title: "Procurement Dashboard",
    subtitle: "Manage school purchasing and supplies",
    sidebarTitle: "Procurement",
    sidebarSubtitle: "Purchasing & Supplies",
    todayContext: "Today's Purchasing",
    sectionNoun: "Orders",
    summaryCards: [],
    urgentAlerts: [],
    emptyState: "No procurement data available",
  },
`;
    rp = rp.replace(/admissions:\s*\{[\s\S]*?\},/g, match => match + newEntry);
    fs.writeFileSync('apps/web/src/lib/school/role-practical-ui.ts', rp, 'utf-8');
}

// 4. search-access-policy.ts
let sp = fs.readFileSync('apps/web/src/lib/search/search-access-policy.ts', 'utf-8');
if (!sp.includes('"procurement-officer"')) {
    let newSpEntry = `
  "procurement-officer": {
    mode: "LIMITED_STAFF",
    allowedEntities: ["student", "staff", "class"],
    forbiddenEntities: ["platformTenant", "systemJob", "invoice", "payment", "examResult"],
    scopeTags: ["store"],
  },
`;
    sp = sp.replace(/admissions:\s*\{[\s\S]*?\},/g, match => match + newSpEntry);
    fs.writeFileSync('apps/web/src/lib/search/search-access-policy.ts', sp, 'utf-8');
}

console.log('Successfully injected all missing record entries');
