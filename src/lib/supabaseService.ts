import { supabase } from './supabase';
import { Customer, Product, MasterShipment, CompanySettings, OrgPreferences } from '../types/exporta';
import { normalizeCustomer, normalizeProduct, normalizeShipment } from './normalize';

/** Outcome of a write. A Supabase call can fail without throwing, so the error field is what counts. */
export interface WriteResult {
  error: { message: string } | null;
}

/**
 * Fetches all organization-scoped data from Supabase Postgres for a given tenant org_id.
 */
export async function fetchOrgData(orgId: string) {
  try {
    const [custRes, prodRes, shipRes, settingsRes] = await Promise.all([
      supabase.from('customers').select('*').eq('org_id', orgId),
      supabase.from('products').select('*').eq('org_id', orgId),
      supabase.from('shipments').select('*').eq('org_id', orgId),
      supabase.from('company_settings').select('*').eq('org_id', orgId).maybeSingle(),
    ]);

    const failed = [custRes, prodRes, shipRes, settingsRes].find((r) => r.error);
    if (failed?.error) {
      console.error('Failed to fetch org data from Supabase:', failed.error);
      return null;
    }

    // Rows written by older versions of the app can be missing fields the UI reads,
    // so every record is normalized here rather than guarded at each call site.
    const payload = (row: { data?: unknown }) =>
      typeof row.data === 'object' && row.data !== null ? row.data : {};

    const customers: Customer[] = (custRes.data || []).map((row) =>
      normalizeCustomer({ ...payload(row) }, row.client_id || row.id)
    );

    const products: Product[] = (prodRes.data || []).map((row) =>
      normalizeProduct({ ...payload(row) }, row.client_id || row.id)
    );

    const shipments: MasterShipment[] = (shipRes.data || []).map((row) =>
      normalizeShipment({ ...payload(row) }, row.code || row.id)
    );

    const companySettings: CompanySettings | null = settingsRes.data?.data || null;

    return { customers, products, shipments, companySettings };
  } catch (err) {
    console.error('Failed to fetch org data from Supabase:', err);
    return null;
  }
}

/**
 * Upserts a customer record into the tenant's organization partition in Supabase.
 */
export async function saveCustomer(orgId: string, customer: Customer): Promise<WriteResult> {
  try {
    const { error } = await supabase.from('customers').upsert(
      {
        org_id: orgId,
        client_id: customer.id,
        data: customer,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'org_id,client_id' }
    );
    if (error) console.error('Error saving customer to Supabase:', error);
    return { error: error ? { message: error.message } : null };
  } catch (err) {
    return { error: { message: err instanceof Error ? err.message : String(err) } };
  }
}

/**
 * Deletes a customer record from Supabase.
 */
export async function deleteCustomer(orgId: string, customerId: string): Promise<WriteResult> {
  try {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('org_id', orgId)
      .eq('client_id', customerId);
    if (error) console.error('Error deleting customer from Supabase:', error);
    return { error: error ? { message: error.message } : null };
  } catch (err) {
    return { error: { message: err instanceof Error ? err.message : String(err) } };
  }
}

/**
 * Upserts a product record into the tenant's organization partition in Supabase.
 */
export async function saveProduct(orgId: string, product: Product): Promise<WriteResult> {
  try {
    const { error } = await supabase.from('products').upsert(
      {
        org_id: orgId,
        client_id: product.id,
        data: product,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'org_id,client_id' }
    );
    if (error) console.error('Error saving product to Supabase:', error);
    return { error: error ? { message: error.message } : null };
  } catch (err) {
    return { error: { message: err instanceof Error ? err.message : String(err) } };
  }
}

/**
 * Deletes a product record from Supabase.
 */
export async function deleteProduct(orgId: string, productId: string): Promise<WriteResult> {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('org_id', orgId)
      .eq('client_id', productId);
    if (error) console.error('Error deleting product from Supabase:', error);
    return { error: error ? { message: error.message } : null };
  } catch (err) {
    return { error: { message: err instanceof Error ? err.message : String(err) } };
  }
}

/**
 * Upserts a master shipment record into the tenant's organization partition in Supabase.
 */
export async function saveShipment(orgId: string, shipment: MasterShipment): Promise<WriteResult> {
  try {
    const { error } = await supabase.from('shipments').upsert(
      {
        org_id: orgId,
        code: shipment.id,
        data: shipment,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'org_id,code' }
    );
    if (error) console.error('Error saving shipment to Supabase:', error);
    return { error: error ? { message: error.message } : null };
  } catch (err) {
    return { error: { message: err instanceof Error ? err.message : String(err) } };
  }
}

/**
 * Deletes a shipment record from Supabase.
 */
export async function deleteShipment(orgId: string, shipmentId: string): Promise<WriteResult> {
  try {
    const { error } = await supabase
      .from('shipments')
      .delete()
      .eq('org_id', orgId)
      .eq('code', shipmentId);
    if (error) console.error('Error deleting shipment from Supabase:', error);
    return { error: error ? { message: error.message } : null };
  } catch (err) {
    return { error: { message: err instanceof Error ? err.message : String(err) } };
  }
}

/**
 * Upserts organization company settings in Supabase.
 */
export async function saveCompanySettings(orgId: string, settings: CompanySettings): Promise<WriteResult> {
  try {
    const { error } = await supabase.from('company_settings').upsert(
      {
        org_id: orgId,
        data: settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'org_id' }
    );
    if (error) console.error('Error saving company settings to Supabase:', error);
    return { error: error ? { message: error.message } : null };
  } catch (err) {
    return { error: { message: err instanceof Error ? err.message : String(err) } };
  }
}

