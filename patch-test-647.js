const fs = require('fs');

const file = 'apps/api/src/modules/students/students.test.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /queries\.push\(\{ text: 'student\.findMany'/g,
  "queries.push({ text: 'prisma.student.findMany'"
);

fs.writeFileSync(file, content, 'utf8');
console.log('patched students.test.ts for test 647');
