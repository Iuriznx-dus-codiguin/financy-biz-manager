import type ExcelJSType from 'exceljs';

/**
 * exceljs (~938 kB minificado) carregado sob demanda.
 *
 * Com o import estático, o módulo entrava no grafo do chunk de entrada por um
 * caminho indireto — `AuthenticatedLayout` → `OnboardingFlow` →
 * `ExpenseSheetStep` → `parseNumber` — e toda a biblioteca era baixada no
 * primeiro carregamento, mesmo por quem nunca exporta uma planilha.
 *
 * As funções puras deste módulo (`parseNumber`, `parseDate`) continuam sem
 * custo algum; só quem chama as funções de import/export paga o download.
 */
const loadExcelJS = async (): Promise<typeof ExcelJSType> => {
  const mod = await import('exceljs');
  return mod.default ?? (mod as unknown as typeof ExcelJSType);
};

export interface SheetSpec {
  name: string;
  aoa?: any[][];
  json?: Record<string, any>[];
}

export interface TemplateColumn {
  key: string;
  header: string;
  example?: string | number;
  width?: number;
}

/**
 * Exporta um ou mais sheets para .xlsx e dispara o download.
 * Compatível com Excel, Google Sheets, Numbers, LibreOffice.
 */
export async function downloadXlsx(fileName: string, sheets: SheetSpec[]) {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Financy';
  workbook.created = new Date();

  for (const spec of sheets) {
    const ws = workbook.addWorksheet(spec.name);
    if (spec.aoa) {
      spec.aoa.forEach((row) => ws.addRow(row));
      if (spec.aoa.length > 0) {
        ws.getRow(1).font = { bold: true };
      }
    } else if (spec.json && spec.json.length > 0) {
      const keys = Object.keys(spec.json[0]);
      ws.columns = keys.map((k) => ({ header: k, key: k, width: Math.max(14, k.length + 2) }));
      spec.json.forEach((r) => ws.addRow(r));
      ws.getRow(1).font = { bold: true };
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(blob, fileName);
}

/**
 * Gera e baixa um template em .xlsx com cabeçalho e linha de exemplo.
 */
export async function downloadTemplate(
  fileName: string,
  sheetName: string,
  columns: TemplateColumn[]
) {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet(sheetName);

  ws.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width ?? Math.max(16, c.header.length + 2),
  }));
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFEFF6FF' },
  };

  const exampleRow: Record<string, any> = {};
  columns.forEach((c) => {
    if (c.example !== undefined) exampleRow[c.key] = c.example;
  });
  if (Object.keys(exampleRow).length > 0) ws.addRow(exampleRow);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(blob, fileName);
}

/**
 * Lê um arquivo .xlsx ou .csv e retorna linhas como objetos
 * usando os headers da primeira linha como chaves.
 */
export async function parseSpreadsheetFile(file: File): Promise<Record<string, any>[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) {
    return parseCsv(await file.text());
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return parseXlsx(await file.arrayBuffer());
  }
  throw new Error('Formato não suportado. Use .xlsx ou .csv');
}

async function parseXlsx(buffer: ArrayBuffer): Promise<Record<string, any>[]> {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const ws = workbook.worksheets[0];
  if (!ws) return [];

  const rows: Record<string, any>[] = [];
  let headers: string[] = [];

  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const values = row.values as any[];
    // ExcelJS row.values is 1-indexed; drop the leading undefined
    const cells = values.slice(1).map((v) => normalizeCell(v));
    if (rowNumber === 1) {
      headers = cells.map((c) => String(c ?? '').trim());
      return;
    }
    if (cells.every((c) => c === '' || c === null || c === undefined)) return;
    const obj: Record<string, any> = {};
    headers.forEach((h, i) => {
      if (h) obj[h] = cells[i] ?? '';
    });
    rows.push(obj);
  });

  return rows;
}

function normalizeCell(v: any): any {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().split('T')[0];
  if (typeof v === 'object') {
    if ('text' in v) return String(v.text);
    if ('result' in v) return v.result;
    if ('richText' in v) return v.richText.map((t: any) => t.text).join('');
  }
  return v;
}

function parseCsv(text: string): Record<string, any>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const obj: Record<string, any> = {};
    headers.forEach((h, i) => {
      if (h) obj[h] = (cells[i] ?? '').trim();
    });
    return obj;
  });
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/** Converte string de valor (R$ 1.234,56 ou 1234.56) em número */
export function parseNumber(v: any): number {
  if (typeof v === 'number') return v;
  if (v === null || v === undefined || v === '') return 0;
  const s = String(v)
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/** Normaliza data para YYYY-MM-DD (aceita DD/MM/YYYY, YYYY-MM-DD, Date) */
export function parseDate(v: any): string {
  if (!v) return new Date().toISOString().split('T')[0];
  if (v instanceof Date) return v.toISOString().split('T')[0];
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (br) {
    const [, d, m, y] = br;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return new Date().toISOString().split('T')[0];
}
