import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Database,
  Download,
  Edit3,
  FileSpreadsheet,
  Filter,
  HardHat,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Package,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  Shield,
  Trash2,
  Upload,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import './styles.css';
import type { AppData, AppRole, DataTableName, Shutdown, ShutdownStatus } from './types';
import { emptyData } from './sampleData';
import { dataService } from './dataService';
import { exportFullWorkbook, exportModule, readExcel } from './excel';
import {
  brDate,
  computeHistogram,
  computePendencies,
  daysBetween,
  getShutdownName,
  makeAudit,
  money,
  now,
  teamCost,
  today,
  uuid,
} from './utils';

type PageKey =
  | 'dashboard'
  | 'shutdowns'
  | 'calendar'
  | 'poBsp'
  | 'team'
  | 'histogram'
  | 'tools'
  | 'progress'
  | 'costs'
  | 'pendencies'
  | 'reports'
  | 'users'
  | 'settings';

type FieldConfig = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'textarea' | 'select' | 'checkbox';
  options?: string[];
  required?: boolean;
  span?: 1 | 2;
};

const statusOptions: ShutdownStatus[] = ['Planejado', 'Em preparação', 'Aguardando PO', 'Aguardando BSP', 'Em mobilização', 'Em execução', 'Concluído', 'On Hold', 'Cancelado'];
const commonStatusOptions = ['Não iniciado', 'Em andamento', 'Aguardando cliente', 'Aguardando terceiro', 'Concluído', 'Atrasado', 'Cancelado'];

const navItems: Array<{ key: PageKey; label: string; icon: any }> = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'shutdowns', label: 'Shutdowns', icon: HardHat },
  { key: 'calendar', label: 'Calendário', icon: CalendarDays },
  { key: 'poBsp', label: 'PO / BSP', icon: ClipboardList },
  { key: 'team', label: 'POB / Equipe', icon: Users },
  { key: 'histogram', label: 'Histograma', icon: BarChart3 },
  { key: 'tools', label: 'Ferramental', icon: Wrench },
  { key: 'progress', label: 'Avanços', icon: ListChecks },
  { key: 'costs', label: 'Custos', icon: FileSpreadsheet },
  { key: 'pendencies', label: 'Pendências', icon: AlertTriangle },
  { key: 'reports', label: 'Relatórios', icon: Download },
  { key: 'users', label: 'Usuários', icon: Shield },
  { key: 'settings', label: 'Configurações', icon: Settings },
];

