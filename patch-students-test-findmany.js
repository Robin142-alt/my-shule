const fs = require('fs');
const file = 'apps/api/src/modules/students/students.test.ts';
let content = fs.readFileSync(file, 'utf8');

const regex = /executeWithTenant: async \(tenantId: string, userId: string \| null, cb: any\) => \{\r?\n\s*return cb\(\{([\s\S]*?)\}\);\r?\n\s*\}/m;
const match = content.match(regex);

if (match) {
  const newMock = `executeWithTenant: async (tenantId: string, userId: string | null, cb: any) => {
        return cb({
          student: {
            findMany: async (args: any) => {
              queries.push({ text: 'student.findMany', values: [args] });
              return [
                {
                  id: '00000000-0000-0000-0000-000000000202',
                  tenant_id: 'tenant-a',
                  admission_number: 'ADM-202',
                  first_name: 'Amina',
                  last_name: 'Wanjiku',
                  middle_name: null,
                  status: 'active',
                  date_of_birth: new Date('2013-02-01'),
                  gender: 'female',
                  created_at: new Date('2026-05-20T06:00:00.000Z'),
                  updated_at: new Date('2026-05-20T06:00:00.000Z'),
                },
              ];
            }
          },
          $queryRawUnsafe: async (sql: string, ...params: any[]) => {
            queries.push({ text: sql, values: params });
            return [
              {
                id: '00000000-0000-0000-0000-000000000202',
                tenant_id: 'tenant-a',
                admission_number: 'ADM-202',
                first_name: 'Amina',
                last_name: 'Wanjiku',
                middle_name: null,
                status: 'active',
                date_of_birth: new Date('2013-02-01'),
                gender: 'female',
                created_at: new Date('2026-05-20T06:00:00.000Z'),
                updated_at: new Date('2026-05-20T06:00:00.000Z'),
              },
            ];
          },
        });
      }`;

  content = content.replace(match[0], newMock);
  fs.writeFileSync(file, content, 'utf8');
  console.log('patched executeWithTenant mock with student.findMany');
} else {
  console.log('match not found');
}
