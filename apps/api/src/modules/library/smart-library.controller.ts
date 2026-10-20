import { BadRequestException, Body, Controller, Get, Param, Post, Query, StreamableFile } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { RequiresModule } from '../module-access/module-access.decorator';
import { SmartLibraryService } from './smart-library.service';
import { createBarcodePdf } from './barcode-print';

@Controller('library/smart')
@RequiresModule('library')
@Permissions('library:read')
export class SmartLibraryController {
  constructor(private readonly library: SmartLibraryService, private readonly context: RequestContextService) {}
  @Get('summary') summary() { return this.library.summary(); }
  @Get('catalogue') catalogue(@Query() q: Record<string,string>) { return this.library.catalogue(q); }
  @Get('inventory') inventory(@Query() q: Record<string,string>) { return this.library.inventory(q); }
  @Get('scan') scan(@Query('barcode') barcode: string) { return this.library.scan(barcode); }
  @Get('borrowers') borrowers(@Query() q: Record<string,string>) { return this.library.borrowers(q); }
  @Get('history') history(@Query() q: Record<string,string>) { return this.library.history(q); }
  @Get('loans') loans(@Query() q: Record<string,string>) { return this.library.loans(q); }
  @Get('batches') batches(@Query() q: Record<string,string>) { return this.library.batches(q); }
  @Get('barcodes') barcodes(@Query() q: Record<string,string>) { return this.library.barcodes(q); }
  @Post('batches') @Permissions('library:write')
  allocate(@Body() b: Record<string,unknown>) { return this.library.allocate(b); }
  @Post('barcodes/import') @Permissions('library:write')
  import(@Body() b: Record<string,unknown>) { return this.library.importBarcodes(b); }
  @Post('register') @Permissions('library:write')
  register(@Body() b: Record<string,unknown>) { return this.library.register(b); }
  @Post('issue') @Permissions('library:write')
  issue(@Body() b: Record<string,unknown>) { return this.library.issue(b); }
  @Post('return') @Permissions('library:write')
  returns(@Body() b: Record<string,unknown>) { return this.library.returns(b); }
  @Post('incidents') @Permissions('library:write')
  incident(@Body() b: Record<string,unknown>) { return this.library.incident(b); }
  @Get('stocktakes') stocktakes(@Query() q: Record<string,string>) { return this.library.stocktakes(q); }
  @Post('stocktakes') @Permissions('library:write')
  startStocktake(@Body() b: Record<string,unknown>) { return this.library.startStocktake(b); }
  @Get('stocktakes/:id') stocktake(@Param('id') id: string,@Query() q: Record<string,string>) { return this.library.stocktakeReport(id,q); }
  @Post('stocktakes/:id/scan') @Permissions('library:write')
  stocktakeScan(@Param('id') id: string,@Body() b: Record<string,unknown>) { return this.library.stocktakeScan(id,b); }
  @Post('stocktakes/:id/complete') @Permissions('library:write')
  complete(@Param('id') id: string,@Body() b: Record<string,unknown>) { return this.library.completeStocktake(id,b); }

  @Get('barcodes/pdf')
  async pdf(@Query() q: Record<string,string>) {
    let selected: unknown;
    try { selected=q.selected ? JSON.parse(q.selected) : undefined; }
    catch { throw new BadRequestException('Invalid selected barcode list.'); }
    const input = {batch_id:q.batch_id,barcodes:selected};
    await this.library.validatePrint(input);
    const s=this.context.requireStore();
    const pdf=await createBarcodePdf(this.library.printBarcodes(input),{guides:q.guides==='true',
      documentId:q.batch_id ?? 'selected-labels',schoolId:s.tenant_id!,actor:s.user_id});
    try { await this.library.recordPrint(input,pdf.count); }
    catch(error) { pdf.stream.destroy();await pdf.cleanup();throw error; }
    return new StreamableFile(pdf.stream,{type:'application/pdf',disposition:`inline; filename="library-barcodes.pdf"`});
  }
  @Get('barcodes/calibration')
  async calibration() {
    const s=this.context.requireStore();
    // Explicitly non-inventory test identifiers. Never reserve numbers.
    const pdf=await createBarcodePdf(Array.from({length:96},()=> 'TEST'),{guides:true,calibration:true,
      documentId:'printer-calibration',schoolId:s.tenant_id!,actor:s.user_id});
    return new StreamableFile(pdf.stream,{type:'application/pdf',disposition:`inline; filename="library-printer-calibration.pdf"`});
  }
}
