import { createHash } from 'node:crypto';

import PDFDocument from 'pdfkit';

import {
  formatReportValue,
  normalizeReportFilename,
  normalizeReportGeneratedAt,
  type ReportArtifact,
  type ReportArtifactInput,
} from './report-artifact';

export async function createPdfReportArtifact(
  input: ReportArtifactInput,
): Promise<ReportArtifact> {
  const generatedAt = normalizeReportGeneratedAt(input.generatedAt);
  const content = await renderPdf(input, generatedAt);

  return {
    filename: normalizeReportFilename(input, 'pdf'),
    contentType: 'application/pdf',
    byteLength: content.length,
    checksumSha256: createHash('sha256').update(content).digest('hex'),
    generatedAt,
    rowCount: input.rows.length,
    content,
  };
}

function renderPdf(
  input: ReportArtifactInput,
  generatedAt: string,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const document = new PDFDocument({
      autoFirstPage: true,
      bufferPages: true,
      compress: false,
      margin: 40,
      size: "A4",
      layout: input.headers.length > 5 ? "landscape" : "portrait",
      info: {
        Title: input.title,
        Author: "My Shule",
        Subject: input.reportId,
        CreationDate: new Date(generatedAt),
        ModDate: new Date(generatedAt),
      },
    });

    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("error", reject);
    document.on("end", () => resolve(Buffer.concat(chunks)));

    const width = document.page.width - 80;
    const bottom = document.page.height - 62;
    const ink = "#182b49",
      muted = "#52647f",
      blue = "#155da8";
    const clean = (value: string) =>
      value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
    const title = clean(input.title.trim() || input.reportId);
    const heading = (continued = false) => {
      document.rect(40, 26, width, 4).fill(blue);
      document
        .font("Helvetica-Bold")
        .fontSize(continued ? 10 : 14)
        .fillColor(blue)
        .text(clean(input.schoolName || "MyShule ERP"), 40, 40, { width });
      document
        .fontSize(continued ? 12 : 21)
        .fillColor(ink)
        .text(title, { width });
      document
        .font("Helvetica")
        .fontSize(8)
        .fillColor(muted)
        .text(
          `${new Date(generatedAt).toLocaleString("en-GB", { timeZone: "Africa/Nairobi" })} EAT  |  ${input.rows.length} records${input.generatedBy ? `  |  ${clean(input.generatedBy)}` : ""}`,
          { width },
        );
      if (!continued)
        for (const [key, value] of Object.entries(input.filters ?? {})) {
          if (value !== null && value !== undefined && value !== "")
            document.text(
              `${key.replace(/_/g, " ")}: ${typeof value === "object" ? JSON.stringify(value) : value}`,
              { width },
            );
        }
      document.moveDown(0.8);
    };
    heading();
    // Wide exports use successive column groups. Every original value remains
    // available, with a stable record number joining the groups on paper.
    const groups = Math.max(1, Math.ceil(input.headers.length / 8));
    for (let group = 0; group < groups; group++) {
      if (group) {
        document.addPage();
        heading(true);
      }
      const start = group * 8,
        end = Math.min(input.headers.length, start + 8);
      const headers = ["#", ...input.headers.slice(start, end)].map(clean);
      if (groups > 1)
        document
          .fontSize(9)
          .fillColor(muted)
          .text(`Columns ${start + 1}-${end} of ${input.headers.length}`)
          .moveDown(0.5);
      const rows = input.rows.map((row, index) => [
        String(index + 1),
        ...input.headers
          .slice(start, end)
          .map((_, i) => clean(formatReportValue(row[start + i]))),
      ]);
      document.font("Helvetica").fontSize(9);
      const weights = headers.map((label, i) =>
        i === 0
          ? 24
          : Math.min(
              220,
              Math.max(
                55,
                ...[label, ...rows.slice(0, 80).map((row) => row[i])].map(
                  (value) => document.widthOfString(value),
                ),
              ) + 14,
            ),
      );
      const total = weights.reduce((a, b) => a + b, 0);
      const widths = [
        32,
        ...weights
          .slice(1)
          .map((value) => (value / (total - weights[0])) * (width - 32)),
      ];
      const draw = (values: string[], isHeader = false, stripe = false) => {
        document.font(isHeader ? "Helvetica-Bold" : "Helvetica").fontSize(9);
        const height =
          Math.max(
            12,
            ...values.map((value, i) =>
              document.heightOfString(value, {
                width: widths[i] - 12,
                lineGap: 2,
              }),
            ),
          ) + 14;
        const top = document.y;
        document
          .rect(40, top, width, height)
          .fill(isHeader ? "#e1ecfa" : stripe ? "#f3f7fc" : "#ffffff");
        let x = 40;
        values.forEach((value, i) => {
          document
            .fillColor(ink)
            .text(value, x + 6, top + 7, { width: widths[i] - 12, lineGap: 2 });
          x += widths[i];
        });
        document
          .moveTo(40, top + height)
          .lineTo(40 + width, top + height)
          .lineWidth(0.4)
          .strokeColor("#d3dfed")
          .stroke();
        document.x = 40;
        document.y = top + height;
      };
      const next = () => {
        document.addPage();
        heading(true);
        draw(headers, true);
      };
      draw(headers, true);
      rows.forEach((row, index) => {
        let remaining = [...row];
        do {
          document.font("Helvetica").fontSize(9);
          let needed =
            Math.max(
              ...remaining.map((value, i) =>
                document.heightOfString(value, {
                  width: widths[i] - 12,
                  lineGap: 2,
                }),
              ),
            ) + 14;
          if (document.y + needed > bottom && document.y > 150) next();
          const available = bottom - document.y - 14;
          // Exceptionally long notes continue on the next page without clipping.
          const part = remaining.map((value, i) => {
            if (
              document.heightOfString(value, {
                width: widths[i] - 12,
                lineGap: 2,
              }) <= available
            )
              return value;
            let low = 0,
              high = value.length;
            while (low < high) {
              const mid = Math.ceil((low + high) / 2);
              if (
                document.heightOfString(value.slice(0, mid), {
                  width: widths[i] - 12,
                  lineGap: 2,
                }) <= available
              )
                low = mid;
              else high = mid - 1;
            }
            return value.slice(0, Math.max(1, low));
          });
          draw(part, false, index % 2 === 0);
          remaining = remaining.map((value, i) => value.slice(part[i].length));
          if (remaining.some(Boolean)) {
            next();
            remaining[0] = `${index + 1} (cont.)`;
          }
        } while (remaining.some(Boolean));
      });
      if (!rows.length)
        document
          .moveDown()
          .font("Helvetica")
          .fontSize(10)
          .fillColor(muted)
          .text("No records were included in this report.", 40, document.y, {
            width,
          });
    }
    const pages = document.bufferedPageRange();
    for (let index = 0; index < pages.count; index++) {
      document.switchToPage(pages.start + index);
      document
        .font("Helvetica")
        .fontSize(8)
        .fillColor(muted)
        .text("MyShule ERP  |  School report", 40, document.page.height - 54, {
          width: width / 2,
          lineBreak: false,
        })
        .text(
          `Page ${index + 1} of ${pages.count}`,
          40 + width / 2,
          document.page.height - 54,
          { width: width / 2, align: "right", lineBreak: false },
        );
    }
    document.end();
  });
}
