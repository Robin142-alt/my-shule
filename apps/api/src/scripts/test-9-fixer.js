const fs = require('fs');
const path = require('path');

function replaceOrAppend(filePath, regex, replacement) {
  let content = fs.readFileSync(filePath, 'utf-8');
  if (content.match(regex)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${filePath}`);
  } else {
    console.log(`No match found in ${filePath}`);
  }
}

// 1. Inventory & Storekeeper
const inventoryServicePath = path.join(__dirname, '../modules/inventory/inventory.service.ts');
replaceOrAppend(
  inventoryServicePath,
  /payload: \{ requisition_number: requisition\.requisition_number \},\n\s+\},\n\s+\}\);/,
  `payload: { requisition_number: requisition.requisition_number },
      },
      notifications: [
        {
          id: \`req-notification-\${requisition.id}\`,
          schoolId: tenantId,
          title: 'Inventory Requisition Created',
          body: \`Requisition \${requisition.requisition_number} created for \${dto.department}\`,
          audienceRoles: ['storekeeper'],
          priority: 'normal',
          sourceModule: 'inventory',
          relatedModule: 'inventory',
          relatedRecordId: requisition.id,
          read: false,
          createdAt: new Date().toISOString(),
        }
      ]
    });`
);
