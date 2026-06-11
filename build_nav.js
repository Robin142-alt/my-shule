const fs = require('fs');
const reportPath = 'C:\\Users\\user\\.gemini\\antigravity\\brain\\851ba70d-a43f-46a5-9344-e4d2d1f1b210\\frontend_comparison_report.md';

const report = fs.readFileSync(reportPath, 'utf-8');

const rolesMap = {};
let currentRole = null;

const lines = report.split('\n');
for (const line of lines) {
    if (line.startsWith('**Frontend Role Mapping**:')) {
        currentRole = line.split(':')[1].trim().replace(/`/g, '');
        rolesMap[currentRole] = [];
    } else if (line.startsWith('**Status**: ❌ Missing completely')) {
        // Procurement Officer special case
        currentRole = 'procurement-officer';
        rolesMap[currentRole] = [
            'Overview', 'Items', 'Stock In', 'Stock Issue', 'Requests', 'Low Stock', 'Stocktake', 'Damaged/Missing', 'Reports'
        ];
    } else if (currentRole && line.startsWith('| ') && !line.includes('---|') && !line.includes('Blueprint Item')) {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length > 2 && currentRole !== 'procurement-officer') {
            const label = parts[1];
            rolesMap[currentRole].push(label);
        }
    } else if (line.startsWith('## ')) {
        if (!line.includes('Procurement Officer')) {
            currentRole = null;
        }
    }
}

const getIcon = (label) => {
    const l = label.toLowerCase();
    if (l.includes('overview') || l.includes('dashboard')) return 'LayoutGrid';
    if (l.includes('report') || l.includes('log') || l.includes('plan')) return 'FileSpreadsheet';
    if (l.includes('student') || l.includes('parent') || l.includes('user') || l.includes('staff')) return 'Users';
    if (l.includes('class') || l.includes('stream') || l.includes('school')) return 'Building2';
    if (l.includes('finance') || l.includes('fee') || l.includes('invoice') || l.includes('payment') || l.includes('receipt') || l.includes('arrear') || l.includes('mpesa')) return 'CircleDollarSign';
    if (l.includes('exam') || l.includes('mark') || l.includes('assessment') || l.includes('academic')) return 'GraduationCap';
    if (l.includes('subject') || l.includes('curriculum') || l.includes('syllabus')) return 'BookOpenCheck';
    if (l.includes('attendance') || l.includes('timetable') || l.includes('roster')) return 'CalendarDays';
    if (l.includes('discipline') || l.includes('incident')) return 'ShieldAlert';
    if (l.includes('communication') || l.includes('message')) return 'MessageSquareText';
    if (l.includes('health') || l.includes('clinic') || l.includes('nurse')) return 'Stethoscope';
    if (l.includes('lab') || l.includes('apparatus') || l.includes('chemical')) return 'FlaskConical';
    if (l.includes('transport') || l.includes('bus') || l.includes('route') || l.includes('vehicle')) return 'BusFront';
    if (l.includes('setting') || l.includes('setup')) return 'Settings';
    if (l.includes('inventory') || l.includes('asset') || l.includes('item') || l.includes('stock')) return 'Boxes';
    if (l.includes('book') || l.includes('library')) return 'Library'; // might not be imported, let's use ClipboardList
    return 'ClipboardList';
};

const getId = (label) => {
    return label.toLowerCase().replace(/[\s\/&]+/g, '-').replace(/-+$/, '').replace(/^-+/, '');
};

const newNavMapCode = `const schoolNavMap: Record<SchoolExperienceRole, ExperienceNavItem[]> = {
${Object.entries(rolesMap).filter(([k]) => k !== 'superadmin').map(([role, labels]) => {
    return `  "${role}": [\n${labels.map(label => {
        const id = getId(label);
        const icon = getIcon(label);
        return `    { id: "${id}", label: "${label}", href: toSchoolPath("${id}"), icon: ${icon} },`;
    }).join('\n')}\n    ...supportSidebarItems,\n  ],`;
}).join('\n')}
};`;

// Add support for superadmin inside superadmin-data.ts
const saLabels = rolesMap['superadmin'];
const saNavMapCode = `export const superadminNavMap: Record<string, ExperienceNavItem[]> = {
  superadmin: [\n${saLabels.map(label => {
      const id = getId(label);
      const icon = getIcon(label);
      return `    { id: "${id}", label: "${label}", href: toSuperadminPath("${id}"), icon: ${icon} },`;
  }).join('\n')}
  ],
};`;

console.log("schoolNavMap preview:");
console.log(newNavMapCode.slice(0, 500));

fs.writeFileSync('new_nav_map.ts', newNavMapCode);
fs.writeFileSync('new_sa_nav_map.ts', saNavMapCode);
