import { createClient } from '@supabase/supabase-js';

/*
 * Which database this build talks to.
 *
 *  - VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY set   → that project ("custom")
 *  - VITE_DATA_ENV=production                         → the exporta.tr production project
 *  - neither                                          → no database ("none"): the public
 *    demo works, sign-in is switched off with an explanation.
 *
 * Netlify sets VITE_DATA_ENV=production (netlify.toml). A local build or dev
 * server therefore never reaches production data unless someone asks for it
 * explicitly in .env.local. The publishable key below is meant for browsers;
 * access is controlled by the database's row-level security, not by hiding it.
 */
const PRODUCTION_URL = 'https://licjxropvuxmoacnajew.supabase.co';
const PRODUCTION_PUBLISHABLE_KEY = 'sb_publishable_FGYN3cN76dv_HDUXEMrOtA_kRDxupKh';

const env = import.meta.env;
const explicitUrl = env.VITE_SUPABASE_URL as string | undefined;
const explicitKey = env.VITE_SUPABASE_ANON_KEY as string | undefined;

export type DataEnv = 'custom' | 'production' | 'none';
export const dataEnv: DataEnv = explicitUrl && explicitKey ? 'custom' : env.VITE_DATA_ENV === 'production' ? 'production' : 'none';
export const supabaseConfigured = dataEnv !== 'none';

const url = dataEnv === 'custom' ? explicitUrl! : dataEnv === 'production' ? PRODUCTION_URL : 'http://127.0.0.1:1';
const key = dataEnv === 'custom' ? explicitKey! : PRODUCTION_PUBLISHABLE_KEY;

export const supabase = createClient(url, key, {
  auth: {
    persistSession: supabaseConfigured,
    autoRefreshToken: supabaseConfigured,
    detectSessionInUrl: supabaseConfigured,
  },
});
