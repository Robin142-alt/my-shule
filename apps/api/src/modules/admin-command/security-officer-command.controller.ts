import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { SecurityOfficerCommandService } from './security-officer-command.service';

@Controller('admin-command/security-officer')
@RequiresModule('visitor_management')
@Permissions('security:read')
export class SecurityOfficerCommandController {
  constructor(private readonly service: SecurityOfficerCommandService) {}

  @Get('overview')
  getOverview() {
    return this.service.getOverview();
  }

  @Get('visitors')
  getVisitors() {
    return this.service.getVisitors();
  }

  @Post('visitors/check-in')
  @Permissions('security:write')
  checkInVisitor(@Body() dto: any) {
    return this.service.checkInVisitor(dto);
  }

  @Post('visitors/:id/check-out')
  @Permissions('security:write')
  checkOutVisitor(@Param('id') id: string) {
    return this.service.checkOutVisitor(id);
  }

  @Post('expected-visitors/:id/check-in')
  @Permissions('security:write')
  checkInExpectedVisitor(@Param('id') id: string) {
    return this.service.checkInExpectedVisitor(id);
  }

  @Post('visitors/:id/flag')
  @Permissions('security:write')
  flagVisitor(@Param('id') id: string, @Body() dto: any) {
    return this.service.flagVisitor(id, dto);
  }

  @Post('visitors/:id/print-badge')
  @Permissions('security:write')
  printVisitorBadge(@Param('id') id: string) {
    return this.service.printVisitorBadge(id);
  }

  @Get('lost-found')
  getLostFoundItems() {
    return this.service.getLostFoundItems();
  }

  @Post('lost-found')
  @Permissions('security:write')
  recordLostFoundItem(@Body() dto: any) {
    return this.service.recordLostFoundItem(dto);
  }

  @Post('lost-found/:id/claim')
  @Permissions('security:write')
  claimLostFoundItem(@Param('id') id: string, @Body() dto: any) {
    return this.service.claimLostFoundItem(id, dto);
  }

  @Get('gate-register')
  getGateRegister() {
    return this.service.getGateRegister();
  }

  @Post('gate-register')
  @Permissions('security:write')
  createGateEntry(@Body() dto: any) {
    return this.service.checkInVisitor(dto);
  }

  @Post('gate-register/:id/exit')
  @Permissions('security:write')
  logGateExit(@Param('id') id: string) {
    return this.service.checkOutVisitor(id);
  }

  @Get('student-exit-passes')
  getStudentExitPasses() {
    return this.service.getStudentExitPasses();
  }

  @Post('student-exit-passes/flag-unauthorized')
  @Permissions('security:write')
  flagUnauthorizedExit(@Body() dto: any) {
    return this.service.flagUnauthorizedExit(dto);
  }

  @Post('student-exit-passes/:id/verify')
  @Permissions('security:write')
  verifyExitPass(@Param('id') id: string) {
    return this.service.verifyExitPass(id);
  }

  @Post('student-exit-passes/:id/exit')
  @Permissions('security:write')
  logStudentExit(@Param('id') id: string) {
    return this.service.logStudentExit(id);
  }

  @Post('student-exit-passes/:id/return')
  @Permissions('security:write')
  logStudentReturn(@Param('id') id: string) {
    return this.service.logStudentReturn(id);
  }

  @Get('boarding-movement')
  getBoardingMovements() {
    return this.service.getBoardingMovements();
  }

  @Post('boarding-movement/:id/verify')
  @Permissions('security:write')
  verifyBoardingMovement(@Param('id') id: string) {
    return this.service.verifyBoardingMovement(id);
  }

  @Post('boarding-movement/:id/return')
  @Permissions('security:write')
  recordBoardingReturn(@Param('id') id: string) {
    return this.service.recordBoardingReturn(id);
  }

  @Post('boarding-movement/:id/notify-master')
  @Permissions('security:write')
  notifyBoardingMaster(@Param('id') id: string) {
    return this.service.notifyBoardingMaster(id);
  }

  @Get('transport-clearance')
  getTransportClearance() {
    return this.service.getTransportClearance();
  }

  @Post('transport-clearance/:id/departure')
  @Permissions('security:write')
  recordTransportDeparture(@Param('id') id: string) {
    return this.service.recordTransportDeparture(id);
  }

  @Post('transport-clearance/:id/arrival')
  @Permissions('security:write')
  recordTransportArrival(@Param('id') id: string) {
    return this.service.recordTransportArrival(id);
  }

  @Get('staff-movement')
  getStaffMovement() {
    return this.service.getStaffMovement();
  }

