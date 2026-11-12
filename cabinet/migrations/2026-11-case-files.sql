-- ===== Справа клієнта: файли (від клієнта та з відкритих джерел), перевірка контрагента =====
-- Виконайте в Supabase: SQL Editor → New query → Run. Скрипт можна запускати повторно.

create table if not exists public.client_files (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  origin text not null check (origin in ('client','manager')),   -- client: завантажив клієнт; manager: матеріал з відкритих джерел (клієнт НЕ бачить)
  category text not null default 'other',
  title text not null,
  note text,
  source_url text,
  file_path text not null,
  file_name text,
  mime text,
  size bigint,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz default now()
);
create index if not exists client_files_client_idx on public.client_files (client_id, created_at desc);
alter table public.client_files enable row level security;
drop policy if exists cf_select on public.client_files;
drop policy if exists cf_insert on public.client_files;
drop policy if exists cf_delete on public.client_files;
create policy cf_select on public.client_files for select using (public.is_manager() or (client_id = auth.uid() and origin = 'client'));
create policy cf_insert on public.client_files for insert with check (
  public.is_manager() or
  (client_id = auth.uid() and origin = 'client' and uploaded_by = auth.uid()
   and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status <> 'blocked')));
create policy cf_delete on public.client_files for delete using (public.is_manager() or (client_id = auth.uid() and origin = 'client'));

-- Нотатки, ризик і чекліст перевірки (тільки менеджер)
create table if not exists public.client_cases (
  client_id uuid primary key references public.profiles(id) on delete cascade,
  risk text not null default 'unknown' check (risk in ('unknown','low','medium','high')),
  checklist jsonb not null default '{}'::jsonb,
  notes text,
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id)
);
alter table public.client_cases enable row level security;
drop policy if exists cc_mgr on public.client_cases;
create policy cc_mgr on public.client_cases for all using (public.is_manager()) with check (public.is_manager());

-- Сховище файлів (приватне). Шляхи: client/<id клієнта>/... і case/<id клієнта>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('client-files', 'client-files', false, 15728640,
  array['application/pdf','image/jpeg','image/png','image/webp','application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/plain'])
on conflict (id) do update set public = false, file_size_limit = 15728640, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists cfo_mgr on storage.objects;
drop policy if exists cfo_client_select on storage.objects;
drop policy if exists cfo_client_insert on storage.objects;
drop policy if exists cfo_client_delete on storage.objects;
create policy cfo_mgr on storage.objects for all
  using (bucket_id = 'client-files' and public.is_manager()) with check (bucket_id = 'client-files' and public.is_manager());
create policy cfo_client_select on storage.objects for select
  using (bucket_id = 'client-files' and (storage.foldername(name))[1] = 'client' and (storage.foldername(name))[2] = auth.uid()::text);
create policy cfo_client_insert on storage.objects for insert
  with check (bucket_id = 'client-files' and (storage.foldername(name))[1] = 'client' and (storage.foldername(name))[2] = auth.uid()::text);
create policy cfo_client_delete on storage.objects for delete
  using (bucket_id = 'client-files' and (storage.foldername(name))[1] = 'client' and (storage.foldername(name))[2] = auth.uid()::text);
