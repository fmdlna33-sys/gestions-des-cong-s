export const ENV = {
  supabaseUrl: window.__ENV__?.SUPABASE_URL || import.meta?.env?.VITE_SUPABASE_URL || '',
  supabaseAnonKey: window.__ENV__?.SUPABASE_ANON_KEY || import.meta?.env?.VITE_SUPABASE_ANON_KEY || ''
};

export const APP_CONFIG = {
  appName: 'FlowLeave',
  maxTeamOverlapWarning: 3
};
