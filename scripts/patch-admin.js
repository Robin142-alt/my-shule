const fs = require('fs');
const file = 'apps/api/src/modules/admin-command/repositories/admin-command.repository.ts';
let content = fs.readFileSync(file, 'utf8');

// Finance
content = content.replace(
  /const collectionData = trendResult\.rows\.length > 0 \? trendResult\.rows\.map\(\(row: any\) => \{[\s\S]*?\}\) : \[[\s\S]*?\];/m,
  `const collectionData = trendResult.rows.map((row: any) => {
      const amount = Number(row.total);
      return {
        label: row.label,
        value: amount > 0 ? 100 : 0,
        amount: \\\`\${(amount / 100000).toFixed(0)}K\\\`
      };
    });`
);

// Students
content = content.replace(
  /if \(populationTrend\.length === 0\) \{[\s\S]*?populationTrend = \[[\s\S]*?\];[\s\S]*?\}/m,
  `if (populationTrend.length === 0) {
      populationTrend = [{ label: 'Current', value: totalStudents }];
    }`
);

// Discipline
content = content.replace(
  /if \(incidentTrend\.length === 0\) \{[\s\S]*?incidentTrend = \[[\s\S]*?\];[\s\S]*?\}/m,
  `if (incidentTrend.length === 0) {
      incidentTrend = [{ label: 'Current', value: openCases }];
    }`
);

// Attendance
content = content.replace(
  /if \(attendanceTrend\.length === 0\) \{[\s\S]*?attendanceTrend = \[[\s\S]*?\];[\s\S]*?\}/m,
  `if (attendanceTrend.length === 0) {
      attendanceTrend = [{ label: 'Current', value: present > 0 ? 100 : 0 }];
    }`
);

// Academics
content = content.replace(
  /performanceTrend: \[\],[\s\S]*?departmentPerformance: \[\]/m,
  `performanceTrend: [{ label: 'Current', value: averageScore }],
      departmentPerformance: []`
);


fs.writeFileSync(file, content);
console.log('Patched');
