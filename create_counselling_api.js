const fs = require('fs');
const path = require('path');

const moduleDir = path.join(__dirname, 'apps/api/src/modules/counselling');

const moduleContent = `import { Module } from '@nestjs/common';
import { CounsellingController } from './counselling.controller';
import { CounsellingService } from './counselling.service';

@Module({
  controllers: [CounsellingController],
  providers: [CounsellingService],
  exports: [CounsellingService],
})
export class CounsellingModule {}
`;

const controllerContent = `import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { CounsellingService } from './counselling.service';

@Controller('api/counsellor')
export class CounsellingController {
  constructor(private readonly counsellingService: CounsellingService) {}

  @Get('overview')
  getOverview(@Request() req) {
    return this.counsellingService.getOverview('tenant-1', 'school-1');
  }

  @Get('referrals')
  getReferrals(@Request() req) {
    return [];
  }

  @Get('cases')
  getCases(@Request() req) {
    return [];
  }

  @Get('sessions')
  getSessions(@Request() req) {
    return [];
  }

  @Get('appointments')
  getAppointments(@Request() req) {
    return [];
  }

  @Get('followups')
  getFollowups(@Request() req) {
    return [];
  }

  @Get('welfare-concerns')
  getWelfareConcerns(@Request() req) {
    return [];
  }

  @Get('reports')
  getReports(@Request() req) {
    return [];
  }
}
`;

const serviceContent = `import { Injectable } from '@nestjs/common';

@Injectable()
export class CounsellingService {
  async getOverview(tenantId: string, schoolId: string) {
    return {
      openCases: 42,
      newReferrals: 12,
      appointmentsToday: 14,
      followUpsDue: 5,
      highPriority: 9,
      parentContactsPending: 8,
    };
  }
}
`;

fs.writeFileSync(path.join(moduleDir, 'counselling.module.ts'), moduleContent);
fs.writeFileSync(path.join(moduleDir, 'counselling.controller.ts'), controllerContent);
fs.writeFileSync(path.join(moduleDir, 'counselling.service.ts'), serviceContent);

// Add to app.module.ts
const appModulePath = path.join(__dirname, 'apps/api/src/app.module.ts');
let appModule = fs.readFileSync(appModulePath, 'utf8');

if (!appModule.includes('CounsellingModule')) {
    appModule = appModule.replace(
        "import { Module } from '@nestjs/common';",
        "import { Module } from '@nestjs/common';\nimport { CounsellingModule } from './modules/counselling/counselling.module';"
    );
    
    appModule = appModule.replace(
        "imports: [",
        "imports: [\n    CounsellingModule,"
    );
    
    fs.writeFileSync(appModulePath, appModule);
}

console.log("Counselling backend module generated and injected.");
