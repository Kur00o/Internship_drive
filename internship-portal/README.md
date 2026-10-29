# Yi MIT-WPU Internship Drive 2026

The application site and organiser desk for the Young Indians (Yi) MIT-WPU student chapter's internship drive: 14 roles from 7 Pune companies, interviews on campus on **Mon 2 and Tue 3 November 2026**.

Live: https://yi-internship-drive.vercel.app

## What is in here

| Route | Who | What |
| --- | --- | --- |
| `/` | Students | Roles by track with an "I study…" filter, where the offices are, how selection works, the two interview days, FAQ from the company answers |
| `/roles/:code` | Students | Full JD for one role (e.g. `/roles/DQR-GFX`), with the link to the original JD in Google Drive |
| `/apply` | Students | One form, up to three ranked roles, resume PDF, D'Quor tasks, availability, declaration. Draft saves on the device |
| `/track` | Students | Status of each application and the interview slot (PRN + email + mobile) |
| `/schedule` | Everyone | Which company interviews on which day, time and room |
| `/organiser` | Core team | Overview, applications (screening, status, resume, history, CSV/company exports), schedule (sessions + automatic slot planning), interview-day board (check-in / done / no-show, live), companies & roles, settings |
| `/company/:token` | Each company | Private dashboard: only that company's applicants, shortlist / decide / rate, resumes, interview list |

Stack: Vite + React 19 + TypeScript + Tailwind v4, Supabase (Postgres, Auth, Storage, Realtime), one Vercel Function (`api/resume.ts`) for company resume links. Type is Jost, self-hosted.

## Supabase

Project: `supabase-cyan-magnet` (`bvogrxgqddabtckoinbo`, Mumbai), created by the Vercel integration. SQL lives in `supabase/migrations/` and has already been applied:

1. `20261028_001_schema.sql` – tables, Operations Plan status values and reason codes, triggers (status log, interview → status), row level security.
2. `20261028_002_functions.sql` – `submit_application`, `track_application`, `public_counts`, company portal RPCs, private `resumes` bucket and its policies.
3. `20261028_003_seed.sql` – the 9 companies and 14 roles from the JD folder plus the companies' answers of 28 Oct.

4. `20261028_004_hardening.sql` – function grants.
5. `20261029_005_slots.sql` – attendance, venues, slot rules (`drive_settings.slot_minutes` etc.) and a unique panel+time index. **Run this before using the Attendance and Slots tabs.**

Interview slots: on the organiser desk, *Attendance* takes a student ID (`STU-0012` or PRN) and, in arrival order, gives that student one slot per company they applied to (30 min slots, 20 min buffer, lunch skipped, all editable under *Slot rules*). Each student's companies are ordered so they finish earliest, which rotates students across companies without gaps. *Slots & venues* shows every slot by company; drag a student to another time (drop on a full slot to swap) and drag a venue onto a company to place it.

Security model:

- Anyone can read companies, roles, sessions and settings. Nobody anonymous can read or write applicants or applications directly; students only go through `submit_application` and `track_application` (PRN + email + mobile must all match).
- Resumes go to a **private** bucket under `incoming/<uuid>/`. Organisers open them with short-lived signed URLs; companies through `/api/resume`, which checks the company token first.
- Organisers are Supabase Auth users whose email is in `public.organizers` (and confirmed).

### Add an organiser

1. Supabase dashboard → Authentication → Users → **Add user** → email + password, tick **Auto Confirm User**.
2. Sign in at `/organiser` as an existing organiser → Settings → add the same email. (The first organiser, `parv.ios17@gmail.com`, is already on the list; create that Auth user first.)

### Give a company its dashboard

Organiser desk → Companies & roles → **Copy** the private link and send it to that company's contact only. **New link** rotates it.

## Environment

The Vercel ↔ Supabase integration already sets everything. The browser build reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `VITE_*` equivalents) and falls back to the public project URL and publishable key. `api/resume.ts` needs `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`) on the server; never expose it to the browser.

## Develop

```bash
cd internship-portal
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
```

Vercel builds this folder (`internship-portal` is the project's Root Directory).

## Photo credits

All via Wikimedia Commons, cropped and colour-adjusted: *MIT WPU campus visible while descending Vetal Hill* by DesiBoy101 (CC BY 4.0); *Baner from Baner Pashan Biodiversity Park* by Rishabh Tatiraju (CC BY-SA 3.0); *Baner hill Pune wonderful evening view* by Naincy555 (CC BY-SA 4.0); *Blue Ridge Office Building at Hinjewadi Pune* by Deepak Patil (CC BY-SA 3.0); *PMPML Rainbow Bhosari Terminal* by Rsrikanth05 (CC BY-SA 4.0). Logos belong to Young Indians / CII and MIT World Peace University.