const fields: Record<string, FieldConfig[]> = {
  shutdowns: [
    { key: 'code', label: 'Código', required: true },
    { key: 'client', label: 'Cliente', required: true },
    { key: 'fpso', label: 'FPSO / Unidade', required: true },
    { key: 'pm', label: 'PM responsável' },
    { key: 'responsible', label: 'Responsável técnico' },
    { key: 'activity', label: 'Atividade / Escopo', span: 2 },
    { key: 'type', label: 'Tipo', type: 'select', options: ['Shutdown', 'Garantia', 'Campanha', 'Survey'] },
    { key: 'startDate', label: 'Início previsto', type: 'date' },
    { key: 'endDate', label: 'Término previsto', type: 'date' },
    { key: 'days', label: 'Dias', type: 'number' },
    { key: 'status', label: 'Status', type: 'select', options: statusOptions },
    { key: 'priority', label: 'Prioridade', type: 'select', options: ['Baixa', 'Normal', 'Alta', 'Crítica'] },
    { key: 'notes', label: 'Observações', type: 'textarea', span: 2 },
  ],
  phases: [
    { key: 'shutdownId', label: 'Shutdown', type: 'select', required: true },
    { key: 'name', label: 'Fase', type: 'select', options: ['Survey', 'Técnico Materiais ARM', 'ARM', 'Campanha Shutdown', 'Pré-Shutdown', 'Shutdown', 'Pós-Shutdown', 'Férias', 'Mobilização', 'Desmobilização'] },
    { key: 'responsible', label: 'Responsável' },
    { key: 'startDate', label: 'Início', type: 'date' },
    { key: 'endDate', label: 'Fim', type: 'date' },
    { key: 'status', label: 'Status', type: 'select', options: commonStatusOptions },
    { key: 'progress', label: 'Percentual', type: 'number' },
    { key: 'notes', label: 'Observações', type: 'textarea', span: 2 },
  ],
  poBsps: [
    { key: 'shutdownId', label: 'Shutdown', type: 'select', required: true },
    { key: 'po', label: 'PO' },
    { key: 'bsp', label: 'BSP' },
    { key: 'bpp', label: 'BPP' },
    { key: 'type', label: 'Tipo', type: 'select', options: ['Shutdown', 'Garantia'] },
    { key: 'status', label: 'Status', type: 'select', options: ['Pendente', 'Solicitado', 'Recebido', 'Em análise', 'Aprovado', 'Cancelado'] },
    { key: 'responsible', label: 'Responsável' },
    { key: 'issueDate', label: 'Emissão', type: 'date' },
    { key: 'receivedDate', label: 'Recebimento', type: 'date' },
    { key: 'notes', label: 'Observações', type: 'textarea', span: 2 },
  ],
  team: [
    { key: 'shutdownId', label: 'Shutdown', type: 'select', required: true },
    { key: 'name', label: 'Nome', required: true },
    { key: 'cpf', label: 'CPF' },
    { key: 'company', label: 'Empresa' },
    { key: 'role', label: 'Função', type: 'select', options: ['Supervisor', 'Mechanic', 'Welder', 'Welding Inspector', 'Phased Array Inspector', 'IRATA N1', 'IRATA N2', 'IRATA N3', 'Habitat', 'Técnico de Materiais', 'Outro'] },
    { key: 'scope', label: 'Escopo', type: 'select', options: ['Shutdown Period', 'R&L Campaign', 'Survey', 'ARM', 'Scaffolding', '6" FG line scope', 'Outro'] },
    { key: 'flight', label: 'Voo' },
    { key: 'shift', label: 'Turno', type: 'select', options: ['Dia', 'Noite', '12x12', 'Sob demanda'] },
    { key: 'arrivalDate', label: 'Chegada', type: 'date' },
    { key: 'departureDate', label: 'Saída', type: 'date' },
    { key: 'status', label: 'Status', type: 'select', options: ['Planejado', 'Nomeado', 'Aguardando documentação', 'Aguardando voo', 'Embarcado', 'Desembarcado', 'Cancelado', 'Substituído'] },
    { key: 'dayRate', label: 'Day Rate', type: 'number' },
    { key: 'notes', label: 'Observações', type: 'textarea', span: 2 },
  ],
  tools: [
    { key: 'shutdownId', label: 'Shutdown', type: 'select', required: true },
    { key: 'item', label: 'Item / Ferramenta', required: true, span: 2 },
    { key: 'category', label: 'Categoria', type: 'select', options: ['Ferramentas Manuais', 'Içamento', 'EPI', 'Consumíveis', 'Gases', 'Equipamentos', 'Instrumentos', 'Outros'] },
    { key: 'quantity', label: 'Quantidade', type: 'number' },
    { key: 'unit', label: 'Unidade' },
    { key: 'status', label: 'Status', type: 'select', options: ['Não iniciado', 'Em separação', 'Separado', 'Pendente', 'Enviado', 'Recebido offshore', 'Cancelado'] },
    { key: 'needDate', label: 'Data necessária', type: 'date' },
    { key: 'separationDate', label: 'Separação', type: 'date' },
    { key: 'sendDate', label: 'Envio', type: 'date' },
    { key: 'responsible', label: 'Responsável' },
    { key: 'notes', label: 'Observações', type: 'textarea', span: 2 },
  ],
  progress: [
    { key: 'shutdownId', label: 'Shutdown', type: 'select', required: true },
    { key: 'stage', label: 'Etapa', type: 'select', options: ['Survey', 'Lista Ferramental', 'Equipe ARM', 'Fabricação', 'DOC IEIS/EPS', 'Nomeação Equipe', 'Embarque Habitat', 'Embarque Ferramental', 'Embarque Equipe', 'Execução', 'Pós-Shutdown'] },
    { key: 'status', label: 'Status', type: 'select', options: commonStatusOptions },
    { key: 'percent', label: 'Percentual', type: 'number' },
    { key: 'plannedDate', label: 'Data prevista', type: 'date' },
    { key: 'actualDate', label: 'Data realizada', type: 'date' },
    { key: 'responsible', label: 'Responsável' },
    { key: 'notes', label: 'Observações', type: 'textarea', span: 2 },
  ],
  users: [
    { key: 'name', label: 'Nome', required: true },
    { key: 'email', label: 'E-mail', required: true },
    { key: 'role', label: 'Perfil', type: 'select', options: ['Administrador', 'Planejamento', 'Suprimentos', 'Operação', 'Cliente', 'Visualizador'] },
    { key: 'sector', label: 'Setor' },
    { key: 'active', label: 'Ativo', type: 'checkbox' },
  ],
};

