const fs = require('fs');
let code = fs.readFileSync('apps/web/src/components/school/storekeeper-command-center.tsx', 'utf8');

code = code.replace(/req: \(typeof requisitions\)\[number\],/, 'req: (typeof initialRequisitions)[number],');

fs.writeFileSync('apps/web/src/components/school/storekeeper-command-center.tsx', code);
