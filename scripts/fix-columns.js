const fs = require('fs');
const file = 'apps/api/src/modules/admin-command/repositories/admin-command.repository.ts';
let content = fs.readFileSync(file, 'utf8');

// Replace tenant_id with school_id for students table
content = content.replace(/FROM students WHERE tenant_id = \$1/g, "FROM students WHERE school_id = $1");
content = content.replace(/FROM students\s+WHERE tenant_id = \$1/g, "FROM students\n              WHERE school_id = $1");

// Replace tenant_memberships with school_memberships
content = content.replace(/tenant_memberships/g, 'school_memberships');
content = content.replace(/FROM school_memberships WHERE tenant_id = \$1/g, "FROM school_memberships WHERE school_id = $1");
content = content.replace(/FROM school_memberships\s+WHERE tenant_id = \$1/g, "FROM school_memberships\n        WHERE school_id = $1");

// Fix class_sections
content = content.replace(/FROM class_sections WHERE tenant_id = \$1/g, "FROM class_sections WHERE school_id = $1");

// Fix staff_profiles
content = content.replace(/staff_profiles/g, 'school_memberships');

fs.writeFileSync(file, content);
console.log('Fixed schema column names in repository');