const tableLabels: Record<string, string> = {
  shutdowns: 'Shutdowns',
  phases: 'Calendário / Fases',
  poBsps: 'PO / BSP',
  team: 'POB / Equipe',
  tools: 'Ferramental',
  progress: 'Avanços',
  users: 'Usuários',
};

const moduleDescriptions: Record<string, string> = {
  shutdowns: 'Cadastro central dos projetos, substituindo a planilha Avanços SD 2026.',
  phases: 'Cronograma/Gantt com fases por shutdown, substituindo as planilhas de calendário.',
  poBsps: 'Controle contratual de PO, BSP e BPP por unidade, cliente e projeto.',
  team: 'Cadastro de POB, equipe, chegada, saída, função, escopo e day rate.',
  tools: 'Controle de ferramental, materiais, unidade, quantidade, status e envio.',
  progress: 'Acompanhamento de etapas, percentuais, datas e responsáveis.',
  users: 'Gestão de perfis e permissões do sistema.',
};

function statusClass(value: string) {
  const v = value?.toLowerCase() ?? '';
  if (v.includes('conclu') || v.includes('aprov') || v.includes('recebido offshore') || v === 'enviado') return 'pill success';
  if (v.includes('atras') || v.includes('crítica') || v.includes('urgente') || v.includes('pendente')) return 'pill danger';
  if (v.includes('andamento') || v.includes('mobilização') || v.includes('separação') || v.includes('solicitado')) return 'pill warning';
  if (v.includes('hold') || v.includes('aguardando')) return 'pill purple';
  return 'pill neutral';
}

function currentUser(data: AppData) {
  return data.users.find((u) => u.email === 'douglasnoticias@gmail.com') ?? data.users[0];
}

function SideBar({ page, setPage }: { page: PageKey; setPage: (p: PageKey) => void }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">S</div>
        <div>
          <strong>STEP</strong>
          <span>Shutdown Control</span>
        </div>
      </div>
      <nav>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button className={page === item.key ? 'nav-item active' : 'nav-item'} onClick={() => setPage(item.key)} key={item.key}>
              <Icon size={18} />
              <span>{item.label}</span>
              {page === item.key && <ChevronRight size={14} className="nav-arrow" />}
            </button>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <Database size={14} />
        <span>{dataService.supabaseConfigured ? 'Supabase conectado' : 'Modo demonstração local'}</span>
      </div>
    </aside>
  );
}

function TopBar({ data, onExport, onSave }: { data: AppData; onExport: () => void; onSave: () => void }) {
  const user = currentUser(data);
  return (
    <header className="topbar">
      <div className="topbar-left">
        <p className="eyebrow">Sistema web para substituir planilhas</p>
        <strong>Gestão integrada de Shutdown Offshore</strong>
      </div>
      <div className="topbar-actions">
        <button className="btn ghost" onClick={onSave}><Save size={16} /> Salvar</button>
        <button className="btn primary" onClick={onExport}><Download size={16} /> Baixar Excel Geral</button>
        <div className="profile">
          <span>{user?.name?.slice(0, 1) ?? 'U'}</span>
          <div>
            <strong>{user?.name ?? 'Usuário'}</strong>
            <small>{user?.role ?? 'Administrador'}</small>
          </div>
        </div>
      </div>
    </header>
  );
}

