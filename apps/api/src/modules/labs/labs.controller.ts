import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import {
  AddLaboratoryStockDto,
  ChemicalDisposalRequestDto,
  ConfirmPracticalIssueDto,
  CreateChemicalItemDto,
  CreateLabDepartmentDto,
  CreateLabDto,
  CreateLabEquipmentDto,
  CreateLabSessionDto,
  CreateLaboratoryItemDto,
  CreateLabStorageLocationDto,
  CreatePracticalRequestDto,
  GenerateLabRegisterDto,
  ImportLaboratoryItemsDto,
  IssueChemicalDto,
  IssueEquipmentDto,
  MarkLabAttendanceDto,
  PreparePracticalDto,
  ReceivePracticalReturnDto,
  ReconcileEquipmentDto,
  RecordBreakageLossDto,
  ReviewPracticalRequestDto,
  SaveLabSafetyCheckDto,
  SaveLabStocktakeDto,
  StartLabStocktakeDto,
} from './dto/labs.dto';
import { LabsService } from './labs.service';

@Controller('labs')
@RequiresModule('lab_management')
export class LabsController {
  constructor(private readonly labsService: LabsService) {}

  @Post('departments')
  @Permissions('labs:write')
  createDepartment(@Body() dto: CreateLabDepartmentDto) {
    return this.labsService.createDepartment(dto);
  }

  @Post()
  @Permissions('labs:write')
  createLab(@Body() dto: CreateLabDto) {
    return this.labsService.createLab(dto);
  }

  @Post('sessions')
  @Permissions('labs:write')
  createLabSession(@Body() dto: CreateLabSessionDto) {
    return this.labsService.createLabSession(dto);
  }

  @Post('sessions/:sessionId/attendance')
  @Permissions('labs:attendance')
  markAttendance(
    @Param('sessionId') sessionId: string,
    @Body() dto: MarkLabAttendanceDto,
  ) {
    return this.labsService.markAttendance(sessionId, dto);
  }

  @Post('equipment')
  @Permissions('labs:inventory')
  createEquipment(@Body() dto: CreateLabEquipmentDto) {
    return this.labsService.createEquipment(dto);
  }

  @Post('chemicals')
  @Permissions('labs:inventory')
  createChemical(@Body() dto: CreateChemicalItemDto) {
    return this.labsService.createChemical(dto);
  }

  @Post('sessions/:sessionId/equipment-usage')
  @Permissions('labs:inventory')
  issueEquipment(
    @Param('sessionId') sessionId: string,
    @Body() dto: IssueEquipmentDto,
  ) {
    return this.labsService.issueEquipment(sessionId, dto);
  }

  @Post('equipment-usage/:usageId/reconcile')
  @Permissions('labs:inventory')
  reconcileEquipment(
    @Param('usageId') usageId: string,
    @Body() dto: ReconcileEquipmentDto,
  ) {
    return this.labsService.reconcileEquipment(usageId, dto);
  }

  @Post('sessions/:sessionId/chemical-usage')
  @Permissions('labs:inventory')
  issueChemical(
    @Param('sessionId') sessionId: string,
    @Body() dto: IssueChemicalDto,
  ) {
    return this.labsService.issueChemical(sessionId, dto);
  }

  @Post('chemicals/:chemicalId/disposal-requests')
  @Permissions('labs:inventory')
  requestChemicalDisposal(
    @Param('chemicalId') chemicalId: string,
    @Body() dto: ChemicalDisposalRequestDto,
  ) {
    return this.labsService.requestChemicalDisposal(chemicalId, dto);
  }

  @Post('disposal-requests/:requestId/approve')
  @Permissions('labs:approve-disposal')
  approveChemicalDisposal(@Param('requestId') requestId: string) {
    return this.labsService.approveChemicalDisposal(requestId);
  }

  @Post('sessions/:sessionId/complete')
  @Permissions('labs:write')
  completeLabSession(@Param('sessionId') sessionId: string) {
    return this.labsService.completeLabSession(sessionId);
  }

  @Get('dashboard')
  @Permissions('labs:read')
  getDashboard() {
    return this.labsService.getDashboard();
  }

  @Get('inventory')
  @Permissions('labs:read')
  getInventory() {
    return this.labsService.getInventory();
  }

  @Get('requests')
  @Permissions('labs:request')
  getRequests() {
    return this.labsService.getRequests();
  }

  @Get('issues')
  @Permissions('labs:read')
  getIssues() {
    return this.labsService.getIssues();
  }

  @Get('home')
  @Permissions('labs:read')
  getHome() {
    return this.labsService.getHome();
  }

