import { supabase } from './supabase.js';

function requireSupabase() {
  if (!supabase) throw new Error('Supabase non configuré (URL/ANON KEY manquantes).');
}

export async function getProfile(userId) {
  requireSupabase();
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

export async function getLeaveRequests({ userId, role }) {
  requireSupabase();
  let query = supabase.from('leave_requests').select('*, users(email, manager_id)').order('created_at', { ascending: false });

  if (role === 'employee') query = query.eq('user_id', userId);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getTeamMembers(managerId) {
  requireSupabase();
  const { data, error } = await supabase.from('users').select('*').eq('manager_id', managerId);
  if (error) throw error;
  return data;
}

export async function getCalendarFeed(role, userId, managerId) {
  requireSupabase();
  if (role === 'employee') {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('id, user_id, start_date, end_date, status, type, users(email,manager_id)')
      .eq('user_id', userId);
    if (error) throw error;
    return data;
  }

  if (role === 'manager') {
    const team = await getTeamMembers(managerId);
    if (!team.length) return [];
    const { data, error } = await supabase
      .from('leave_requests')
      .select('id, user_id, start_date, end_date, status, type, users(email,manager_id)')
      .in('user_id', team.map((u) => u.id));
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('leave_requests')
    .select('id, user_id, start_date, end_date, status, type, users(email,manager_id)');
  if (error) throw error;
  return data;
}

export async function getSpecialDays(table) {
  requireSupabase();
  const { data, error } = await supabase.from(table).select('date,label').order('date');
  if (error) throw error;
  return data;
}

export async function createLeaveRequest(payload) {
  requireSupabase();
  const { data, error } = await supabase.from('leave_requests').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateLeaveRequest(id, patch) {
  requireSupabase();
  const { data, error } = await supabase.from('leave_requests').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
