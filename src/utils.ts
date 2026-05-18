import type { AppData, AuditLog, ID, TeamMember } from './types';

export const uuid = () => (crypto?.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);
export const today = () => new Date().toISOString().slice(0, 10);
export const now = () => new Date().toISOString();

export function daysBetween(start?: string, end?: string) {
  if (!start || !end) return 0;
  const a = new Date(`${start}T00:00:00`);
  const b = new Date(`${end}T00:00:00`);
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
  return Number.isFinite(diff) && diff > 0 ? diff : 0;
}

export function dateRange(start?: string, end?: string) {
  const total = daysBetween(start, end);
  if (!total || !start) return [];
  const dates: string[] = [];
  const current = new Date(`${start}T00:00:00`);
  for (let i = 0; i < total; i++) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export function brDate(value?: string) {
  if (!value) return '—';
  const [y, m, d] = value.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : value;
}

export function money(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

export function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function getShutdownName(data: AppData, id?: ID) {
  const sd = data.shutdowns.find((s) => s.id === id);
  return sd ? `${sd.code} · ${sd.fpso}` : 'Sem vínculo';
}

export function makeAudit(entity: string, entityId: string, action: string, description: string): AuditLog {
  return { id: uuid(), entity, entityId, action, userName: 'Usuário atual', at: now(), description };
}

export function teamCost(member: TeamMember) {
  return daysBetween(member.arrivalDate, member.departureDate) * Number(member.dayRate || 0);
}

export function computeHistogram(data: AppData) {
  const rows: Array<{ date: string; total: number; cost: number; byRole: Record<string, number> }> = [];
  const map = new Map<string, { date: string; total: number; cost: number; byRole: Record<string, number> }>();
  data.team.forEach((member) => {
    dateRange(member.arrivalDate, member.departureDate).forEach((date) => {
      const row = map.get(date) ?? { date, total: 0, cost: 0, byRole: {} };
      row.total += 1;
      row.cost += Number(member.dayRate || 0);
      row.byRole[member.role] = (row.byRole[member.role] ?? 0) + 1;
      map.set(date, row);
    });
  });
  Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date)).forEach((r) => rows.push(r));
  return rows;
}

export function computePendencies(data: AppData) {
  const items: Array<{ id: string; severity: 'Baixa' | 'Média' | 'Alta' | 'Crítica'; module: string; shutdownId?: string; title: string; detail: string; responsible?: string }> = [];
  const todayDate = today();
  data.shutdowns.forEach((sd) => {
    const links = data.poBsps.filter((p) => p.shutdownId === sd.id);
    if (!links.some((p) => p.po)) items.push({ id: `po-${sd.id}`, severity: 'Alta', module: 'PO/BSP', shutdownId: sd.id, title: 'Shutdown sem PO', detail: `${sd.code} ainda não possui PO vinculado.`, responsible: sd.pm });
    if (!links.some((p) => p.bsp)) items.push({ id: `bsp-${sd.id}`, severity: 'Alta', module: 'PO/BSP', shutdownId: sd.id, title: 'Shutdown sem BSP', detail: `${sd.code} ainda não possui BSP vinculado.`, responsible: sd.pm });
    if (!sd.startDate || !sd.endDate) items.push({ id: `date-${sd.id}`, severity: 'Crítica', module: 'Shutdowns', shutdownId: sd.id, title: 'Data obrigatória ausente', detail: 'Início ou término não preenchido.', responsible: sd.pm });
    if (sd.startDate && sd.startDate < todayDate && !['Concluído', 'Cancelado'].includes(sd.status)) items.push({ id: `late-${sd.id}`, severity: 'Média', module: 'Shutdowns', shutdownId: sd.id, title: 'Projeto com início vencido', detail: `${sd.code} tem início em ${brDate(sd.startDate)} e não está concluído.`, responsible: sd.pm });
  });
  data.team.forEach((m) => {
    if (!m.arrivalDate || !m.departureDate) items.push({ id: `team-date-${m.id}`, severity: 'Média', module: 'POB', shutdownId: m.shutdownId, title: 'POB sem data completa', detail: `${m.name} está sem chegada ou saída.`, responsible: 'Operações' });
    if (!m.name || m.name.toLowerCase().includes('profissional')) items.push({ id: `team-name-${m.id}`, severity: 'Baixa', module: 'POB', shutdownId: m.shutdownId, title: 'Equipe com nome provisório', detail: `${m.role} ainda precisa de nomeação definitiva.`, responsible: 'RH / Operações' });
  });
  data.tools.forEach((t) => {
    if (!t.unit) items.push({ id: `tool-unit-${t.id}`, severity: 'Baixa', module: 'Ferramental', shutdownId: t.shutdownId, title: 'Ferramental sem unidade', detail: `${t.item} está sem unidade padrão.`, responsible: t.responsible });
    if (['Pendente', 'Não iniciado'].includes(t.status)) items.push({ id: `tool-pending-${t.id}`, severity: 'Média', module: 'Ferramental', shutdownId: t.shutdownId, title: 'Ferramental pendente', detail: `${t.item} ainda está com status ${t.status}.`, responsible: t.responsible });
  });
  data.progress.forEach((p) => {
    if (p.status !== 'Concluído' && p.plannedDate && p.plannedDate < todayDate) items.push({ id: `progress-late-${p.id}`, severity: 'Alta', module: 'Avanços', shutdownId: p.shutdownId, title: 'Etapa atrasada', detail: `${p.stage} venceu em ${brDate(p.plannedDate)}.`, responsible: p.responsible });
  });
  return items;
}

export function downloadBlob(content: BlobPart, filename: string, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
