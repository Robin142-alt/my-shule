const fs = require('fs');
const file = 'apps/api/src/modules/admissions/admissions.test.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/tenant_id: string;/g, 'school_id: string;');

fs.writeFileSync(file, content, 'utf8');
console.log('patched admissions types');
