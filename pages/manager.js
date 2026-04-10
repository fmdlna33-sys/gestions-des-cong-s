import { renderCalendar } from '../components/calendar.js';
import { toast } from '../components/ui.js';
import { getCalendarFeed, getLeaveRequests, getTeamMembers, updateLeaveRequest } from '../services/api.js';
import { requireRole, logout } from '../services/auth.js';

const app = document.getElementById('app');

async function renderManagerPage() {
  try {
    const profile = await requireRole('manager');
    if (!profile) return;

    const [team, requests] = await Promise.all([
      getTeamMembers(profile.id),
      getLeaveRequests({ role: 'manager' })
    ]);

    const teamIds = new Set(team.map((member) => member.id));
    const pending = requests.filter((request) => teamIds.has(request.user_id) && request.manager_status === 'pending');

    app.innerHTML = `
      <header class="topbar">
        <div><h1>Portail Manager</h1><small>${profile.email}</small></div>
        <button id="logout" class="ghost" style="width:auto">Se déconnecter</button>
      </header>
      <section class="card">
        <h2>Équipe (${team.length})</h2>
        <p class="muted">${team.map((member) => member.email).join(' • ') || 'Aucun membre rattaché.'}</p>
      </section>
      <section class="card" style="margin-top:16px;">
        <h2>Demandes à valider</h2>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Employé</th><th>Période</th><th>Type</th><th>Actions</th></tr></thead>
            <tbody id="pending-rows"></tbody>
          </table>
        </div>
      </section>
      <section class="card" style="margin-top:16px;">
        <h2>Calendrier d'équipe</h2>
        <div id="calendar"></div>
      </section>`;

    document.getElementById('logout').onclick = logout;

    const rows = document.getElementById('pending-rows');
    rows.innerHTML = pending.map((request) => `
      <tr>
        <td>${request.users?.email || request.user_id}</td>
        <td>${request.start_date} → ${request.end_date}</td>
        <td>${request.type}</td>
        <td>
          <button class="success action" data-id="${request.id}" data-state="approved" style="width:auto">Approuver</button>
          <button class="danger action" data-id="${request.id}" data-state="rejected" style="width:auto">Refuser</button>
        </td>
      </tr>`).join('');

    rows.querySelectorAll('.action').forEach((btn) => {
      btn.onclick = async () => {
        const state = btn.dataset.state;
        await updateLeaveRequest(btn.dataset.id, {
          manager_status: state,
          status: state === 'approved' ? 'pending_admin' : 'rejected'
        });
        toast(state === 'approved' ? 'Demande validée.' : 'Demande refusée.');
        renderManagerPage();
      };
    });

    const calendarData = await getCalendarFeed('manager', profile.id, profile.id);
    renderCalendar(document.getElementById('calendar'), calendarData);
  } catch (error) {
    app.innerHTML = `<section class="card"><h2>Erreur manager</h2><p>${error.message}</p></section>`;
  }
}

renderManagerPage();
