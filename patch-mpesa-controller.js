const fs = require('fs');

const file = 'apps/api/src/modules/payments/payments.test.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/new MpesaCallbackController\(\s*requestContext,/g, 'new MpesaCallbackController({} as never, requestContext,');

fs.writeFileSync(file, content, 'utf8');
