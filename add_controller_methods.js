const fs = require('fs');
const filePath = 'apps/api/src/modules/admissions/admissions.controller.ts';
let content = fs.readFileSync(filePath, 'utf8');

const imports = `
import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { CreateOfferDto } from './dto/create-offer.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
`;

content = content.replace(/} from '@nestjs\/common';/, "} from '@nestjs/common';" + imports);

const controllerMethods = `
  @Post('enquiries')
  async createEnquiry(@Body() dto: CreateEnquiryDto) {
    const store = this.requestContext.requireStore();
    return this.admissionsService.createEnquiry(store.tenant_id, dto, store.user_id);
  }

  @Post('interviews')
  async createInterview(@Body() dto: CreateInterviewDto) {
    const store = this.requestContext.requireStore();
    return this.admissionsService.createInterview(store.tenant_id, dto);
  }

  @Post('offers')
  async createOffer(@Body() dto: CreateOfferDto) {
    const store = this.requestContext.requireStore();
    return this.admissionsService.createOffer(store.tenant_id, dto);
  }

  @Post('appointments')
  async createAppointment(@Body() dto: CreateAppointmentDto) {
    const store = this.requestContext.requireStore();
    return this.admissionsService.createAppointment(store.tenant_id, dto);
  }

  @Post('tasks')
  async createTask(@Body() dto: CreateTaskDto) {
    const store = this.requestContext.requireStore();
    return this.admissionsService.createTask(store.tenant_id, dto);
  }

  @Post('templates')
  async createTemplate(@Body() dto: CreateTemplateDto) {
    const store = this.requestContext.requireStore();
    return this.admissionsService.createTemplate(store.tenant_id, dto, store.user_id);
  }
`;

content = content.replace(/}\s*$/, controllerMethods + '\n}\n');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Controller updated.');
