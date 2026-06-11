const fs = require('fs');

const navMap = fs.readFileSync('new_nav_map.ts', 'utf-8');
const saNavMap = fs.readFileSync('new_sa_nav_map.ts', 'utf-8');

// We need to extract all labels and ids to build `schoolSectionLabels` dynamically
const allIds = {};
const extractLabels = (str) => {
    const matches = str.matchAll(/id:\s*"([^"]+)",\s*label:\s*"([^"]+)"/g);
    for (const match of matches) {
        allIds[match[1]] = match[2];
    }
};
extractLabels(navMap);
extractLabels(saNavMap);

const sectionLabelsCode = `export const schoolSectionLabels: Record<string, string> = {
${Object.entries(allIds).map(([id, label]) => `  "${id}": "${label}",`).join('\n')}
  // Keep original ones just in case
  "setup-checklist": "Setup Checklist",
  "principal-overview": "Overview",
  "finance-overview": "Finance Overview",
  "support-new-ticket": "New Ticket",
  "support-my-tickets": "My Tickets",
  "support-knowledge-base": "Knowledge Base",
  "support-system-status": "System Status",
  settings: "Settings",
};`;

let sd = fs.readFileSync('apps/web/src/lib/experiences/school-data.ts', 'utf-8');

// 1. Add Library to imports if missing
if (!sd.includes('Library,')) {
    sd = sd.replace(/LayoutGrid,/, 'LayoutGrid,\n  Library,');
}

// 2. Replace schoolNavMap
const beforeNav = sd.substring(0, sd.indexOf('const schoolNavMap: Record<SchoolExperienceRole, ExperienceNavItem[]> = {'));
const afterNav = sd.substring(sd.indexOf('const roleToDashboardRole: Record<SchoolExperienceRole, DashboardRole> = {'));
sd = beforeNav + navMap + '\n\n' + afterNav;

// 3. Replace schoolSectionLabels
const beforeLabels = sd.substring(0, sd.indexOf('export const schoolSectionLabels: Record<string, string> = {'));
const afterLabels = sd.substring(sd.indexOf('function buildSchoolProfile('));
sd = beforeLabels + sectionLabelsCode + '\n\n' + afterLabels;

fs.writeFileSync('apps/web/src/lib/experiences/school-data.ts', sd, 'utf-8');

// 4. Fix Superadmin
let sa = fs.readFileSync('apps/web/src/lib/experiences/superadmin-data.ts', 'utf-8');
if (!sa.includes('Library,')) {
    sa = sa.replace(/LayoutGrid,/, 'LayoutGrid,\n  Library,');
}
const beforeSaNav = sa.substring(0, sa.indexOf('export const superadminNavMap: Record<string, ExperienceNavItem[]> = {'));
const afterSaNav = sa.substring(sa.indexOf('export const superadminSectionLabels: Record<string, string> = {'));
sa = beforeSaNav + saNavMap + '\n\n' + afterSaNav;

// We should also replace superadminSectionLabels to prevent crashing
const saLabelsCode = `export const superadminSectionLabels: Record<string, string> = {
${Object.entries(allIds).map(([id, label]) => `  "${id}": "${label}",`).join('\n')}
};`;
const beforeSaLabels = sa.substring(0, sa.indexOf('export const superadminSectionLabels: Record<string, string> = {'));
const afterSaLabels = sa.substring(sa.indexOf('export function getSuperadminWorkspace('));
sa = beforeSaLabels + saLabelsCode + '\n\n' + afterSaLabels;

fs.writeFileSync('apps/web/src/lib/experiences/superadmin-data.ts', sa, 'utf-8');

console.log("Applied nav maps and labels!");
