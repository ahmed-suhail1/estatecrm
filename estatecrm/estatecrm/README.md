# EstateCRM

A fast, modern, realtime CRM for a small real estate office (5–15 agents).
Built with Next.js 14 (App Router), Supabase (Postgres + Realtime + Storage),
React Query, Tailwind, and Radix primitives.

---

## 1. Quick Start

### 1.1 Create a Supabase project
1. Go to [supabase.com](https://supabase.com) → New Project (free tier is enough).
2. Open **SQL Editor** and run the three files in `supabase/migrations/` **in order**:
   - `0001_core_schema.sql`
   - `0002_audit_triggers.sql`
   - `0003_seed_and_rls.sql`
3. Go to **Project Settings → API** and copy the **Project URL** and **anon public key**.
4. Edit the seed agents in `0003_seed_and_rls.sql` (or just edit them later in
   Settings → Office Roster in the app) to match your real team.

### 1.2 Configure the app
```bash
cp .env.local.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 1.3 Run it
```bash
npm install
npm run dev
```
Open http://localhost:3000. On first visit you'll be asked "Who's using
EstateCRM?" — pick your name from the roster.

### 1.4 Deploy
Push to GitHub, import into [Vercel](https://vercel.com), add the two env
vars in Vercel's dashboard, deploy. Since this is an internal tool, consider
putting it behind your office VPN or a shared password (Vercel's
Password Protection feature on Pro plans, or a middleware check) — see
§5 Security below.

---

## 2. Why these architecture choices

### 2.1 No traditional user accounts — "device-remembered identity"
Real per-user auth (passwords, resets, sessions) is pure overhead for 5–15
trusted people sharing an internal tool. Instead:

- On first visit, the browser has no stored identity → a full-screen picker
  shows every agent as a big tappable avatar.
- The chosen identity (`{id, name, avatar_color}`) is persisted to
  **localStorage** via a Zustand store (`lib/stores/agent-store.ts`) and
  auto-resumes on every future visit from that device/browser.
- **"Switch Agent"** in the profile menu (top right) clears it and re-opens
  the picker — for shared office computers.
- Every mutation goes through `lib/mutations/properties.ts`, which reads the
  current agent id and stamps `created_by` / `updated_by` / `agent_id` — so
  "every action records who performed it" is enforced structurally in one
  place, not left to be remembered at each call site.
- An optional 4-digit PIN (`agents.pin_hash`) is supported in the schema for
  offices that want light protection against a coworker accidentally
  switching to your identity — this is a soft deterrent appropriate for a
  trusted internal tool, not real security.

This is deliberately **not** real authentication. See §5 for how to add a
lightweight office-wide gate if you're worried about the app being public.

### 2.2 Database: one audit trigger, not scattered app code
"Nothing should ever be silently overwritten" is implemented with Postgres
triggers (`supabase/migrations/0002_audit_triggers.sql`) that fire on every
`properties` insert/update and write to:
- `property_events` — human-readable timeline ("Price changed from $250k to
  $265k")
- `property_versions` — full JSON snapshot of the row, enabling **restore**

Doing this in the database (not in application code) means the timeline is
guaranteed complete no matter which code path makes the change — the UI,
a future admin script, or a bulk import — rather than trusting every
developer to remember to log every field change by hand.

### 2.3 Search: two-tier (Postgres FTS + Fuse.js)
- All non-deleted properties are fetched once (cached, realtime-invalidated)
  and searched **client-side** with Fuse.js for instant, typo-tolerant,
  multi-field fuzzy search (title, address, owner phone, agent, tags, price,
  property code, etc.) — zero network latency per keystroke.
- The schema also has a Postgres `tsvector` + GIN index (`0001_core_schema.sql`)
  and trigram indexes for phone/address, ready to switch to server-side
  search (`lib/hooks/use-property-search.ts` is the single place to swap the
  strategy) if your listing count grows into the tens of thousands.

### 2.4 Realtime
A single Supabase Realtime channel (`lib/hooks/use-realtime-sync.ts`)
subscribes to `properties`, `property_notes`, `property_events`,
`activity_feed`, `tasks`, `favorites`, and `notifications`, and invalidates
the relevant React Query caches on any change from any connected browser.
With 5–15 users this refetch-on-invalidate approach is simpler and far less
bug-prone than hand-rolled cache patching, while still feeling instant.

### 2.5 Duplicate detection
Postgres `pg_trgm` trigram similarity powers `find_similar_owners` and
`find_similar_properties` SQL functions — as you type a phone number, name,
or address into the New Property / New Owner forms, a live warning banner
shows likely existing matches with links to view them.

### 2.6 Map
Uses **MapLibre GL** with free CARTO basemap tiles instead of the Google
Maps JS SDK — no API key, no billing setup required, and it still supports
everything asked for (markers, popups, click-to-open). The property record
still stores `lat`/`lng` and links out to Google Maps for turn-by-turn/street
view, satisfying the "Google Maps location" requirement without forcing you
to manage a Google Cloud API key for an internal tool.

### 2.7 Soft deletes everywhere
Properties, owners, and notes use `deleted_at` instead of `DELETE`, so the
activity feed and timelines never reference a vanished row.

---

## 3. Project structure

```
app/                    Next.js App Router pages (route = folder)
  properties/           list, [id] detail, [id]/edit, new
  owners/                list, [id] detail
  tasks/ map/ favorites/ activity/ settings/
components/
  ui/                    design-system primitives (Button, Card, Dialog...)
  agent/                 identity picker + profile/switch-agent menu
  properties/            card, form, gallery, timeline, notes, version history
  owners/ tasks/ dashboard/ activity/ notifications/ search/ layout/
lib/
  supabase/client.ts     single browser Supabase client
  stores/agent-store.ts  the identity system (see §2.1)
  mutations/properties.ts  all writes go through here (agent stamping)
  hooks/                 React Query hooks per domain (properties, owners,
                          tasks, dashboard stats, favorites, realtime, search)
  validation/            zod schemas
  providers/              React Query + theme providers
types/database.ts        TypeScript types mirroring the SQL schema exactly
supabase/migrations/     the entire database, in 3 ordered SQL files
```

Everything is grouped by domain, not by technical layer — the whole
"Property" feature (card, form, timeline, notes...) lives in one folder, so
extending it later means touching one place.

---

## 4. What's built vs. natural next steps

**Fully built:** agent identity system, property CRUD with full validation,
image upload/gallery, immutable timeline, version history + restore,
@mention notes, favorites, recently viewed, tasks, owners with
call/WhatsApp shortcuts, fuzzy multi-field search + filters, duplicate
detection, map view, realtime sync across all connected clients, live
notifications, dashboard, dark mode, mobile-responsive layout with bottom
nav, command palette (⌘K).

**Natural next steps** (the architecture is set up so these are additive,
not rewrites):
- Server-side pagination once listing count exceeds ~2–3k (swap the fetch
  in `use-property-search.ts` for the `search_properties` RPC pattern noted
  in the migration comments)
- Bulk CSV import for initial data migration from a spreadsheet
- Print-friendly / PDF export of a listing sheet
- Push notifications (web push) in addition to in-app notifications
- Role-based write restrictions if the office grows past ~15 people and
  wants e.g. junior agents unable to delete listings

---

## 5. Security note

This app currently has **no login wall** — anyone with the URL and the
Supabase anon key (which ships in the client bundle, as is normal for
Supabase) can read/write data, scoped only by the permissive RLS policies
described in `0003_seed_and_rls.sql`. That's an intentional trade-off for
an internal tool prioritizing zero-friction daily use over defense against
external attackers, but you should still put **something** in front of it
since it will be reachable at a public URL:

- Easiest: Vercel Deployment Protection / Password Protection (Pro plan), or
- Put it behind your office VPN / Tailscale, or
- Add a single shared office password gate.

Do **not** treat the agent picker as a security boundary — it's an identity
convenience, not authentication.
