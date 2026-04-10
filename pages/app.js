import { supabase } from '../services/supabase.js';
import { APP_CONFIG } from '../services/config.js';
import { calculatePaidLeaveAllowance, countRequestedDays } from '../services/leaveRules.js';
import { createLeaveRequest, getCalendarFeed, getLeaveRequests, getProfile, getSpecialDays, getTeamMembers, updateLeaveRequest } from '../services/api.js';
import { loadingCard, statusBadge, toast } from '../components/ui.js';
import { renderCalendar } from '../components/calendar.js';

const app = document.getElementById('app');

async function boot() {
  app.innerHTML = loadingCard('Booting FlowLeave...');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return renderAuth();
  return renderApp(session.user.id);
}

function renderAuth() {
  app.innerHTML = `
  <section class="card" style="max-width:420px;margin:12vh auto;">
    <h1>FlowLeave</h1>
    <p class="muted">HR Leave Platform</p>
    <form id="auth-form" class="grid">
      <label>Email<input name="email" type="email" required /></label>
      <label>Password<input name="password" type="password" required minlength="6" /></label>
      <button type="submit">Sign in / Sign up</button>
    </form>
  </section>`;

  document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const email = form.get('email');
    const password = form.get('password');

    let { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const signUp = await supabase.auth.signUp({ email, password });
      error = signUp.error;
    }
    if (error) return toast(error.message);
    toast('Authenticated. Welcome!');
    const { data: { session } } = await supabase.auth.getSession();
    renderApp(session.user.id);
  });
}

function formatStatus(r) {
  if (r.admin_status === 'approved') return 'Approved';
  if (r.admin_status === 'rejected') return 'Rejected';
  if (r.manager_status === 'approved') return 'Pending Admin';
  return 'Pending Manager';
}

