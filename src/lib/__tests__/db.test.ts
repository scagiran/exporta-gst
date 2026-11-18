/**
 * Database guarantees, tested on an embedded Postgres (PGlite).
 *
 * The production schema is not in this repository and the production project
 * was paused when this was written, so the baseline below is reconstructed
 * from the app's queries (columns org_id / client_id / code / data). The
 * policies and functions under test are the real files from supabase/.
 * auth.uid() is emulated the way Supabase does it, from a request claim.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../../..');
const sql = (p: string) => readFileSync(resolve(root, p), 'utf8');

const BASELINE = `
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

create table public.organizations (id uuid primary key default gen_random_uuid(), name text not null);
create table public.org_members (org_id uuid references public.organizations(id), user_id uuid not null, role text, primary key (org_id, user_id));
create table public.customers (org_id uuid not null references public.organizations(id), client_id text not null, data jsonb, updated_at timestamptz, primary key (org_id, client_id));
create table public.products (org_id uuid not null references public.organizations(id), client_id text not null, data jsonb, updated_at timestamptz, primary key (org_id, client_id));
create table public.shipments (org_id uuid not null references public.organizations(id), code text not null, data jsonb, updated_at timestamptz, primary key (org_id, code));
create table public.company_settings (org_id uuid primary key references public.organizations(id), data jsonb, updated_at timestamptz);
grant select on public.organizations, public.org_members to authenticated;
`;

const ORG_A = '00000000-0000-0000-0000-0000000000a1';
const ORG_B = '00000000-0000-0000-0000-0000000000b1';
const USER_A = '00000000-0000-0000-0000-00000000aaaa';
const USER_B = '00000000-0000-0000-0000-00000000bbbb';

let db: PGlite;

/** Runs statements as an API role with the given user, then returns to the owner. */
async function as<T>(role: 'authenticated' | 'anon', user: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set request.jwt.claim.sub = '${user ?? ''}'; set role ${role};`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; reset request.jwt.claim.sub;`);
  }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(BASELINE);
  await db.exec(sql('supabase/create_org_function.sql'));
  await db.exec(sql('supabase/org_preferences.sql'));
  await db.exec(sql('supabase/migrations/20261118120000_exporta_integrity.sql'));
  // Applying it twice must be harmless.
  await db.exec(sql('supabase/migrations/20261118120000_exporta_integrity.sql'));
  await db.exec(`
    insert into public.organizations (id, name) values ('${ORG_A}', 'Org A'), ('${ORG_B}', 'Org B');
    insert into public.org_members (org_id, user_id, role) values ('${ORG_A}', '${USER_A}', 'owner'), ('${ORG_B}', '${USER_B}', 'owner');
  `);
}, 60000);

describe('scenario 7: two organisations cannot see each other', () => {
  it('lets each member read and write only their own rows', async () => {
    await as('authenticated', USER_A, () =>
      db.exec(`insert into public.shipments (org_id, code, data) values ('${ORG_A}', 'a1', '{"shipmentCode":"SHP-2026-001"}')`)
    );
    await as('authenticated', USER_B, () =>
      db.exec(`insert into public.shipments (org_id, code, data) values ('${ORG_B}', 'b1', '{"shipmentCode":"SHP-2026-001"}')`)
    );

    const seenByA = await as('authenticated', USER_A, () => db.query<{ code: string }>(`select code from public.shipments order by code`));
    expect(seenByA.rows.map((r) => r.code)).toEqual(['a1']);

    // A cannot write into B's organisation…
    await expect(
      as('authenticated', USER_A, () => db.exec(`insert into public.customers (org_id, client_id, data) values ('${ORG_B}', 'x', '{}')`))
    ).rejects.toThrow(/row-level security/);
    // …nor change or delete B's rows (the statements simply match nothing).
    await as('authenticated', USER_A, () => db.exec(`update public.shipments set data = '{}' where code = 'b1'; delete from public.shipments where code = 'b1';`));
    const bStill = await as('authenticated', USER_B, () => db.query<{ data: { shipmentCode: string } }>(`select data from public.shipments where code = 'b1'`));
    expect(bStill.rows[0].data.shipmentCode).toBe('SHP-2026-001');
  });

  it('gives anonymous visitors nothing', async () => {
    await expect(as('anon', null, () => db.query(`select * from public.shipments`))).rejects.toThrow(/permission denied/);
  });

  it('refuses counters and number reservations for another organisation', async () => {
    await expect(as('authenticated', USER_A, () => db.query(`select public.next_org_counter('${ORG_B}', 'shipment:2026', 0)`))).rejects.toThrow(
      /not a member/
    );
  });
});

describe('scenario 4: numbers do not collide', () => {
  it('hands out strictly increasing counter values and respects the floor', async () => {
    const values: number[] = [];
    for (let i = 0; i < 5; i++) {
      const r = await as('authenticated', USER_A, () => db.query<{ v: string }>(`select public.next_org_counter('${ORG_A}', 'doc:proforma', 0) as v`));
      values.push(Number(r.rows[0].v));
    }
    expect(values).toEqual([1, 2, 3, 4, 5]);
    const jumped = await as('authenticated', USER_A, () => db.query<{ v: string }>(`select public.next_org_counter('${ORG_A}', 'doc:proforma', 40) as v`));
    expect(Number(jumped.rows[0].v)).toBe(41);
  });

  it('reserves a document number once per organisation and type', async () => {
    const first = await as('authenticated', USER_A, () => db.query<{ ok: boolean }>(`select public.reserve_document_number('${ORG_A}', 'proforma', 'PI-1') as ok`));
    const again = await as('authenticated', USER_A, () => db.query<{ ok: boolean }>(`select public.reserve_document_number('${ORG_A}', 'proforma', 'PI-1') as ok`));
    const otherOrg = await as('authenticated', USER_B, () => db.query<{ ok: boolean }>(`select public.reserve_document_number('${ORG_B}', 'proforma', 'PI-1') as ok`));
    expect(first.rows[0].ok).toBe(true);
    expect(again.rows[0].ok).toBe(false);
    expect(otherOrg.rows[0].ok).toBe(true);
  });

  it('rejects a second shipment with the same code in one organisation', async () => {
    await expect(
      as('authenticated', USER_A, () => db.exec(`insert into public.shipments (org_id, code, data) values ('${ORG_A}', 'a2', '{"shipmentCode":"SHP-2026-001"}')`))
    ).rejects.toThrow(/duplicate key/);
  });
});

describe('early-access requests', () => {
  it('accepts an insert from a visitor but does not let visitors read requests', async () => {
    await as('anon', null, () =>
      db.exec(`insert into public.early_access_requests (email, plan, lang) values ('lead@example.com', 'insights', 'en')`)
    );
    await expect(as('anon', null, () => db.query(`select * from public.early_access_requests`))).rejects.toThrow(/permission denied/);
    await expect(
      as('anon', null, () => db.exec(`insert into public.early_access_requests (email, plan, lang) values ('not-an-email', 'insights', 'en')`))
    ).rejects.toThrow(/check constraint/);
    const owner = await db.query<{ n: number }>(`select count(*)::int as n from public.early_access_requests`);
    expect(owner.rows[0].n).toBe(1);
  });
});
