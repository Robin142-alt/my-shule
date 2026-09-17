import { Module } from '@nestjs/common';
import { SidebarWorkspaceSchemaService } from './sidebar-workspace-schema.service';

import { AdminCommandController } from './admin-command.controller';
import { AdminCommandOperationsService } from './admin-command-operations.service';
import { AdminCommandSchemaService } from './admin-command-schema.service';
import { AdminCommandService } from './admin-command.service';
import { DeputyCommandController } from './deputy-command.controller';
import { DeputyCommandService } from './deputy-command.service';
import { AdmissionsCommandController } from './admissions-command.controller';
import { AdmissionsCommandService } from './admissions-command.service';
import { PrincipalInsightsCacheService } from './principal-insights-cache.service';
import { PrincipalInsightsService } from './principal-insights.service';
import { AdminCommandRepository } from './repositories/admin-command.repository';
import { DeputyCommandRepository } from './repositories/deputy-command.repository';
import { AdmissionsCommandRepository } from './repositories/admissions-command.repository';

import { StorekeeperCommandController } from './storekeeper-command.controller';
import { StorekeeperCommandService } from './storekeeper-command.service';
import { NurseCommandController } from './nurse-command.controller';
import { NurseCommandService } from './nurse-command.service';
import { TransportManagerCommandController } from './transport-manager-command.controller';
import { TransportManagerCommandService } from './transport-manager-command.service';
import { BoardingMasterCommandController } from './boarding-master-command.controller';
import { BoardingMasterCommandService } from './boarding-master-command.service';
import { ClassTeacherCommandController } from './class-teacher-command.controller';
import { ClassTeacherCommandService } from './class-teacher-command.service';
import { DeanAcademicsCommandController } from './dean-academics-command.controller';
import { DeanAcademicsCommandService } from './dean-academics-command.service';
import { ExamsManagerCommandController } from './exams-manager-command.controller';
import { ExamsManagerCommandService } from './exams-manager-command.service';
import { GuidanceCounsellingCommandController } from './guidance-counselling-command.controller';
import { GuidanceCounsellingCommandService } from './guidance-counselling-command.service';
import { HODCommandController } from './hod-command.controller';
import { HodCommandService } from './hod-command.service';
import { ICTManagerCommandController } from './ict-manager-command.controller';
import { IctManagerCommandService } from './ict-manager-command.service';
import { LaboratoryTechnicianCommandController } from './laboratory-technician-command.controller';
import { LaboratoryTechnicianCommandService } from './laboratory-technician-command.service';
import { LibrarianCommandController } from './librarian-command.controller';
import { LibrarianCommandService } from './librarian-command.service';
import { ProcurementOfficerCommandController } from './procurement-officer-command.controller';
import { ProcurementOfficerCommandService } from './procurement-officer-command.service';
import { SecretaryCommandController } from './secretary-command.controller';
import { SecretaryCommandService } from './secretary-command.service';
import { SecurityOfficerCommandController } from './security-officer-command.controller';
import { SecurityOfficerCommandService } from './security-officer-command.service';
import { TeacherCommandController } from './teacher-command.controller';
import { TeacherCommandService } from './teacher-command.service';
import { StudentCommandController } from './student-command.controller';
import { StudentCommandService } from './student-command.service';
import { ParentCommandController } from './parent-command.controller';
import { ParentCommandService } from './parent-command.service';
import { AccountantCommandController } from './accountant-command.controller';
import { AccountantCommandService } from './accountant-command.service';
import { ExamsModule } from '../exams/exams.module';
import { EventsModule } from '../events/events.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { AcademicsModule } from '../academics/academics.module';

@Module({
  imports: [EventsModule, ExamsModule, WorkflowModule, AcademicsModule],
  controllers: [
    AdminCommandController,
    DeputyCommandController,
    AdmissionsCommandController,
    StorekeeperCommandController,
    NurseCommandController,
    TransportManagerCommandController,
    BoardingMasterCommandController,
    ClassTeacherCommandController,
    DeanAcademicsCommandController,
    ExamsManagerCommandController,
    GuidanceCounsellingCommandController,
    HODCommandController,
    ICTManagerCommandController,
    LaboratoryTechnicianCommandController,
    LibrarianCommandController,
    ProcurementOfficerCommandController,
    SecretaryCommandController,
    SecurityOfficerCommandController,
    TeacherCommandController,
    StudentCommandController,
    ParentCommandController,
    AccountantCommandController,
  ],
  providers: [
    SidebarWorkspaceSchemaService,
    AdminCommandSchemaService,
    AdminCommandOperationsService,
    AdminCommandService,
    AdminCommandRepository,
    DeputyCommandService,
    DeputyCommandRepository,
    AdmissionsCommandService,
    AdmissionsCommandRepository,
    PrincipalInsightsCacheService,
    PrincipalInsightsService,
    StorekeeperCommandService,
    NurseCommandService,
    TransportManagerCommandService,
    BoardingMasterCommandService,
    ClassTeacherCommandService,
    DeanAcademicsCommandService,
    ExamsManagerCommandService,
    GuidanceCounsellingCommandService,
    HodCommandService,
    IctManagerCommandService,
    LaboratoryTechnicianCommandService,
    LibrarianCommandService,
    ProcurementOfficerCommandService,
    SecretaryCommandService,
    SecurityOfficerCommandService,
    TeacherCommandService,
    StudentCommandService,
    ParentCommandService,
    AccountantCommandService,
  ],
  exports: [
    AdminCommandService,
    AdminCommandOperationsService,
    AdminCommandRepository,
    DeputyCommandService,
    DeputyCommandRepository,
    AdmissionsCommandService,
    AdmissionsCommandRepository,
    PrincipalInsightsCacheService,
    PrincipalInsightsService,
    StorekeeperCommandService,
    NurseCommandService,
    TransportManagerCommandService,
    BoardingMasterCommandService,
    ClassTeacherCommandService,
    DeanAcademicsCommandService,
    ExamsManagerCommandService,
    GuidanceCounsellingCommandService,
    HodCommandService,
    IctManagerCommandService,
    LaboratoryTechnicianCommandService,
    LibrarianCommandService,
    ProcurementOfficerCommandService,
    SecretaryCommandService,
    SecurityOfficerCommandService,
    TeacherCommandService,
    StudentCommandService,
    ParentCommandService,
    AccountantCommandService,
  ],
})
export class AdminCommandModule {}

