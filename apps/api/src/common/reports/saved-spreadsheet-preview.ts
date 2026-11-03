import { Readable } from "node:stream";
import { ConflictException } from "@nestjs/common";
import ExcelJS from "exceljs";

/** Reads only an integrity-checked, saved artifact. Never reruns its data query. */
export async function readSavedSpreadsheet(content: Buffer, format: string) {
  if (content.length > 20 * 1024 * 1024) {
    throw new ConflictException(
      "This document is too large for an inline preview. Download the original spreadsheet.",
    );
  }
  const workbook = new ExcelJS.Workbook();
  try {
    if (format === "csv") {
      await workbook.csv.read(Readable.from([content]), {
        map: (value: string) => value,
      });
    } else if (format === "xlsx") {
      await workbook.xlsx.load(content as unknown as ExcelJS.Buffer);
    } else {
      throw new Error("Unsupported saved format");
    }
    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount > 10000 || sheet.columnCount > 40) {
      throw new ConflictException(
        "Download this spreadsheet to view its complete contents. It exceeds the inline preview limit.",
      );
    }
    // The existing XLSX exporter writes title, generated date and filters before
    // its header. Preserve arbitrary older workbooks as they were stored.
    const headerRow =
      format === "xlsx" &&
      sheet.getCell("A2").text.startsWith("Generated at:") &&
      sheet.getCell("A3").text.startsWith("Filters:")
        ? 4
        : 1;
    const cells = (row: number) =>
      Array.from(
        { length: sheet.columnCount },
        (_, col) => sheet.getRow(row).getCell(col + 1).text,
      );
    return {
      headers: cells(headerRow),
      rows: Array.from(
        { length: Math.max(0, sheet.rowCount - headerRow) },
        (_, i) => cells(headerRow + i + 1),
      ),
    };
  } catch (error) {
    if (error instanceof ConflictException) throw error;
    throw new ConflictException(
      "The saved spreadsheet could not be previewed. Download the original file or regenerate it.",
    );
  }
}
