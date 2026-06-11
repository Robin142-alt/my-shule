const fs = require('fs');

const saData = fs.readFileSync('apps/web/src/lib/experiences/superadmin-data.ts', 'utf-8');
const scData = fs.readFileSync('apps/web/src/lib/experiences/school-data.ts', 'utf-8');

// Extract all toSuperadminPath("xyz")
const saIds = new Set();
for (const match of saData.matchAll(/toSuperadminPath\("([^"]+)"\)/g)) {
    saIds.add(match[1]);
}

// Extract all toSchoolPath("xyz")
const scIds = new Set();
for (const match of scData.matchAll(/toSchoolPath\("([^"]+)"\)/g)) {
    scIds.add(match[1]);
}

// Update experience-routes.ts
let routesCode = fs.readFileSync('apps/web/src/lib/routing/experience-routes.ts', 'utf-8');

// Extract current sa arrays
const curSaMatch = routesCode.match(/export const SUPERADMIN_SECTIONS = \[([\s\S]*?)\] as const;/);
if (curSaMatch) {
    const curSa = [...curSaMatch[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
    curSa.forEach(id => saIds.add(id));
}

// Extract current sc arrays
const curScMatch = routesCode.match(/export const SCHOOL_SECTIONS = \[([\s\S]*?)\] as const;/);
if (curScMatch) {
    const curSc = [...curScMatch[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
    curSc.forEach(id => scIds.add(id));
}

// Rebuild sa arrays
let newSaStr = "export const SUPERADMIN_SECTIONS = [\n";
for (const id of saIds) {
    newSaStr += `  "${id}",\n`;
}
newSaStr += "] as const;";
routesCode = routesCode.replace(/export const SUPERADMIN_SECTIONS = \[([\s\S]*?)\] as const;/, newSaStr);

// Rebuild sc arrays
let newScStr = "export const SCHOOL_SECTIONS = [\n";
for (const id of scIds) {
    newScStr += `  "${id}",\n`;
}
newScStr += "] as const;";
routesCode = routesCode.replace(/export const SCHOOL_SECTIONS = \[([\s\S]*?)\] as const;/, newScStr);

fs.writeFileSync('apps/web/src/lib/routing/experience-routes.ts', routesCode, 'utf-8');

// Update superadmin-sections.ts
let saPublicCode = fs.readFileSync('apps/web/src/lib/routing/superadmin-sections.ts', 'utf-8');
let newSaPubStr = "export const SUPERADMIN_PUBLIC_SECTIONS = [\n";
for (const id of saIds) {
    newSaPubStr += `  "${id}",\n`;
}
newSaPubStr += "] as const;";
saPublicCode = saPublicCode.replace(/export const SUPERADMIN_PUBLIC_SECTIONS = \[([\s\S]*?)\] as const;/, newSaPubStr);
fs.writeFileSync('apps/web/src/lib/routing/superadmin-sections.ts', saPublicCode, 'utf-8');

console.log("Successfully injected types to experience-routes.ts and superadmin-sections.ts");