  @Get('search')
  searchSecurityRecords(@Query('query') query: string) {
    return this.service.searchSecurityRecords(query);
  }

  @Post('staff-movement/entry')
  @Permissions('security:write')
  logStaffEntry(@Body() dto: any) {
    return this.service.logStaffEntry(dto);
  }

  @Post('staff-movement/departure')
  @Permissions('security:write')
  logStaffDeparture(@Body() dto: any) {
    return this.service.logStaffDeparture(dto);
  }

  @Post('staff-movement/:id/return')
  @Permissions('security:write')
  logStaffReturn(@Param('id') id: string) {
    return this.service.logStaffReturn(id);
  }

  @Get('vehicle-log')
  getVehicleLogs() {
    return this.service.getVehicleLogs();
  }

  @Post('vehicle-log')
  @Permissions('security:write')
  recordVehicleEntry(@Body() dto: any) {
    return this.service.recordVehicleEntry(dto);
  }

  @Post('vehicle-log/:id/exit')
  @Permissions('security:write')
  recordVehicleExit(@Param('id') id: string) {
    return this.service.recordVehicleExit(id);
  }

  @Get('deliveries')
  getDeliveries() {
    return this.service.getDeliveries();
  }

  @Post('deliveries')
  @Permissions('security:write')
  recordDelivery(@Body() dto: any) {
    return this.service.recordDelivery(dto);
  }

  @Post('deliveries/:id/notify-recipient')
  @Permissions('security:write')
  notifyDeliveryRecipient(@Param('id') id: string) {
    return this.service.notifyDeliveryRecipient(id);
  }

  @Post('deliveries/:id/collected')
  @Permissions('security:write')
  markDeliveryCollected(@Param('id') id: string) {
    return this.service.markDeliveryCollected(id);
  }

  @Get('late-arrivals')
  getLateArrivals() {
    return this.service.getLateArrivals();
  }

  @Post('late-arrivals')
  @Permissions('security:write')
  recordLateArrival(@Body() dto: any) {
    return this.service.recordLateArrival(dto);
  }

  @Post('late-arrivals/:id/notify-parent')
  @Permissions('security:write')
  notifyLateArrivalParent(@Param('id') id: string) {
    return this.service.notifyLateArrivalParent(id);
  }

  @Get('early-departures')
  getEarlyDepartures() {
    return this.service.getEarlyDepartures();
  }

  @Post('early-departures')
  @Permissions('security:write')
  recordEarlyDeparture(@Body() dto: any) {
    return this.service.recordEarlyDeparture(dto);
  }

  @Post('early-departures/:id/return')
  @Permissions('security:write')
  recordEarlyDepartureReturn(@Param('id') id: string) {
    return this.service.recordEarlyDepartureReturn(id);
  }

  @Get('watchlist')
  getWatchlistEntries() {
    return this.service.getWatchlistEntries();
  }

  @Post('watchlist')
  @Permissions('security:write')
  recordWatchlistEntry(@Body() dto: any) {
    return this.service.recordWatchlistEntry(dto);
  }

  @Post('watchlist/:id/acknowledge')
  @Permissions('security:write')
  acknowledgeWatchlistEntry(@Param('id') id: string) {
    return this.service.acknowledgeWatchlistEntry(id);
  }

  @Post('shift/start')
  @Permissions('security:write')
  startShift(@Body() dto: any) {
    return this.service.startShift(dto);
  }

  @Post('shift/end')
  @Permissions('security:write')
  endShift(@Body() dto: any) {
    return this.service.endShift(dto);
  }

  @Get('incidents')
  getIncidents() {
    return this.service.getIncidents();
  }

  @Post('incidents')
  @Permissions('security:write')
  reportIncident(@Body() dto: any) {
    return this.service.reportIncident(dto);
  }

  @Post('incidents/:id/escalate')
  @Permissions('security:write')
  escalateIncident(@Param('id') id: string) {
    return this.service.escalateIncident(id);
  }

  @Post('incidents/:id/resolve')
  @Permissions('security:write')
  resolveIncident(@Param('id') id: string, @Body() dto: any) {
    return this.service.resolveIncident(id, dto);
  }

  @Get('reports')
  getReports() {
    return this.service.getReports();
  }

  @Post('reports/generate')
  @Permissions('security:write')
  generateReport(@Body() dto: any) {
    return this.service.generateReport(dto);
  }

  @Post('reports/:id/download')
  downloadReport(@Param('id') id: string) {
    return this.service.downloadReport(id);
  }

  @Post('actions')
  @Permissions('security:write')
  recordAction(@Body() dto: any) {
    return this.service.recordAction(dto);
  }
}
