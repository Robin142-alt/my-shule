const fs = require('fs');
const path = require('path');

const PROJECT_DIR = 'C:\\Users\\user\\Desktop\\PROJECTS\\Shule hub';
const BACKEND_DIR = path.join(PROJECT_DIR, 'apps', 'api', 'src');
const SCHEMA_FILE = path.join(PROJECT_DIR, 'prisma', 'schema.prisma');

// Paths to frontend analysis folders
const EXPLORER_1_DIR = path.join(PROJECT_DIR, '.agents', 'explorer_frontend_1');
const EXPLORER_2_DIR = path.join(PROJECT_DIR, '.agents', 'explorer_frontend_2');
const EXPLORER_3_DIR = path.join(PROJECT_DIR, '.agents', 'explorer_frontend_3');

function normalizePath(p) {
  if (!p) return '';
  let normalized = p.trim();
  
  // Remove query params
  const queryIdx = normalized.indexOf('?');
  if (queryIdx !== -1) {
    normalized = normalized.substring(0, queryIdx);
  }
  
  // Strip starting/ending backticks/quotes if any
  normalized = normalized.replace(/^['"`]+|['"`]+$/g, '');
  
  // Standardize prefix
  if (normalized.startsWith('/api/v1/')) {
    normalized = normalized.substring(7); // strip '/api/v1' -> '/'
  } else if (normalized.startsWith('/api/')) {
    normalized = normalized.substring(4); // strip '/api' -> '/'
  } else if (normalized.startsWith('api/v1/')) {
    normalized = '/' + normalized.substring(7);
  } else if (normalized.startsWith('api/')) {
    normalized = '/' + normalized.substring(4);
  }
  
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }
  
  // Strip trailing slash unless it's just '/'
  if (normalized.endsWith('/') && normalized.length > 1) {
    normalized = normalized.slice(0, -1);
  }
  
  // Replace environment variables or path parameters
  normalized = normalized.replace(/\$\{baseUrl\}/g, '');
  normalized = normalized.replace(/\$\{apiBase\}/g, '');
  normalized = normalized.replace(/\$\{apiBaseUrl\}/g, '');
  normalized = normalized.replace(/\$\{baseUrlSchool\}/g, '');
  normalized = normalized.replace(/\$\{tenantId\}/g, '');
  normalized = normalized.replace(/\$\{tenant_id\}/g, '');
  
  // Standardize all route parameters to :param
  normalized = normalized.replace(/\$\{[^}]+\}/g, ':param');
  normalized = normalized.replace(/\/:[a-zA-Z0-9_]+/g, '/:param');
  
  // Clean up any double slashes
  normalized = normalized.replace(/\/+/g, '/');
  
  return normalized;
}

// -------------------------------------------------------------
// Step 1: Compile Master List of Expected Endpoints from Frontend
// -------------------------------------------------------------
const expectedEndpoints = new Map(); // Key: "METHOD path", Value: { method, path, originalPaths: [], sources: [] }

// A. Parse explorer_frontend_1 raw_endpoints.json if exists
const rawJsonPath = path.join(EXPLORER_1_DIR, 'raw_endpoints.json');
if (fs.existsSync(rawJsonPath)) {
  try {
    const rawData = JSON.parse(fs.readFileSync(rawJsonPath, 'utf8'));
    for (const ref of rawData) {
      const method = (ref.method || 'GET').toUpperCase();
      const norm = normalizePath(ref.path);
      
      // Filter out external URLs or static resources
      if (norm.startsWith('/http') || norm.endsWith('.json') || norm.endsWith('.svg') || norm.endsWith('.png')) {
        continue;
      }
      
      const key = `${method} ${norm}`;
      if (!expectedEndpoints.has(key)) {
        expectedEndpoints.set(key, { method, path: norm, originalPaths: new Set(), sources: new Set() });
      }
      const entry = expectedEndpoints.get(key);
      entry.originalPaths.add(ref.path);
      entry.sources.add(ref.file);
    }
  } catch (err) {
    console.error('Error reading raw_endpoints.json:', err.message);
  }
}

// B. Parse markdown tables from all explorer analysis files to ensure complete coverage
const analysisFiles = [
  path.join(EXPLORER_1_DIR, 'analysis.md'),
  path.join(EXPLORER_2_DIR, 'analysis.md'),
  path.join(EXPLORER_3_DIR, 'analysis.md')
];

