# FlowLeave — Gestion des congés (Supabase + Vanilla JS)

Application SaaS moderne de gestion des congés avec **page de connexion dédiée** et **pages séparées par partie**:
- `/` : Connexion
- `/pages/employee.html` : Espace Employé
- `/pages/manager.html` : Espace Manager
- `/pages/admin.html` : Espace Admin

## Stack
- Frontend: HTML + CSS + JavaScript modulaire
- Backend: Supabase Auth + PostgreSQL + Realtime
- Déploiement: Vercel (statique)

## Structure
```
.
├── components/
│   ├── calendar.js
│   └── ui.js
├── db/
│   ├── schema.sql
│   └── seed.sql
├── pages/
│   ├── login.js
│   ├── employee.html
│   ├── employee.js
│   ├── manager.html
│   ├── manager.js
│   ├── admin.html
│   └── admin.js
├── services/
│   ├── api.js
│   ├── auth.js
│   ├── config.js
│   ├── leaveRules.js
│   └── supabase.js
├── styles/main.css
├── index.html
├── .env.example
└── vercel.json
```

## Fonctionnalités
- Auth email/password via Supabase.
- Redirection automatique selon rôle après connexion.
- Workflow: `pending_manager` → `pending_admin` → `approved/rejected`.
- Demandes employé: type, plage de dates, demi-journée, commentaire.
- Validation manager et validation finale admin.
- Calcul de solde (acquisition mensuelle / différé annuel).
- Exclusion des jours fériés et déduction des fermetures entreprise.
- Vue calendrier (personnelle, équipe, globale).

## Installation Supabase
1. Créer le projet Supabase.
2. Exécuter `db/schema.sql` puis `db/seed.sql`.
3. Créer les utilisateurs Auth (employee/manager/admin).
4. Créer le compte `evan.sarrazin` (ou `evan.sarrazin@...`) pour bootstrap l'administrateur.
5. Mettre à jour les UUID dans `public.users`.

Si vous avez déjà une base avec l'erreur `infinite recursion detected in policy for relation "users"`, exécutez `db/fix_users_policies.sql`.

## Variables d'environnement
Configurer:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Si tu lances en HTML statique pur (sans Vite), tu peux aussi définir avant les modules:
- `window.SUPABASE_URL`
- `window.SUPABASE_ANON_KEY`

Sur Vercel, les variables sont lues automatiquement via l'endpoint serverless `api/env.js`.

## Lancement local
```bash
python3 -m http.server 4173
```
Puis ouvrir `http://localhost:4173`.

## Déploiement Vercel
1. Importer le repo.
2. Ajouter les variables d'environnement.
3. Déployer.
