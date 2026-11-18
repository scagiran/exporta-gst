-- ExPorta: tenant isolation, collision-free numbering, early-access requests
--
-- STATUS: written and tested locally (src/lib/__tests__/db.test.ts runs this
-- file in an embedded Postgres). NOT applied to production. The production
-- project was paused (INACTIVE) when this was written, so its current policies
-- could not be read. Apply to a test/branch project first, run the checks in
-- docs/release/RELEASE_CHECKLIST.md, then production.
--
-- Safe to run more than once. Section 1 replaces EVERY existing policy on the
-- five tenant tables with the membership rule below; review the
-- "before" listing from the checklist so nothing intentional is lost.

-- ---------------------------------------------------------------------------
-- 0. Membership helper
-- ---------------------------------------------------------------------------
-- security definer: it reads org_members without going through org_members'
-- own policies, which avoids policy recursion.
create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = p_org_id and m.user_id = auth.uid()
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 1. Row-level security on tenant data: a row is visible and writable only to
--    members of the organisation in its org_id column.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  p record;
begin
  foreach t in array array['customers', 'products', 'shipments', 'company_settings', 'org_preferences'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
    execute format('create policy %I on public.%I for select to authenticated using (public.is_org_member(org_id))', t || '_member_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_org_member(org_id))', t || '_member_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_org_member(org_id)) with check (public.is_org_member(org_id))', t || '_member_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_org_member(org_id))', t || '_member_delete', t);
    execute format('revoke all on table public.%I from anon', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
  end loop;
end $$;

-- Organisations and memberships: members see their own organisation and their own membership rows.
alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
drop policy if exists organizations_member_select on public.organizations;
create policy organizations_member_select on public.organizations for select to authenticated using (public.is_org_member(id));
drop policy if exists org_members_self_select on public.org_members;
create policy org_members_self_select on public.org_members for select to authenticated using (user_id = auth.uid());
revoke all on table public.organizations from anon;
revoke all on table public.org_members from anon;

-- ---------------------------------------------------------------------------
-- 2. Counters: one row per (organisation, scope), advanced atomically.
--    Scopes used by the app: 'shipment:<year>' and 'doc:<doc_type>'.
-- ---------------------------------------------------------------------------
create table if not exists public.org_counters (
  org_id uuid not null references public.organizations (id) on delete cascade,
  scope text not null check (length(scope) between 1 and 64),
  value bigint not null default 0 check (value >= 0),
  updated_at timestamptz not null default now(),
  primary key (org_id, scope)
);
alter table public.org_counters enable row level security;
drop policy if exists org_counters_member_select on public.org_counters;
create policy org_counters_member_select on public.org_counters for select to authenticated using (public.is_org_member(org_id));
revoke all on table public.org_counters from anon;
grant select on table public.org_counters to authenticated;

-- Returns the next value, never below p_at_least + 1. The row lock taken by
-- the upsert serialises concurrent callers, so no two calls get the same value.
create or replace function public.next_org_counter(p_org_id uuid, p_scope text, p_at_least bigint default 0)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v bigint;
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'not a member of this organisation' using errcode = '42501';
  end if;
  insert into public.org_counters as c (org_id, scope, value)
  values (p_org_id, p_scope, greatest(coalesce(p_at_least, 0), 0) + 1)
  on conflict (org_id, scope) do update
    set value = greatest(c.value, coalesce(p_at_least, 0)) + 1, updated_at = now()
  returning c.value into v;
  return v;
end;
$$;
revoke all on function public.next_org_counter(uuid, text, bigint) from public;
grant execute on function public.next_org_counter(uuid, text, bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Issued document numbers: unique per organisation and document type.
--    Numbers are never deleted, so a deleted shipment's numbers stay used.
--    These are internal references, not official e-invoice (e-Fatura) numbers.
-- ---------------------------------------------------------------------------
create table if not exists public.issued_document_numbers (
  org_id uuid not null references public.organizations (id) on delete cascade,
  doc_type text not null,
  number text not null check (length(number) between 1 and 80),
  issued_at timestamptz not null default now(),
  issued_by uuid default auth.uid(),
  primary key (org_id, doc_type, number)
);
alter table public.issued_document_numbers enable row level security;
drop policy if exists issued_numbers_member_select on public.issued_document_numbers;
create policy issued_numbers_member_select on public.issued_document_numbers for select to authenticated using (public.is_org_member(org_id));
revoke all on table public.issued_document_numbers from anon;
grant select on table public.issued_document_numbers to authenticated;

create or replace function public.reserve_document_number(p_org_id uuid, p_doc_type text, p_number text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted int;
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'not a member of this organisation' using errcode = '42501';
  end if;
  insert into public.issued_document_numbers (org_id, doc_type, number)
  values (p_org_id, p_doc_type, p_number)
  on conflict do nothing;
  get diagnostics inserted = row_count;
  return inserted = 1;
end;
$$;
revoke all on function public.reserve_document_number(uuid, text, text) from public;
grant execute on function public.reserve_document_number(uuid, text, text) to authenticated;

-- Shipment codes unique per organisation. Created only when the existing data
-- has no duplicates; otherwise a notice lists the problem and nothing changes.
do $$
begin
  if exists (
    select 1 from public.shipments
    where data ? 'shipmentCode'
    group by org_id, data->>'shipmentCode'
    having count(*) > 1
  ) then
    raise notice 'shipments_org_code_unique NOT created: duplicate shipment codes exist. Resolve them first (see RELEASE_CHECKLIST.md).';
  else
    execute 'create unique index if not exists shipments_org_code_unique on public.shipments (org_id, (data->>''shipmentCode''))';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Early-access requests from the public site. Visitors can insert one
--    request; nobody can read them through the API (team reads them with the
--    service role or the dashboard).
-- ---------------------------------------------------------------------------
create table if not exists public.early_access_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  company text check (company is null or length(company) <= 200),
  plan text not null check (plan in ('starter', 'professional', 'business', 'insights')),
  interest text check (interest is null or length(interest) <= 1000),
  lang text not null default 'en' check (lang in ('tr', 'en', 'fr'))
);
alter table public.early_access_requests enable row level security;
drop policy if exists early_access_insert on public.early_access_requests;
create policy early_access_insert on public.early_access_requests for insert to anon, authenticated with check (true);
revoke all on table public.early_access_requests from anon, authenticated;
grant insert on table public.early_access_requests to anon, authenticated;
