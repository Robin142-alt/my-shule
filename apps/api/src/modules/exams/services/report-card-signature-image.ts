import { BadRequestException } from '@nestjs/common';
import PDFDocument from 'pdfkit';

const MAX_SIGNATURE_IMAGE_DIMENSION = 4096;
const MAX_SIGNATURE_IMAGE_PIXELS = 4 * 1024 * 1024;

type OpenedPdfImage = {
  width?: number;
  height?: number;
};

export async function assertDecodableReportCardSignatureImage(content: Buffer): Promise<void> {
  let document: PDFKit.PDFDocument;
  let openedImage: OpenedPdfImage;

  try {
    document = new PDFDocument({ autoFirstPage: false, compress: true });
    openedImage = (document as PDFKit.PDFDocument & {
      openImage: (source: Buffer) => OpenedPdfImage;
    }).openImage(content);
  } catch {
    throw new BadRequestException('The signature image is damaged or could not be decoded');
  }

  const width = Number(openedImage.width ?? 0);
  const height = Number(openedImage.height ?? 0);
  if (
    !Number.isInteger(width)
    || !Number.isInteger(height)
    || width <= 0
    || height <= 0
    || width > MAX_SIGNATURE_IMAGE_DIMENSION
    || height > MAX_SIGNATURE_IMAGE_DIMENSION
    || width * height > MAX_SIGNATURE_IMAGE_PIXELS
  ) {
    document.end();
    throw new BadRequestException(
      'Signature image dimensions must be valid and no larger than 4 megapixels',
    );
  }

  if (width < 300 || height < 80 || width > 1600 || height > 600) {
    document.end();
    throw new BadRequestException('Signature images must be 300–1600 pixels wide and 80–600 pixels high. A cropped 600 × 200 image is recommended.');
  }
  if (width / height < 2 || width / height > 6) {
    document.end();
    throw new BadRequestException('Crop the signature to a landscape image, 2–6 times wider than it is tall. Do not upload a photograph of the whole page.');
  }

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const complete = (error?: unknown) => {
      if (settled) return;
      settled = true;
      if (error) {
        reject(new BadRequestException('The signature image is damaged or could not be decoded'));
      } else {
        resolve();
      }
    };

    document.on('data', () => undefined);
    document.once('error', complete);
    document.once('end', () => complete());

    try {
      document.addPage({ size: [120, 80], margin: 0 });
      document.image(content, 5, 5, { fit: [110, 70], align: 'center', valign: 'center' });
      document.end();
    } catch (error) {
      complete(error);
    }
  });
}
