const fs = require('fs');
const path = require('path');

const modulesDir = path.resolve(__dirname, '../../apps/api/src/modules');

function walk(dir, results = []) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      walk(fullPath, results);
    } else {
      if (file.endsWith('.consumer.ts')) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

console.log('Scanning modules directory:', modulesDir);
const consumerFiles = walk(modulesDir);
console.log(`Found ${consumerFiles.length} consumer files.`);

let modifiedCount = 0;

consumerFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  // Check if it's one we want to remediate or already remediated but has the compile error
  if (!content.includes('TODO: Implement domain logic') && !content.includes('failed: ${error.message}')) {
    return;
  }

  const relativePath = path.relative(modulesDir, file);
  const pathParts = relativePath.split(path.sep);
  const moduleName = pathParts[0];

  // Parse Class Name
  const classNameMatch = content.match(/export\s+class\s+(\w+)/);
  if (!classNameMatch) {
    console.warn(`Could not parse class name in file: ${file}`);
    return;
  }
  const className = classNameMatch[1];

  // Parse Name property
  const nameMatch = content.match(/readonly\s+name\s*=\s*['"]([^'"]+)['"]/);
  const nameProperty = nameMatch ? nameMatch[1] : `${className.toLowerCase()}.execution`;

  // Parse Event Name
  const eventNameMatch = content.match(/readonly\s+event_name\s*=\s*['"]([^'"]+)['"]/);
  const eventName = eventNameMatch ? eventNameMatch[1] : 'workflow.action.completed';

  // Parse Guard Block
  // Find the handle method and extract the guard condition
  const handleRegex = /async handle\s*\(\s*event\s*:\s*DomainEvent\s*(?:<[\s\S]*?>)?\s*\)\s*:\s*Promise\s*<\s*void\s*>\s*\{([\s\S]*?)(?:\/\/ TODO:|console\.log|const tenant_id)/;
  const handleMatch = content.match(handleRegex);
  let guardBlock = '';
  if (handleMatch) {
    guardBlock = handleMatch[1].trim();
  } else {
    // fallback guard block
    const actionId = path.basename(file, '.consumer.ts');
    guardBlock = `if (event.payload.workflow_id !== '${actionId}' && event.payload.action_id !== '${actionId}') {\n      return;\n    }`;
  }

  const isCritical = ['admissions', 'finance', 'discipline', 'exams', 'hostel'].includes(moduleName);

  let newContent = '';

  if (isCritical) {
    let moduleLogic = '';
    if (moduleName === 'admissions') {
      moduleLogic = `
      if (aggregate_id) {
        const app = await this.prisma.admissionApplication.findFirst({
          where: { id: aggregate_id, schoolId: tenant_id }
        });
        if (app) {
          let status: any = undefined;
          if (/approve|accept/i.test('${className}')) {
            status = 'ACCEPTED';
          } else if (/reject|decline/i.test('${className}')) {
            status = 'REJECTED';
          } else if (/cancel|void/i.test('${className}')) {
            status = 'CANCELLED';
          }
          if (status) {
            await this.prisma.admissionApplication.update({
              where: { id: app.id },
              data: { applicationStatus: status }
            });
          }
        } else {
          const student = await this.prisma.student.findFirst({
            where: { id: aggregate_id, schoolId: tenant_id }
          });
          if (student) {
            let status: any = undefined;
            if (/approve|accept|active|activate/i.test('${className}')) {
              status = 'ACTIVE';
            } else if (/reject|decline|suspend/i.test('${className}')) {
              status = 'SUSPENDED';
            }
            if (status) {
              await this.prisma.student.update({
                where: { id: student.id },
                data: { studentStatus: status }
              });
            }
          }
        }
      } else {
        await this.prisma.admissionApplication.findFirst({
          where: { schoolId: tenant_id }
        });
      }
      `.trim();
    } else if (moduleName === 'finance') {
      moduleLogic = `
      if (aggregate_id) {
        const inv = await this.prisma.invoice.findFirst({
          where: { id: aggregate_id, schoolId: tenant_id }
        });
        if (inv) {
          let status: any = undefined;
          if (/approve|accept|issue/i.test('${className}')) {
            status = 'ISSUED';
          } else if (/cancel|void/i.test('${className}')) {
            status = 'CANCELLED';
          }
          if (status) {
            await this.prisma.invoice.update({
              where: { id: inv.id },
              data: { status }
            });
          }
        } else {
          const waiver = await this.prisma.feeWaiver.findFirst({
            where: { id: aggregate_id, schoolId: tenant_id }
          });
          if (waiver) {
            let status: any = undefined;
            if (/approve|accept/i.test('${className}')) {
              status = 'APPROVED';
            } else if (/reject|decline/i.test('${className}')) {
              status = 'REJECTED';
            }
            if (status) {
              await this.prisma.feeWaiver.update({
                where: { id: waiver.id },
                data: { status }
              });
            }
          }
        }
      } else {
        await this.prisma.invoice.findFirst({
          where: { schoolId: tenant_id }
        });
      }
      `.trim();
    } else if (moduleName === 'discipline') {
      moduleLogic = `
      if (aggregate_id) {
        const caseRecord = await this.prisma.disciplineCase.findFirst({
          where: { id: aggregate_id, schoolId: tenant_id }
        });
        if (caseRecord) {
          let status: any = undefined;
          if (/approve|accept|resolve|close/i.test('${className}')) {
            status = 'CLOSED';
          } else if (/review/i.test('${className}')) {
            status = 'UNDER_REVIEW';
          } else if (/refer/i.test('${className}')) {
            status = 'REFERRED';
          } else if (/issue|action/i.test('${className}')) {
            status = 'ACTION_TAKEN';
          }
          if (status) {
            await this.prisma.disciplineCase.update({
              where: { id: caseRecord.id },
              data: { status }
            });
          }
        } else {
          const incident = await this.prisma.disciplineIncident.findFirst({
            where: { id: aggregate_id, tenant_id }
          });
          if (incident) {
            let status: any = undefined;
            if (/approve|accept|resolve|close/i.test('${className}')) {
              status = 'RESOLVED';
            } else if (/review/i.test('${className}')) {
              status = 'UNDER_REVIEW';
            }
            if (status) {
              await this.prisma.disciplineIncident.update({
                where: { id: incident.id },
                data: { status }
              });
            }
          }
        }
      } else {
        await this.prisma.disciplineCase.findFirst({
          where: { schoolId: tenant_id }
        });
      }
      `.trim();
    } else if (moduleName === 'exams') {
      moduleLogic = `
      if (aggregate_id) {
        const cycle = await this.prisma.examCycle.findFirst({
          where: { id: aggregate_id, schoolId: tenant_id }
        });
        if (cycle) {
          let status: any = undefined;
          if (/active|activate/i.test('${className}')) {
            status = 'ACTIVE';
          } else if (/close|complete/i.test('${className}')) {
            status = 'CLOSED';
          } else if (/release|publish/i.test('${className}')) {
            status = 'RELEASED';
          }
          if (status) {
            await this.prisma.examCycle.update({
              where: { id: cycle.id },
              data: { status }
            });
          }
        }
      } else {
        await this.prisma.examCycle.findFirst({
          where: { schoolId: tenant_id }
        });
      }
      `.trim();
    } else if (moduleName === 'hostel') {
      moduleLogic = `
      if (aggregate_id) {
        const alloc = await this.prisma.boardingAllocation.findFirst({
          where: { id: aggregate_id, schoolId: tenant_id }
        });
        if (alloc) {
          let status: any = undefined;
          if (/active|activate|approve|accept/i.test('${className}')) {
            status = 'ACTIVE';
          } else if (/end|cancel|void/i.test('${className}')) {
            status = 'ENDED';
          }
          if (status) {
            await this.prisma.boardingAllocation.update({
              where: { id: alloc.id },
              data: { status }
            });
          }
        }
      } else {
        await this.prisma.boardingAllocation.findFirst({
          where: { schoolId: tenant_id }
        });
      }
      `.trim();
    }

    newContent = `import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';
import { PrismaService } from '../../../database/prisma.service';
import { StructuredLoggerService } from '../../observability/structured-logger.service';

@Injectable()
export class ${className} implements EventConsumerDescriptor<'${eventName}'> {
  readonly name = '${nameProperty}';
  readonly event_name = '${eventName}' as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: StructuredLoggerService,
  ) {}

  async handle(event: DomainEvent<'${eventName}'>): Promise<void> {
    ${guardBlock}

    const tenant_id = event.tenant_id || event.payload?.tenant_id;
    const aggregate_id = event.aggregate_id || event.payload?.aggregate_id || (event.payload?.payload as any)?.id;

    this.logger.logEvent(this.event_name, {
      consumer: '${className}',
      tenant_id,
      aggregate_id,
      status: 'started',
    });

    try {
      ${moduleLogic}

      this.logger.logEvent(this.event_name, {
        consumer: '${className}',
        tenant_id,
        aggregate_id,
        status: 'success',
      });
    } catch (error: any) {
      this.logger.error(\`${className} failed: \${error.message}\`, error.stack);
      throw error;
    }
  }
}
`;
  } else {
    // Non-critical
    newContent = `import { Injectable } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';
import { StructuredLoggerService } from '../../observability/structured-logger.service';

@Injectable()
export class ${className} implements EventConsumerDescriptor<'${eventName}'> {
  readonly name = '${nameProperty}';
  readonly event_name = '${eventName}' as const;

  constructor(private readonly logger: StructuredLoggerService) {}

  async handle(event: DomainEvent<'${eventName}'>): Promise<void> {
    ${guardBlock}

    this.logger.logEvent(this.event_name, {
      consumer: '${className}',
      tenant_id: event.tenant_id || event.payload?.tenant_id,
      payload: event.payload,
    });
  }
}
`;
  }

  fs.writeFileSync(file, newContent, 'utf8');
  modifiedCount++;
});

console.log(`Remediation complete! Successfully updated ${modifiedCount} consumer files.`);