function StatCard({ label, value, icon: Icon, tone, sub }: any) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone ?? ''}`}><Icon size={21} /></div>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
        {sub && <small>{sub}</small>}
      </div>
    </div>
  );
}

function ModalForm({ title, record, configs, shutdownOptions, onSave, onClose }: {
  title: string;
  record: any;
  configs: FieldConfig[];
  shutdownOptions: Array<{ label: string; value: string }>;
  onSave: (record: any) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<any>({ ...record });
  const set = (key: string, value: any) => setForm((prev: any) => ({ ...prev, [key]: value }));
  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Edição no painel</p>
            <h2>{title}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="form-grid">
          {configs.map((field) => {
            const type = field.type ?? 'text';
            const opts = field.key === 'shutdownId' ? shutdownOptions.map((o) => o.value) : field.options;
            return (
              <label key={field.key} className={field.span === 2 ? 'span-2' : ''}>
                <span>{field.label}{field.required ? ' *' : ''}</span>
                {type === 'textarea' ? (
                  <textarea value={form[field.key] ?? ''} onChange={(e) => set(field.key, e.target.value)} />
                ) : type === 'select' ? (
                  <select value={form[field.key] ?? ''} onChange={(e) => set(field.key, e.target.value)}>
                    <option value="">Selecione</option>
                    {(opts ?? []).map((option) => {
                      const label = field.key === 'shutdownId' ? (shutdownOptions.find((o) => o.value === option)?.label ?? option) : option;
                      return <option key={option} value={option}>{label}</option>;
                    })}
                  </select>
                ) : type === 'checkbox' ? (
                  <div className="check-row"><input type="checkbox" checked={Boolean(form[field.key])} onChange={(e) => set(field.key, e.target.checked)} /> Ativo</div>
                ) : (
                  <input type={type} value={form[field.key] ?? ''} onChange={(e) => set(field.key, type === 'number' ? Number(e.target.value) : e.target.value)} />
                )}
              </label>
            );
          })}
        </div>
        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={() => onSave(form)}><Save size={16} /> Salvar registro</button>
        </div>
      </div>
    </div>
  );
}

function DataTable({ rows, columns, data, onEdit, onDelete, onDuplicate }: {
  rows: any[];
  columns: FieldConfig[];
  data: AppData;
  onEdit: (row: any) => void;
  onDelete: (row: any) => void;
  onDuplicate: (row: any) => void;
}) {
  const shown = columns.filter((c) => c.type !== 'textarea').slice(0, 8);
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {shown.map((c) => <th key={c.key}>{c.label}</th>)}
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={shown.length + 1} className="empty-cell">Nenhum registro encontrado.</td></tr>
          ) : rows.map((row) => (
            <tr key={row.id}>
              {shown.map((c) => {
                let value = row[c.key];
                if (c.key === 'shutdownId') value = getShutdownName(data, value);
                if (String(c.key).toLowerCase().includes('date') && value) value = brDate(value);
                const isStatus = c.key.toLowerCase().includes('status') || c.key === 'priority';
                return <td key={c.key}>{isStatus ? <span className={statusClass(String(value))}>{String(value || '—')}</span> : String(value ?? '—')}</td>;
              })}
              <td>
                <div className="row-actions">
                  <button className="icon-btn" title="Editar" onClick={() => onEdit(row)}><Edit3 size={15} /></button>
                  <button className="icon-btn" title="Duplicar" onClick={() => onDuplicate(row)}><Plus size={15} /></button>
                  <button className="icon-btn danger" title="Excluir" onClick={() => onDelete(row)}><Trash2 size={15} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CrudPage({ table, data, setData, title, description, moduleKey }: {
  table: DataTableName;
  data: AppData;
  setData: (d: AppData) => void;
  title: string;
  description: string;
  moduleKey?: keyof AppData;
}) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<any | null>(null);
  const [filterShutdown, setFilterShutdown] = useState('todos');
  const fileRef = useRef<HTMLInputElement | null>(null);
  const configs = fields[String(table)] ?? [];
  const rows = (data[table] as any[]) ?? [];
  const shutdownOptions = data.shutdowns.map((s) => ({ value: s.id, label: `${s.code} · ${s.fpso}` }));
  const filtered = rows.filter((r) => {
    const text = JSON.stringify(r).toLowerCase();
    const byText = !query || text.includes(query.toLowerCase());
    const byShutdown = filterShutdown === 'todos' || r.shutdownId === filterShutdown;
    return byText && byShutdown;
  });
  const newBase = () => {
    const base: any = { id: uuid(), createdAt: now(), updatedAt: now() };
    configs.forEach((f) => {
      if (f.type === 'number') base[f.key] = 0;
      else if (f.type === 'checkbox') base[f.key] = true;
      else if (f.type === 'select') base[f.key] = f.key === 'shutdownId' ? (data.shutdowns[0]?.id ?? '') : (f.options?.[0] ?? '');
      else base[f.key] = '';
    });
    if (table === 'shutdowns') {
      base.status = 'Planejado';
      base.priority = 'Normal';
      base.type = 'Shutdown';
    }
    return base;
  };
  const persistRows = async (nextRows: any[], audit: any) => {
    const next: AppData = { ...data, [table]: nextRows, auditLogs: [audit, ...data.auditLogs] } as AppData;
    setData(next);
    await dataService.saveAll(next);
  };
  const handleSave = async (record: any) => {
    const nextRecord = { ...record, updatedAt: now() };
    if (table === 'shutdowns') nextRecord.days = daysBetween(nextRecord.startDate, nextRecord.endDate) || nextRecord.days || 0;
    const exists = rows.some((r) => r.id === nextRecord.id);
    const nextRows = exists ? rows.map((r) => (r.id === nextRecord.id ? nextRecord : r)) : [nextRecord, ...rows];
    await persistRows(nextRows, makeAudit(String(table), nextRecord.id, exists ? 'Edição' : 'Cadastro', `${tableLabels[String(table)]} atualizado pelo painel.`));
    setEditing(null);
  };
  const handleDelete = async (row: any) => {
    if (!confirm('Deseja realmente excluir este registro?')) return;
    const nextRows = rows.filter((r) => r.id !== row.id);
    const next: AppData = { ...data, [table]: nextRows, auditLogs: [makeAudit(String(table), row.id, 'Exclusão', 'Registro removido pelo painel.'), ...data.auditLogs] } as AppData;
    setData(next);
    await dataService.remove(table, row.id);
    await dataService.saveAll(next);
  };
  const handleDuplicate = (row: any) => {
    setEditing({ ...row, id: uuid(), code: row.code ? `${row.code}-COPY` : row.code, createdAt: now(), updatedAt: now() });
  };
  const handleImport = async (file?: File) => {
    if (!file) return;
    const imported = await readExcel(file);
    const mapped = imported.map((raw: any) => {
      const record = newBase();
      configs.forEach((field) => {
        const found = Object.entries(raw).find(([key]) => key.toLowerCase().replace(/[^a-z0-9]/g, '') === field.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '') || key === field.key);
        if (found) record[field.key] = found[1];
      });
      return { ...record, id: uuid(), createdAt: now(), updatedAt: now() };
    });
    const nextRows = [...mapped, ...rows];
    await persistRows(nextRows, makeAudit(String(table), 'import', 'Importação Excel', `${mapped.length} registros importados para ${title}.`));
    if (fileRef.current) fileRef.current.value = '';
  };
  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <p className="eyebrow">Módulo operacional</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="page-actions">
          <button className="btn ghost" onClick={() => fileRef.current?.click()}><Upload size={16} /> Importar Excel</button>
          <button className="btn ghost" onClick={() => exportModule(data, moduleKey ?? table, `step-${String(table)}.xlsx`)}><Download size={16} /> Baixar Excel</button>
          <button className="btn primary" onClick={() => setEditing(newBase())}><Plus size={16} /> Novo</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => handleImport(e.target.files?.[0])} />
        </div>
      </div>
      <div className="toolbar">
        <div className="search-box"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar em todos os campos..." /></div>
        {table !== 'shutdowns' && table !== 'users' && (
          <select value={filterShutdown} onChange={(e) => setFilterShutdown(e.target.value)}>
            <option value="todos">Todos os shutdowns</option>
            {shutdownOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        )}
        <span className="toolbar-count"><Filter size={14} /> {filtered.length} de {rows.length} registros</span>
      </div>
      <DataTable rows={filtered} columns={configs} data={data} onEdit={setEditing} onDelete={handleDelete} onDuplicate={handleDuplicate} />
      {editing && <ModalForm title={title} record={editing} configs={configs} shutdownOptions={shutdownOptions} onSave={handleSave} onClose={() => setEditing(null)} />}
    </section>
  );
}

function Dashboard({ data, setPage }: { data: AppData; setPage: (p: PageKey) => void }) {
  const pend = computePendencies(data);
  const histogram = computeHistogram(data);
  const totalCost = data.team.reduce((sum, m) => sum + teamCost(m), 0);
  const byMonth = data.shutdowns.reduce((acc: Record<string, number>, sd) => {
    const key = sd.startDate?.slice(0, 7) || 'Sem data';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const statusData = statusOptions.map((s) => ({ name: s, value: data.shutdowns.filter((d) => d.status === s).length })).filter((r) => r.value > 0);
  const cards = [
    { label: 'Shutdowns', value: data.shutdowns.length, icon: HardHat, tone: 'blue', sub: 'projetos cadastrados' },
    { label: 'Em andamento', value: data.shutdowns.filter((s) => ['Em preparação', 'Em mobilização', 'Em execução'].includes(s.status)).length, icon: Clock, tone: 'amber', sub: 'ativos no painel' },
    { label: 'POB planejado', value: data.team.length, icon: Users, tone: 'green', sub: 'pessoas cadastradas' },
    { label: 'Pendências', value: pend.length, icon: AlertTriangle, tone: 'red', sub: 'geradas automaticamente' },
    { label: 'Ferramental', value: data.tools.length, icon: Wrench, tone: 'purple', sub: 'itens controlados' },
    { label: 'Custo previsto', value: money(totalCost), icon: FileSpreadsheet, tone: 'cyan', sub: 'base day rate' },
  ];
  return (
    <section className="dashboard">
      <div className="page-header">
        <div>
          <p className="eyebrow">Visão executiva</p>
          <h1>Dashboard Geral</h1>
          <p>Controle consolidado de shutdowns, POB, ferramental, PO/BSP, avanços, custos e pendências.</p>
        </div>
        <div className="page-actions">
          <button className="btn ghost" onClick={() => setPage('pendencies')}><AlertTriangle size={16} /> Ver pendências</button>
          <button className="btn primary" onClick={() => setPage('shutdowns')}><Plus size={16} /> Novo shutdown</button>
        </div>
      </div>
      <div className="stat-grid">{cards.map((card) => <StatCard key={card.label} {...card} />)}</div>
      <div className="grid two">
        <div className="panel">
          <h2>Shutdowns por mês</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={Object.entries(byMonth).map(([name, value]) => ({ name, value }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.15)" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="currentColor" className="chart-bar" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="panel">
          <h2>Status geral</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={90} label>
                {statusData.map((_, index) => <Cell key={index} fill={['#22c55e', '#38bdf8', '#f59e0b', '#a78bfa', '#ef4444', '#14b8a6'][index % 6]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid two">
        <div className="panel">
          <h2>Histograma diário de POB</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={histogram}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.15)" />
              <XAxis dataKey="date" tickFormatter={(v) => brDate(v).slice(0, 5)} />
              <YAxis allowDecimals={false} />
              <Tooltip labelFormatter={(v) => brDate(String(v))} />
              <Line type="monotone" dataKey="total" stroke="#38bdf8" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="panel">
          <h2>Pendências críticas</h2>
          <div className="mini-list">
            {pend.slice(0, 8).map((p) => (
              <div className="mini-item" key={p.id}>
                <span className={statusClass(p.severity)}>{p.severity}</span>
                <div><strong>{p.title}</strong><small>{p.detail}</small></div>
              </div>
            ))}
            {!pend.length && <div className="empty-card"><CheckCircle2 /> Nenhuma pendência encontrada.</div>}
          </div>
        </div>
      </div>
    </section>
  );
}

function CalendarGantt({ data }: { data: AppData }) {
  const rows = [...data.phases].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const min = rows[0]?.startDate || today();
  const max = rows.reduce((m, r) => (r.endDate > m ? r.endDate : m), min);
  const total = Math.max(daysBetween(min, max), 1);
  return (
    <div className="panel gantt-panel">
      <h2>Gantt visual</h2>
      <div className="gantt">
        {rows.map((p) => {
          const left = (daysBetween(min, p.startDate) - 1) / total * 100;
          const width = Math.max(daysBetween(p.startDate, p.endDate) / total * 100, 2);
          return (
            <div className="gantt-row" key={p.id}>
              <div className="gantt-label"><strong>{p.name}</strong><small>{getShutdownName(data, p.shutdownId)}</small></div>
              <div className="gantt-track">
                <div className="gantt-bar" style={{ left: `${Math.max(left, 0)}%`, width: `${width}%` }}>
                  <span>{p.progress}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HistogramPage({ data }: { data: AppData }) {
  const rows = computeHistogram(data);
  return (
    <section className="page-section">
      <div className="page-header">
        <div><p className="eyebrow">POB automático</p><h1>Histograma</h1><p>Gerado automaticamente a partir da chegada, saída, função e day rate do módulo POB / Equipe.</p></div>
        <div className="page-actions"><button className="btn ghost" onClick={() => exportModule(data, 'histogram', 'step-histograma.xlsx')}><Download size={16} /> Baixar Excel</button></div>
      </div>
      <div className="panel">
        <ResponsiveContainer width="100%" height={310}>
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.15)" />
            <XAxis dataKey="date" tickFormatter={(v) => brDate(v).slice(0, 5)} />
            <YAxis allowDecimals={false} />
            <Tooltip labelFormatter={(v) => brDate(String(v))} />
            <Bar dataKey="total" fill="#38bdf8" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="table-wrap"><table><thead><tr><th>Data</th><th>POB</th><th>Custo diário</th><th>Funções</th></tr></thead><tbody>{rows.map((r) => <tr key={r.date}><td>{brDate(r.date)}</td><td>{r.total}</td><td>{money(r.cost)}</td><td>{Object.entries(r.byRole).map(([k, v]) => `${k}: ${v}`).join(' | ')}</td></tr>)}</tbody></table></div>
    </section>
  );
}

function CostsPage({ data }: { data: AppData }) {
  const rows = data.team.map((m) => ({ ...m, shutdown: getShutdownName(data, m.shutdownId), days: daysBetween(m.arrivalDate, m.departureDate), cost: teamCost(m) }));
  const total = rows.reduce((s, r) => s + r.cost, 0);
  return (
    <section className="page-section">
      <div className="page-header">
        <div><p className="eyebrow">Day Rate</p><h1>Custos</h1><p>Custo previsto por pessoa, função, projeto e período.</p></div>
        <div className="page-actions"><button className="btn ghost" onClick={() => exportModule(data, 'costs', 'step-custos.xlsx')}><Download size={16} /> Baixar Excel</button></div>
      </div>
      <div className="stat-grid"><StatCard label="Custo previsto total" value={money(total)} icon={FileSpreadsheet} tone="cyan" /><StatCard label="Média por pessoa" value={money(total / Math.max(rows.length, 1))} icon={Users} tone="blue" /><StatCard label="POB cadastrado" value={rows.length} icon={HardHat} tone="green" /></div>
      <div className="table-wrap"><table><thead><tr><th>Shutdown</th><th>Nome</th><th>Função</th><th>Chegada</th><th>Saída</th><th>Dias</th><th>Day Rate</th><th>Custo</th></tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td>{r.shutdown}</td><td>{r.name}</td><td>{r.role}</td><td>{brDate(r.arrivalDate)}</td><td>{brDate(r.departureDate)}</td><td>{r.days}</td><td>{money(r.dayRate)}</td><td>{money(r.cost)}</td></tr>)}</tbody></table></div>
    </section>
  );
}

function PendenciesPage({ data }: { data: AppData }) {
  const rows = computePendencies(data);
  return (
    <section className="page-section">
      <div className="page-header">
        <div><p className="eyebrow">Controle automático</p><h1>Pendências</h1><p>Itens gerados automaticamente a partir de datas, campos obrigatórios, PO/BSP, POB, ferramental e avanços.</p></div>
        <div className="page-actions"><button className="btn ghost" onClick={() => exportModule(data, 'pendencies', 'step-pendencias.xlsx')}><Download size={16} /> Baixar Excel</button></div>
      </div>
      <div className="table-wrap"><table><thead><tr><th>Criticidade</th><th>Módulo</th><th>Shutdown</th><th>Pendência</th><th>Detalhe</th><th>Responsável</th></tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td><span className={statusClass(r.severity)}>{r.severity}</span></td><td>{r.module}</td><td>{getShutdownName(data, r.shutdownId)}</td><td>{r.title}</td><td>{r.detail}</td><td>{r.responsible}</td></tr>)}</tbody></table></div>
    </section>
  );
}

function ReportsPage({ data }: { data: AppData }) {
  const reports = [
    { title: 'Excel completo do sistema', desc: 'Todas as abas consolidadas: shutdowns, calendário, PO/BSP, POB, histograma, ferramental, avanços, custos e pendências.', action: () => exportFullWorkbook(data) },
    { title: 'Resumo executivo', desc: 'Cadastro de shutdowns com status, cliente, unidade, datas e prioridades.', action: () => exportModule(data, 'shutdowns', 'resumo-executivo-shutdowns.xlsx') },
    { title: 'POB e custos', desc: 'Equipe, chegada, saída, função, day rate e custo previsto.', action: () => exportModule(data, 'team', 'pob-equipe.xlsx') },
    { title: 'Ferramental', desc: 'Lista de ferramentas e materiais por projeto, status, quantidade e envio.', action: () => exportModule(data, 'tools', 'ferramental.xlsx') },
    { title: 'Pendências críticas', desc: 'Lista de todas as pendências geradas automaticamente.', action: () => exportModule(data, 'pendencies', 'pendencias.xlsx') },
  ];
  return (
    <section className="page-section">
      <div className="page-header"><div><p className="eyebrow">Exportações</p><h1>Relatórios</h1><p>Todos os relatórios podem ser baixados em Excel para envio quando necessário.</p></div></div>
      <div className="report-grid">{reports.map((r) => <div className="report-card" key={r.title}><FileSpreadsheet size={28} /><h3>{r.title}</h3><p>{r.desc}</p><button className="btn primary" onClick={r.action}><Download size={16} /> Baixar Excel</button></div>)}</div>
    </section>
  );
}

function SettingsPage({ data, setData }: { data: AppData; setData: (d: AppData) => void }) {
  return (
    <section className="page-section">
      <div className="page-header"><div><p className="eyebrow">Administração</p><h1>Configurações</h1><p>Configuração de banco, modo de demonstração, backup e instruções de implantação.</p></div></div>
      <div className="grid two">
        <div className="panel"><h2>Status do banco</h2><p className="muted">{dataService.supabaseConfigured ? 'Supabase configurado. Os dados serão gravados no banco.' : 'Supabase não configurado. O sistema está usando localStorage como demonstração.'}</p><code>VITE_SUPABASE_URL<br />VITE_SUPABASE_ANON_KEY</code></div>
        <div className="panel"><h2>Ações locais</h2><div className="vertical-actions"><button className="btn ghost" onClick={() => { const reset = dataService.resetLocalDemo(); setData(reset); }}><RefreshCw size={16} /> Recarregar dados demo</button><button className="btn ghost danger-text" onClick={() => { if (confirm('Limpar dados locais?')) setData(dataService.clearLocal()); }}><Trash2 size={16} /> Limpar localStorage</button><button className="btn primary" onClick={() => exportFullWorkbook(data, 'backup-step-shutdown-control.xlsx')}><Download size={16} /> Gerar backup Excel</button></div></div>
      </div>
      <div className="panel"><h2>Como colocar no ar</h2><ol className="steps"><li>Crie um projeto no Supabase.</li><li>Execute o arquivo <strong>supabase/schema.sql</strong> no SQL Editor.</li><li>No Netlify, configure <strong>VITE_SUPABASE_URL</strong> e <strong>VITE_SUPABASE_ANON_KEY</strong>.</li><li>Suba o projeto no GitHub e conecte no Netlify.</li><li>Comando de build: <strong>npm run build</strong>; pasta publish: <strong>dist</strong>.</li></ol></div>
    </section>
  );
}

function App() {
  const [data, setData] = useState<AppData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<PageKey>('dashboard');
  const [error, setError] = useState('');

  useEffect(() => {
    dataService.loadAll()
      .then(setData)
      .catch((err) => setError(err.message ?? String(err)))
      .finally(() => setLoading(false));
  }, []);

  const saveAll = async () => {
    const next = { ...data, auditLogs: [makeAudit('Sistema', 'all', 'Salvamento manual', 'Usuário acionou salvar tudo.'), ...data.auditLogs] };
    setData(next);
    await dataService.saveAll(next);
    alert('Dados salvos com sucesso.');
  };

  const content = useMemo(() => {
    if (page === 'dashboard') return <Dashboard data={data} setPage={setPage} />;
    if (page === 'shutdowns') return <CrudPage table="shutdowns" data={data} setData={setData} title="Shutdowns" description={moduleDescriptions.shutdowns} />;
    if (page === 'calendar') return <><CrudPage table="phases" data={data} setData={setData} title="Calendário" description={moduleDescriptions.phases} /><CalendarGantt data={data} /></>;
    if (page === 'poBsp') return <CrudPage table="poBsps" data={data} setData={setData} title="PO / BSP" description={moduleDescriptions.poBsps} />;
    if (page === 'team') return <CrudPage table="team" data={data} setData={setData} title="POB / Equipe" description={moduleDescriptions.team} />;
    if (page === 'histogram') return <HistogramPage data={data} />;
    if (page === 'tools') return <CrudPage table="tools" data={data} setData={setData} title="Ferramental" description={moduleDescriptions.tools} />;
    if (page === 'progress') return <CrudPage table="progress" data={data} setData={setData} title="Avanços" description={moduleDescriptions.progress} />;
    if (page === 'costs') return <CostsPage data={data} />;
    if (page === 'pendencies') return <PendenciesPage data={data} />;
    if (page === 'reports') return <ReportsPage data={data} />;
    if (page === 'users') return <CrudPage table="users" data={data} setData={setData} title="Usuários" description={moduleDescriptions.users} />;
    if (page === 'settings') return <SettingsPage data={data} setData={setData} />;
    return null;
  }, [page, data]);

  if (loading) return <div className="loading"><div className="spinner" /> Carregando STEP Shutdown Control...</div>;
  return (
    <div className="app-shell">
      <SideBar page={page} setPage={setPage} />
      <main className="main-area">
        <TopBar data={data} onExport={() => exportFullWorkbook(data)} onSave={saveAll} />
        {error && <div className="error-banner"><AlertTriangle size={16} /> {error}</div>}
        <div className="content-area">{content}</div>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
