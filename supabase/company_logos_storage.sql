-- ExPorta GST — company-logos storage bucket + RLS
--
-- ⚠️  MANUEL UYGULAMA GEREKLİ
-- Bu dosya, üretim Supabase projesi (licjxropvuxmoacnajew / "exporta") şu an
-- INACTIVE olduğu için MCP üzerinden uygulanamadı. Firma logosu yükleme
-- özelliği çalışmadan önce bu SQL'in Supabase Dashboard > SQL Editor'de bir kez
-- çalıştırılması gerekir.
--
-- Yol düzeni: company-logos/{org_id}/logo.<ext>
-- Yani her nesnenin ilk klasör segmenti, o dosyanın ait olduğu organizasyonun
-- id'sidir. RLS bu segmenti org_members üyeliğiyle karşılaştırır — org_preferences
-- tablosundaki mevcut politika kalıbının aynısı.

-- 1) Bucket. Public = true: belge PDF'lerinde <img src> ile erişilebilmesi için
--    (okuma herkese açık; yazma/silme aşağıdaki politikalarla org'a kısıtlı).
insert into storage.buckets (id, name, public)
values ('company-logos', 'company-logos', true)
on conflict (id) do update set public = true;

-- 2) Politikalar. storage.objects üzerinde RLS zaten etkin (Supabase varsayılanı).

-- Herkes okuyabilir (public bucket + belge önizleme/PDF için gerekli).
drop policy if exists "company logos are publicly readable" on storage.objects;
create policy "company logos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'company-logos');

-- Yükleme: sadece {org_id} segmentinin üyesi olan kullanıcı.
drop policy if exists "org members can upload own company logo" on storage.objects;
create policy "org members can upload own company logo"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'company-logos'
    and exists (
      select 1 from public.org_members m
      where m.org_id = ((storage.foldername(name))[1])::uuid
        and m.user_id = auth.uid()
    )
  );

-- Güncelleme (upsert ile aynı yola tekrar yükleme).
drop policy if exists "org members can update own company logo" on storage.objects;
create policy "org members can update own company logo"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'company-logos'
    and exists (
      select 1 from public.org_members m
      where m.org_id = ((storage.foldername(name))[1])::uuid
        and m.user_id = auth.uid()
    )
  );

-- Silme (logoyu kaldır).
drop policy if exists "org members can delete own company logo" on storage.objects;
create policy "org members can delete own company logo"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'company-logos'
    and exists (
      select 1 from public.org_members m
      where m.org_id = ((storage.foldername(name))[1])::uuid
        and m.user_id = auth.uid()
    )
  );
