const fs = require('fs');

const file = 'apps/api/src/modules/admissions/admissions.test.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const subjectTimetableCalls: Array<\{\s*tenant_id: string;/g,
  'const subjectTimetableCalls: Array<{\n    school_id: string;'
);
content = content.replace(
  /assert\.deepEqual\(subjectTimetableCalls, \[\s*\{\s*tenant_id: 'tenant-a',/g,
  "assert.deepEqual(subjectTimetableCalls, [\n    {\n      school_id: 'tenant-a',"
);

fs.writeFileSync(file, content, 'utf8');
console.log('patched subjectTimetableCalls in admissions.test.ts');
