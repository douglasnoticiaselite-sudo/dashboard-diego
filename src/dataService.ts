import type { AppData, DataTableName } from './types';
import { emptyData, sampleData } from './sampleData';
import { supabase, supabaseConfigured } from './supabaseClient';

const STORAGE_KEY = 'step_shutdown_control_data_v2_imported_2026';

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
  return Boolean(data.shutdowns?.length || data.team?.length || data.tools?.length || data.phases?.length || data.poBsps?.length || data.progress?.length);
}

function readLocal(): AppData {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleData));
    return sampleData;
  }
  try {
    const parsed = { ...emptyData, ...JSON.parse(raw) } as AppData;
    if (!hasCoreData(parsed)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleData));
      return sampleData;
    }
    return parsed;
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleData));
    return sampleData;
  }
}

function writeLocal(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

async function saveRemote(data: AppData): Promise<void> {
  if (!supabaseConfigured || !supabase) return;
  for (const key of Object.keys(tableMap) as Array<keyof AppData>) {
    const table = tableMap[key];
    const rows = (data[key] as any[]).map(toDb);
    if (rows.length) {
      const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
      if (error) throw error;
    }
  }
}

export const dataService = {
  supabaseConfigured,

  async loadAll(): Promise<AppData> {
    if (!supabaseConfigured || !supabase) return readLocal();
    const next: AppData = { ...emptyData };
    for (const key of Object.keys(tableMap) as Array<keyof AppData>) {
      const { data, error } = await supabase.from(tableMap[key]).select('*').order('created_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      (next as any)[key] = (data ?? []).map(fromDb);
    }
    if (!hasCoreData(next)) {
      const fallback = readLocal();
      saveRemote(fallback).catch((err) => console.warn('Não foi possível semear o Supabase automaticamente:', err));
      return fallback;
    }
    return next;
  },

  async saveAll(data: AppData): Promise<void> {
    writeLocal(data);
    await saveRemote(data);
  },

  async upsert<T extends DataTableName>(table: T, row: AppData[T][number]) {
    if (!supabaseConfigured || !supabase) return;
    const { error } = await supabase.from(tableMap[table]).upsert(toDb(row), { onConflict: 'id' });
    if (error) throw error;
  },

  async remove<T extends DataTableName>(table: T, id: string) {
    if (!supabaseConfigured || !supabase) return;
    const { error } = await supabase.from(tableMap[table]).delete().eq('id', id);
    if (error) throw error;
  },

  resetLocalDemo() {
    writeLocal(sampleData);
    return sampleData;
  },

  clearLocal() {
    writeLocal(emptyData);
    return emptyData;
  },
};
