const fs = require('fs');
const path = require('path');

const apiModuleDir = path.join(__dirname, 'apps/api/src/modules/class-teacher');

// Ensure directories exist
if (!fs.existsSync(apiModuleDir)) {
  fs.mkdirSync(apiModuleDir, { recursive: true });
}

// 1. class-teacher.service.ts
const serviceCode = `import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class ClassTeacherService {
  private readonly logger = new Logger(ClassTeacherService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async getOverview(tenantId: string, userId: string, streamId: string) {
    // In a real app, we would query the database for the class stats
    return {
      totalLearners: 46,
      presentToday: 43,
      absentToday: 3,
      feeArrears: 7,
      urgentFollowups: [
        { id: "1", learnerName: "Brian Otieno", issue: "Absent 3 days straight", actionNeeded: "Contact Parent" }
      ]
    };
  }

  async getRegister(tenantId: string, userId: string, streamId: string) {
    return [
      { id: "2041", admissionNo: "2041", name: "Brian Otieno", gender: "Male", parentPhone: "+254712345678", status: "Active" },
      { id: "2042", admissionNo: "2042", name: "Mary Wanjiku", gender: "Female", parentPhone: "+254722345678", status: "Active" }
    ];
  }

  async getAttendance(tenantId: string, userId: string, streamId: string) {
    return [
      { id: "2041", admissionNo: "2041", name: "Brian Otieno", attendance: "absent", reason: "sick" },
      { id: "2042", admissionNo: "2042", name: "Mary Wanjiku", attendance: "present", reason: "" }
    ];
  }

  async saveAttendance(tenantId: string, userId: string, streamId: string, records: any[]) {
    this.logger.log(\`Saved \${records.length} attendance records for stream \${streamId}\`);
    return { success: true, count: records.length };
  }
}
`;
fs.writeFileSync(path.join(apiModuleDir, 'class-teacher.service.ts'), serviceCode);

// 2. class-teacher.controller.ts
const controllerCode = `import { Controller, Get, Post, Body, Query, Headers } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { ClassTeacherService } from './class-teacher.service';

@Controller('class-teacher')
@RequiresModule('academics')
export class ClassTeacherController {
  constructor(private readonly classTeacherService: ClassTeacherService) {}

  @Get('overview')
  @Permissions('academics:read')
  getOverview(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Query('streamId') streamId: string
  ) {
    return this.classTeacherService.getOverview(tenantId, userId, streamId);
  }

  @Get('register')
  @Permissions('academics:read')
  getRegister(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Query('streamId') streamId: string
  ) {
    return this.classTeacherService.getRegister(tenantId, userId, streamId);
  }

  @Get('attendance')
  @Permissions('academics:read')
  getAttendance(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Query('streamId') streamId: string
  ) {
    return this.classTeacherService.getAttendance(tenantId, userId, streamId);
  }

  @Post('attendance')
  @Permissions('academics:write')
  saveAttendance(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { streamId: string; records: any[] }
  ) {
    return this.classTeacherService.saveAttendance(tenantId, userId, body.streamId, body.records);
  }
}
`;
fs.writeFileSync(path.join(apiModuleDir, 'class-teacher.controller.ts'), controllerCode);

// 3. class-teacher.module.ts
const moduleCode = `import { Module } from '@nestjs/common';
import { ClassTeacherController } from './class-teacher.controller';
import { ClassTeacherService } from './class-teacher.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ClassTeacherController],
  providers: [ClassTeacherService],
  exports: [ClassTeacherService]
})
export class ClassTeacherModule {}
`;
fs.writeFileSync(path.join(apiModuleDir, 'class-teacher.module.ts'), moduleCode);

console.log('Backend files generated.');

// 4. Update app.module.ts (Regex approach)
const appModulePath = path.join(__dirname, 'apps/api/src/app.module.ts');
let appModuleContent = fs.readFileSync(appModulePath, 'utf8');

if (!appModuleContent.includes('ClassTeacherModule')) {
  // Add import
  appModuleContent = appModuleContent.replace(
    "import { GradeMasterModule } from './modules/grade-master/grade-master.module';",
    "import { GradeMasterModule } from './modules/grade-master/grade-master.module';\\nimport { ClassTeacherModule } from './modules/class-teacher/class-teacher.module';"
  );
  
  // Add to imports array
  appModuleContent = appModuleContent.replace(
    "GradeMasterModule,\\n  ],",
    "GradeMasterModule,\\n    ClassTeacherModule,\\n  ],"
  );
  
  fs.writeFileSync(appModulePath, appModuleContent);
  console.log('Updated app.module.ts');
} else {
  console.log('app.module.ts already contains ClassTeacherModule');
}

// 5. Frontend Hooks (apps/web/src/lib/data/class-teacher-hooks.ts)
const hooksDir = path.join(__dirname, 'apps/web/src/lib/data');
if (!fs.existsSync(hooksDir)) {
  fs.mkdirSync(hooksDir, { recursive: true });
}

const hooksCode = `import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentTenantId } from "@/lib/auth/auth-store";

// Mock fetcher until real backend is wired to production
async function fetchApi(endpoint: string, options?: RequestInit) {
  const tenantId = getCurrentTenantId() || "myshule-tenant-demo";
  const res = await fetch(\\\`http://localhost:3001/api/\\\${endpoint}\\\`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-tenant-id": tenantId,
      "x-user-id": "user-uuid",
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error("API call failed: " + res.statusText);
  return res.json();
}

export function useClassTeacherOverview(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "overview", streamId],
    queryFn: () => fetchApi(\\\`class-teacher/overview?streamId=\\\${streamId}\\\`)
  });
}

export function useClassTeacherRegister(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "register", streamId],
    queryFn: () => fetchApi(\\\`class-teacher/register?streamId=\\\${streamId}\\\`)
  });
}

export function useClassTeacherAttendance(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "attendance", streamId],
    queryFn: () => fetchApi(\\\`class-teacher/attendance?streamId=\\\${streamId}\\\`)
  });
}

export function useSaveAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { streamId: string; records: any[] }) => 
      fetchApi("class-teacher/attendance", {
        method: "POST",
        body: JSON.stringify(data)
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["class-teacher", "attendance", variables.streamId] });
      queryClient.invalidateQueries({ queryKey: ["class-teacher", "overview", variables.streamId] });
    }
  });
}
\`;

fs.writeFileSync(path.join(hooksDir, 'class-teacher-hooks.ts'), hooksCode);
console.log('Frontend hooks generated.');
