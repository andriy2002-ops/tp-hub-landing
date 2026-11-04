-- Схема бази даних кабінету клієнта. Виконайте в Supabase: SQL Editor → New query → Run.
-- Усі таблиці захищені Row Level Security: клієнт бачить лише свої дані, менеджер бачить усе.

create extension if not exists pgcrypto;

-- ===== Профілі =====
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'client' check (role in ('client','manager')),
  status text not null default 'pending' check (status in ('pending','active','blocked')),
  type text default 'le',
  company_name text, edrpou text, contact_name text, position text, basis text,
  phone text, address text, tax text, iban text, bank text,
  prefs jsonb default '{"email":true}'::jsonb,
  created_at timestamptz default now()
);

create or replace function public.is_manager() returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'manager' and status = 'active') $$;

create or replace function public.is_active() returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.profiles where id = auth.uid() and status = 'active') $$;

-- Створення профілю при реєстрації (дані беруться з форми реєстрації)
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, type, company_name, edrpou, contact_name, phone, address, tax)
  values (new.id, new.email,
    coalesce(new.raw_user_meta_data->>'type','le'), new.raw_user_meta_data->>'company_name', new.raw_user_meta_data->>'edrpou',
    new.raw_user_meta_data->>'contact_name', new.raw_user_meta_data->>'phone', new.raw_user_meta_data->>'address', new.raw_user_meta_data->>'tax');
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Клієнт не може змінити собі роль, статус і пошту
create or replace function public.protect_profile() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_manager() then
    new.role := old.role; new.status := old.status; new.email := old.email; new.id := old.id;
  end if;
  return new;
end $$;
drop trigger if exists protect_profile_trg on public.profiles;
create trigger protect_profile_trg before update on public.profiles for each row execute function public.protect_profile();

alter table public.profiles enable row level security;
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_select on public.profiles for select using (id = auth.uid() or public.is_manager());
create policy profiles_update on public.profiles for update using (id = auth.uid() or public.is_manager());

-- ===== Вантажі =====
create sequence if not exists public.shipment_seq start 100;
create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  number text unique default ('TP-' || lpad(nextval('public.shipment_seq')::text, 6, '0')),
  client_id uuid not null references public.profiles(id) on delete cascade,
  arrival_type text, title text, places int, pallets int, weight numeric, volume numeric,
  declared_value numeric, eta date, receivers text, location text default '',
  status text not null default 'requested',
  calc jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
alter table public.shipments enable row level security;
drop policy if exists sh_select on public.shipments; drop policy if exists sh_insert on public.shipments;
drop policy if exists sh_update_mgr on public.shipments; drop policy if exists sh_cancel on public.shipments;
create policy sh_select on public.shipments for select using (client_id = auth.uid() or public.is_manager());
create policy sh_insert on public.shipments for insert with check ((client_id = auth.uid() and public.is_active()) or public.is_manager());
create policy sh_update_mgr on public.shipments for update using (public.is_manager());
create policy sh_cancel on public.shipments for update using (client_id = auth.uid() and status = 'requested') with check (client_id = auth.uid() and status in ('requested','cancelled'));

create table if not exists public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  status text, comment text, by_role text, created_at timestamptz default now()
);
alter table public.shipment_events enable row level security;
drop policy if exists ev_select on public.shipment_events; drop policy if exists ev_insert on public.shipment_events;
create policy ev_select on public.shipment_events for select using (public.is_manager() or exists (select 1 from public.shipments s where s.id = shipment_id and s.client_id = auth.uid()));
create policy ev_insert on public.shipment_events for insert with check (public.is_manager() or (by_role = 'client' and exists (select 1 from public.shipments s where s.id = shipment_id and s.client_id = auth.uid())));

