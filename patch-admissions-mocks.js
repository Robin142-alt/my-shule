const fs = require('fs');

const file = 'apps/api/src/modules/admissions/admissions.test.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /upsertStudentGuardianLink: async \(input: \{\s*tenant_id: string;/g,
  'upsertStudentGuardianLink: async (input: {\n        school_id: string;'
);

content = content.replace(
  /createStudentAcademicEnrollment: async \(input: \{\s*tenant_id: string;/g,
  'createStudentAcademicEnrollment: async (input: {\n        school_id: string;'
);

content = content.replace(
  /enrollStudentSubjectsAndTimetable: async \(input: \{\s*tenant_id: string;/g,
  'enrollStudentSubjectsAndTimetable: async (input: {\n        school_id: string;'
);

content = content.replace(
  /createStudentFeeAssignmentInvoice: async \(input: \{\s*tenant_id: string;/g,
  'createStudentFeeAssignmentInvoice: async (input: {\n        school_id: string;'
);

fs.writeFileSync(file, content, 'utf8');
console.log('patched admissions.test.ts AdmissionsRepository mocks');
