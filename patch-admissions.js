const fs = require('fs');
const file = 'apps/api/src/modules/admissions/admissions.test.ts';
let content = fs.readFileSync(file, 'utf8');

// The tests fail because some mock parameters are typed with tenant_id, while the Admissions service uses school_id

content = content.replace(/tenant_id: string;/g, 'school_id: string;');
content = content.replace(/tenantId: string;/g, 'schoolId: string;');
content = content.replace(/tenant_id: /g, 'school_id: ');
content = content.replace(/tenantId:/g, 'schoolId:');

fs.writeFileSync(file, content, 'utf8');
console.log('patched admissions test');
