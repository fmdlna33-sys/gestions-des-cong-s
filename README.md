# FlowLeave — Production-Ready HR Leave Management (Supabase + Vanilla JS)

A modern SaaS-style leave management web app with role-based workflows:
- **Employee**: submit/cancel requests, see personal dashboard and calendar.
- **Manager**: validate team requests, team overload warnings, calendar visibility.
- **Admin**: final approval/rejection, global stats, override control.

## Stack
- Frontend: HTML + modular Vanilla JavaScript + modern responsive CSS
- Backend: Supabase Auth + PostgreSQL + Realtime
- Deployment: Vercel-ready static deployment

## Project Structure
```
.
├── components/
│   ├── calendar.js
│   └── ui.js
├── db/
│   ├── schema.sql
│   └── seed.sql
├── pages/
│   └── app.js
├── services/
│   ├── api.js
│   ├── config.js
│   ├── leaveRules.js
│   └── supabase.js
├── styles/
│   └── main.css
├── .env.example
├── index.html
└── vercel.json
```

## Core Features
- Supabase email/password authentication.
- Role-based dashboards and action permissions.
- Workflow: **Pending Manager → Pending Admin → Approved/Rejected**.
- Leave types: paid, unpaid, other (with required custom text).
- Half-day support (morning/afternoon), 0.5 day calculation.
- Special-day logic: public holidays excluded, company closures deducted.
- Overlap prevention for employee requests.
- Team overload warning for manager.
- Calendar views: personal/team/global depending on role.
- In-app toasts, loading/error states, realtime refresh using Supabase channels.

## Supabase Setup
1. Create a Supabase project.
2. In Supabase SQL editor, run:
   - `db/schema.sql`
   - `db/seed.sql` (edit UUIDs first to match `auth.users` IDs)
3. In Auth settings, enable email/password.
4. Create users in Auth (employee/manager/admin), then update corresponding rows in `public.users`.

## Local Run
Because this is a static app, you can use any static server:

```bash
cp .env.example .env
# set your values
python3 -m http.server 4173
# or npx serve .
```

Open `http://localhost:4173`.

> If you use Vite for local DX, you can add a simple Vite config and keep the same source files.

## Environment Variables
Set these in local environment (or Vercel Project Settings):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Vercel Deployment
1. Push this project to GitHub.
2. Import into Vercel.
3. Set environment variables above.
4. Deploy.

`vercel.json` already rewrites routes to `index.html` for SPA behavior.

## Notes for Production Hardening
- Add server-side RPC functions for stricter leave calculations.
- Add audit trail table for decision history.
- Add email notifications via Supabase Edge Functions.
- Add pagination and advanced analytics (or BI dashboard).
