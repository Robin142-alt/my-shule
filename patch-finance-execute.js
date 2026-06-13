const fs = require('fs');

function patchLedgerService() {
  const file = 'apps/api/src/modules/finance/ledger.service.ts';
  let content = fs.readFileSync(file, 'utf8');

  // Replace withRequestTransaction with executeWithTenant
  content = content.replace(
    /return databaseService\.withRequestTransaction\(async \(\) => \{\s*const requestContext = this\.requireRuntimeDependency\(\s*this\.requestContext,\s*'RequestContextService',\s*\)\.requireStore\(\);\s*const tenantId = this\.requireTenantId\(\);/g,
    `const requestContext = this.requireRuntimeDependency(
      this.requestContext,
      'RequestContextService',
    ).requireStore();
    const tenantId = this.requireTenantId();

    return databaseService.executeWithTenant(tenantId, null, async () => {`
  );

  fs.writeFileSync(file, content, 'utf8');
}

function patchFinanceTest() {
  const file = 'apps/api/src/modules/finance/finance.test.ts';
  let content = fs.readFileSync(file, 'utf8');

  // The first argument to LedgerService is `this.prisma`.
  // We need it to have executeWithTenant instead of being just `{} as never`.
  
  content = content.replace(
    /const service = new LedgerService\({} as never, \{/g,
    `const service = new LedgerService({ executeWithTenant: async (tenantId: string, userId: string | null, cb: any) => cb() } as never, {`
  );

  fs.writeFileSync(file, content, 'utf8');
}

patchLedgerService();
patchFinanceTest();
console.log('patched ledger and finance test');
