const fs = require('fs');
const path = require('path');

const modulesDir = path.join(__dirname, 'apps/api/src/modules');

function getFilesRecursively(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of list) {
    if (file.isDirectory()) {
      results = results.concat(getFilesRecursively(path.join(dir, file.name)));
    } else {
      results.push(path.join(dir, file.name));
    }
  }
  return results;
}

const modules = fs.readdirSync(modulesDir, { withFileTypes: true })
  .filter(d => d.isDirectory());

let patchedModulesCount = 0;

for (const mod of modules) {
  const modPath = path.join(modulesDir, mod.name);
  const consumersDir = path.join(modPath, 'consumers');
  
  if (!fs.existsSync(consumersDir)) continue;

  const consumerFiles = getFilesRecursively(consumersDir)
    .filter(f => f.endsWith('.consumer.ts') || f.endsWith('.ts'))
    .filter(f => !f.endsWith('index.ts'));

  if (consumerFiles.length === 0) continue;

  // 1. Generate index.ts
  let indexCode = '';
  const exportNames = [];
  for (const file of consumerFiles) {
    const relPath = './' + path.relative(consumersDir, file).replace(/\\/g, '/').replace('.ts', '');
    const content = fs.readFileSync(file, 'utf-8');
    const classMatch = content.match(/export class ([A-Za-z0-9_]+)/);
    if (classMatch) {
      indexCode += `export { ${classMatch[1]} } from '${relPath}';\n`;
      exportNames.push(classMatch[1]);
    }
  }
  
  fs.writeFileSync(path.join(consumersDir, 'index.ts'), indexCode, 'utf-8');

  // 2. Patch module.ts
  // Module files are usually named [module.name].module.ts, e.g., discipline.module.ts
  // or they might have different names, let's find the .module.ts file in the modPath
  const moduleFiles = fs.readdirSync(modPath).filter(f => f.endsWith('.module.ts'));
  if (moduleFiles.length === 0) continue;
  
  for (const moduleFile of moduleFiles) {
    const moduleFilePath = path.join(modPath, moduleFile);
    let moduleCode = fs.readFileSync(moduleFilePath, 'utf-8');
    
    // Check if already patched
    if (moduleCode.includes(`import * as moduleConsumers from './consumers';`)) {
      continue;
    }

    // Insert import at the top
    moduleCode = `import * as moduleConsumers from './consumers';\n` + moduleCode;

    // We need to inject ...Object.values(moduleConsumers) into providers: [ ... ]
    // We will use a regex replacement. 
    // Find "providers: [" or "providers: \n  ["
    const providersRegex = /(providers\s*:\s*\[)/;
    if (providersRegex.test(moduleCode)) {
      moduleCode = moduleCode.replace(providersRegex, `$1\n    ...Object.values(moduleConsumers),`);
      fs.writeFileSync(moduleFilePath, moduleCode, 'utf-8');
      console.log(`Patched ${moduleFile} to include ${exportNames.length} consumers.`);
      patchedModulesCount++;
    } else {
      // If there's no providers array, we need to inject it into @Module({ ... })
      const moduleDecoratorRegex = /(@Module\s*\(\{)/;
      if (moduleDecoratorRegex.test(moduleCode)) {
        moduleCode = moduleCode.replace(moduleDecoratorRegex, `$1\n  providers: [...Object.values(moduleConsumers)],`);
        fs.writeFileSync(moduleFilePath, moduleCode, 'utf-8');
        console.log(`Patched ${moduleFile} (added providers array) to include ${exportNames.length} consumers.`);
        patchedModulesCount++;
      }
    }
  }
}

console.log(`Successfully patched ${patchedModulesCount} module(s).`);
