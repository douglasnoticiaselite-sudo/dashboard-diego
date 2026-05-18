-- STEP Shutdown Control - Supabase schema
-- Execute este arquivo no SQL Editor do Supabase antes do deploy final.

create extension if not exists "pgcrypto";

create table if not exists public.shutdowns (
  id text primary key,
  code text not null,
  client text not null,
  fpso text not null,
  pm text,
  responsible text,
  activity text,
  type text default 'Shutdown',
  start_date date,
  end_date date,
  days integer default 0,
  status text default 'Planejado',
  priority text default 'Normal',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.shutdown_phases (
  id text primary key,
  shutdown_id text references public.shutdowns(id) on delete cascade,
  name text not null,
  responsible text,
  start_date date,
  end_date date,
  status text default 'Não iniciado',
  progress numeric default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.shutdown_po_bsp (
  id text primary key,
  shutdown_id text references public.shutdowns(id) on delete cascade,
  po text,
  bsp text,
  bpp text,
  type text default 'Shutdown',
  status text default 'Pendente',
  responsible text,
  issue_date date,
  received_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.shutdown_team (
  id text primary key,
  shutdown_id text references public.shutdowns(id) on delete cascade,
  name text not null,
  cpf text,
  company text,
  role text,
  scope text,
  flight text,
  shift text,
  arrival_date date,
  departure_date date,
  status text default 'Planejado',
  day_rate numeric default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.shutdown_tools (
  id text primary key,
  shutdown_id text references public.shutdowns(id) on delete cascade,
  item text not null,
  category text,
  quantity numeric default 0,
  unit text,
  status text default 'Não iniciado',
  need_date date,
  separation_date date,
  send_date date,
  responsible text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.shutdown_progress (
  id text primary key,
  shutdown_id text references public.shutdowns(id) on delete cascade,
  stage text not null,
  status text default 'Não iniciado',
  percent numeric default 0,
  planned_date date,
  actual_date date,
  responsible text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.app_users (
  id text primary key,
  name text not null,
  email text not null unique,
  role text default 'Visualizador',
  sector text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.audit_logs (
  id text primary key,
  entity text not null,
  entity_id text,
  action text not null,
  user_name text,
  at timestamptz default now(),
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_shutdowns_updated_at on public.shutdowns;
create trigger trg_shutdowns_updated_at before update on public.shutdowns for each row execute function public.set_updated_at();

drop trigger if exists trg_shutdown_phases_updated_at on public.shutdown_phases;
create trigger trg_shutdown_phases_updated_at before update on public.shutdown_phases for each row execute function public.set_updated_at();

drop trigger if exists trg_shutdown_po_bsp_updated_at on public.shutdown_po_bsp;
create trigger trg_shutdown_po_bsp_updated_at before update on public.shutdown_po_bsp for each row execute function public.set_updated_at();

drop trigger if exists trg_shutdown_team_updated_at on public.shutdown_team;
create trigger trg_shutdown_team_updated_at before update on public.shutdown_team for each row execute function public.set_updated_at();

drop trigger if exists trg_shutdown_tools_updated_at on public.shutdown_tools;
create trigger trg_shutdown_tools_updated_at before update on public.shutdown_tools for each row execute function public.set_updated_at();

drop trigger if exists trg_shutdown_progress_updated_at on public.shutdown_progress;
create trigger trg_shutdown_progress_updated_at before update on public.shutdown_progress for each row execute function public.set_updated_at();

drop trigger if exists trg_app_users_updated_at on public.app_users;
create trigger trg_app_users_updated_at before update on public.app_users for each row execute function public.set_updated_at();

-- Políticas simples para MVP: usuários autenticados podem operar tudo.
-- Para produção, refine por perfil em app_users.
alter table public.shutdowns enable row level security;
alter table public.shutdown_phases enable row level security;
alter table public.shutdown_po_bsp enable row level security;
alter table public.shutdown_team enable row level security;
alter table public.shutdown_tools enable row level security;
alter table public.shutdown_progress enable row level security;
alter table public.app_users enable row level security;
alter table public.audit_logs enable row level security;

do $$
declare
  tbl text;
begin
  foreach tbl in array array['shutdowns','shutdown_phases','shutdown_po_bsp','shutdown_team','shutdown_tools','shutdown_progress','app_users','audit_logs'] loop
    execute format('drop policy if exists "%s_select" on public.%I', tbl, tbl);
    execute format('drop policy if exists "%s_insert" on public.%I', tbl, tbl);
    execute format('drop policy if exists "%s_update" on public.%I', tbl, tbl);
    execute format('drop policy if exists "%s_delete" on public.%I', tbl, tbl);
    execute format('create policy "%s_select" on public.%I for select using (true)', tbl, tbl);
    execute format('create policy "%s_insert" on public.%I for insert with check (true)', tbl, tbl);
    execute format('create policy "%s_update" on public.%I for update using (true) with check (true)', tbl, tbl);
    execute format('create policy "%s_delete" on public.%I for delete using (true)', tbl, tbl);
  end loop;
end $$;

insert into public.app_users (id, name, email, role, sector, active)
values ('usr-1', 'Douglas Francisco', 'douglasnoticias@gmail.com', 'Administrador', 'Gestão', true)
on conflict (email) do nothing;
