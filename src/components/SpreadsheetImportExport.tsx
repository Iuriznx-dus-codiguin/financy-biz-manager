import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileSpreadsheet, Download, Upload, FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  downloadTemplate,
  downloadXlsx,
  parseSpreadsheetFile,
  TemplateColumn,
} from '@/utils/spreadsheetIO';

export interface SpreadsheetImportExportProps {
  entityLabel: string; // ex: "Receitas"
  fileBaseName: string; // ex: "receitas"
  templateColumns: TemplateColumn[];
  /** Função que devolve as linhas para exportação */
  getExportRows?: () => Record<string, any>[];
  /** Recebe as linhas importadas, devolve quantos foram salvos */
  onImport?: (rows: Record<string, any>[]) => Promise<{ inserted: number; skipped?: number }>;
  /** Estilo compacto (somente ícone em telas pequenas) */
  compact?: boolean;
}

export const SpreadsheetImportExport: React.FC<SpreadsheetImportExportProps> = ({
  entityLabel,
  fileBaseName,
  templateColumns,
  getExportRows,
  onImport,
  compact = true,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<null | 'export' | 'import' | 'template'>(null);

  const handleTemplate = async () => {
    try {
      setBusy('template');
      await downloadTemplate(
        `modelo-${fileBaseName}.xlsx`,
        entityLabel,
        templateColumns
      );
      toast.success('Modelo baixado', {
        description: 'Preencha no Excel ou Google Sheets e importe de volta.',
      });
    } catch (e) {
      toast.error('Erro ao gerar modelo');
    } finally {
      setBusy(null);
    }
  };

  const handleExport = async () => {
    if (!getExportRows) return;
    try {
      setBusy('export');
      const rows = getExportRows();
      if (rows.length === 0) {
        toast.info('Nada para exportar', { description: `Você ainda não possui ${entityLabel.toLowerCase()}.` });
        return;
      }
      const stamp = new Date().toISOString().split('T')[0];
      await downloadXlsx(`${fileBaseName}-${stamp}.xlsx`, [
        { name: entityLabel, json: rows },
      ]);
      toast.success(`${entityLabel} exportadas`, {
        description: `${rows.length} registro(s) em .xlsx — abre no Excel e Google Sheets.`,
      });
    } catch (e) {
      toast.error('Erro ao exportar');
    } finally {
      setBusy(null);
    }
  };

  const handlePickFile = () => inputRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onImport) return;
    try {
      setBusy('import');
      const rows = await parseSpreadsheetFile(file);
      if (rows.length === 0) {
        toast.warning('Planilha vazia ou sem cabeçalhos válidos.');
        return;
      }
      const { inserted, skipped } = await onImport(rows);
      toast.success(`Importação concluída`, {
        description: `${inserted} registro(s) adicionado(s)${skipped ? ` · ${skipped} ignorado(s)` : ''}.`,
      });
    } catch (err: any) {
      toast.error('Erro ao importar planilha', {
        description: err?.message ?? 'Verifique o formato e tente novamente.',
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="rounded-xl gap-2" disabled={!!busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            <span className={compact ? 'hidden sm:inline' : ''}>Planilha</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Excel & Google Sheets</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleTemplate}>
            <FileDown className="h-4 w-4 mr-2" />
            Baixar modelo (.xlsx)
          </DropdownMenuItem>
          {onImport && (
            <DropdownMenuItem onClick={handlePickFile}>
              <Upload className="h-4 w-4 mr-2" />
              Importar planilha
            </DropdownMenuItem>
          )}
          {getExportRows && (
            <DropdownMenuItem onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar {entityLabel.toLowerCase()}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFile}
        className="hidden"
      />
    </>
  );
};