const LOGO_BUCKET = 'company-logos';
export const LOGO_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
export const LOGO_ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];

/**
 * Uploads a company logo to Storage under `company-logos/{orgId}/logo.<ext>` and
 * returns its public URL. The path is org-scoped so the RLS policy in
 * `supabase/company_logos_storage.sql` can restrict writes to org members.
 *
 * A cache-busting query param is appended to the returned URL so a replaced logo
 * shows immediately instead of a stale cached copy.
 */
export async function uploadCompanyLogo(
  orgId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  if (!LOGO_ACCEPTED_TYPES.includes(file.type)) {
    return { url: null, error: 'Yalnızca PNG, JPEG veya SVG dosyaları yüklenebilir.' };
  }
  if (file.size > LOGO_MAX_BYTES) {
    return { url: null, error: 'Dosya 2 MB sınırını aşıyor. Lütfen daha küçük bir görsel seçin.' };
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/jpeg' ? 'jpg' : 'svg';
  const path = `${orgId}/logo.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type, cacheControl: '3600' });

  if (uploadError) {
    console.error('[ExPorta] Logo yüklenemedi:', uploadError.message, uploadError);
    return { url: null, error: `Logo yüklenemedi: ${uploadError.message}` };
  }

  // Old logo may sit under a different extension (png -> svg etc.) — clear the rest.
  const stale = ['png', 'jpg', 'svg'].filter((e) => e !== ext).map((e) => `${orgId}/logo.${e}`);
  await supabase.storage.from(LOGO_BUCKET).remove(stale);

  const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);
  return { url: `${data.publicUrl}?v=${Date.now()}`, error: null };
}

/**
 * Removes every stored logo variant for an org. Missing files are not an error.
 */
export async function deleteCompanyLogo(orgId: string): Promise<{ error: string | null }> {
  const paths = ['png', 'jpg', 'svg'].map((e) => `${orgId}/logo.${e}`);
  const { error } = await supabase.storage.from(LOGO_BUCKET).remove(paths);
  if (error) {
    console.error('[ExPorta] Logo silinemedi:', error.message, error);
    return { error: `Logo silinemedi: ${error.message}` };
  }
  return { error: null };
}

/**
 * Fetches organization preferences (numbering formats, custom fields, notes,
 * onboarding progress). Returns null when the org has no saved preferences yet.
 */
export async function fetchOrgPreferences(orgId: string): Promise<Partial<OrgPreferences> | null> {
  const { data, error } = await supabase
    .from('org_preferences')
    .select('data')
    .eq('org_id', orgId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching org preferences from Supabase:', error);
    return null;
  }
  return (data?.data as Partial<OrgPreferences>) || null;
}

/**
 * Upserts the full organization preferences blob.
 */
export async function saveOrgPreferences(orgId: string, prefs: OrgPreferences): Promise<WriteResult> {
  try {
    const { error } = await supabase.from('org_preferences').upsert(
      {
        org_id: orgId,
        data: prefs,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'org_id' }
    );
    if (error) console.error('[ExPorta] org_preferences kaydedilemedi:', error.message, error);
    return { error: error ? { message: error.message } : null };
  } catch (err) {
    return { error: { message: err instanceof Error ? err.message : String(err) } };
  }
}

/*
 * Server-side numbering (supabase/migrations/20261118_*). The counter is
 * advanced atomically in the database, and every issued document number is
 * recorded under a unique constraint, so two tabs or two users cannot obtain
 * the same number. When the functions are not installed yet the call fails
 * and the caller falls back to browser-side numbering, saying so.
 */
export async function nextOrgCounter(orgId: string, scope: string, atLeast: number): Promise<{ value: number | null; error: string | null }> {
  try {
    const { data, error } = await supabase.rpc('next_org_counter', { p_org_id: orgId, p_scope: scope, p_at_least: atLeast });
    if (error) return { value: null, error: error.message };
    return { value: Number(data), error: null };
  } catch (err) {
    return { value: null, error: err instanceof Error ? err.message : String(err) };
  }
}

/** True when the number was free and is now reserved for this organisation; false when it was already taken. */
export async function reserveDocumentNumber(orgId: string, docType: string, number: string): Promise<{ reserved: boolean | null; error: string | null }> {
  try {
    const { data, error } = await supabase.rpc('reserve_document_number', { p_org_id: orgId, p_doc_type: docType, p_number: number });
    if (error) return { reserved: null, error: error.message };
    return { reserved: data === true, error: null };
  } catch (err) {
    return { reserved: null, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface EarlyAccessRequest {
  email: string;
  company?: string;
  plan: string;
  interest?: string;
  lang: string;
}

/** Stores an early-access request (table early_access_requests, insert-only for visitors). */
export async function submitEarlyAccess(req: EarlyAccessRequest): Promise<WriteResult> {
  try {
    const { error } = await supabase.from('early_access_requests').insert({
      email: req.email.trim().toLowerCase(),
      company: req.company?.trim() || null,
      plan: req.plan,
      interest: req.interest?.trim() || null,
      lang: req.lang,
    });
    return { error: error ? { message: error.message } : null };
  } catch (err) {
    return { error: { message: err instanceof Error ? err.message : String(err) } };
  }
}
