import { BadRequestException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import bwipjs from 'bwip-js';
import { once } from 'node:events';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setImmediate } from 'node:timers/promises';

export const LABEL_SHEET = Object.freeze({
  pageWidth: 210, pageHeight: 297, width: 32, height: 15,
  columns: 6, rows: 16, perPage: 96, gapX: 1, gapY: 1,
  marginX: 6.5, marginY: 21, quietModules: 10,
  minimumModuleMm: 0.254, maximumModuleMm: 0.3386666667,
});
export const mm = (value: number) => value * 72 / 25.4;

export function assertBarcode(value: unknown): string {
  // Exact identity: no numeric coercion, case folding, zero stripping or trim.
  // Space is valid inside Code 128, but edge whitespace is disallowed to avoid
  // scanner suffix ambiguity. The 256-byte input bound protects request resources.
  if (typeof value !== 'string' || !value || value.length > 256 || !/^[\x21-\x7e](?:[\x20-\x7e]*[\x21-\x7e])?$/.test(value)) {
    throw new BadRequestException('Enter the exact barcode using printable ASCII characters, without surrounding spaces.');
  }
  return value;
}
export function encodeCode128(value: string): number[] {
  assertBarcode(value);
  // BWIPP selects Code C for digit pairs and switches sets for odd-length and
  // external identifiers. parse/parsefnc remain disabled: ^ characters are data.
  const symbol = bwipjs.raw({ bcid: 'code128', text: value, parse: false, parsefnc: false })[0];
  if (!('sbs' in symbol)) throw new BadRequestException('The barcode encoder did not produce a Code 128 symbol.');
  return symbol.sbs;
}
export function barcodePrintMetrics(value: string) {
  const widths = encodeCode128(value);
  const modules = widths.reduce((sum, width) => sum + width, 0);
  const x = Math.min(LABEL_SHEET.maximumModuleMm, 31 / (modules + 2 * LABEL_SHEET.quietModules));
  if (x < LABEL_SHEET.minimumModuleMm) {
    throw new BadRequestException(`Barcode ${value} cannot fit a 32 × 15 mm label at the supported scan density. Its identity is preserved; use its existing sticker or a separately calibrated larger label.`);
  }
  return { widths, modules, moduleMm: x, quietMm: x * LABEL_SHEET.quietModules, totalWidthMm: (modules + 20) * x };
}
export function labelPosition(index: number) {
  const slot = index % LABEL_SHEET.perPage;
  return { page: Math.floor(index / LABEL_SHEET.perPage), column: slot % 6, row: Math.floor(slot / 6),
    x: LABEL_SHEET.marginX + (slot % 6) * 33, y: LABEL_SHEET.marginY + Math.floor(slot / 6) * 16 };
}
export async function createBarcodePdf(
  barcodes: AsyncIterable<string> | Iterable<string>,
  options: { guides?: boolean; calibration?: boolean; documentId: string; schoolId: string; actor: string },
) {
  const directory = await mkdtemp(join(tmpdir(), 'myshule-library-'));
  const path = join(directory, 'barcodes.pdf');
  const cleanup = () => rm(directory, { recursive: true, force: true });
  const doc = new PDFDocument({ autoFirstPage: false, bufferPages: false, compress: true,
    info: { Title: options.calibration ? 'MyShule printer calibration - NOT INVENTORY' : `Library barcode batch ${options.documentId}`,
      Author: options.actor, Subject: `School ${options.schoolId}; ${options.documentId}` } });
  const output = createWriteStream(path);
  const finished = once(output, 'finish');
  // Attach immediately so a filesystem failure cannot become unhandled.
  void finished.catch(() => undefined);
  doc.pipe(output);
  doc.on('error', error => output.destroy(error));
  let count = 0;
  try {
    for await (const code of barcodes) {
      if (count % 96 === 0) {
        doc.addPage({ size: [mm(210),mm(297)], margin: 0 });
        doc.fillColor('black').font('Helvetica').fontSize(7).text(
          options.calibration ? 'CALIBRATION ONLY - do not attach these test codes to books' : `MyShule library | ${options.documentId} | Sheet ${Math.floor(count/96)+1}`,
          mm(6.5),mm(9),{width:mm(197),lineBreak:false});
        doc.fontSize(7).text('A4 - Actual size / 100% - disable Fit to page. Each label: 32 x 15 mm.',mm(6.5),mm(283),{lineBreak:false});
        if(options.calibration) {
          doc.lineWidth(.4).moveTo(mm(6.5),mm(289)).lineTo(mm(106.5),mm(289)).stroke();
          doc.moveTo(mm(6.5),mm(287)).lineTo(mm(6.5),mm(291)).stroke();
          doc.moveTo(mm(106.5),mm(287)).lineTo(mm(106.5),mm(291)).stroke();
          doc.text('Measure this line: exactly 100 mm',mm(110),mm(287),{lineBreak:false});
        }
      }
      const {x,y}=labelPosition(count);
      const metric=barcodePrintMetrics(code);
      if(options.guides || options.calibration) doc.save().lineWidth(.2).strokeColor('#aaaaaa').rect(mm(x),mm(y),mm(32),mm(15)).stroke().restore();
      let barX=x+(32-metric.totalWidthMm)/2+metric.quietMm;
      doc.fillColor('black');
      metric.widths.forEach((width,index)=>{
        if(index%2===0)doc.rect(mm(barX),mm(y+1.4),mm(width*metric.moduleMm),mm(9.2)).fill();
        barX+=width*metric.moduleMm;
      });
      doc.font('Helvetica').fontSize(7).text(code,mm(x+.5),mm(y+11),{width:mm(31),align:'center',lineBreak:false});
      count++;
      if(count%96===0) {
        // Yield each sheet. Only the current PDF page and one DB chunk are held.
        await setImmediate();
        if(output.writableNeedDrain)await once(output,'drain');
        if(output.destroyed)throw new Error('PDF output was interrupted.');
      }
    }
    if(!count)throw new BadRequestException('No barcodes selected.');
    doc.end(); await finished;
    const stream=createReadStream(path);
    stream.on('close',()=>{void cleanup();});
    return { stream, count, pages:Math.ceil(count/96), cleanup };
  } catch(error) {
    doc.destroy();output.destroy();await cleanup();throw error;
  }
}
