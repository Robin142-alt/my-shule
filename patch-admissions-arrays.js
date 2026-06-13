const fs = require('fs');
const file = 'apps/api/src/modules/admissions/admissions.test.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/const guardianLinks: Array<{\s*tenant_id: string;/g, 'const guardianLinks: Array<{\n    school_id: string;');
content = content.replace(/const feeAssignments: Array<{\s*tenant_id: string;/g, 'const feeAssignments: Array<{\n    school_id: string;');
content = content.replace(/const enrollments: Array<{\s*tenant_id: string;/g, 'const enrollments: Array<{\n    school_id: string;');
content = content.replace(/const subjectTimetableCalls: Array<{\s*tenant_id: string;/g, 'const subjectTimetableCalls: Array<{\n    school_id: string;');
content = content.replace(/const publishedEvents: Array<{\s*tenant_id: string;/g, 'const publishedEvents: Array<{\n    school_id: string;');

fs.writeFileSync(file, content, 'utf8');
console.log('patched arrays');
