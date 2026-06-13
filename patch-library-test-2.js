const fs = require('fs');
const file = 'apps/api/src/modules/library/library.test.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /new LibraryService\(\s*\{ getStore:/g,
  'new LibraryService({} as never, { getStore:'
);

content = content.replace(
  /new LibraryService\(\s*requestContext/g,
  'new LibraryService({} as never, requestContext'
);

fs.writeFileSync(file, content, 'utf8');
console.log('patched library test');
