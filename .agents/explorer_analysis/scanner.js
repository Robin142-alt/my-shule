const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SCHOOL_COMPONENTS_DIR = path.join(__dirname, '..', '..', 'apps', 'web', 'src', 'components', 'school');
const DEFINITIONS_FILE = path.join(__dirname, '..', '..', 'apps', 'web', 'src', 'lib', 'operational', 'generated-workspace-definitions.ts');
const BACKEND_DIR = path.join(__dirname, '..', '..', 'apps', 'api', 'src');

console.log('SCHOOL_COMPONENTS_DIR:', SCHOOL_COMPONENTS_DIR);
console.log('DEFINITIONS_FILE:', DEFINITIONS_FILE);
console.log('BACKEND_DIR:', BACKEND_DIR);

// 1. Parse generated-workspace-definitions.ts
function parseDefinitions() {
  const content = fs.readFileSync(DEFINITIONS_FILE, 'utf8');
  // We want to extract module contracts
  const contracts = [];
  const moduleContractRegex = /moduleContract\(\{([\s\S]*?)\}\)/g;
  let match;
  
  while ((match = moduleContractRegex.exec(content)) !== null) {
    const block = match[1];
    const idMatch = block.match(/id:\s*['"]([^'"]+)['"]/);
    const titleMatch = block.match(/title:\s*['"]([^'"]+)['"]/);
    const id = idMatch ? idMatch[1] : null;
    const title = titleMatch ? titleMatch[1] : null;
    if (id) {
      contracts.push({ id, title, block });
    }
  }
  return contracts;
}

const definitions = parseDefinitions();
console.log(`Parsed ${definitions.length} definitions from generated-workspace-definitions.ts`);

// 2. Scan school components recursively
function getWorkspaceFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getWorkspaceFiles(filePath, fileList);
    } else if (file.endsWith('-workspace.tsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const workspaceFiles = getWorkspaceFiles(SCHOOL_COMPONENTS_DIR);
console.log(`Found ${workspaceFiles.length} workspace files under components/school`);

// 3. Filter placeholder workspaces
const placeholders = [];
let totalScanned = 0;

for (const file of workspaceFiles) {
  totalScanned++;
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('DocxOperationalWorkspace')) {
    const parentDir = path.dirname(file);
    const role = path.basename(parentDir);
    const relativePath = path.relative(path.join(__dirname, '..', '..'), file);
    
    // Extract moduleId
    const moduleIdMatch = content.match(/moduleId\s*=\s*['"]([^'"]+)['"]/);
    const moduleId = moduleIdMatch ? moduleIdMatch[1] : null;
    
    // Find matching definition
    const def = definitions.find(d => d.id === moduleId);
    
    placeholders.push({
      file: relativePath,
      filename: path.basename(file),
      role,
      moduleId,
      hasDefinition: !!def,
      definitionTitle: def ? def.title : null
    });
  }
}

console.log(`Identified ${placeholders.length} placeholder workspaces rendering DocxOperationalWorkspace`);

// 4. Check backend for bindings/references
// We will search for moduleId in the backend code.
placeholders.forEach((p, idx) => {
  let backendMatches = [];
  if (p.moduleId) {
    try {
      // Use git grep without || true, and wrap in try/catch to handle 0 matches (exit code 1)
      const output = execSync(`git grep -n "${p.moduleId}" apps/api/src`, {
        cwd: path.join(__dirname, '..', '..'),
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'] // ignore stderr to avoid polluting logs
      });
      const lines = output.trim().split('\n').filter(l => l.trim() !== '');
      backendMatches = lines.map(l => {
        const parts = l.split(':');
        return {
          file: parts[0],
          line: parts[1],
          content: parts.slice(2).join(':').trim()
        };
      });
    } catch (e) {
      // No matches or command failed
    }
  }
  p.backendMatches = backendMatches;
  p.backendStatus = backendMatches.length > 0 ? 'Referenced' : 'Missing';
  console.log(`[${idx+1}/${placeholders.length}] Checked ${p.moduleId} - ${p.backendStatus} (${backendMatches.length} references)`);
});

// 5. Group by role
const grouped = {};
placeholders.forEach(p => {
  if (!grouped[p.role]) {
    grouped[p.role] = [];
  }
  grouped[p.role].push(p);
});

// Output results to a JSON file for analysis
fs.writeFileSync(path.join(__dirname, 'scan_results.json'), JSON.stringify({
  totalScanned,
  totalPlaceholders: placeholders.length,
  placeholders,
  grouped
}, null, 2), 'utf8');

console.log('Scan results written to scan_results.json');
