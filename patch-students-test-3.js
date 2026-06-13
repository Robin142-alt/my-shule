const fs = require('fs');

const file = 'apps/api/src/modules/students/students.test.ts';
let content = fs.readFileSync(file, 'utf8');

// The test 'StudentsService creates a student and publishes student.created'
// Currently:
/*
  const service = new StudentsService(
    requestContext,
    {
      withRequestTransaction: async <T>(callback: () => Promise<T>): Promise<T> => callback(),
    } as never,
*/
content = content.replace(
  /const service = new StudentsService\(\n    requestContext,\n    \{\n      withRequestTransaction/g,
  `const service = new StudentsService(
    requestContext,
    { execute: async (req: any) => req.handler() } as never,
    { publishStudentCreated: async (payload: any) => { publishedPayload = payload; } } as never,
    {
      withRequestTransaction`
);

// The test 'StudentsRepository uses keyset cursor pagination for the high-volume student directory'
// Wait, the repository test doesn't use StudentsService, it uses StudentsRepository.

fs.writeFileSync(file, content, 'utf8');
console.log('patched students test');
