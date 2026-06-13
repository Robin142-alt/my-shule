const fs = require('fs');
const glob = require('glob');

const files = glob.sync('apps/api/src/**/*.ts', { ignore: ['**/*.test.ts'] });

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  let changed = false;

  // 1. Remove prepended prisma from constructors
  if (content.includes('constructor(private readonly prisma: PrismaService, ')) {
    content = content.replace('constructor(private readonly prisma: PrismaService, ', 'constructor(');
    changed = true;
  }

  // 2. Rewrite executeSql to use databaseService or prisma fallback and cast as any to prevent TS errors
  if (content.includes('private async executeSql<T = any>')) {
    // We will replace the entire executeSql method.
    // The executeSql method starts with `private async executeSql` and ends with the next `  }` or `  async ` or whatever, but my injected executeSql was very specific.
    // Let's just use a regex to replace `this.prisma.` with `((this as any).databaseService || (this as any).prisma).` inside executeSql!
    // But we need to be careful not to replace anything else.
    // Since `this.prisma` is only used inside `executeSql` for those files, we can just replace `this.prisma.` with `((this as any).databaseService || (this as any).prisma).` globally in the file IF it had executeSql!
    // Actually, safer to just replace it within executeSql.
    
    // Instead of parsing, let's just replace all `this.prisma.executeWithTenant` and `this.prisma.$queryRawUnsafe` and `(this.prisma as any).query` 
    // with `((this as any).databaseService || (this as any).prisma).executeWithTenant` etc.
    const newPrisma = '((this as any).databaseService || (this as any).prisma)';
    const originalPrismaRegex1 = /this\.prisma\.executeWithTenant/g;
    const originalPrismaRegex2 = /this\.prisma\.\$queryRawUnsafe/g;
    const originalPrismaRegex3 = /\(this\.prisma as any\)\.query/g;

    if (originalPrismaRegex1.test(content) || originalPrismaRegex2.test(content) || originalPrismaRegex3.test(content)) {
      content = content.replace(originalPrismaRegex1, `${newPrisma}.executeWithTenant`);
      content = content.replace(originalPrismaRegex2, `${newPrisma}.$queryRawUnsafe`);
      content = content.replace(originalPrismaRegex3, `${newPrisma}.query`);
      changed = true;
    }
  }

  // 3. Special revert for LedgerService manually changed lines
  if (file.includes('ledger.service.ts')) {
    if (content.includes("this.requireRuntimeDependency(\n      this.prisma,\n      'PrismaService',") || content.includes("this.requireRuntimeDependency(this.prisma, 'PrismaService')")) {
      content = content.replace(/this\.requireRuntimeDependency\(\s*this\.prisma,\s*'PrismaService',\s*\)/g, "this.requireRuntimeDependency(this.databaseService, 'PrismaService')");
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`Fixed ${file}`);
  }
}
