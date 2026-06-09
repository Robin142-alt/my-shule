const fs = require('fs');
let clinicService = fs.readFileSync('apps/api/src/modules/clinic/clinic.service.ts', 'utf8');

clinicService = clinicService.replace(
  "    return visit;\n  }\n\n  async dispenseMedicine",
  `    await this.schoolEvents.recordSchoolOperation({
      event: {
        id: visit?.id,
        type: 'clinic.visit_recorded',
        module: 'clinic',
        actorRole: this.requestContext.requireStore().role || 'staff',
        title: 'Clinic Visit Recorded',
        body: \`Clinic visit recorded for student \${dto.student_id}\`,
        entityId: visit?.id,
        severity: 'info',
        payload: { student_id: dto.student_id },
      },
    });

    return visit;
  }

  async dispenseMedicine`
);

fs.writeFileSync('apps/api/src/modules/clinic/clinic.service.ts', clinicService);
