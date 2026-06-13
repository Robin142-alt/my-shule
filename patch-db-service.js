const fs = require('fs');

const files = [
  'apps/api/src/modules/hr/hr.test.ts',
  'apps/api/src/modules/integrations/integrations.test.ts',
  'apps/api/src/modules/library/library.test.ts',
  'apps/api/src/modules/timetable/timetable.test.ts'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(/import \{ DatabaseService \} from '..\/..\/database\/database.service';/, "import { PrismaService } from '../../database/prisma.service';");
  content = content.replace(/\[DatabaseService\]/g, '[PrismaService]');
  
  fs.writeFileSync(file, content, 'utf8');
}
