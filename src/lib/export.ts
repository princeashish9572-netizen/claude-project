/** Tabular export helpers shared by CSV and Excel output. */
export type Cell = string | number | null | undefined;

export interface Sheet {
  name: string;
  columns: { header: string; width?: number; money?: boolean }[];
  rows: Cell[][];
}

/**
 * Prevent CSV/formula injection: a text cell starting with = @ tab CR, or with
 * + / - followed by anything other than a number (phone numbers are fine),
 * could be executed as a formula by Excel. Numbers are left untouched.
 */
export function neutralizeFormula(value: Cell): Cell {
  if (typeof value !== "string") return value;
  const risky = /^[=@\t\r]/.test(value) || (/^[+-]/.test(value) && !/^[+-][\d\s.]*$/.test(value));
  return risky ? `'${value}` : value;
}

function csvCell(value: Cell): string {
  const v = neutralizeFormula(value);
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV with UTF-8 BOM so Excel shows ₹ and non-ASCII names correctly. */
export function toCsv(sheet: Sheet): string {
  const lines = [sheet.columns.map((c) => csvCell(c.header)).join(",")];
  for (const row of sheet.rows) lines.push(row.map(csvCell).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n";
}

export async function toXlsx(sheets: Sheet[], meta: { title: string; creator: string }): Promise<Uint8Array> {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = meta.creator;
  wb.title = meta.title;
  wb.created = new Date();

  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet.name.slice(0, 31), { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = sheet.columns.map((c) => ({ header: c.header, width: c.width ?? 16 }));
    for (const row of sheet.rows) ws.addRow(row.map(neutralizeFormula));
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E7FF" } };
    sheet.columns.forEach((c, i) => {
      if (c.money) ws.getColumn(i + 1).numFmt = "#,##,##0.00";
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf as ArrayBuffer);
}
