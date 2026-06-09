const fs = require('fs');
let code = fs.readFileSync('apps/web/src/components/school/storekeeper-command-center.tsx', 'utf8');

code = code.replace(/typeof aiInsights/g, 'typeof initialAiInsights');
code = code.replace(/typeof suppliers/g, 'typeof initialSuppliers');
code = code.replace(/typeof waste/g, 'typeof initialWaste');
code = code.replace(/typeof auditTrail/g, 'typeof initialAuditTrail');

fs.writeFileSync('apps/web/src/components/school/storekeeper-command-center.tsx', code);
