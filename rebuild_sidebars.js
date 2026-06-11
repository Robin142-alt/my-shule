const fs = require('fs');

const rawBlueprint = fs.readFileSync('blueprint-raw.txt', 'utf-8');
const workspaceDefs = fs.readFileSync('apps/web/src/lib/operational/generated-workspace-definitions.ts', 'utf-8');

// extract workspace IDs
const allIds = [...workspaceDefs.matchAll(/id:\s*["']([^"']+)["']/g)].map(m => m[1]);

const lines = rawBlueprint.split('\n');

let currentRole = null;
let currentSection = null;
const blueprintRoles = {};

for(let line of lines) {
  line = line.trim();
  const roleMatch = line.match(/^# \d+\. (.+) Dashboard/);
  if (roleMatch) {
    currentRole = roleMatch[1].trim();
    blueprintRoles[currentRole] = [];
    continue;
  }
  if (!currentRole) continue;

  if (line.toLowerCase().includes('sidebar items')) {
    currentSection = 'sidebar';
    continue;
  } else if (line.startsWith('## ') && !line.toLowerCase().includes('sidebar')) {
    currentSection = null;
  }

  if (currentSection === 'sidebar') {
    if (line.match(/^\d+\.\s+(.+)/)) {
      const itemMatch = line.match(/^\d+\.\s+(.+)/);
      blueprintRoles[currentRole].push(itemMatch[1].trim());
    }
  }
}

function toId(label) {
  const s = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  let exact = allIds.find(i => i === s);
  if (exact) return exact;
  return s;
}

const roleMap = {
  "Super Admin": "superadmin",
  "Principal": "principal",
  "Deputy Principal": "deputy-principal",
  "School Admin": "admin",
  "Dean of Academics": "dean-academics",
  "Exams Manager": "exams-manager",
  "HOD": "hod",
  "Teacher": "teacher",
  "Class Teacher / Grade Master": ["class-teacher", "grade-master"],
  "Accountant / Bursar": ["accountant", "bursar"],
  "Secretary / Front Office": "secretary",
  "Admissions Officer": "admissions",
  "Discipline Master": "discipline-master",
  "Counsellor": "guidance-counselling",
  "Nurse / Sick Bay": "nurse",
  "Librarian": "librarian",
  "Storekeeper": "storekeeper",
  "Procurement Officer": "procurement-officer",
  "Boarding Master": "boarding-master",
  "Security Officer": "security-officer",
  "Transport Manager": "transport-manager",
  "Laboratory Technician": "laboratory-technician",
  "ICT / Assets Officer": "ict-manager",
};

const iconMap = {
  overview: 'LayoutGrid',
  dashboard: 'LayoutGrid',
  schools: 'Building2',
  health: 'Stethoscope',
  students: 'Users',
  staff: 'UserSquare2',
  academics: 'GraduationCap',
  reports: 'FileSpreadsheet',
  settings: 'Settings',
  default: 'LayoutGrid'
};

function getIcon(id) {
  for(let k in iconMap) {
    if (id.includes(k)) return iconMap[k];
  }
  return 'LayoutGrid';
}

const saItems = blueprintRoles["Super Admin"];
let saStr = "export const superadminNav: ExperienceNavItem[] = [\n";
saItems.forEach(item => {
  let id = toId(item);
  saStr += `  { id: "${id}", label: "${item}", href: toSuperadminPath("${id}"), icon: ${getIcon(id)}, group: "Platform Operations" },\n`;
});
saStr += "];";

let scStr = "const schoolNavMap: Record<SchoolExperienceRole, ExperienceNavItem[]> = {\n";
for (const [bpRole, bpItems] of Object.entries(blueprintRoles)) {
  if (bpRole === "Super Admin") continue;
  
  let feKeys = roleMap[bpRole];
  if (!feKeys) continue;
  if (!Array.isArray(feKeys)) feKeys = [feKeys];
  
  feKeys.forEach(roleKey => {
    scStr += `  "${roleKey}": [\n`;
    bpItems.forEach(item => {
      let id = toId(item);
      if (id === 'overview') {
          let specific = allIds.find(i => i === roleKey+'-overview');
          if (specific) id = specific;
      }
      scStr += `    { id: "${id}", label: "${item}", href: toSchoolPath("${id}"), icon: ${getIcon(id)}, group: "Operations" },\n`;
    });
    scStr += `    ...supportSidebarItems,\n  ],\n`;
  });
}

scStr += `  student: [\n    { id: "dashboard", label: "Dashboard", href: toSchoolPath("dashboard"), icon: LayoutGrid, group: "Overview" },\n  ],\n`;
scStr += "};";

let saCode = fs.readFileSync('apps/web/src/lib/experiences/superadmin-data.ts', 'utf-8');
saCode = saCode.replace(/export const superadminNav: ExperienceNavItem\[\] = \[[\s\S]*?\];/, saStr);
fs.writeFileSync('apps/web/src/lib/experiences/superadmin-data.ts', saCode, 'utf-8');

let schoolCode = fs.readFileSync('apps/web/src/lib/experiences/school-data.ts', 'utf-8');
schoolCode = schoolCode.replace(/const schoolNavMap: Record<SchoolExperienceRole, ExperienceNavItem\[\]> = \{[\s\S]*?\};/, scStr);

// Also apply the role mapping updates we did before
if (!schoolCode.includes('"procurement-officer":')) {
    schoolCode = schoolCode.replace(/admissions: "admissions",\n};/, 'admissions: "admissions",\n  "procurement-officer": "storekeeper",\n};');
}
if (!schoolCode.includes('name: "Procurement Officer"')) {
    schoolCode = schoolCode.replace(/admissions: \{\n      name: "Admissions Officer",\n      roleLabel: "Admissions officer",\n      contextLabel: schoolName,\n    \},\n  \};\n\n  return \{/m, 
    'admissions: {\n      name: "Admissions Officer",\n      roleLabel: "Admissions officer",\n      contextLabel: schoolName,\n    },\n    "procurement-officer": {\n      name: "Procurement Officer",\n      roleLabel: "Procurement officer",\n      contextLabel: schoolName,\n    },\n  };\n\n  return {');
}

fs.writeFileSync('apps/web/src/lib/experiences/school-data.ts', schoolCode, 'utf-8');
console.log('Successfully applied all mappings!');
