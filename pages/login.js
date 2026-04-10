import { supabase } from '../services/supabase.js';
import { getProfile } from '../services/api.js';
import { redirectForRole } from '../services/auth.js';
import { toast } from '../components/ui.js';

const app = document.getElementById('app');

function renderConfigError(message) {
  app.innerHTML = `<section class="card" style="max-width:720px;margin:10vh auto;">
      <h2>Configuration requise</h2>
      <p>${message}</p>
      <pre>window.SUPABASE_URL = 'https://xxx.supabase.co'\nwindow.SUPABASE_ANON_KEY = '...'</pre>
    </section>`;
}

async function redirectWithProfile(user) {
  const profile = await getProfile(user.id);
  redirectForRole(profile.role);
}

async function bootLogin() {
  if (!supabase) {
    renderConfigError('Supabase non configuré.');
    return;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await redirectWithProfile(session.user);
      return;
    }
  } catch (error) {
    renderConfigError(`Erreur de session: ${error.message}`);
    return;
  }

  app.innerHTML = `
    <section class="auth-shell card">
      <h1>FlowLeave</h1>
      <p class="muted">Connectez-vous ou créez votre compte.</p>
      <form id="auth-form" class="grid">
        <label>Email<input name="email" type="email" required /></label>
        <label>Mot de passe<input name="password" type="password" minlength="6" required /></label>
        <button type="submit">Connexion / Inscription</button>
      </form>
      <p class="muted" style="margin:0;">Bootstrap admin: identifiant <strong>evan.sarrazin</strong> (ou evan.sarrazin@...) puis mot de passe de votre choix (6+).</p>
    </section>`;

  document.getElementById('auth-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(event.target);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');

    if (password.length < 6) {
      toast('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    const signIn = await supabase.auth.signInWithPassword({ email, password });
    if (!signIn.error && signIn.data.user) {
      await redirectWithProfile(signIn.data.user);
      return;
    }

    const signUp = await supabase.auth.signUp({ email, password });
    if (signUp.error) {
      toast(signUp.error.message);
      return;
    }

    toast('Compte créé. Si la confirmation email est active, validez votre adresse puis reconnectez-vous.');

    if (signUp.data.user && signUp.data.session) {
      await redirectWithProfile(signUp.data.user);
    }
  });
}

bootLogin();
