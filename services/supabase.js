import { ENV } from './config.js';

if (!ENV.supabaseUrl || !ENV.supabaseAnonKey) {
  console.warn('Supabase credentials missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = window.supabase.createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true }
});
