const fs = require('fs');

const file = 'apps/api/src/modules/admissions/admissions.test.ts';
let content = fs.readFileSync(file, 'utf8');

// The error shows the parameter type definition inside AdmissionsService mock:
content = content.replace(
  /createGuardianLink: async \(input: \{\s*tenant_id: string;/g,
  'createGuardianLink: async (input: {\n        school_id: string;'
);

content = content.replace(
  /createAcademicEnrollment: async \(input: \{\s*tenant_id: string;/g,
  'createAcademicEnrollment: async (input: {\n        school_id: string;'
);

content = content.replace(
  /createSubjectEnrollment: async \(input: \{\s*tenant_id: string;/g,
  'createSubjectEnrollment: async (input: {\n        school_id: string;'
);

// We also need to fix where it's being pushed: `guardianLinks.push(input)` is fine, 
// but wait, is the expected assertion checking `school_id: 'tenant-a'` now? Yes, I updated that.
// What about the return type of `createGuardianLink`?

fs.writeFileSync(file, content, 'utf8');
console.log('patched admissions.test.ts params');
