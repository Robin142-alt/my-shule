const fs = require('fs');
const filePath = 'apps/api/src/modules/admissions/admissions.service.ts';
let content = fs.readFileSync(filePath, 'utf8');

const imports = `
import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { CreateOfferDto } from './dto/create-offer.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
`;

content = content.replace("import { Random } from 'random-js';", imports + "\nimport { Random } from 'random-js';");
if (!content.includes('CreateEnquiryDto')) {
  // if previous replacement failed due to missing Random import
  content = content.replace("import {", imports + "\nimport {");
}

const serviceMethods = `
  async createEnquiry(tenantId: string, dto: CreateEnquiryDto, userId?: string) {
    const result = await this.databaseService.query(
      \`
        INSERT INTO admission_enquiries (
          tenant_id, enquiry_code, student_first_name, student_last_name,
          parent_name, parent_phone, parent_email, class_applying,
          enquiry_source, boarding_day_preference, current_school,
          location, notes, follow_up_date, created_by_user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id
      \`,
      [
        tenantId, dto.enquiry_code, dto.student_first_name, dto.student_last_name,
        dto.parent_name, dto.parent_phone, dto.parent_email, dto.class_applying,
        dto.enquiry_source, dto.boarding_day_preference, dto.current_school,
        dto.location, dto.notes, dto.follow_up_date, userId
      ]
    );
    return { id: result.rows[0].id };
  }

  async createInterview(tenantId: string, dto: CreateInterviewDto) {
    const result = await this.databaseService.query(
      \`
        INSERT INTO admission_interviews (
          tenant_id, application_id, interview_date, start_time, end_time,
          location, interviewer_user_id, assessment_type, reading_score,
          writing_score, mathematics_score, general_conduct, recommendation,
          interviewer_comment
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id
      \`,
      [
        tenantId, dto.application_id, dto.interview_date, dto.start_time, dto.end_time,
        dto.location, dto.interviewer_user_id, dto.assessment_type, dto.reading_score,
        dto.writing_score, dto.mathematics_score, dto.general_conduct, dto.recommendation,
        dto.interviewer_comment
      ]
    );
    return { id: result.rows[0].id };
  }

  async createOffer(tenantId: string, dto: CreateOfferDto) {
    const result = await this.databaseService.query(
      \`
        INSERT INTO admission_offers (
          tenant_id, application_id, required_deposit, offer_date, deadline_date
        ) VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE), $5)
        RETURNING id
      \`,
      [
        tenantId, dto.application_id, dto.required_deposit, dto.offer_date, dto.deadline_date
      ]
    );
    return { id: result.rows[0].id };
  }

  async createAppointment(tenantId: string, dto: CreateAppointmentDto) {
    const result = await this.databaseService.query(
      \`
        INSERT INTO admission_appointments (
          tenant_id, application_id, visitor_name, purpose, appointment_date,
          start_time, assigned_user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      \`,
      [
        tenantId, dto.application_id, dto.visitor_name, dto.purpose, dto.appointment_date,
        dto.start_time, dto.assigned_user_id
      ]
    );
    return { id: result.rows[0].id };
  }

  async createTask(tenantId: string, dto: CreateTaskDto) {
    const result = await this.databaseService.query(
      \`
        INSERT INTO admission_tasks (
          tenant_id, application_id, task_title, task_description, due_date,
          priority, assigned_user_id
        ) VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'medium'), $7)
        RETURNING id
      \`,
      [
        tenantId, dto.application_id, dto.task_title, dto.task_description, dto.due_date,
        dto.priority, dto.assigned_user_id
      ]
    );
    return { id: result.rows[0].id };
  }

  async createTemplate(tenantId: string, dto: CreateTemplateDto, userId?: string) {
    const result = await this.databaseService.query(
      \`
        INSERT INTO admission_templates (
          tenant_id, template_name, template_type, content, is_active, created_by_user_id
        ) VALUES ($1, $2, $3, $4, COALESCE($5, TRUE), $6)
        RETURNING id
      \`,
      [
        tenantId, dto.template_name, dto.template_type, dto.content, dto.is_active, userId
      ]
    );
    return { id: result.rows[0].id };
  }
`;

content = content.replace(/}\s*$/, serviceMethods + '\n}\n');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Service updated.');
