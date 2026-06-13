const fs = require('fs');

function patchAdmissions() {
  const file = 'apps/api/src/modules/admissions/admissions.test.ts';
  let content = fs.readFileSync(file, 'utf8');

  // test 232
  content = content.replace(
    /assert\.match\(call\.sql, \/tenant_id\|tenant\\\.id\/\);/g,
    'assert.match(call.sql, /tenant_id|tenant\\\\.id|school_id/);'
  );

  // test 234: guardianLinks
  content = content.replace(
    /const guardianLinks: Array<\{\s*tenant_id: string;/g,
    'const guardianLinks: Array<{\n    school_id: string;'
  );
  content = content.replace(
    /assert\.deepEqual\(guardianLinks, \[\s*\{\s*tenant_id: 'tenant-a',/g,
    "assert.deepEqual(guardianLinks, [\n    {\n      school_id: 'tenant-a',"
  );

  // test 236: academicEnrollments
  content = content.replace(
    /const academicEnrollments: Array<\{\s*tenant_id: string;/g,
    'const academicEnrollments: Array<{\n    school_id: string;'
  );
  content = content.replace(
    /assert\.deepEqual\(academicEnrollments, \[\s*\{\s*tenant_id: 'tenant-a',/g,
    "assert.deepEqual(academicEnrollments, [\n    {\n      school_id: 'tenant-a',"
  );

  // test 237: subjectEnrollments
  content = content.replace(
    /const subjectEnrollments: Array<\{\s*tenant_id: string;/g,
    'const subjectEnrollments: Array<{\n    school_id: string;'
  );
  content = content.replace(
    /assert\.deepEqual\(subjectEnrollments, \[\s*\{\s*tenant_id: 'tenant-a',/g,
    "assert.deepEqual(subjectEnrollments, [\n    {\n      school_id: 'tenant-a',"
  );

  fs.writeFileSync(file, content, 'utf8');
  console.log('patched admissions.test.ts');
}

function patchStudents() {
  const file = 'apps/api/src/modules/students/students.test.ts';
  let content = fs.readFileSync(file, 'utf8');

  // test 646: BillingAccessService mock in StudentsService
  content = content.replace(
    /\{ checkCanAddStudents: async \(\) => \{\} \} as never,/g,
    '{ resolveForTenant: async () => null } as never,'
  );

  fs.writeFileSync(file, content, 'utf8');
  console.log('patched students.test.ts');
}

patchAdmissions();
patchStudents();
