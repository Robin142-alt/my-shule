const fs = require('fs');
let content = fs.readFileSync('apps/api/src/scripts/base-onboarding-seed.ts', 'utf-8');

// Replace the imports
content = content.replace(/import \{.*\} from '\.\.\/\.\.\/web\/src\/lib\/demo\/kisumu-boys-high-demo';/s, '');

// Rename seed key
content = content.replace(/export const KISUMU_BOYS_DEMO_SEED_KEY = 'kisumu-boys-demo-v1';/, "export const ONBOARDING_SEED_KEY = 'onboarding-base-v1';");

// Replace assertKisumuBoysTenantSelection to assertOnboardingTenantSelection
content = content.replace(/assertKisumuBoysTenantSelection/g, 'assertOnboardingTenantSelection');
content = content.replace(/const KISUMU_BOYS_NOT_FOUND_MESSAGE = "ERROR: Existing demo school 'Kisumu Boys' not found. Seed aborted.";/, '');

content = content.replace(/export function assertOnboardingTenantSelection\(rows: TenantSelectionRow\[\]\): TenantSelectionRow \{[\s\S]*?return tenant;\n\}/, 'export function assertOnboardingTenantSelection(rows: TenantSelectionRow[]): TenantSelectionRow {\n  if (rows.length !== 1) {\n    throw new Error("ERROR: Tenant not found.");\n  }\n  return rows[0];\n}');

// Delete the seedDemoRows function and its contents
content = content.replace(/async function seedDemoRows\(writer: DemoSeedWriter, context: DemoContext\): Promise<void> \{[\s\S]*?\n\}\n\nasync function runSeed/, 'async function seedDemoRows(writer: DemoSeedWriter, context: DemoContext): Promise<void> {\n  // Do nothing, base onboarding is empty.\n}\n\nasync function runSeed');

// Update DemoSeedWriter to BaseSeedWriter
content = content.replace(/class DemoSeedWriter/g, 'class BaseSeedWriter');
content = content.replace(/DemoSeedWriter/g, 'BaseSeedWriter');
content = content.replace(/KISUMU_BOYS_DEMO_SEED_KEY/g, 'ONBOARDING_SEED_KEY');

// Update resolveTenant
content = content.replace(/SELECT id::text, tenant_id, name, subdomain\n      FROM tenants\n      WHERE name = 'Kisumu Boys'/, "SELECT id::text, tenant_id, name, subdomain\n      FROM tenants\n      WHERE tenant_id = $1");
content = content.replace(/async function resolveTenant\(client: Client\): Promise<TenantSelectionRow> \{/, "async function resolveTenant(client: Client, targetTenantId: string): Promise<TenantSelectionRow> {");
content = content.replace(/const result = await client\.query<TenantSelectionRow>\([\s\S]*?\);/m, "const result = await client.query<TenantSelectionRow>(`\n      SELECT id::text, tenant_id, name, subdomain\n      FROM tenants\n      WHERE tenant_id = $1\n    `, [targetTenantId]);");

// Update runSeed call to resolveTenant
content = content.replace(/const tenant = await resolveTenant\(client\);/, "const targetTenantId = process.env.TARGET_TENANT_ID;\n    if (!targetTenantId) throw new Error('TARGET_TENANT_ID is required');\n    const tenant = await resolveTenant(client, targetTenantId);");

content = content.replace(/if \(apply && !process\.argv\.includes\('--confirm-kisumu-boys-only'\)\) \{[\s\S]*?\}/, "if (apply && !process.argv.includes('--confirm-onboarding')) { throw new Error('Refusing to mutate data without --confirm-onboarding.'); }");

// We also need to strip out `buildKisumuBoysDemoSeedPlan` usage.
content = content.replace(/const plan = buildKisumuBoysDemoSeedPlan\(\);/, "const plan = { seedKey: ONBOARDING_SEED_KEY };");

fs.writeFileSync('apps/api/src/scripts/base-onboarding-seed.ts', content);
