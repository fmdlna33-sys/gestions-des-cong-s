import { enumerateDates } from '../services/leaveRules.js';

export function renderCalendar(container, entries, month = new Date()) {
  const year = month.getFullYear();
  const mm = month.getMonth();
  const first = new Date(year, mm, 1);
  const daysInMonth = new Date(year, mm + 1, 0).getDate();
  const startWeekday = (first.getDay() + 6) % 7;

  const byDate = new Map();
  entries.forEach((e) => {
    enumerateDates(e.start_date, e.end_date).forEach((d) => {
      if (!byDate.has(d)) byDate.set(d, []);
      byDate.get(d).push(e);
    });
  });

  const header = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => `<div class="calendar-cell"><strong>${d}</strong></div>`).join('');
  const cells = [];
  for (let i = 0; i < startWeekday; i += 1) cells.push('<div class="calendar-cell"></div>');
  for (let d = 1; d <= daysInMonth; d += 1) {
    const iso = new Date(year, mm, d).toISOString().slice(0, 10);
    const items = (byDate.get(iso) || []).slice(0, 3).map((e) => {
      const cls = e.status?.toLowerCase().includes('approve') ? 'approved' : e.status?.toLowerCase().includes('reject') ? 'rejected' : 'pending';
      return `<div class="calendar-item ${cls}">${e.users?.email || 'Employee'} • ${e.type}</div>`;
    }).join('');
    cells.push(`<div class="calendar-cell"><strong>${d}</strong>${items}</div>`);
  }
  container.innerHTML = `<div class="calendar-grid">${header}${cells.join('')}</div>`;
}