async function renderApp(userId) {
  try {
    const [profile, requests, holidays, closures] = await Promise.all([
      getProfile(userId), getLeaveRequests({ userId, role: 'employee' }),
      getSpecialDays('public_holidays'), getSpecialDays('company_closures')
    ]);

    app.innerHTML = `
    <header class="topbar">
      <div><h1>${APP_CONFIG.appName}</h1><small>${profile.email} · ${profile.role}</small></div>
      <button id="logout" class="ghost" style="width:auto;">Logout</button>
    </header>
    <main class="grid">
      <section class="grid kpi" id="kpis"></section>
      <section class="grid two">
        <article class="card">
          <h2>New leave request</h2>
          <form id="leave-form" class="grid">
            <label>Type
              <select name="type" required>
                <option value="paid">Paid leave</option>
                <option value="unpaid">Unpaid leave</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label id="custom-type" class="hidden">Custom type<input name="custom_type_text" /></label>
            <label>Start date<input type="date" name="start_date" required /></label>
            <label>End date<input type="date" name="end_date" required /></label>
            <label><input type="checkbox" name="is_half_day" /> Half-day</label>
            <label id="period" class="hidden">Half day period
              <select name="half_day_period"><option value="morning">Morning</option><option value="afternoon">Afternoon</option></select>
            </label>
            <label>Comment<textarea name="comment" rows="3"></textarea></label>
            <button type="submit">Submit request</button>
          </form>
          <small class="muted">Cancellation after approval is possible, but balance restoration is not guaranteed.</small>
        </article>

        <article class="card">
          <h2>${profile.role === 'employee' ? 'My calendar' : 'Team / Global calendar'}</h2>
          <div id="calendar"></div>
        </article>
      </section>

      <article class="card">
        <h2>Requests</h2>
        <div class="table-wrap"><table><thead><tr>
          <th>Employee</th><th>Type</th><th>Dates</th><th>Status</th><th>Action</th>
        </tr></thead><tbody id="request-rows"></tbody></table></div>
      </article>

      <article class="card" id="role-panel"></article>
    </main>`;

    document.getElementById('logout').onclick = async () => {
      await supabase.auth.signOut();
      renderAuth();
    };

    await renderCommon(profile, requests, holidays, closures);
    if (profile.role === 'manager') await renderManagerPanel(profile);
    if (profile.role === 'admin') await renderAdminPanel(profile);

    supabase.channel('leave_realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, () => renderApp(userId)).subscribe();
  } catch (error) {
    app.innerHTML = `<section class="card"><h2>Setup required</h2><p>${error.message}</p></section>`;
  }
}

async function renderCommon(profile, requests, holidays, closures) {
  const approvedDaysTaken = requests.filter((r) => r.admin_status === 'approved').reduce((acc, r) => acc + countRequestedDays({
    startDate: r.start_date, endDate: r.end_date, isHalfDay: r.is_half_day,
    holidays: holidays.map((h) => h.date), closures: closures.map((c) => c.date)
  }), 0);
  const allowance = calculatePaidLeaveAllowance({ leaveMode: profile.leave_mode, hireDate: profile.hire_date });
  const balance = Number((allowance - approvedDaysTaken).toFixed(2));

  document.getElementById('kpis').innerHTML = `
    <div class="card"><h3>Allowance</h3><div>${allowance} days</div></div>
    <div class="card"><h3>Taken</h3><div>${approvedDaysTaken} days</div></div>
    <div class="card"><h3>Balance</h3><div>${balance} days</div></div>
    <div class="card"><h3>Pending</h3><div>${requests.filter((r) => formatStatus(r).includes('Pending')).length}</div></div>`;

  document.querySelector('[name="type"]').onchange = (e) => {
    document.getElementById('custom-type').classList.toggle('hidden', e.target.value !== 'other');
  };
  document.querySelector('[name="is_half_day"]').onchange = (e) => {
    document.getElementById('period').classList.toggle('hidden', !e.target.checked);
  };

  document.getElementById('leave-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const payload = Object.fromEntries(form.entries());
    payload.user_id = profile.id;
    payload.is_half_day = form.get('is_half_day') === 'on';
    payload.manager_status = 'pending';
    payload.admin_status = 'pending';
    payload.status = 'pending_manager';

    if (payload.type === 'other' && !payload.custom_type_text) return toast('Custom type text is required.');
    if (payload.is_half_day && !payload.half_day_period) return toast('Specify morning or afternoon.');

    const overlap = requests.some((r) => !(payload.end_date < r.start_date || payload.start_date > r.end_date));
    if (overlap) return toast('Overlapping request detected.');

    await createLeaveRequest(payload);
    toast('Leave request created.');
    renderApp(profile.id);
  };

  document.getElementById('request-rows').innerHTML = requests.map((r) => `
    <tr>
      <td>${r.users?.email || profile.email}</td>
      <td>${r.type}${r.custom_type_text ? ` (${r.custom_type_text})` : ''}</td>
      <td>${r.start_date} → ${r.end_date}${r.is_half_day ? ` (${r.half_day_period})` : ''}</td>
      <td>${statusBadge(formatStatus(r))}</td>
      <td><button class="ghost cancel" data-id="${r.id}" style="width:auto;">Cancel</button></td>
    </tr>`).join('');

  [...document.querySelectorAll('.cancel')].forEach((btn) => {
    btn.onclick = async () => {
      const proceed = confirm('Cancellation can be refused for balance restoration. Continue?');
      if (!proceed) return;
      await updateLeaveRequest(btn.dataset.id, { status: 'cancel_pending', comment: 'Cancellation requested by employee' });
      toast('Cancellation submitted.');
      renderApp(profile.id);
    };
  });

  const calendarEntries = await getCalendarFeed(profile.role, profile.id, profile.id);
  renderCalendar(document.getElementById('calendar'), calendarEntries);
}

async function renderManagerPanel(profile) {
  const [teamMembers, teamRequests] = await Promise.all([
    getTeamMembers(profile.id), getLeaveRequests({ role: 'manager' })
  ]);
  const pending = teamRequests.filter((r) => teamMembers.some((m) => m.id === r.user_id) && r.manager_status === 'pending');

  const overload = Object.values(pending.reduce((acc, r) => {
    acc[r.start_date] = (acc[r.start_date] || 0) + 1;
    return acc;
  }, {})).some((count) => count >= APP_CONFIG.maxTeamOverlapWarning);

  const panel = document.getElementById('role-panel');
  panel.innerHTML = `
    <h2>Manager workspace</h2>
    <p class="muted">Team members: ${teamMembers.length}</p>
    ${overload ? '<p class="badge pending">Warning: high team overlap risk.</p>' : ''}
    <div class="table-wrap"><table><thead><tr><th>User</th><th>Dates</th><th>Action</th></tr></thead><tbody>
      ${pending.map((r) => `<tr><td>${r.users?.email || r.user_id}</td><td>${r.start_date} → ${r.end_date}</td><td>
        <button class="success mgr" data-id="${r.id}" data-action="approved" style="width:auto">Approve</button>
        <button class="danger mgr" data-id="${r.id}" data-action="rejected" style="width:auto">Reject</button>
      </td></tr>`).join('')}
    </tbody></table></div>`;

  [...panel.querySelectorAll('.mgr')].forEach((btn) => {
    btn.onclick = async () => {
      await updateLeaveRequest(btn.dataset.id, { manager_status: btn.dataset.action, status: btn.dataset.action === 'approved' ? 'pending_admin' : 'rejected' });
      toast(`Manager ${btn.dataset.action}.`);
      renderApp(profile.id);
    };
  });
}

async function renderAdminPanel(profile) {
  const requests = await getLeaveRequests({ role: 'admin' });
  const pending = requests.filter((r) => r.admin_status === 'pending');
  const approved = requests.filter((r) => r.admin_status === 'approved').length;
  const rejected = requests.filter((r) => r.admin_status === 'rejected').length;

  const panel = document.getElementById('role-panel');
  panel.innerHTML = `
    <h2>Admin control center</h2>
    <div class="grid kpi">
      <div class="card"><h3>Approved</h3><div>${approved}</div></div>
      <div class="card"><h3>Rejected</h3><div>${rejected}</div></div>
      <div class="card"><h3>Pending final</h3><div>${pending.length}</div></div>
    </div>
    <h3 style="margin-top:14px;">Final validation queue</h3>
    <div class="table-wrap"><table><thead><tr><th>User</th><th>Manager</th><th>Dates</th><th>Decision</th></tr></thead><tbody>
      ${pending.map((r) => `<tr><td>${r.users?.email || r.user_id}</td><td>${r.manager_status}</td><td>${r.start_date} → ${r.end_date}</td><td>
        <button class="success adm" data-id="${r.id}" data-action="approved" style="width:auto">Approve</button>
        <button class="danger adm" data-id="${r.id}" data-action="rejected" style="width:auto">Reject</button>
      </td></tr>`).join('')}
    </tbody></table></div>`;

  [...panel.querySelectorAll('.adm')].forEach((btn) => {
    btn.onclick = async () => {
      const patch = { admin_status: btn.dataset.action, status: btn.dataset.action === 'approved' ? 'approved' : 'rejected' };
      await updateLeaveRequest(btn.dataset.id, patch);
      toast(`Admin ${btn.dataset.action}.`);
      renderApp(profile.id);
    };
  });
}

supabase.auth.onAuthStateChange((_event, session) => {
  if (!session) renderAuth();
});

boot();
