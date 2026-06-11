const fs = require('fs');

const rawBlueprint = fs.readFileSync('blueprint-raw.txt', 'utf-8');
const rolesMatch = [...rawBlueprint.matchAll(/^# \d+\. (.+) Dashboard/gm)];

const roles = rolesMatch.map(m => m[1].trim());

console.log("Expected Roles in Blueprint:");
roles.forEach(r => console.log(r));

// Now let's check the frontend app directory
const appDir = 'apps/web/src/app';
const dirs = fs.readdirSync(appDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

console.log("\nDirectories in apps/web/src/app:");
dirs.forEach(d => console.log(d));

// Let's do a mapping to see which roles have a directory
const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-');

console.log("\nMatching:");
roles.forEach(r => {
  const slug = slugify(r);
  // Some roles might be mapped differently, e.g., Super Admin -> superadmin
  const matched = dirs.find(d => d === slug || d === slug.replace('-', ''));
  if (matched) {
    console.log(`[OK] Role '${r}' mapped to directory '${matched}'`);
  } else {
    console.log(`[MISSING] Role '${r}' has no direct directory mapping (slug checked: ${slug}, ${slug.replace('-', '')})`);
  }
});
