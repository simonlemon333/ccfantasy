# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

```bash
pnpm dev              # Development server with hot reload
pnpm build            # Production build (includes type checking)
pnpm type-check       # TypeScript checking only (tsc --noEmit)
pnpm lint             # ESLint

# E2E tests (Playwright, requires dev server running on localhost:3000)
npx playwright test
npx playwright test tests/api-only.spec.ts    # Run single test file
```

## Architecture

**Tech Stack**: Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + Supabase (PostgreSQL) + pnpm

### Project Structure

- `src/app/` — Next.js App Router pages and API routes
  - `api/` — 59 API route handlers (core business + admin/debug endpoints)
  - `my-team/`, `leagues/`, `players/`, `fixtures/`, `leaderboard/` — User-facing pages
  - `admin/` — Admin dashboard (hidden from normal navigation)
- `src/lib/` — Business logic and data integration
  - `validateLineup.ts` — Fantasy football rule validation (formations, budget, team limits)
  - `scoringRules.ts` — Point calculation algorithms
  - `fplApi.ts` — Fantasy Premier League API client
  - `multiSourceApi.ts` — Multi-source data aggregation (FPL + Football-Data.org)
  - `database.types.ts` — Supabase-generated TypeScript schema
  - `supabase.ts` / `supabaseAdmin.ts` — Database clients (anon vs service role)
  - `auth.ts` — Supabase Auth utilities
- `src/components/` — React components (`Header.tsx`, `Layout.tsx`, `PlayerCard.tsx`, `ui/`)
- `src/hooks/useAuth.ts` — Authentication hook
- `scripts/` — SQL migration and seed files (run in Supabase SQL Editor)
- `tests/` — Playwright E2E tests

### Key Patterns

**API Response Format** — All API routes return `{ success, data?, error?, message? }`.

**Next.js 15 Route Handlers** — Dynamic route params are async:
```typescript
// params type is Promise, must be awaited
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}
```

**Tailwind CSS v4** — CSS-first configuration, no `tailwind.config.js`. Uses `@tailwindcss/postcss` plugin and `@import "tailwindcss"` in CSS.

**Path Aliases** — `@/*` maps to `./src/*`.

**TypeScript** — Strict mode is disabled. Module resolution is `"bundler"`.

### Database Schema (Core Tables)

- `users` — Auth profiles
- `rooms` — Fantasy leagues (budget limits, gameweek tracking)
- `teams` — 20 Premier League teams with branding
- `players` — Player database (positions, prices, stats)
- `lineups` — User team selections with formation data
- `fixtures` — Match schedule and results (380 per season)
- `player_events` — Match events for scoring

### Fantasy Football Rules (validated in `validateLineup.ts`)

- Starting XI: 11 players with valid formation (e.g., 4-4-2, 3-5-2)
- Full squad: 15 players (2 GK, 5 DEF, 5 MID, 3 FWD)
- Budget: £100m total
- Max 3 players per Premier League team
- Captain/vice-captain must be in starting XI

### Data Integration

- **FPL API** (primary, unlimited) — Player stats, prices, gameweek data
- **Football-Data.org** (secondary, 10 req/min) — Match events, detailed fixtures
- Team mapping between APIs uses `short_name` matching as highest priority

### Navigation Structure

- Main nav (all users): 我的球队, 联赛, 球员市场, 比赛赛程, 排行榜
- Admin link appears in user menu only (low-profile `text-xs` link)

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL      # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY # Supabase anonymous key
FOOTBALL_DATA_API_KEY         # Football-Data.org API key
```