  @Post('items')
  @Permissions('labs:inventory')
  createLaboratoryItem(@Body() dto: CreateLaboratoryItemDto) {
    return this.labsService.createLaboratoryItem(dto);
  }

  @Post('items/import')
  @Permissions('labs:inventory')
  importLaboratoryItems(@Body() dto: ImportLaboratoryItemsDto) {
    return this.labsService.importLaboratoryItems(dto);
  }

  @Post('items/:itemSource/:itemId/stock')
  @Permissions('labs:inventory')
  addLaboratoryStock(
    @Param('itemSource') itemSource: string,
    @Param('itemId') itemId: string,
    @Body() dto: AddLaboratoryStockDto,
  ) {
    return this.labsService.addLaboratoryStock(itemSource, itemId, dto);
  }

  @Get('locations')
  @Permissions('labs:read')
  listStorageLocations() {
    return this.labsService.listStorageLocations();
  }

  @Post('locations')
  @Permissions('labs:inventory')
  createStorageLocation(@Body() dto: CreateLabStorageLocationDto) {
    return this.labsService.createStorageLocation(dto);
  }

  @Post('practical-requests')
  @Permissions('labs:request')
  createPracticalRequest(@Body() dto: CreatePracticalRequestDto) {
    return this.labsService.createPracticalRequest(dto);
  }

  @Patch('practical-requests/:requestId/review')
  @Permissions('labs:inventory')
  reviewPracticalRequest(
    @Param('requestId') requestId: string,
    @Body() dto: ReviewPracticalRequestDto,
  ) {
    return this.labsService.reviewPracticalRequest(requestId, dto);
  }

  @Patch('practical-requests/:requestId/preparation')
  @Permissions('labs:inventory')
  preparePracticalRequest(
    @Param('requestId') requestId: string,
    @Body() dto: PreparePracticalDto,
  ) {
    return this.labsService.preparePracticalRequest(requestId, dto);
  }

  @Post('practical-requests/:requestId/issues')
  @Permissions('labs:inventory')
  confirmPracticalIssue(
    @Param('requestId') requestId: string,
    @Body() dto: ConfirmPracticalIssueDto,
  ) {
    return this.labsService.confirmPracticalIssue(requestId, dto);
  }

  @Post('issues/:issueId/returns')
  @Permissions('labs:inventory')
  receivePracticalReturn(
    @Param('issueId') issueId: string,
    @Body() dto: ReceivePracticalReturnDto,
  ) {
    return this.labsService.receivePracticalReturn(issueId, dto);
  }

  @Post('issues/:issueId/reminders')
  @Permissions('labs:inventory')
  sendReturnReminder(@Param('issueId') issueId: string) {
    return this.labsService.sendReturnReminder(issueId);
  }

  @Get('breakage-loss')
  @Permissions('labs:read')
  listBreakageLoss() {
    return this.labsService.listBreakageLoss();
  }

  @Post('breakage-loss')
  @Permissions('labs:inventory')
  recordBreakageLoss(@Body() dto: RecordBreakageLossDto) {
    return this.labsService.recordBreakageLoss(dto);
  }

  @Get('stocktakes')
  @Permissions('labs:read')
  listStocktakes() {
    return this.labsService.listStocktakes();
  }

  @Post('stocktakes')
  @Permissions('labs:inventory')
  startStocktake(@Body() dto: StartLabStocktakeDto) {
    return this.labsService.startStocktake(dto);
  }

  @Patch('stocktakes/:stocktakeId')
  @Permissions('labs:inventory')
  saveStocktake(
    @Param('stocktakeId') stocktakeId: string,
    @Body() dto: SaveLabStocktakeDto,
  ) {
    return this.labsService.saveStocktake(stocktakeId, dto);
  }

  @Post('stocktakes/:stocktakeId/submit')
  @Permissions('labs:inventory')
  submitStocktake(
    @Param('stocktakeId') stocktakeId: string,
    @Body() dto: SaveLabStocktakeDto,
  ) {
    return this.labsService.submitStocktake(stocktakeId, dto);
  }

  @Get('safety-checks')
  @Permissions('labs:read')
  listSafetyChecks() {
    return this.labsService.listSafetyChecks();
  }

  @Post('safety-checks')
  @Permissions('labs:inventory')
  saveSafetyCheck(@Body() dto: SaveLabSafetyCheckDto) {
    return this.labsService.saveSafetyCheck(dto);
  }

  @Post('registers')
  @Permissions('reports:read', 'labs:read')
  generateRegister(@Body() dto: GenerateLabRegisterDto) {
    return this.labsService.generateRegister(dto);
  }
}
