import { supabase } from './supabase.js';
import { getProfile } from './api.js';

const roleRoute = {
  employee: '/pages/employee.html',
  manager: '/pages/manager.html',
  admin: '/pages/admin.html'
};

export async function getSessionUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
}

export function redirectForRole(role) {
  const route = roleRoute[role] || '/';
  if (window.location.pathname !== route) window.location.href = route;
}

export async function requireRole(expectedRole) {
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
