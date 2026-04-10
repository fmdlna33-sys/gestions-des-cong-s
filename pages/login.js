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
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:8px;">
        <button id="mode-login" class="ghost" type="button">Connexion</button>
        <button id="mode-signup" class="ghost" type="button">Créer un compte</button>
      </div>
      <form id="auth-form" class="grid" style="margin-top:10px;">
        <label>Email<input name="email" type="email" required /></label>
        <label>Mot de passe<input name="password" type="password" minlength="6" required /></label>
        <button id="submit-btn" type="submit">Se connecter</button>
      </form>
      <p id="auth-help" class="muted" style="margin:0;">Mode connexion actif.</p>
    </section>`;

  let mode = 'login';
  const submitBtn = document.getElementById('submit-btn');
  const help = document.getElementById('auth-help');

  function setMode(nextMode) {
    mode = nextMode;
    submitBtn.textContent = mode === 'login' ? 'Se connecter' : 'Créer le compte';
    help.textContent = mode === 'login'
      ? 'Mode connexion actif.'
      : 'Mode création de compte actif (évite les tentatives automatiques et les erreurs de rate-limit).';
  }

  document.getElementById('mode-login').onclick = () => setMode('login');
  document.getElementById('mode-signup').onclick = () => setMode('signup');

  document.getElementById('auth-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(event.target);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');

    if (password.length < 6) {
      toast('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (mode === 'login') {
      const signIn = await supabase.auth.signInWithPassword({ email, password });
      if (signIn.error) {
        toast(`Connexion impossible: ${signIn.error.message}`);
        return;
      }
      await redirectWithProfile(signIn.data.user);
      return;
    }

    const signUp = await supabase.auth.signUp({ email, password });
    if (signUp.error) {
      toast(`Création impossible: ${signUp.error.message}`);
      return;
    }

    toast('Compte créé. Si la confirmation email est active, validez votre adresse puis connectez-vous.');

    if (signUp.data.user && signUp.data.session) {
      await redirectWithProfile(signUp.data.user);
    }
  });
}

bootLogin();
