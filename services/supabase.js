import { ENV } from './config.js';

const sdkReady = typeof window !== 'undefined' && typeof window.supabase?.createClient === 'function';
const missingConfig = !ENV.supabaseUrl || !ENV.supabaseAnonKey;

if (!sdkReady) {
  console.warn('Supabase SDK absent. Vérifiez le chargement du script CDN @supabase/supabase-js.');
}

if (missingConfig) {
  console.warn('Supabase credentials missing. Set SUPABASE_URL/SUPABASE_ANON_KEY or VITE_ variants.');
}

export const supabase = (!sdkReady || missingConfig)
  ? null
  : window.supabase.createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
