import { ENV } from './config.js';

const missingConfig = !ENV.supabaseUrl || !ENV.supabaseAnonKey;

if (missingConfig) {
  console.warn('Supabase credentials missing. Set SUPABASE_URL/SUPABASE_ANON_KEY or VITE_ variants.');
}

export const supabase = missingConfig
  ? null
  : window.supabase.createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
