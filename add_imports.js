const fs = require('fs');

function addImports(file, imports) {
    let code = fs.readFileSync(file, 'utf-8');
    const importRegex = /import\s+\{[\s\S]*?\}\s+from\s+['"]lucide-react['"];/;
    const match = code.match(importRegex);
    if (match) {
        let importBlock = match[0];
        imports.forEach(imp => {
            if (!importBlock.includes(imp)) {
                importBlock = importBlock.replace('import {', `import {\n  ${imp},`);
            }
        });
        code = code.replace(importRegex, importBlock);
        fs.writeFileSync(file, code, 'utf-8');
    }
}

addImports('apps/web/src/lib/experiences/superadmin-data.ts', ['LayoutGrid', 'UserSquare2', 'GraduationCap', 'FileSpreadsheet']);
addImports('apps/web/src/lib/experiences/school-data.ts', ['LayoutGrid', 'UserSquare2', 'GraduationCap', 'FileSpreadsheet']);
console.log('Successfully added missing icon imports');
