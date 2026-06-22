import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

export interface PdfOptions {
  title?: string;
  margin?: number;
  size?: string;
  author?: string;
  subject?: string;
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  generatePdfStream(content: string, options: PdfOptions = {}): Readable {
    const doc = new PDFDocument({
      autoFirstPage: true,
      margin: options.margin || 40,
      size: options.size || 'A4',
      info: {
        Title: options.title || 'Document',
        Author: options.author || 'My Shule',
        Subject: options.subject || '',
        CreationDate: new Date(),
      },
    });

    if (options.title) {
      doc.fontSize(18).text(options.title.trim(), { continued: false });
      doc.moveDown(1);
    }

    doc.fontSize(12).text(content);
    doc.end();

    return doc as unknown as Readable;
  }
}
