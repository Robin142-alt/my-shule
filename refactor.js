const fs = require('fs');
const path = require('path');

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Replace constructor injection
  content = content.replace(
    /constructor\s*\(\s*private readonly prisma:\s*PrismaService\s*\)/g, 
    'constructor(private readonly databaseService: DatabaseService)'
  );

  content = content.replace(
    /constructor\s*\(\s*protected readonly prisma:\s*PrismaService\s*\)/g, 
    'constructor(protected readonly databaseService: DatabaseService)'
  );

  content = content.replace(
    /constructor\s*\(\s*([\s\S]*?)private readonly prisma:\s*PrismaService([\s\S]*?)\)/g, 
    'constructor($1private readonly databaseService: DatabaseService$2)'
  );

  // Replace usages
  content = content.replace(/this\.prisma\.executeWithTenant<any>/g, '(this.databaseService as any).executeWithTenant');
  content = content.replace(/this\.prisma\.executeWithTenant/g, '(this.databaseService as any).executeWithTenant');
  content = content.replace(/this\.prisma\.\$queryRawUnsafe/g, '(this.databaseService as any).$queryRawUnsafe');
  content = content.replace(/\(this\.prisma as any\)\.query/g, '(this.databaseService as any).query');
  content = content.replace(/this\.prisma\.runSchemaBootstrap/g, '(this.databaseService as any).runSchemaBootstrap');
  content = content.replace(/this\.prisma\.\$executeRawUnsafe/g, '(this.databaseService as any).$executeRawUnsafe');

  // Also catch generic this.prisma usages
  content = content.replace(/this\.prisma/g, '(this.databaseService as any)');

  // Fix imports
  if (content.includes('constructor(private readonly databaseService: DatabaseService)') || 
      content.includes('constructor(protected readonly databaseService: DatabaseService)') ||
      content.includes('private readonly databaseService: DatabaseService')) {
    
    // Find where PrismaService was imported
    if (content.includes('PrismaService')) {
      // Just swap PrismaService with DatabaseService in the import
      content = content.replace(/import\s+{([^}]*?)PrismaService([^}]*?)}\s+from\s+['"]([^'"]+?)['"]/g, (match, before, after, source) => {
        const newSource = source.replace('prisma.service', 'database.service');
        return `import {${before}DatabaseService${after}} from '${newSource}'`;
      });
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

processDirectory(path.join(__dirname, 'apps/api/src'));
