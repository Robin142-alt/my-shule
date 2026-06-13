const fs = require('fs');
const file = 'apps/api/src/modules/students/students.test.ts';
let content = fs.readFileSync(file, 'utf8');

// Replace the mock for StudentsRepository in the keyset cursor pagination test
const oldMock = `    {
      query: async (text: string, values: unknown[]) => {
        queries.push({ text, values });`;

const newMock = `    {
      executeWithTenant: async function(tenantId, ctx, cb) {
        return cb({
          $queryRawUnsafe: async (sql, ...params) => {
            const res = await this.query(sql, params);
            return res.rows || res;
          },
          student: {
            findMany: async (args) => {
              queries.push({ text: 'prisma.student.findMany', values: [args] });
              return [{
                id: '00000000-0000-0000-0000-000000000202',
                schoolId: 'tenant-a',
                admissionNumber: 'ADM-202',
                firstName: 'Amina',
                lastName: 'Wanjiku',
                middleName: null,
                studentStatus: 'ACTIVE',
                dateOfBirth: new Date('2013-02-01'),
                gender: 'female',
                createdAt: new Date('2026-05-20T06:00:00.000Z'),
                updatedAt: new Date('2026-05-20T06:00:00.000Z'),
              }];
            }
          }
        });
      },
      query: async (text: string, values: unknown[]) => {
        queries.push({ text, values });`;

content = content.replace(oldMock, newMock);

// Add agp mock
content = content.replace(
  /    \} as never,\n    \{\n      recordUsage:/g,
  `    } as never,\n    {\n      execute: async (req: any) => req.handler(),\n    } as never,\n    {\n      recordUsage:`
);

fs.writeFileSync(file, content, 'utf8');
console.log('patched students test 2');
