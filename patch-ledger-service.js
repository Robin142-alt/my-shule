const fs = require('fs');

const file = 'apps/api/src/modules/finance/finance.test.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/new LedgerService\(\)/g, 'new LedgerService({} as never)');
content = content.replace(/new LedgerService\(\s*\{/g, 'new LedgerService({} as never, {');

fs.writeFileSync(file, content, 'utf8');
