const fs = require('fs');

const file = 'apps/api/src/modules/admissions/admissions.test.ts';
let content = fs.readFileSync(file, 'utf8');

// The mocks for `createStudentAcademicEnrollment`
content = content.replace(/createStudentAcademicEnrollment: async \(input: \{\s*tenant_id: string;/g, 'createStudentAcademicEnrollment: async (input: {\n        school_id: string;');
content = content.replace(/tenant_id: 'tenant-a',\s*student_id: '00000000-0000-0000-0000-000000000762',/g, "school_id: 'tenant-a',\n      student_id: '00000000-0000-0000-0000-000000000762',");
content = content.replace(/tenant_id: 'tenant-a',\s*student_id: '00000000-0000-0000-0000-000000000742',/g, "school_id: 'tenant-a',\n      student_id: '00000000-0000-0000-0000-000000000742',");

// For guardianLinks assertion
content = content.replace(/tenant_id: 'tenant-a',\s*student_id: '00000000-0000-0000-0000-000000000712',/g, "school_id: 'tenant-a',\n      student_id: '00000000-0000-0000-0000-000000000712',");

// Mocks for `enrollStudentSubjectsAndTimetable`
content = content.replace(/enrollStudentSubjectsAndTimetable: async \(input: \{\s*tenant_id: string;/g, 'enrollStudentSubjectsAndTimetable: async (input: {\n        school_id: string;');

fs.writeFileSync(file, content, 'utf8');
console.log('patched admissions execute test');
