import { supabase } from './supabase';
import { Customer, Product, MasterShipment, CompanySettings } from '../types/exporta';

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

    const customers: Customer[] = (custRes.data || []).map((row) => ({
      id: row.client_id || row.id,
      ...(typeof row.data === 'object' && row.data !== null ? row.data : {}),
    }));

    const products: Product[] = (prodRes.data || []).map((row) => ({
      id: row.client_id || row.id,
      ...(typeof row.data === 'object' && row.data !== null ? row.data : {}),
    }));

    const shipments: MasterShipment[] = (shipRes.data || []).map((row) => ({
      id: row.code || row.id,
      ...(typeof row.data === 'object' && row.data !== null ? row.data : {}),
    }));

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
export async function saveCustomer(orgId: string, customer: Customer) {
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
}

/**
 * Deletes a customer record from Supabase.
 */
export async function deleteCustomer(orgId: string, customerId: string) {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('org_id', orgId)
    .eq('client_id', customerId);
  if (error) console.error('Error deleting customer from Supabase:', error);
}

/**
 * Upserts a product record into the tenant's organization partition in Supabase.
 */
export async function saveProduct(orgId: string, product: Product) {
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
}

/**
 * Deletes a product record from Supabase.
 */
export async function deleteProduct(orgId: string, productId: string) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('org_id', orgId)
    .eq('client_id', productId);
  if (error) console.error('Error deleting product from Supabase:', error);
}

/**
 * Upserts a master shipment record into the tenant's organization partition in Supabase.
 */
export async function saveShipment(orgId: string, shipment: MasterShipment) {
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
}

/**
 * Deletes a shipment record from Supabase.
 */
export async function deleteShipment(orgId: string, shipmentId: string) {
  const { error } = await supabase
    .from('shipments')
    .delete()
    .eq('org_id', orgId)
    .eq('code', shipmentId);
  if (error) console.error('Error deleting shipment from Supabase:', error);
}

/**
 * Upserts organization company settings in Supabase.
 */
export async function saveCompanySettings(orgId: string, settings: CompanySettings) {
  const { error } = await supabase.from('company_settings').upsert(
    {
      org_id: orgId,
      data: settings,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'org_id' }
  );
  if (error) console.error('Error saving company settings to Supabase:', error);
}
