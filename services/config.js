const viteEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};

export const ENV = {
  supabaseUrl:
    window.__ENV__?.SUPABASE_URL ||
    window.SUPABASE_URL ||
    viteEnv.VITE_SUPABASE_URL ||
    '',
  supabaseAnonKey:
    window.__ENV__?.SUPABASE_ANON_KEY ||
    window.SUPABASE_ANON_KEY ||
    viteEnv.VITE_SUPABASE_ANON_KEY ||
    ''
};

export const APP_CONFIG = {
  appName: 'FlowLeave',
  maxTeamOverlapWarning: 3
};
