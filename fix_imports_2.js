const fs = require('fs');
let code = fs.readFileSync('apps/web/src/lib/experiences/superadmin-data.ts', 'utf-8');
const importRegex = /import\s+\{[\s\S]*?\}\s+from\s+['"]lucide-react['"];/;
const match = code.match(importRegex);
if (match) {
    let importBlock = match[0];
    ['Stethoscope', 'Settings'].forEach(imp => {
        if (!importBlock.includes(imp)) {
            importBlock = importBlock.replace('import {', `import {\n  ${imp},`);
        }
    });
    code = code.replace(importRegex, importBlock);
    fs.writeFileSync('apps/web/src/lib/experiences/superadmin-data.ts', code, 'utf-8');
}
console.log('Fixed imports in superadmin-data.ts');
