import { renderCalendar } from '../components/calendar.js';
import { toast } from '../components/ui.js';
import { getCalendarFeed, getLeaveRequests, updateLeaveRequest } from '../services/api.js';
import { requireRole, logout } from '../services/auth.js';

const app = document.getElementById('app');

async function renderAdminPage() {
  try {
    const profile = await requireRole('admin');
    if (!profile) return;

    const requests = await getLeaveRequests({ role: 'admin' });
    const pending = requests.filter((request) => request.manager_status === 'approved' && request.admin_status === 'pending');

    app.innerHTML = `
      <header class="topbar">
        <div><h1>Portail Administrateur</h1><small>${profile.email}</small></div>
        <button id="logout" class="ghost" style="width:auto">Se déconnecter</button>
      </header>

      <section class="grid kpi">
        <article class="card"><h3>Total</h3><div>${requests.length}</div></article>
        <article class="card"><h3>En attente finale</h3><div>${pending.length}</div></article>
        <article class="card"><h3>Approuvées</h3><div>${requests.filter((request) => request.admin_status === 'approved').length}</div></article>
        <article class="card"><h3>Refusées</h3><div>${requests.filter((request) => request.admin_status === 'rejected').length}</div></article>
      </section>

      <section class="card" style="margin-top:16px;">
        <h2>Validation finale</h2>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Employé</th><th>Période</th><th>Commentaire</th><th>Décision</th></tr></thead>
            <tbody id="pending-rows"></tbody>
          </table>
        </div>
      </section>

      <section class="card" style="margin-top:16px;">
        <h2>Planning global</h2>
        <div id="calendar"></div>
      </section>`;

    document.getElementById('logout').onclick = logout;

    const rows = document.getElementById('pending-rows');
    rows.innerHTML = pending.map((request) => `
      <tr>
        <td>${request.users?.email || request.user_id}</td>
        <td>${request.start_date} → ${request.end_date}</td>
        <td>${request.comment || '—'}</td>
        <td>
          <button class="success action" data-id="${request.id}" data-state="approved" style="width:auto">Approuver</button>
          <button class="danger action" data-id="${request.id}" data-state="rejected" style="width:auto">Refuser</button>
        </td>
      </tr>`).join('');

    rows.querySelectorAll('.action').forEach((btn) => {
      btn.onclick = async () => {
        const state = btn.dataset.state;
        await updateLeaveRequest(btn.dataset.id, {
          admin_status: state,
          status: state
        });
        toast(state === 'approved' ? 'Demande approuvée.' : 'Demande rejetée.');
        renderAdminPage();
      };
    });

    const calendarData = await getCalendarFeed('admin', profile.id, profile.id);
    renderCalendar(document.getElementById('calendar'), calendarData);
  } catch (error) {
    app.innerHTML = `<section class="card"><h2>Erreur admin</h2><p>${error.message}</p></section>`;
  }
}

renderAdminPage();
