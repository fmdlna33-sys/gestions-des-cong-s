import { supabase } from './supabase.js';

export async function getProfile(userId) {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

export async function getLeaveRequests({ userId, role }) {
  let query = supabase.from('leave_requests').select('*, users(email)');
  if (role === 'employee') query = query.eq('user_id', userId);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getTeamMembers(managerId) {
  const { data, error } = await supabase.from('users').select('*').eq('manager_id', managerId);
  if (error) throw error;
  return data;
}

export async function getCalendarFeed(role, userId, managerId) {
  let query = supabase.from('leave_requests').select('id, user_id, start_date, end_date, status, type, users(email,manager_id)');
  if (role === 'employee') query = query.eq('user_id', userId);
  if (role === 'manager') query = query.eq('users.manager_id', managerId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getSpecialDays(table) {
  const { data, error } = await supabase.from(table).select('date,label').order('date');
  if (error) throw error;
  return data;
}

export async function createLeaveRequest(payload) {
  const { data, error } = await supabase.from('leave_requests').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateLeaveRequest(id, patch) {
  const { data, error } = await supabase.from('leave_requests').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
