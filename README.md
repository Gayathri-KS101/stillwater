# Stillwater (Next.js)

A gentle mental wellness check-in journal, converted from a TanStack Router
single-page app to a Next.js (App Router) project.

## What changed in the conversion

- **Routing**: `createFileRoute` → Next.js App Router. The three pages now
  live at `app/page.tsx` (home), `app/checkin/page.tsx`, and
  `app/dashboard/page.tsx`. `Link`/`useNavigate` from TanStack Router were
  swapped for `next/link` and `next/navigation`'s `useRouter`.
- **Data layer**: everything related to journal data — types, the option
  lists used in the check-in flow, and persistence — now lives in a single
  file: **`lib/data.ts`**.
- **Local database**: entries are stored in a real on-device database
  (**IndexedDB**, store name `entries` inside DB `stillwater-db`), not just
  `localStorage`. A `localStorage` mirror (`stillwater:entries`) is kept in
  sync as a fast-read cache and as a fallback for environments where
  IndexedDB isn't available. Nothing is ever sent over the network.
- **Timestamps**: every entry is stamped the moment it's saved —
  `timestamp` (epoch ms, used for sorting/streaks) and `createdAt` (an
  ISO-8601 string, e.g. `2026-06-27T14:32:08.123Z`) capturing the exact date
  *and* time the check-in was completed. If an entry is later edited,
  `updatedAt` records when that happened. The dashboard shows the full
  date + time for each entry (e.g. "Jun 27, 2026 · 2:32 PM"), and the final
  review step of the check-in flow shows the exact moment it's about to be
  saved.

## Project structure

```
app/
  layout.tsx          # fonts, global metadata, toast provider
  page.tsx             # landing page ("/")
  checkin/page.tsx      # multi-step check-in flow ("/checkin")
  dashboard/page.tsx    # streak, charts, entry history ("/dashboard")
  globals.css          # design tokens (glass, gradients, shadows)
components/
  toaster-provider.tsx
  ui/                  # button, textarea, slider, progress, badge
lib/
  data.ts              # types + constants + the local database (IndexedDB)
  utils.ts             # cn() class helper
```

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Where your data lives

Open your browser's DevTools → Application/Storage tab → IndexedDB →
`stillwater-db` → `entries` to see the raw stored entries, each with its
`timestamp`/`createdAt` fields.
