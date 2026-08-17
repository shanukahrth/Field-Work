# FieldPro — Field Work Management System (FWMS)

A modern, responsive Field Work Management System: Bootstrap 5 / HTML5 / CSS3
/ vanilla JS — **100% static, no backend code, no build step**. The only
external piece is a free [Supabase](https://supabase.com) project, whose
auto-generated REST API the browser calls directly for shared, persistent
data. That means the whole app — including everything under `js/` — can be
hosted anywhere that serves plain files, including **GitHub Pages**.

Every page still only ever talks to the `API` object in `js/data.js` —
that object makes `fetch()` calls straight to Supabase instead of
`localStorage` or any custom server, but no other file changed shape.

## Demo accounts

All accounts use the password `password123`.

| Role         | Email                        |
|--------------|-------------------------------|
| Super Admin  | admin@fwms.com                |
| Manager      | priya.manager@fwms.com        |
| Manager      | david.manager@fwms.com        |
| Employee     | ravi.employee@fwms.com        |
| Employee     | sarah.employee@fwms.com       |
| Employee     | mohammed.employee@fwms.com    |
| Employee (disabled) | nadia.employee@fwms.com |

Quick-login buttons for the first three accounts are on the login screen.

## Getting started

Two one-time steps — a database and a place to host static files — then
you're done. No CLI tooling, no npm, no build.

**1. Create the database (5 minutes, once):**
1. Sign up at [supabase.com](https://supabase.com) and create a new project (free tier).
2. Open the **SQL Editor** in the Supabase dashboard, paste in the entire contents of `supabase/schema.sql` from this repo, and click **Run**. That single file creates all six tables, sets up access policies, and loads the demo dataset.
3. Go to **Project Settings → API**. Copy your **Project URL** and your **anon / publishable** key.

**2. Point the app at it:**
1. Open `js/data.js` and fill in the two constants near the top:
   ```js
   const SUPABASE_URL = 'https://your-project-ref.supabase.co';
   const SUPABASE_ANON_KEY = 'your-anon-or-publishable-key';
   ```
2. Commit that change.

**3. Host the static files — GitHub Pages:**
1. Push this repo to GitHub (or use **Add file → Upload files** in the browser if you don't use git — see below).
2. In the repo, go to **Settings → Pages**, set **Source** to your main branch (root), and save.
3. GitHub gives you a live URL in a minute or two. Open it and sign in with one of the demo accounts above.

That's the entire deployment. No CLI, no dependencies, no functions, no
migrations — just two files (`supabase/schema.sql` and the two constants
in `js/data.js`) and a place to serve HTML.

> **Uploading via the browser instead of git?** Upload the *contents* of
> this folder (not the folder itself) so `index.html` ends up at the repo
> root — see the note in the project structure section below.

> **Data is shared**, not per-browser: everyone who opens the deployed URL
> is reading/writing the same Supabase project, which is what makes "add
> my real team" actually work across everyone's devices.

> **Resetting the demo data.** Run `API.system.resetDemoData()` in the
> browser console any time to wipe every table back to the seeded demo
> dataset (dates recomputed relative to right now).

> **Security note.** This is a prototype: the Supabase policies in
> `schema.sql` allow full read/write access to anyone who has the site's
> anon key, which is visible in the browser (same level of openness the
> app has always had — it never had server-side auth checks). Don't put
> real sensitive data in here without writing real row-level-security
> policies first.

## Project structure

```
fwms/
├── index.html                 Login page
├── employee-dashboard.html    Employee dashboard
├── manager-dashboard.html     Manager dashboard
├── admin-dashboard.html       Super Admin dashboard
├── employee-management.html   Manager/Admin: create & manage employees
├── manager-management.html    Super Admin: create & manage managers
├── employee-profile.html      Individual employee profile
├── work-log.html              Work log module
├── daily-planner.html         Daily checklist / planner
├── tasks.html                 Task management (table + kanban)
├── calendar.html               FullCalendar view (tasks/logs/reminders)
├── reminders.html              Reminder system
├── reports.html                Chart.js dashboards
├── supabase/
│   └── schema.sql              Tables + access policies + demo data — paste into Supabase's SQL Editor once
├── css/
│   └── style.css               Design tokens, layout, components, dark mode
└── js/
    ├── data.js                 API layer — calls Supabase's REST API directly (fill in your project URL/key here)
    ├── auth.js                 Session handling & role guards
    ├── app.js                  Shared shell: sidebar, topbar, toasts, theme
    ├── login.js
    └── <page>.js                One controller script per page
```

If you upload via GitHub's web UI rather than git, drag in `index.html`,
`css/`, `js/`, `supabase/`, `assets/`, and `README.md` so they land at the
repo root — dragging the outer `fwms` folder in as one item nests
everything one level too deep and GitHub Pages won't find `index.html`.

## Architecture notes

**Everything goes through `API` in `js/data.js`.** Every read/write in the
app calls a method on the `API` object (e.g. `API.tasks.getForUser(id)`),
and every method returns a `Promise`. Internally, each method calls
Supabase's auto-generated REST API (PostgREST) directly — no custom
backend code exists anywhere in this project.

**Schema.** `supabase/schema.sql` creates six tables — `users`, `tasks`,
`workLogs`, `reminders`, `plannerItems`, `activityFeed` — with column
names in `camelCase` on purpose, matching the field names `js/data.js`
already sends and expects, so there's no snake_case translation layer to
maintain. The one exception is the planner's sort-order field, stored as
`"sortOrder"` because `order` is a reserved word in Supabase's query
syntax; `js/data.js` maps it back to `order` before it reaches the rest of
the app.

**Roles.** Users have a `role` of `super_admin`, `manager`, or `employee`,
and employees/managers carry a `managerId` (or `null`). Route guarding
happens client-side via `Auth.requireAuth()`. Passwords are stored in
plain text, which is fine for this prototype but should be hashed (and
moved behind Supabase Auth, ideally) before this goes anywhere near
production.

## Design system

- **Palette:** royal blue `#3457D5` (primary), teal `#14B8A6` (success /
  accent), amber `#F59E0B` (pending), red `#EF4444` (overdue / danger).
- **Type:** Sora for headings/brand, Inter for body and UI text.
- **Components:** reusable stat cards, status pills, priority dots, and a
  left-accent-bar convention used consistently for tasks (blue), work logs
  (teal), reminders (violet) and overdue items (red) across the dashboard,
  calendar legend and reports.
- **Dark mode:** toggled from the topbar, persisted in `localStorage`, and
  implemented with Bootstrap 5.3's `data-bs-theme` attribute plus a set of
  CSS custom properties in `css/style.css`.

## Notes on the prototype

- File attachments are placeholders: the UI accepts a file and stores its
  name only, ready to be swapped for real upload handling (e.g. Supabase
  Storage).
- Browser notifications for reminders require you to grant permission when
  prompted (or via the banner on the Reminders page).
- `js/data.old.js` and `js/data.netlify-blobs.old.js` are earlier versions
  of this file from previous iterations (`localStorage`-only, then Netlify
  Blobs) — kept for reference only, neither is loaded by any page.
