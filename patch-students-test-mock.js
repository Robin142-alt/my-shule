const fs = require('fs');
const file = 'apps/api/src/modules/students/students.test.ts';
let content = fs.readFileSync(file, 'utf8');

const regex = /const service = new StudentsService\([\s\S]*?as never,\r?\n  \);/m;
const match = content.match(regex);
if (match) {
  const newArgs = `const service = new StudentsService(
    requestContext,
    {
      withRequestTransaction: async <T>(callback: () => Promise<T>): Promise<T> => callback(),
    } as never,
    {
      createStudent: async () => ({
        id: '00000000-0000-0000-0000-000000000101',
        tenant_id: 'tenant-a',
        admission_number: 'ADM-001',
        first_name: 'Amina',
        last_name: 'Otieno',
        middle_name: null,
        status: 'active',
        date_of_birth: '2014-01-10',
        gender: 'female',
        primary_guardian_name: 'Grace Otieno',
        primary_guardian_phone: '254700000001',
        metadata: { stream: 'red' },
        created_by_user_id: '00000000-0000-0000-0000-000000000001',
        created_at: new Date(),
        updated_at: new Date(),
      }),
      countActiveStudents: async () => 150,
    } as never,
    { checkCanAddStudents: async () => {} } as never,
    {} as never,
    { publishStudentCreated: async (payload: any) => { publishedPayload = payload; } } as never,
    { execute: async (req: any) => req.handler() } as never,
    { incrementUsage: async () => {} } as never,
  );`;

  content = content.replace(match[0], newArgs);
  fs.writeFileSync(file, content, 'utf8');
  console.log('patched students test mock constructor');
} else {
  console.log('no match found for students test mock constructor');
}
