const fs = require('fs');

const file = 'apps/api/src/modules/admissions/admissions.test.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /executeWithTenant: async \(tenantId: string, userId: string \| null, cb: any\) => cb\(\),/g,
  'withRequestTransaction: async <T>(callback: () => Promise<T>): Promise<T> => callback(),\n      executeWithTenant: async (tenantId: string, userId: string | null, cb: any) => cb(),'
);

fs.writeFileSync(file, content, 'utf8');
console.log('patched executeWithTenant and withRequestTransaction in admissions.test.ts');
