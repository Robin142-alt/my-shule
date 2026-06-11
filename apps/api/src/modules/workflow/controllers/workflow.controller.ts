import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { WorkflowService, CreateWorkflowEventInput } from '../services/workflow.service';

@Controller('workflow/events')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Get()
  async getEvents(@Req() req: any) {
    // In a real app we'd get this from request context or tenant guard
    // We are assuming auth guard provides req.user
    return { data: [], message: 'List of events' };
  }

  @Post()
  async createEvent(@Body() input: CreateWorkflowEventInput) {
    return this.workflowService.createWorkflowEvent(input);
  }

  @Post(':id/dispatch')
  async dispatchEvent(@Param('id') id: string) {
    return this.workflowService.dispatchWorkflowEvent(id);
  }

  @Post(':id/handled')
  async markHandled(@Param('id') id: string, @Body('userId') userId: string) {
    return this.workflowService.markEventHandled(id, userId);
  }
}
