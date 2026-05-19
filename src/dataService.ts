import type { AppData, DataTableName } from './types';
import { emptyData, sampleData } from './sampleData';
import { supabase, supabaseConfigured } from './supabaseClient';

// v3 força uma nova carga no navegador e evita reaproveitar caches antigos vazios.
const STORAGE_KEY = 'step_shutdown_control_data_v3_imported_resilient_2026';
const LEGACY_KEYS = [
  'step_shutdown_control_data',
  'step_shutdown_control_data_v2_imported_2026',
];

const tableMap: Record<keyof AppData, string> = {
  shutdowns: 'shutdowns',
  phases: 'shutdown_phases',
  poBsps: 'shutdown_po_bsp',
  team: 'shutdown_team',
  tools: 'shutdown_tools',
  progress: 'shutdown_progress',
  users: 'app_users',
  auditLogs: 'audit_logs',
};

const toDb = (row: any) => {
  const out: any = {};
  Object.entries(row).forEach(([key, value]) => {
    const snake = key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
    out[snake] = value;
  });
  return out;
};

const fromDb = (row: any) => {
  const out: any = {};
  Object.entries(row ?? {}).forEach(([key, value]) => {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = value;
  });
  return out;
};

function hasCoreData(data: AppData) {
  return Boolean(
    data.shutdowns?.length ||
    data.team?.length ||
    data.tools?.length ||
    data.phases?.length ||
    data.poBsps?.length ||
    data.progress?.length
  );
}

function normalized(data: Partial<AppData> | null | undefined): AppData {
  return { ...emptyData, ...(data ?? {}) } as AppData;
}

function seedLocal(): AppData {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleData));
  return sampleData;
}

function readLocal(): AppData {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = normalized(JSON.parse(raw));
      if (hasCoreData(parsed)) return parsed;
    } catch (err) {
      console.warn('Cache local inválido. Recarregando carga importada.', err);
    }
  }

  // Tenta aproveitar caches antigos somente se tiverem dados reais.
  for (const key of LEGACY_KEYS) {
    const legacy = localStorage.getItem(key);
    if (!legacy) continue;
    try {
      const parsed = normalized(JSON.parse(legacy));
      if (hasCoreData(parsed)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        return parsed;
      }
    } catch {
      // ignora cache antigo inválido
    }
  }

  return seedLocal();
}

function writeLocal(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized(data)));
}

async function trySaveRemote(data: AppData): Promise<boolean> {
  if (!supabaseConfigured || !supabase) return false;
  try {
    for (const key of Object.keys(tableMap) as Array<keyof AppData>) {
      const table = tableMap[key];
      const rows = ((data[key] as any[]) ?? []).map(toDb);
      if (rows.length) {
        const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
        if (error) throw error;
      }
    }
    return true;
  } catch (err) {
    console.warn('Supabase indisponível ou schema incompleto. Dados preservados localmente.', err);
    return false;
  }
}

async function tryRemoveRemote<T extends DataTableName>(table: T, id: string): Promise<boolean> {
  if (!supabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase.from(tableMap[table]).delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('Não foi possível remover no Supabase. Remoção mantida localmente.', err);
    return false;
  }
}

export const dataService = {
  supabaseConfigured,

  async loadAll(): Promise<AppData> {
    const localFallback = readLocal();

    // Se não tiver Supabase, usa a carga importada imediatamente.
    if (!supabaseConfigured || !supabase) return localFallback;

    try {
      const next: AppData = { ...emptyData };
      for (const key of Object.keys(tableMap) as Array<keyof AppData>) {
        const { data, error } = await supabase
          .from(tableMap[key])
          .select('*')
          .order('created_at', { ascending: false, nullsFirst: false });
        if (error) throw error;
        (next as any)[key] = (data ?? []).map(fromDb);
      }

      // Supabase acessível, mas vazio: mostra a carga importada e tenta semear o banco em segundo plano.
      if (!hasCoreData(next)) {
        trySaveRemote(localFallback).catch(() => undefined);
        return localFallback;
      }

      writeLocal(next);
      return next;
    } catch (err) {
      // Ponto principal da correção: erro de rede / TypeError Failed to fetch não pode zerar o painel.
      console.warn('Falha ao consultar Supabase. Usando carga importada/local.', err);
      return localFallback;
    }
  },

  async saveAll(data: AppData): Promise<void> {
    writeLocal(data);
    await trySaveRemote(data);
  },

  async upsert<T extends DataTableName>(table: T, row: AppData[T][number]) {
    writeLocal({ ...readLocal(), [table]: [row, ...(readLocal()[table] as any[]).filter((r: any) => r.id !== (row as any).id)] } as AppData);
    if (!supabaseConfigured || !supabase) return;
    try {
      const { error } = await supabase.from(tableMap[table]).upsert(toDb(row), { onConflict: 'id' });
      if (error) throw error;
    } catch (err) {
      console.warn('Não foi possível sincronizar registro no Supabase. Registro preservado localmente.', err);
    }
  },

  async remove<T extends DataTableName>(table: T, id: string) {
    await tryRemoveRemote(table, id);
  },

  resetLocalDemo() {
    return seedLocal();
  },

  clearLocal() {
    writeLocal(emptyData);
    return emptyData;
  },
};
