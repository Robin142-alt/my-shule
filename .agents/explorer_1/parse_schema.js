const fs = require('fs');
const path = require('path');

const schemaPath = path.resolve('prisma/schema.prisma');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');

// A more robust model extractor
const models = [];
let currentIndex = 0;

while (true) {
  const modelStartIdx = schemaContent.indexOf('model ', currentIndex);
  if (modelStartIdx === -1) break;

  // Find the opening brace
  const openBraceIdx = schemaContent.indexOf('{', modelStartIdx);
  if (openBraceIdx === -1) break;

  const modelHeader = schemaContent.slice(modelStartIdx, openBraceIdx).trim();
  const modelName = modelHeader.split(/\s+/)[1];

  // Find the correct matching closing brace by counting braces
  let braceCount = 1;
  let searchIdx = openBraceIdx + 1;
  let closeBraceIdx = -1;

  while (braceCount > 0 && searchIdx < schemaContent.length) {
    const char = schemaContent[searchIdx];
    if (char === '{') {
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        closeBraceIdx = searchIdx;
        break;
      }
    }
    searchIdx++;
  }

  if (closeBraceIdx === -1) {
    // Malformed model, skip or break
    currentIndex = openBraceIdx + 1;
    continue;
  }

  const modelBody = schemaContent.slice(openBraceIdx + 1, closeBraceIdx);
  models.push({ name: modelName, body: modelBody });
  currentIndex = closeBraceIdx + 1;
}

const tenantFields = ['schoolId', 'school_id', 'tenantId', 'tenant_id'];
const results = [];

for (const model of models) {
  const modelName = model.name;
  const modelBody = model.body;

  // Find tenant field
  let foundTenantField = null;
  const lines = modelBody.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('@@') || trimmed === '') continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      const fieldName = parts[0];
      if (tenantFields.includes(fieldName)) {
        foundTenantField = fieldName;
        break;
      }
    }
  }

  if (!foundTenantField) {
    // Check if there's any field mapping to school_id or tenant_id
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.includes('@map("school_id")') || trimmed.includes('@map("tenant_id")') || trimmed.includes('@map("schoolId")') || trimmed.includes('@map("tenantId")')) {
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 2) {
          foundTenantField = parts[0];
          break;
        }
      }
    }
  }

  if (foundTenantField) {
    let hasIndex = false;
    let indexDetails = [];

    // 1. Check for single field @unique
    const tenantFieldLine = lines.find(l => l.trim().startsWith(foundTenantField + ' '));
    if (tenantFieldLine && tenantFieldLine.includes('@unique')) {
      hasIndex = true;
      indexDetails.push(`@unique on field ${foundTenantField}`);
    }

    // 2. Check for @@index, @@unique, @@id
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('@@index') || trimmed.startsWith('@@unique') || trimmed.startsWith('@@id')) {
        // Parse fields
        const fieldsMatch = trimmed.match(/\[(.*?)\]/);
        if (fieldsMatch) {
          const fields = fieldsMatch[1].split(',').map(f => f.trim().replace(/"/g, '').replace(/\:\s*\w+/g, ''));
          if (fields[0] === foundTenantField) {
            hasIndex = true;
            indexDetails.push(`${trimmed.startsWith('@@index') ? '@@index' : trimmed.startsWith('@@unique') ? '@@unique' : '@@id'}([${fields.join(', ')}])`);
          }
        }
      }
    }

    results.push({
      model: modelName,
      tenantField: foundTenantField,
      hasIndex,
      indexes: indexDetails
    });
  } else {
    results.push({
      model: modelName,
      tenantField: null,
      hasIndex: false,
      indexes: []
    });
  }
}

const globalModels = ['User', 'School', 'Permission', 'RolePermission', 'ModulePermission', 'SubscriptionPlan'];

const lackingIndex = results.filter(r => r.tenantField && !r.hasIndex);
const indexed = results.filter(r => r.tenantField && r.hasIndex);
const noTenant = results.filter(r => !r.tenantField && !globalModels.includes(r.model));

console.log(`Total Models: ${results.length}`);
console.log(`Models with Tenant Field: ${results.filter(r => r.tenantField).length}`);
console.log(`Models with Index on Tenant Field: ${indexed.length}`);
console.log(`Models LACKING Index on Tenant Field: ${lackingIndex.length}`);
console.log(`Models with No Tenant Field (excluding global): ${noTenant.length}`);

console.log('\n--- Lacking Indexes (First 20) ---');
lackingIndex.slice(0, 20).forEach(r => {
  console.log(`Model: ${r.model} (Field: ${r.tenantField})`);
});

fs.writeFileSync(
  path.resolve(__dirname, 'schema_index_audit.json'),
  JSON.stringify({
    summary: {
      total: results.length,
      withTenant: results.filter(r => r.tenantField).length,
      indexed: indexed.length,
      lackingIndex: lackingIndex.length,
      noTenant: noTenant.length
    },
    lackingIndex,
    indexed,
    noTenant
  }, null, 2),
  'utf8'
);
console.log('\nFull audit results written to schema_index_audit.json');
