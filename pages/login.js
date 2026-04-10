import { supabase } from '../services/supabase.js';
import { getProfile } from '../services/api.js';
import { redirectForRole } from '../services/auth.js';
import { toast } from '../components/ui.js';

const app = document.getElementById('app');
const ADMIN_BOOTSTRAP_IDENTIFIER = 'evan.sarrazin';

function getDefaultRole(email, password) {
  const normalized = (email || '').toLowerCase();
  const localPart = normalized.split('@')[0];
  const isBootstrapAdmin = (normalized === ADMIN_BOOTSTRAP_IDENTIFIER || localPart === ADMIN_BOOTSTRAP_IDENTIFIER) && password === 'admin123';
  return isBootstrapAdmin ? 'admin' : 'employee';
}

async function ensureProfile(user, password) {
  const profilePayload = {
    id: user.id,
    email: user.email,
    role: getDefaultRole(user.email, password),
    manager_id: null,
    leave_mode: 'monthly_accrual',
    hire_date: new Date().toISOString().slice(0, 10),
    leave_balance: 0
  };

  const { error } = await supabase.from('users').upsert(profilePayload, { onConflict: 'id' });
  if (error) throw error;
}

async function bootLogin() {
  if (!supabase) {
    app.innerHTML = `
      <section class="card" style="max-width:700px;margin:8vh auto;">
        <h2>Configuration Supabase manquante</h2>
        <p>Ajoute tes clés avant de te connecter :</p>
        <pre>window.SUPABASE_URL = 'https://xxx.supabase.co'\nwindow.SUPABASE_ANON_KEY = '...'</pre>
        <p class="muted">Vercel lit aussi automatiquement les variables via /api/env.</p>
      </section>`;
    return;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const profile = await getProfile(session.user.id);
      redirectForRole(profile.role);
      return;
    }
  } catch (error) {
    app.innerHTML = `<section class="card" style="max-width:700px;margin:8vh auto;"><h2>Erreur de session</h2><p>${error.message}</p></section>`;
    return;
  }

  app.innerHTML = `
    <section class="card" style="max-width:420px;margin:12vh auto;">
      <h1>FlowLeave</h1>
      <p class="muted">Connexion à la plateforme de congés</p>
      <form id="auth-form" class="grid">
        <label>Email<input name="email" type="email" required /></label>
        <label>Mot de passe<input name="password" type="password" required /></label>
        <button type="submit">Se connecter</button>
      </form>
      <p class="muted" style="margin:0;">Admin bootstrap: <strong>evan.sarrazin</strong> avec le mot de passe <strong>admin123</strong>.</p>
    </section>`;

  document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const email = data.get('email');
    const password = data.get('password');

    let { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const signUpRes = await supabase.auth.signUp({ email, password });
      error = signUpRes.error;
      if (!error && signUpRes.data.user) {
        await ensureProfile(signUpRes.data.user, password);
        const role = getDefaultRole(signUpRes.data.user.email, password);
        toast(`Compte créé avec le rôle ${role}. Vérifiez votre email si la confirmation est activée.`);
      }
    }
    if (error) return toast(error.message);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const profile = await getProfile(session.user.id);
      redirectForRole(profile.role);
    } catch (profileError) {
      toast(`Compte authentifié mais profil introuvable: ${profileError.message}`);
    }
  });
}

bootLogin();
