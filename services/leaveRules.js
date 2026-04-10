export const LEAVE_TYPES = ['paid', 'unpaid', 'other'];

export function calculatePaidLeaveAllowance({ leaveMode, hireDate, today = new Date() }) {
  const hire = new Date(hireDate);
  if (Number.isNaN(hire.getTime())) return 0;

  if (leaveMode === 'monthly_accrual') {
    const months = (today.getFullYear() - hire.getFullYear()) * 12 + (today.getMonth() - hire.getMonth()) + 1;
    return Math.max(0, Number((months * 2.0833).toFixed(2)));
  }

  if (leaveMode === 'annual_deferred') {
    const years = today.getFullYear() - hire.getFullYear();
    return years < 1 ? 0 : years * 25;
  }

  return 0;
}

export function enumerateDates(start, end) {
  const cur = new Date(start);
  const to = new Date(end);
  const days = [];
  while (cur <= to) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export function countRequestedDays({ startDate, endDate, isHalfDay, holidays = [], closures = [] }) {
  if (isHalfDay) return 0.5;
  const blocked = new Set([...holidays, ...closures]);
  return enumerateDates(startDate, endDate).filter((d) => !blocked.has(d)).length;
}
