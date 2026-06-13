const fs = require('fs');

const file = 'apps/api/src/modules/admissions/admissions.test.ts';
let content = fs.readFileSync(file, 'utf8');

// feeAssignments
content = content.replace(
  /const feeAssignments: Array<\{\s*tenant_id: string;/g,
  'const feeAssignments: Array<{\n    school_id: string;'
);
content = content.replace(
  /assert\.deepEqual\(feeAssignments, \[\s*\{\s*tenant_id: 'tenant-a',/g,
  "assert.deepEqual(feeAssignments, [\n    {\n      school_id: 'tenant-a',"
);

// enrollments
content = content.replace(
  /const enrollments: Array<\{\s*tenant_id: string;/g,
  'const enrollments: Array<{\n    school_id: string;'
);
content = content.replace(
  /assert\.deepEqual\(enrollments, \[\s*\{\s*tenant_id: 'tenant-a',/g,
  "assert.deepEqual(enrollments, [\n    {\n      school_id: 'tenant-a',"
);

// subjectEnrollments (maybe already changed? Let's do it generally)
content = content.replace(
  /const subjectEnrollments: Array<\{\s*tenant_id: string;/g,
  'const subjectEnrollments: Array<{\n    school_id: string;'
);
content = content.replace(
  /assert\.deepEqual\(subjectEnrollments, \[\s*\{\s*tenant_id: 'tenant-a',/g,
  "assert.deepEqual(subjectEnrollments, [\n    {\n      school_id: 'tenant-a',"
);

fs.writeFileSync(file, content, 'utf8');
console.log('patched admissions.test.ts array types');
