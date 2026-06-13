const fs = require('fs');

function patchStudentLifecycle() {
  const file = 'apps/api/src/modules/students/student-lifecycle.controller.ts';
  let content = fs.readFileSync(file, 'utf8');

  // Add the import
  content = content.replace(
    /import \{ StudentStatus \} from '@prisma\/client';/,
    `import { StudentStatus } from '@prisma/client';\nimport { Permissions } from '../../auth/decorators/permissions.decorator';`
  );

  // Add the decorator
  content = content.replace(
    /@Controller\('students\/lifecycle'\)/,
    `@Controller('students/lifecycle')\n@Permissions('students:lifecycle')`
  );

  fs.writeFileSync(file, content, 'utf8');
}

function patchPermission() {
  const file = 'apps/api/src/modules/workflow/controllers/permission.controller.ts';
  let content = fs.readFileSync(file, 'utf8');

  // Add the import
  content = content.replace(
    /import \{ PermissionService \} from '\.\.\/services\/permission\.service';/,
    `import { PermissionService } from '../services/permission.service';\nimport { Permissions } from '../../auth/decorators/permissions.decorator';`
  );

  // Add the decorator
  content = content.replace(
    /@Controller\('permissions'\)/,
    `@Controller('permissions')\n@Permissions('*')`
  );

  fs.writeFileSync(file, content, 'utf8');
}

patchStudentLifecycle();
patchPermission();
console.log('patched missing controller decorators');
