const fs = require('fs');

// INVENTORY
let invService = fs.readFileSync('apps/api/src/modules/inventory/inventory.service.ts', 'utf8');
if (!invService.includes("import { SchoolOperationalEventsService }")) {
  invService = `import { SchoolOperationalEventsService } from '../events/school-operational-events.service';\n` + invService;
  fs.writeFileSync('apps/api/src/modules/inventory/inventory.service.ts', invService);
}

// LIBRARY
let libService = fs.readFileSync('apps/api/src/modules/library/library.service.ts', 'utf8');
if (!libService.includes("import { SchoolOperationalEventsService }")) {
  libService = `import { SchoolOperationalEventsService } from '../events/school-operational-events.service';\n` + libService;
  fs.writeFileSync('apps/api/src/modules/library/library.service.ts', libService);
}
