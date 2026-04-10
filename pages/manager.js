import { renderCalendar } from '../components/calendar.js';
import { toast } from '../components/ui.js';
import { getCalendarFeed, getLeaveRequests, getTeamMembers, updateLeaveRequest } from '../services/api.js';
import { requireRole, logout } from '../services/auth.js';

const app = document.getElementById('app');

async function renderManagerPage() {
  const profile = await requireRole('manager');
  if (!profile) return;

  const [team, requests] = await Promise.all([
    getTeamMembers(profile.id),
    getLeaveRequests({ role: 'manager' })
  ]);

  const teamIds = new Set(team.map((u) => u.id));
  const pending = requests.filter((r) => teamIds.has(r.user_id) && r.manager_status === 'pending');

  app.innerHTML = `
    <header class="topbar">
      <div><h1>Espace Manager</h1><small>${profile.email}</small></div>
      <button id="logout" class="ghost" style="width:auto">Se déconnecter</button>
    </header>
    <section class="card">
      <h2>Équipe (${team.length})</h2>
      <p class="muted">${team.map((u) => u.email).join(' • ') || 'Aucun membre'}</p>
    </section>
    <section class="card" style="margin-top:16px;">
      <h2>Demandes en attente</h2>
      <div class="table-wrap"><table><thead><tr><th>Employé</th><th>Période</th><th>Actions</th></tr></thead><tbody id="pending-rows"></tbody></table></div>
    </section>
    <section class="card" style="margin-top:16px;">
      <h2>Calendrier équipe</h2>
      <div id="calendar"></div>
    </section>`;

  document.getElementById('logout').onclick = logout;

  const rows = document.getElementById('pending-rows');
  rows.innerHTML = pending.map((r) => `
    <tr>
      <td>${r.users?.email || r.user_id}</td>
      <td>${r.start_date} → ${r.end_date}</td>
      <td>
        <button class="success action" data-id="${r.id}" data-state="approved" style="width:auto">Approuver</button>
        <button class="danger action" data-id="${r.id}" data-state="rejected" style="width:auto">Refuser</button>
      </td>
    </tr>`).join('');

  rows.querySelectorAll('.action').forEach((btn) => {
    btn.onclick = async () => {
      const state = btn.dataset.state;
      await updateLeaveRequest(btn.dataset.id, {
        manager_status: state,
        status: state === 'approved' ? 'pending_admin' : 'rejected'
      });
      toast(`Demande ${state === 'approved' ? 'approuvée' : 'refusée'} côté manager.`);
      renderManagerPage();
    };
  });

  const calendarData = await getCalendarFeed('manager', profile.id, profile.id);
  renderCalendar(document.getElementById('calendar'), calendarData);
}

renderManagerPage();
