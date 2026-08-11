import { createClient } from '@supabase/supabase-js';

// Default Supabase project credentials (from exporta.tr production project)
// Can be overridden via environment variables (.env.local)
const DEFAULT_SUPABASE_URL = 'https://licjxropvuxmoacnajew.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_FGYN3cN76dv_HDUXEMrOtA_kRDxupKh';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
