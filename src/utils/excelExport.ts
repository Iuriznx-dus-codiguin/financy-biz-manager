/**
 * @deprecated Use `@/utils/spreadsheetIO` diretamente.
 *
 * Este módulo era uma cópia reduzida de `spreadsheetIO.ts`: mesmo
 * `downloadXlsx`, sem cabeçalho em negrito, sem largura de coluna e sem os
 * metadados do arquivo. Mantido como re-export para não quebrar nenhum import
 * existente — a implementação agora é a de `spreadsheetIO`, que também carrega
 * o `exceljs` sob demanda.
 */
export { downloadXlsx } from './spreadsheetIO';
export type { SheetSpec } from './spreadsheetIO';
