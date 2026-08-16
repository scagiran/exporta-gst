-- ExPorta GST — organizasyon oluşturma fonksiyonu
--
-- Sorun: istemci önce organizations'a insert edip satırı geri okumaya çalışıyordu.
-- organizations SELECT politikası org_members'ta üyelik arıyor, üyelik ise henüz
-- oluşturulmadığı için okuma boş dönüyor ve org_members insert'i hiç çalışmıyordu.
-- Geriye sahipsiz organizasyon satırları kalıyordu.
--
-- Çözüm: her ikisini tek bir security definer fonksiyonda atomik yapmak.
--
-- Supabase Dashboard > SQL Editor'e yapıştırıp bir kez çalıştırın.

create or replace function public.create_org_for_current_user(org_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Oturum açılmamış';
  end if;

  -- Kullanıcının zaten bir organizasyonu varsa yenisini açma, mevcudu döndür.
  select m.org_id into new_org_id
  from public.org_members m
  where m.user_id = uid
  limit 1;

  if new_org_id is not null then
    return new_org_id;
  end if;

  insert into public.organizations (name)
  values (coalesce(nullif(trim(org_name), ''), 'İhracat Firmam'))
  returning id into new_org_id;

  insert into public.org_members (org_id, user_id, role)
  values (new_org_id, uid, 'owner');

  return new_org_id;
end;
$$;

grant execute on function public.create_org_for_current_user(text) to authenticated;
