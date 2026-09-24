import ExcelJS from 'exceljs';

export interface SheetSpec {
  name: string;
  // Either rows of arrays (with optional header row included)
  aoa?: any[][];
  // Or array of plain objects (keys become headers)
  json?: Record<string, any>[];
}

export async function downloadXlsx(fileName: string, sheets: SheetSpec[]) {
  const workbook = new ExcelJS.Workbook();

  for (const spec of sheets) {
    const ws = workbook.addWorksheet(spec.name);
    if (spec.aoa) {
      spec.aoa.forEach(row => ws.addRow(row));
    } else if (spec.json && spec.json.length > 0) {
      const keys = Object.keys(spec.json[0]);
      ws.columns = keys.map(k => ({ header: k, key: k }));
      spec.json.forEach(r => ws.addRow(r));
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
