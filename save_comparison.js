const fs = require('fs');

const rawBlueprint = fs.readFileSync('blueprint-raw.txt', 'utf-8');
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
const superAdminCode = fs.readFileSync('apps/web/src/lib/routing/superadmin-sections.ts', 'utf-8');
const saMatches = [...superAdminCode.matchAll(/label:\s*["']([^"']+)["']/g)];
frontendRoles['superadmin'] = saMatches.map(m => m[1]);

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
  "Class Teacher / Grade Master": "class-teacher", // or grade-master
  "Accountant / Bursar": "accountant", // or bursar
  "Secretary / Front Office": "secretary",
  "Admissions Officer": "admissions",
  "Discipline Master": "discipline-master",
  "Counsellor": "guidance-counselling",
  "Nurse / Sick Bay": "nurse",
  "Librarian": "librarian",
  "Storekeeper": "storekeeper",
  "Procurement Officer": null, // missing in frontend
  "Boarding Master": "boarding-master",
  "Security Officer": "security-officer",
  "Transport Manager": "transport-manager",
  "Laboratory Technician": "laboratory-technician",
  "ICT / Assets Officer": "ict-manager",
};

let output = "# Frontend vs Blueprint Comparison Report\n\n";

let totalMapped = 0;
let totalMissingRoles = 0;
let totalExpectedItems = 0;
let totalImplementedItems = 0;

for (const [bpRole, bpItems] of Object.entries(blueprintRoles)) {
  if (bpItems.length === 0) continue; // skip empty like Admissions

  const feKey = mapping[bpRole];
  output += `## ${bpRole}\n`;
  if (!feKey) {
    output += `**Status**: ❌ Missing completely from frontend implementation.\n\n`;
    totalMissingRoles++;
    totalExpectedItems += bpItems.length;
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
  totalExpectedItems += bpItems.length;
  totalImplementedItems += matchCount;
}

const summary = `> [!IMPORTANT]\n> Total Implemented Roles: ${totalMapped} / 23\n> Total Missing Roles: ${totalMissingRoles}\n> Total Sidebar Fidelity: ${Math.round((totalImplementedItems/totalExpectedItems)*100)}% (${totalImplementedItems} / ${totalExpectedItems})\n\n`;
output = summary + output;

fs.writeFileSync('C:\\Users\\user\\.gemini\\antigravity\\brain\\851ba70d-a43f-46a5-9344-e4d2d1f1b210\\frontend_comparison_report.md', output);
console.log('Report saved!');
