export type ID = string;

export type AppRole = 'Administrador' | 'Planejamento' | 'Suprimentos' | 'Operação' | 'Cliente' | 'Visualizador';

export type ShutdownStatus =
  | 'Planejado'
  | 'Em preparação'
  | 'Aguardando PO'
  | 'Aguardando BSP'
  | 'Em mobilização'
  | 'Em execução'
  | 'Concluído'
  | 'On Hold'
  | 'Cancelado';

export type Priority = 'Baixa' | 'Normal' | 'Alta' | 'Crítica';
export type CommonStatus = 'Não iniciado' | 'Em andamento' | 'Aguardando cliente' | 'Aguardando terceiro' | 'Concluído' | 'Atrasado' | 'Cancelado';

export interface Shutdown {
  id: ID;
  code: string;
  client: string;
  fpso: string;
  pm: string;
  responsible: string;
  activity: string;
  type: 'Shutdown' | 'Garantia' | 'Campanha' | 'Survey';
  startDate: string;
  endDate: string;
  days: number;
  status: ShutdownStatus;
  priority: Priority;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Phase {
  id: ID;
  shutdownId: ID;
  name: string;
  responsible: string;
  startDate: string;
  endDate: string;
  status: CommonStatus;
  progress: number;
  notes?: string;
}

export interface PoBsp {
  id: ID;
  shutdownId: ID;
  po: string;
  bsp: string;
  bpp?: string;
  type: 'Shutdown' | 'Garantia';
  status: 'Pendente' | 'Solicitado' | 'Recebido' | 'Em análise' | 'Aprovado' | 'Cancelado';
  responsible: string;
  issueDate?: string;
  receivedDate?: string;
  notes?: string;
}

export interface TeamMember {
  id: ID;
  shutdownId: ID;
  name: string;
  cpf?: string;
  company: string;
  role: string;
  scope: string;
  flight?: string;
  shift?: string;
  arrivalDate: string;
  departureDate: string;
  status: 'Planejado' | 'Nomeado' | 'Aguardando documentação' | 'Aguardando voo' | 'Embarcado' | 'Desembarcado' | 'Cancelado' | 'Substituído';
  dayRate: number;
  notes?: string;
}

export interface ToolItem {
  id: ID;
  shutdownId: ID;
  item: string;
  category: string;
  quantity: number;
  unit: string;
  status: 'Não iniciado' | 'Em separação' | 'Separado' | 'Pendente' | 'Enviado' | 'Recebido offshore' | 'Cancelado';
  needDate?: string;
  separationDate?: string;
  sendDate?: string;
  responsible?: string;
  notes?: string;
}

export interface ProgressItem {
  id: ID;
  shutdownId: ID;
  stage: string;
  status: CommonStatus;
  percent: number;
  plannedDate?: string;
  actualDate?: string;
  responsible?: string;
  notes?: string;
}

export interface UserProfile {
  id: ID;
  name: string;
  email: string;
  role: AppRole;
  sector?: string;
  active: boolean;
}

export interface AuditLog {
  id: ID;
  entity: string;
  entityId: string;
  action: string;
  userName: string;
  at: string;
  description: string;
}

export interface AppData {
  shutdowns: Shutdown[];
  phases: Phase[];
  poBsps: PoBsp[];
  team: TeamMember[];
  tools: ToolItem[];
  progress: ProgressItem[];
  users: UserProfile[];
  auditLogs: AuditLog[];
}

export type DataTableName = keyof AppData;
