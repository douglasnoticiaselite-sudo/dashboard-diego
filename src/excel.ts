import * as XLSX from 'xlsx';
import type { AppData } from './types';
import { computeHistogram, computePendencies, getShutdownName, money, normalize } from './utils';

const sheet = (rows: any[]) => XLSX.utils.json_to_sheet(rows.length ? rows : [{ vazio: 'Sem dados' }]);

function writeBook(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}

function namedRows(data: AppData, rows: any[]) {
  return rows.map((r) => ({ ...r, shutdown: getShutdownName(data, r.shutdownId) }));
}

export function exportFullWorkbook(data: AppData, filename = 'step-shutdown-control.xlsx') {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet(data.shutdowns), 'Shutdowns');
  XLSX.utils.book_append_sheet(wb, sheet(namedRows(data, data.phases)), 'Calendario');
  XLSX.utils.book_append_sheet(wb, sheet(namedRows(data, data.poBsps)), 'PO_BSP');
  XLSX.utils.book_append_sheet(wb, sheet(namedRows(data, data.team)), 'POB_Equipe');
  XLSX.utils.book_append_sheet(wb, sheet(namedRows(data, data.tools)), 'Ferramental');
  XLSX.utils.book_append_sheet(wb, sheet(namedRows(data, data.progress)), 'Avancos');
  XLSX.utils.book_append_sheet(wb, sheet(computeHistogram(data).map((r) => ({ ...r, custo: money(r.cost), funcoes: Object.entries(r.byRole).map(([k, v]) => `${k}: ${v}`).join(' | ') }))), 'Histograma');
  XLSX.utils.book_append_sheet(wb, sheet(computePendencies(data)), 'Pendencias');
  XLSX.utils.book_append_sheet(wb, sheet(data.users), 'Usuarios');
  writeBook(wb, filename);
}

export function exportModule(data: AppData, module: keyof AppData | 'histogram' | 'pendencies' | 'costs', filename?: string) {
  const wb = XLSX.utils.book_new();
  if (module === 'histogram') {
    XLSX.utils.book_append_sheet(wb, sheet(computeHistogram(data)), 'Histograma');
  } else if (module === 'pendencies') {
    XLSX.utils.book_append_sheet(wb, sheet(computePendencies(data)), 'Pendencias');
  } else if (module === 'costs') {
    XLSX.utils.book_append_sheet(wb, sheet(data.team.map((m) => ({ ...m, shutdown: getShutdownName(data, m.shutdownId), dias: m.arrivalDate && m.departureDate ? undefined : 0, custoPrevisto: Number(m.dayRate || 0) }))), 'Custos');
  } else {
    const rows = ['phases', 'poBsps', 'team', 'tools', 'progress'].includes(module) ? namedRows(data, (data as any)[module]) : (data as any)[module];
    XLSX.utils.book_append_sheet(wb, sheet(rows), String(module));
  }
  writeBook(wb, filename ?? `step-${module}.xlsx`);
}

export async function readExcel(file: File): Promise<any[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer);
  const first = wb.SheetNames[0];
  return XLSX.utils.sheet_to_json(wb.Sheets[first], { defval: '' });
}

export function mapRow(row: any, fields: string[]) {
  const out: any = {};
  const entries = Object.entries(row);
  fields.forEach((field) => {
    const found = entries.find(([key]) => normalize(key) === normalize(field));
    if (found) out[field] = found[1];
  });
  return out;
}
