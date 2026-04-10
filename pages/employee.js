import { renderCalendar } from '../components/calendar.js';
import { statusBadge, toast } from '../components/ui.js';
import { createLeaveRequest, getCalendarFeed, getLeaveRequests, getSpecialDays, updateLeaveRequest } from '../services/api.js';
import { requireRole, logout } from '../services/auth.js';
import { calculatePaidLeaveAllowance, countRequestedDays } from '../services/leaveRules.js';

const app = document.getElementById('app');

async function renderEmployeePage() {
  const profile = await requireRole('employee');
  if (!profile) return;

  const [requests, holidays, closures] = await Promise.all([
    getLeaveRequests({ userId: profile.id, role: 'employee' }),
    getSpecialDays('public_holidays'),
    getSpecialDays('company_closures')
  ]);

  const approvedDays = requests
    .filter((r) => r.admin_status === 'approved')
    .reduce((sum, r) => sum + countRequestedDays({
      startDate: r.start_date,
      endDate: r.end_date,
      isHalfDay: r.is_half_day,
      holidays: holidays.map((h) => h.date),
      closures: closures.map((c) => c.date)
    }), 0);

  const allowance = calculatePaidLeaveAllowance({ leaveMode: profile.leave_mode, hireDate: profile.hire_date });
  const balance = Number((allowance - approvedDays).toFixed(2));

  app.innerHTML = `
    <header class="topbar">
      <div><h1>Espace Employé</h1><small>${profile.email}</small></div>
      <button id="logout" class="ghost" style="width:auto">Se déconnecter</button>
    </header>
    <section class="grid kpi">
      <article class="card"><h3>Droits acquis</h3><div>${allowance} jours</div></article>
      <article class="card"><h3>Pris</h3><div>${approvedDays} jours</div></article>
      <article class="card"><h3>Solde</h3><div>${balance} jours</div></article>
    </section>
    <section class="grid two" style="margin-top:16px;">
      <article class="card">
        <h2>Nouvelle demande</h2>
        <form id="request-form" class="grid">
          <label>Type
            <select name="type" required>
              <option value="paid">Paid leave</option>
              <option value="unpaid">Unpaid leave</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label id="custom-type" class="hidden">Type personnalisé<input name="custom_type_text" /></label>
          <label>Date début<input type="date" name="start_date" required /></label>
          <label>Date fin<input type="date" name="end_date" required /></label>
          <label><input type="checkbox" name="is_half_day" /> Demi-journée</label>
          <label id="half-period" class="hidden">Période
            <select name="half_day_period"><option value="morning">Matin</option><option value="afternoon">Après-midi</option></select>
          </label>
          <label>Commentaire<textarea name="comment"></textarea></label>
          <button type="submit">Envoyer</button>
        </form>
        <small class="muted">Attention: la restitution du solde après annulation peut être refusée.</small>
      </article>
      <article class="card">
        <h2>Calendrier personnel</h2>
        <div id="calendar"></div>
      </article>
    </section>
    <section class="card" style="margin-top:16px;">
      <h2>Mes demandes</h2>
      <div class="table-wrap"><table><thead><tr><th>Type</th><th>Période</th><th>Statut</th><th>Action</th></tr></thead><tbody id="rows"></tbody></table></div>
    </section>`;

  document.getElementById('logout').onclick = logout;

  const typeField = document.querySelector('[name="type"]');
  const halfDayCheck = document.querySelector('[name="is_half_day"]');
  typeField.onchange = () => document.getElementById('custom-type').classList.toggle('hidden', typeField.value !== 'other');
  halfDayCheck.onchange = () => document.getElementById('half-period').classList.toggle('hidden', !halfDayCheck.checked);

  document.getElementById('request-form').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());
    payload.user_id = profile.id;
    payload.is_half_day = formData.get('is_half_day') === 'on';
    payload.status = 'pending_manager';
    payload.manager_status = 'pending';
    payload.admin_status = 'pending';

    if (payload.type === 'other' && !payload.custom_type_text) return toast('Le champ type est requis.');
    const overlap = requests.some((r) => !(payload.end_date < r.start_date || payload.start_date > r.end_date));
    if (overlap) return toast('Chevauchement détecté avec une demande existante.');

    await createLeaveRequest(payload);
    toast('Demande envoyée.');
    renderEmployeePage();
  };

  const rows = document.getElementById('rows');
  rows.innerHTML = requests.map((r) => `
    <tr>
      <td>${r.type}${r.custom_type_text ? ` (${r.custom_type_text})` : ''}</td>
      <td>${r.start_date} → ${r.end_date}</td>
      <td>${statusBadge(r.status)}</td>
      <td><button data-id="${r.id}" class="ghost cancel" style="width:auto">Annuler</button></td>
    </tr>`).join('');

  rows.querySelectorAll('.cancel').forEach((btn) => {
    btn.onclick = async () => {
      await updateLeaveRequest(btn.dataset.id, { status: 'cancel_pending', comment: 'Annulation demandée par employé' });
      toast('Demande d’annulation transmise.');
      renderEmployeePage();
    };
  });

  const calendarData = await getCalendarFeed('employee', profile.id, profile.id);
  renderCalendar(document.getElementById('calendar'), calendarData);
}

renderEmployeePage();
