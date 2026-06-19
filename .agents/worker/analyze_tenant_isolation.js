const fs = require('fs');
const path = require('path');

const PROJECT_DIR = 'C:\\Users\\user\\Desktop\\PROJECTS\\Shule hub';
const SCHEMA_FILE = path.join(PROJECT_DIR, 'prisma', 'schema.prisma');

if (!fs.existsSync(SCHEMA_FILE)) {
  console.error('schema.prisma not found.');
  process.exit(1);
}

const schemaContent = fs.readFileSync(SCHEMA_FILE, 'utf8');
const modelBlocks = schemaContent.split('model ');

const models = [];

for (let i = 1; i < modelBlocks.length; i++) {
  const block = modelBlocks[i];
  const braceIdx = block.indexOf('{');
  if (braceIdx === -1) continue;
  const modelName = block.substring(0, braceIdx).trim();
  const modelBody = block.substring(braceIdx + 1);
  const closeBraceIdx = modelBody.indexOf('}');
  if (closeBraceIdx === -1) continue;
  const bodyContent = modelBody.substring(0, closeBraceIdx);
  
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
    
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      const fieldName = parts[0];
      if (['schoolId', 'school_id', 'tenantId', 'tenant_id'].includes(fieldName)) {
        tenantFields.push(fieldName);
      }
    }
  });
  
  models.push({
    name: modelName,
    tenantFields,
    hasIndexOnTenant
  });
}

const withoutTenant = models.filter(m => m.tenantFields.length === 0);
const withTenantButNotIndexed = models.filter(m => m.tenantFields.length > 0 && !m.hasIndexOnTenant);

const report = {
  summary: {
    totalModels: models.length,
    withoutTenantCount: withoutTenant.length,
    withTenantButNotIndexedCount: withTenantButNotIndexed.length
  },
  modelsWithoutTenant: withoutTenant.map(m => m.name),
  modelsWithTenantButNotIndexed: withTenantButNotIndexed.map(m => ({ name: m.name, fields: m.tenantFields }))
};

fs.writeFileSync(
  path.join(PROJECT_DIR, '.agents', 'worker', 'tenant_isolation_report.json'),
  JSON.stringify(report, null, 2),
  'utf8'
);

console.log('Written report to .agents/worker/tenant_isolation_report.json');
