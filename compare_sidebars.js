const fs = require('fs');

const rawBlueprint = fs.readFileSync('blueprint-raw.txt', 'utf-8');
const lines = rawBlueprint.split('\n');

let currentRole = null;
let currentSection = null;
const blueprintRoles = {};

for(let line of lines) {
  line = line.trim();
  const roleMatch = line.match(/^# \d+\. (.+) (Dashboard|Portal)/);
  if (roleMatch) {
    currentRole = roleMatch[1].trim();
    if (currentRole === 'Parent') currentRole = 'Parent Portal';
    if (currentRole === 'Student') currentRole = 'Student Portal';
    blueprintRoles[currentRole] = [];
    continue;
  }
  // also handle "# 24. Parent Portal" without Dashboard
  if (line.match(/^# \d+\. Parent Portal/)) {
    currentRole = 'Parent Portal';
    blueprintRoles[currentRole] = [];
    continue;
  }
  if (line.match(/^# \d+\. Student Portal/)) {
    currentRole = 'Student Portal';
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

const frontendCode = fs.readFileSync('apps/web/src/lib/experiences/school-data.ts', 'utf-8');

const frontendRoles = {};
const mapLines = frontendCode.substring(frontendCode.indexOf('const schoolNavMap')).split('\n');
let currentFEndRole = null;

for(let line of mapLines) {
  const roleMatch = line.match(/^\s+["']?([a-z-]+)["']?:\s*\[/);
  if (roleMatch) {
    currentFEndRole = roleMatch[1];
    frontendRoles[currentFEndRole] = [];
    continue;
  }
  
  if (currentFEndRole) {
    if (line.match(/^\s+\]/)) {
      currentFEndRole = null;
      continue;
    }
    const labelMatch = line.match(/label:\s*["']([^"']+)["']/);
    if (labelMatch) {
      frontendRoles[currentFEndRole].push(labelMatch[1]);
    }
  }
}

// Add Super Admin explicitly
try {
  const superAdminCode = fs.readFileSync('apps/web/src/lib/routing/superadmin-sections.ts', 'utf-8');
  const saMatches = [...superAdminCode.matchAll(/label:\s*["']([^"']+)["']/g)];
  frontendRoles['superadmin'] = saMatches.map(m => m[1]);
} catch (e) {}

// Map blueprint roles to frontend roles manually for comparison
const mapping = {
  "Super Admin": "superadmin",
  "Principal": "principal",
  "Deputy Principal": "deputy-principal",
  "School Admin": "admin",
  "Dean of Academics": "dean-academics",
  "Exams Manager": "exams-manager",
  "HOD": "hod",
  "Teacher": "teacher",
  "Class Teacher / Grade Master": "class-teacher",
  "Accountant / Bursar": "accountant",
  "Secretary / Front Office": "secretary",
  "Admissions Officer": "admissions",
  "Discipline Master": "discipline-master",
  "Counsellor": "guidance-counselling",
  "Nurse / Sick Bay": "nurse",
  "Librarian": "librarian",
  "Storekeeper": "storekeeper",
  "Procurement Officer": "procurement-officer", // fixed
  "Boarding Master": "boarding-master",
  "Security Officer": "security-officer",
  "Transport Manager": "transport-manager",
  "Laboratory Technician": "laboratory-technician",
  "ICT / Assets Officer": "ict-manager",
  "Parent Portal": "parent",
  "Student Portal": "student",
};

let output = "# Frontend to Blueprint Comparison\n\n";

let totalMapped = 0;
let totalMissing = 0;

for (const [bpRole, bpItems] of Object.entries(blueprintRoles)) {
  if (bpItems.length === 0) continue; // skip empty like Admissions

  const feKey = mapping[bpRole];
  output += `## ${bpRole}\n`;
  if (!feKey) {
    output += `**Status**: ❌ Missing completely from frontend implementation.\n\n`;
    totalMissing++;
    continue;
  }
  
  const feItems = frontendRoles[feKey] || [];
  output += `**Frontend Role Mapping**: \`${feKey}\`\n\n`;
  
  output += `| Blueprint Item | Frontend Item (Best Match) | Status |\n`;
  output += `|---|---|---|\n`;
  
  let matchCount = 0;
  bpItems.forEach(bpItem => {
    // very naive matching
    const match = feItems.find(f => f.toLowerCase().includes(bpItem.toLowerCase()) || bpItem.toLowerCase().includes(f.toLowerCase()));
    if (match) {
      output += `| ${bpItem} | ${match} | ✅ |\n`;
      matchCount++;
    } else {
      output += `| ${bpItem} | *Missing or Renamed* | ❌ |\n`;
    }
  });
  
  output += `\n**Score**: ${matchCount} / ${bpItems.length} Sidebar Items implemented.\n\n`;
  totalMapped++;
}

console.log(output);
