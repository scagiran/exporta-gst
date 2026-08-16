-- ExPorta GST — org_preferences tablosu
-- Numaralandırma formatları, özel alanlar, notlar, onboarding ilerlemesi ve
-- numaralandırma audit log'u bu tabloda org bazında saklanır.
--
-- Supabase Dashboard > SQL Editor'e yapıştırıp bir kez çalıştırın.

create table if not exists public.org_preferences (
  org_id     uuid primary key references public.organizations (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Tablo düzeyi yetki. Bu olmadan RLS politikaları hiç değerlendirilmez;
-- istemci doğrudan "permission denied for table org_preferences" alır.
grant select, insert, update, delete on table public.org_preferences to authenticated;

alter table public.org_preferences enable row level security;

-- Sadece ilgili organizasyonun üyesi kendi satırını okuyabilir/yazabilir.
drop policy if exists "org members can read own preferences" on public.org_preferences;
create policy "org members can read own preferences"
  on public.org_preferences for select
  using (
    exists (
      select 1 from public.org_members m
      where m.org_id = org_preferences.org_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "org members can insert own preferences" on public.org_preferences;
create policy "org members can insert own preferences"
  on public.org_preferences for insert
  with check (
    exists (
      select 1 from public.org_members m
      where m.org_id = org_preferences.org_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "org members can update own preferences" on public.org_preferences;
create policy "org members can update own preferences"
  on public.org_preferences for update
  using (
    exists (
      select 1 from public.org_members m
      where m.org_id = org_preferences.org_id
        and m.user_id = auth.uid()
    )
  );
