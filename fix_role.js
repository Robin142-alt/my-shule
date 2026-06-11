const fs = require('fs');

let rp = fs.readFileSync('apps/web/src/lib/school/role-practical-ui.ts', 'utf-8');

const newEntry = `  "procurement-officer": {
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
};`;

rp = rp.replace(/};\s*$/, newEntry + '\n');
fs.writeFileSync('apps/web/src/lib/school/role-practical-ui.ts', rp, 'utf-8');
console.log('Fixed role-practical-ui.ts');
