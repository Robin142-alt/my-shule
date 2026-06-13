const fs = require('fs');
const glob = require('glob');

const files = glob.sync('apps/api/src/modules/**/*.test.ts').concat(glob.sync('apps/api/src/modules/**/*.test.js'));

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  
  let modified = false;
  
  // Find "query: async" blocks inside repository mocks
  const patchedContent = content.replace(
    /query:\s*async\s*\((.*?)\)\s*=>\s*\{([\s\S]*?)\n\s*\},/g,
    (match, args, body) => {
      if (body.includes('$queryRawUnsafe')) return match; // already patched

      let unsafeBody = body.replace(/return\s*\{\s*rows:\s*([^}]*?)\s*\};/g, 'return $1;');
      
      modified = true;
      return `${match}\n    executeWithTenant: async (tenantId: string, ctx: any, cb: any) => {\n      return cb({\n        $queryRawUnsafe: async (${args}) => {${unsafeBody}\n        }\n      });\n    },`;
    }
  );

  if (modified) {
    fs.writeFileSync(file, patchedContent, 'utf8');
  }
}
