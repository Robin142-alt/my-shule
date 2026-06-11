const fs = require('fs');

let sd = fs.readFileSync('apps/web/src/lib/experiences/school-data.ts', 'utf-8');

// 1. Add aliases for shared navs
// Accountant and Bursar should share
const accountantMatch = sd.match(/"accountant": \[\n([\s\S]*?)\n  \],/);
if (accountantMatch && !sd.includes('"bursar": [')) {
    sd = sd.replace(/"accountant": \[/, `"bursar": [\n${accountantMatch[1]}\n  ],\n  "accountant": [`);
}

// Class Teacher and Grade Master
const classTeacherMatch = sd.match(/"class-teacher": \[\n([\s\S]*?)\n  \],/);
if (classTeacherMatch && !sd.includes('"grade-master": [')) {
    sd = sd.replace(/"class-teacher": \[/, `"grade-master": [\n${classTeacherMatch[1]}\n  ],\n  "class-teacher": [`);
}

if (!sd.includes('"student": [')) {
    sd = sd.replace(/};\n\nconst roleToDashboardRole/, '  "student": [\n    { id: "dashboard", label: "Dashboard", href: toSchoolPath("dashboard"), icon: LayoutGrid },\n    ...supportSidebarItems,\n  ],\n};\n\nconst roleToDashboardRole');
}

// 2. Fix duplicate keys in schoolSectionLabels
const labelsMatch = sd.match(/export const schoolSectionLabels: Record<string, string> = {([\s\S]*?)function buildSchoolProfile/);
if (labelsMatch) {
    const labelsBlock = labelsMatch[1];
    const lines = labelsBlock.split('\n');
    const seen = new Set();
    const newLines = [];
    for (const line of lines) {
        const match = line.match(/^\s*\"?([a-zA-Z0-9_-]+)\"?\s*:/);
        if (match) {
            const key = match[1];
            if (!seen.has(key)) {
                seen.add(key);
                newLines.push(line);
            }
        } else {
            newLines.push(line);
        }
    }
    sd = sd.replace(labelsBlock, newLines.join('\n'));
}

fs.writeFileSync('apps/web/src/lib/experiences/school-data.ts', sd, 'utf-8');

// 3. Fix ClipboardList in superadmin-data.ts
let sa = fs.readFileSync('apps/web/src/lib/experiences/superadmin-data.ts', 'utf-8');
if (!sa.includes('ClipboardList')) {
    sa = sa.replace(/import {/, 'import {\n  ClipboardList,');
}
fs.writeFileSync('apps/web/src/lib/experiences/superadmin-data.ts', sa, 'utf-8');
console.log('Fixed aliases, duplicates, and imports');
