import { supabase } from './supabase.js';
import { getProfile } from './api.js';

const roleRoute = {
  employee: '/pages/employee.html',
  manager: '/pages/manager.html',
  admin: '/pages/admin.html'
};

export async function getSessionUser() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
}

export function redirectForRole(role) {
  const route = roleRoute[role] || '/';
  if (window.location.pathname !== route) window.location.href = route;
}

export async function requireRole(expectedRole) {
  if (!supabase) {
    document.getElementById('app').innerHTML = `
      <section class="card" style="max-width:700px;margin:8vh auto;">
        <h2>Configuration requise</h2>
        <p>Ajoute les clés Supabase pour utiliser l'application.</p>
        <pre>window.SUPABASE_URL = 'https://xxx.supabase.co'\nwindow.SUPABASE_ANON_KEY = '...'</pre>
        <p class="muted">Si tu es sur Vercel, vérifie les variables SUPABASE_URL et SUPABASE_ANON_KEY.</p>
      </section>`;
    return null;
  }
  const user = await getSessionUser();
  if (!user) {
    window.location.href = '/';
    return null;
  }
  const profile = await getProfile(user.id);
  if (profile.role !== expectedRole) {
    redirectForRole(profile.role);
    return null;
  }
  return profile;
}

export async function logout() {
  await supabase.auth.signOut();
  window.location.href = '/';
}