-- ===== Договори =====
create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  number text, status text not null default 'draft' check (status in ('draft','sent','signed')),
  data jsonb, calc jsonb, created_at timestamptz default now(), updated_at timestamptz default now()
);
alter table public.contracts enable row level security;
drop policy if exists ct_select on public.contracts; drop policy if exists ct_insert on public.contracts;
drop policy if exists ct_update_mgr on public.contracts; drop policy if exists ct_update_own on public.contracts;
create policy ct_select on public.contracts for select using (client_id = auth.uid() or public.is_manager());
create policy ct_insert on public.contracts for insert with check ((client_id = auth.uid() and status in ('draft','sent')) or public.is_manager());
create policy ct_update_mgr on public.contracts for update using (public.is_manager());
create policy ct_update_own on public.contracts for update using (client_id = auth.uid() and status = 'draft') with check (client_id = auth.uid() and status in ('draft','sent'));

-- ===== Документи (посилання на файли: Google Drive, Supabase Storage тощо) =====
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  shipment_id uuid references public.shipments(id) on delete set null,
  kind text default 'other', name text not null, url text, created_at timestamptz default now()
);
alter table public.documents enable row level security;
drop policy if exists doc_select on public.documents; drop policy if exists doc_mgr on public.documents;
create policy doc_select on public.documents for select using (client_id = auth.uid() or public.is_manager());
create policy doc_mgr on public.documents for all using (public.is_manager()) with check (public.is_manager());

-- ===== Відеоспостереження =====
create table if not exists public.cameras (
  id uuid primary key default gen_random_uuid(),
  name text not null, zone text, kind text default 'hls', url text, active boolean default true
);
create table if not exists public.camera_access (
  camera_id uuid references public.cameras(id) on delete cascade,
  client_id uuid references public.profiles(id) on delete cascade,
  primary key (camera_id, client_id)
);
create table if not exists public.camera_views (
  id uuid primary key default gen_random_uuid(),
  camera_id uuid references public.cameras(id) on delete set null,
  client_id uuid references public.profiles(id) on delete cascade,
  who text, created_at timestamptz default now()
);
alter table public.cameras enable row level security;
alter table public.camera_access enable row level security;
alter table public.camera_views enable row level security;
drop policy if exists cam_select on public.cameras; drop policy if exists cam_mgr on public.cameras;
drop policy if exists ca_select on public.camera_access; drop policy if exists ca_mgr on public.camera_access;
drop policy if exists cv_insert on public.camera_views; drop policy if exists cv_select on public.camera_views;
create policy cam_select on public.cameras for select using (public.is_manager() or (active and public.is_active() and exists (select 1 from public.camera_access a where a.camera_id = id and a.client_id = auth.uid())));
create policy cam_mgr on public.cameras for all using (public.is_manager()) with check (public.is_manager());
create policy ca_select on public.camera_access for select using (client_id = auth.uid() or public.is_manager());
create policy ca_mgr on public.camera_access for all using (public.is_manager()) with check (public.is_manager());
create policy cv_insert on public.camera_views for insert with check (client_id = auth.uid());
create policy cv_select on public.camera_views for select using (public.is_manager());

-- ===== Повідомлення та сповіщення =====
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  shipment_id uuid references public.shipments(id) on delete set null,
  from_role text not null check (from_role in ('client','manager')), text text not null,
  created_at timestamptz default now()
);
alter table public.messages enable row level security;
drop policy if exists msg_select on public.messages; drop policy if exists msg_insert on public.messages;
create policy msg_select on public.messages for select using (client_id = auth.uid() or public.is_manager());
create policy msg_insert on public.messages for insert with check ((client_id = auth.uid() and from_role = 'client') or public.is_manager());

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  text text, link text, read boolean default false, created_at timestamptz default now()
);
alter table public.notifications enable row level security;
drop policy if exists nt_select on public.notifications; drop policy if exists nt_update on public.notifications; drop policy if exists nt_insert on public.notifications;
create policy nt_select on public.notifications for select using (client_id = auth.uid());
create policy nt_update on public.notifications for update using (client_id = auth.uid());
create policy nt_insert on public.notifications for insert with check (public.is_manager());

-- ===== Перший менеджер =====
-- 1) Зареєструйтесь на сайті як звичайний клієнт.
-- 2) Виконайте (підставте свою пошту), щоб зробити себе менеджером і активувати:
--    update public.profiles set role = 'manager', status = 'active' where email = 'ВАША_ПОШТА';
