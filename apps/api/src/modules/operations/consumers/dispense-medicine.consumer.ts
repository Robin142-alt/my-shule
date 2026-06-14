import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent, EventConsumerDescriptor } from '../../events/events.types';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class DispenseMedicineConsumer implements EventConsumerDescriptor<'workflow.action.completed'> {
  private readonly logger = new Logger(DispenseMedicineConsumer.name);
  readonly name = 'dispense-medicine.execution';
  readonly event_name = 'workflow.action.completed' as const;

  constructor(private readonly prisma: PrismaService) {}

  async handle(event: DomainEvent<'workflow.action.completed'>): Promise<void> {
    if (event.payload.workflow_id !== 'dispense-medicine' && event.payload.action_id !== 'dispense-medicine') {
      return;
    }

    const tenant_id = event.payload.tenant_id; const data = event.payload.payload as any;
    if (!data?.studentId || !data?.medicineInventoryId || !data?.quantityDispensed || !data?.symptoms) {
      this.logger.warn(`Missing dispense medicine details for tenant ${tenant_id}`);
      return;
    }

    this.logger.log(`Dispensing medicine for student ${data.studentId} in tenant ${tenant_id}`);

    try {
      await this.prisma.$transaction(async (tx: any) => {
        let medicalVisitId = data.medicalVisitId;
        
        if (!medicalVisitId) {
          const visit = await tx.medicalVisit.create({
            data: {
              schoolId: tenant_id,
              studentId: data.studentId,
              nurseUserId: data.dispensedByUserId || 'system',
              visitTime: new Date(),
              symptoms: data.symptoms,
              severity: data.severity || 'MILD',
              actionTaken: 'MEDICINE_DISPENSED',
              parentNotified: data.parentNotified || false,
              status: 'TREATED'
            }
          });
          medicalVisitId = visit.id;
        }

        await tx.medicineDispensingLog.create({
          data: {
            schoolId: tenant_id,
            medicalVisitId: medicalVisitId,
            medicineInventoryId: data.medicineInventoryId,
            quantityDispensed: data.quantityDispensed,
            dosageNotes: data.dosageNotes || 'Follow prescription',
            dispensedByUserId: data.dispensedByUserId || 'system'
          }
        });

        const inventory = await tx.medicineInventory.findUnique({ where: { id: data.medicineInventoryId } });
        if (inventory) {
          await tx.medicineInventory.update({
            where: { id: data.medicineInventoryId },
            data: { quantityAvailable: inventory.quantityAvailable - data.quantityDispensed }
          });
        }
      });
      this.logger.log(`Successfully dispensed medicine for student ${data.studentId}`);
    } catch (error: any) {
      this.logger.error(`Failed to dispense medicine: ${error.message}`, error.stack);
      throw error;
    }
  }
}