analysisFiles.forEach((file, idx) => {
  if (!fs.existsSync(file)) {
    console.log(`Frontend Analysis File ${idx + 1} not found at: ${file}`);
    return;
  }
  
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach(line => {
    if (!line.includes('|')) return;
    const parts = line.split('|').map(p => p.trim());
    
    let method = '';
    let rawPath = '';
    
    for (let p of parts) {
      const upper = p.toUpperCase().replace(/\*/g, '').trim();
      if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'SSE'].includes(upper)) {
        method = upper === 'SSE' ? 'GET' : upper;
      }
      if (p.includes('/') || p.includes('${')) {
        const match = p.match(/`([^`]+)`/) || p.match(/'([^']+)'/) || p.match(/"([^"]+)"/);
        if (match) {
          rawPath = match[1];
        } else if (p.startsWith('/') || p.startsWith('api/') || p.startsWith('${')) {
          rawPath = p;
        }
      }
    }
    
    if (method && rawPath) {
      const norm = normalizePath(rawPath);
      if (norm && !norm.startsWith('/http') && !norm.endsWith('.json') && !norm.endsWith('.svg') && !norm.endsWith('.png')) {
        const key = `${method} ${norm}`;
        if (!expectedEndpoints.has(key)) {
          expectedEndpoints.set(key, { method, path: norm, originalPaths: new Set(), sources: new Set() });
        }
        const entry = expectedEndpoints.get(key);
        entry.originalPaths.add(rawPath);
        entry.sources.add(`analysis_${idx + 1}.md`);
      }
    }
  });
});

console.log(`Loaded ${expectedEndpoints.size} unique expected endpoints from frontend analyses.`);

// -------------------------------------------------------------
// Step 2: Scan Backend Codebase for Actual Implemented Routes
// -------------------------------------------------------------
const actualRoutes = [];

function walkDirectory(dir, filter, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDirectory(fullPath, filter, callback);
    } else if (filter(fullPath)) {
      callback(fullPath);
    }
  }
}

walkDirectory(BACKEND_DIR, (f) => f.endsWith('.controller.ts'), (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  
  const controllerMatch = content.match(/@Controller\(\s*(?:['"`]([^'"`]*)['"`])?\s*\)/);
  if (!controllerMatch) {
    return;
  }
  const prefix = controllerMatch[1] || '';
  
  const classMatch = content.match(/export\s+class\s+(\w+)/);
  const className = classMatch ? classMatch[1] : path.basename(filePath);
  
  // Custom parsing loop to match HTTP decorators and extract the actual method name
  const httpDecoratorRegex = /@(Get|Post|Put|Patch|Delete|Sse)\(\s*(?:['"`]([^'"`]*)['"`])?\s*\)/g;
  let match;
  while ((match = httpDecoratorRegex.exec(content)) !== null) {
    const decorator = match[0];
    const httpMethod = match[1] === 'Sse' ? 'GET' : match[1].toUpperCase();
    const subpath = match[2] || '';
    
    // Look forward from this match to find the method name
    const startIdx = match.index + decorator.length;
    const forwardText = content.substring(startIdx);
    const forwardLines = forwardText.split('\n');
    
    let methodName = 'unknown';
    for (let line of forwardLines) {
      line = line.trim();
      if (!line) continue;
      
      // Skip decorators
      if (line.startsWith('@')) continue;
      
      // Look for method signature: e.g. "async createStudent(" or "getStudents("
      const sigMatch = line.match(/^(?:async\s+)?(\w+)\s*\(/);
      if (sigMatch) {
        methodName = sigMatch[1];
        break;
      }
      
      // If we see another class definition or end of block, stop
      if (line.includes('class ') || line.includes('}')) {
        break;
      }
    }
    
    const fullPath = '/' + [prefix, subpath].filter(Boolean).join('/');
    const normalizedPath = normalizePath(fullPath);
    
    actualRoutes.push({
      file: path.relative(PROJECT_DIR, filePath),
      controller: className,
      method: methodName,
      httpMethod,
      subpath,
      fullPath,
      normalizedPath
    });
  }
});

console.log(`Scanned backend. Found ${actualRoutes.length} actual endpoints in controllers.`);

// -------------------------------------------------------------
// Step 3: Scan Prisma Schema for Models, Columns, and Multi-tenant Scope
// -------------------------------------------------------------
const prismaModels = new Map();

if (fs.existsSync(SCHEMA_FILE)) {
  const schemaContent = fs.readFileSync(SCHEMA_FILE, 'utf8');
  const modelBlocks = schemaContent.split('model ');
  
  for (let i = 1; i < modelBlocks.length; i++) {
    const block = modelBlocks[i];
    const braceIdx = block.indexOf('{');
    if (braceIdx === -1) continue;
    const modelName = block.substring(0, braceIdx).trim();
    const modelBody = block.substring(braceIdx + 1);
    const closeBraceIdx = modelBody.indexOf('}');
    if (closeBraceIdx === -1) continue;
    const bodyContent = modelBody.substring(0, closeBraceIdx);
    
    const fields = [];
    const tenantFields = [];
    let hasIndexOnTenant = false;
    
    const lines = bodyContent.split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//')) return;
      
      if (trimmed.startsWith('@@index') || trimmed.startsWith('@@unique')) {
        if (trimmed.includes('school_id') || trimmed.includes('schoolId') || trimmed.includes('tenantId') || trimmed.includes('tenant_id')) {
          hasIndexOnTenant = true;
        }
        return;
      }
      
      const fieldParts = trimmed.split(/\s+/);
      if (fieldParts.length >= 2) {
        const fieldName = fieldParts[0];
        const fieldType = fieldParts[1];
        
        fields.push({ name: fieldName, type: fieldType });
        
        if (['schoolId', 'school_id', 'tenantId', 'tenant_id'].includes(fieldName)) {
          tenantFields.push({ name: fieldName, type: fieldType });
        }
      }
    });
    
    prismaModels.set(modelName.toLowerCase(), {
      name: modelName,
      fields,
      tenantFields,
      hasIndexOnTenant
    });
  }
}

console.log(`Scanned Prisma schema. Found ${prismaModels.size} models.`);

// -------------------------------------------------------------
// Step 4: Scan Backend Services for Database Queries & Models
// -------------------------------------------------------------
const serviceFilesScanned = [];
const missingModelsReferenced = new Set();
const uncheckedTenantIsolation = [];

walkDirectory(BACKEND_DIR, (f) => f.endsWith('.service.ts'), (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(PROJECT_DIR, filePath);
  serviceFilesScanned.push(relPath);
  
  const prismaQueryRegex = /\b(?:prisma|db|prismaService|prismaClient)\.([a-z][a-zA-Z0-9_]*)\.(findMany|findFirst|findUnique|findFirstOrThrow|findUniqueOrThrow|create|update|delete|upsert|count|aggregate|groupBy|updateMany|deleteMany)\b/g;
  let match;
  while ((match = prismaQueryRegex.exec(content)) !== null) {
    const camelModel = match[1];
    const op = match[2];
    
    const modelLower = camelModel.toLowerCase();
    const model = prismaModels.get(modelLower);
    
    if (!model) {
      // Ignore if it starts with comment prefix on the same line
      const lineStartIdx = content.lastIndexOf('\n', match.index);
      const lineSnippet = content.substring(lineStartIdx, match.index);
      if (lineSnippet.includes('//') || lineSnippet.includes('/*')) {
        continue;
      }
      missingModelsReferenced.add(`${camelModel} (in ${relPath})`);
    }
  }
});

console.log(`Scanned ${serviceFilesScanned.length} service files for Prisma queries.`);

// -------------------------------------------------------------
// Step 5: Reconciliation of Expected vs Actual Routes
// -------------------------------------------------------------
const wiredEndpoints = [];
const missingEndpoints = [];
const extraBackendRoutes = [];

const actualRoutesMap = new Map();
actualRoutes.forEach(r => {
  const key = `${r.httpMethod} ${r.normalizedPath}`;
  if (!actualRoutesMap.has(key)) {
    actualRoutesMap.set(key, []);
  }
  actualRoutesMap.get(key).push(r);
});

expectedEndpoints.forEach((val, key) => {
  const actuals = actualRoutesMap.get(key);
  if (actuals && actuals.length > 0) {
    wiredEndpoints.push({
      key,
      expected: val,
      actual: actuals[0]
    });
  } else {
    const matchesAnyMethod = actualRoutes.filter(r => r.normalizedPath === val.path);
    missingEndpoints.push({
      key,
      expected: val,
      methodMismatch: matchesAnyMethod.map(m => m.httpMethod)
    });
  }
});

actualRoutes.forEach(r => {
  const key = `${r.httpMethod} ${r.normalizedPath}`;
  if (!expectedEndpoints.has(key)) {
    extraBackendRoutes.push(r);
  }
});

// -------------------------------------------------------------
// Step 6: Output Consolidated Audit JSON
// -------------------------------------------------------------
const auditData = {
  summary: {
    totalExpectedFrontendEndpoints: expectedEndpoints.size,
    totalActualBackendEndpoints: actualRoutes.length,
    fullyWiredEndpoints: wiredEndpoints.length,
    missingEndpoints: missingEndpoints.length,
    extraBackendEndpoints: extraBackendRoutes.length,
    prismaModelsCount: prismaModels.size,
    missingModelsReferencedCount: missingModelsReferenced.size,
    uncheckedTenantQueriesCount: uncheckedTenantIsolation.length
  },
  missingEndpoints,
  wiredEndpoints,
  extraBackendRoutes,
  missingModelsReferenced: Array.from(missingModelsReferenced),
  uncheckedTenantIsolation
};

fs.writeFileSync(
  path.join(PROJECT_DIR, '.agents', 'worker', 'audit_scan_results.json'),
  JSON.stringify(auditData, null, 2),
  'utf8'
);

console.log('Audit scan completed. JSON results written to .agents/worker/audit_scan_results.json');
