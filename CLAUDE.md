# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development
```bash
# Development server (hot reload enabled)
pnpm dev

# Production build and type checking  
pnpm build

# Type checking only
pnpm type-check

# Linting
pnpm lint
```

### Database Management
```bash
# Run database schema (in Supabase SQL Editor)
scripts/01_initial_schema.sql

# Seed teams data
scripts/02_teams_seed.sql  

# Seed players data (105 Premier League players)
scripts/03_players_seed.sql
```

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 with TypeScript and App Router
- **Styling**: Tailwind CSS v4 (CSS-first configuration)
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Package Manager**: pnpm (specified in packageManager field)
- **Deployment Target**: Vercel + Supabase

### Project Structure

**Core API Routes** (`src/app/api/`):
- `rooms/` - Fantasy league management (create, join, settings)
- `players/` - Player database with filtering and stats
- `lineups/` - Team formation and validation  
- `leaderboard/` - Multi-period rankings (gameweek, total, season)

**Business Logic** (`src/lib/`):
- `validateLineup.ts` - Fantasy football rule validation engine
- `database.types.ts` - Complete TypeScript schema definitions
- `supabase.ts` - Database client configuration

**Key Components** (`src/components/`):
- UI components follow composition patterns
- `Layout.tsx` provides consistent page structure
- `ui/` directory contains reusable design system components

### Database Schema

**Core Tables**:
- `users` - Authentication and profiles
- `rooms` - Fantasy leagues with budget limits and gameweek tracking
- `teams` - Premier League teams (20 teams with branding)
- `players` - Player database with positions, prices, and statistics
- `lineups` - User team selections with formation validation
- `fixtures` - Match schedule and results
- `player_events` - Match events for scoring calculation

**Fantasy Football Rules** (enforced in `validateLineup.ts`):
- Total squad: 15 players (2 GK, 5 DEF, 5 MID, 3 FWD)
- Starting XI: 11 players with valid formations
- Budget limit: £100m total spend
- Team limits: Maximum 3 players per Premier League team
- Captain/Vice-captain: Must be in starting XI

### API Design Patterns

**Request/Response Format**:
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

**Next.js 15 Route Handlers**:
- Dynamic routes use `{ params: Promise<{ id: string }> }` type
- Parameters must be awaited: `const { id } = await params`
- All routes include comprehensive error handling and validation

### Data Integration Strategy

**External APIs**:
- **Primary**: Fantasy Premier League (FPL) API - unlimited requests
- **Secondary**: Football-Data.org - 10 requests/minute (for detailed match events)
- **Future**: balldontlie API for NBA expansion

**Data Lifecycle**:
- Hot data: Current 3-5 gameweeks in Supabase (targeting <500MB limit)
- Cold data: Historical gameweeks archived to local JSON files
- Automatic cleanup: Weekly exports and database maintenance

### Development Notes

**TypeScript Configuration**:
- Path aliases: `@/*` maps to `./src/*`
- Strict mode disabled for learning/prototyping
- Module resolution set to "bundler" for Next.js 15 compatibility

**Tailwind CSS v4**:
- Uses `@tailwindcss/postcss` plugin (not direct tailwindcss)
- CSS imports use `@import "tailwindcss";` syntax
- No separate config file needed (CSS-first approach)

**Environment Variables**:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- Default development values provided in `.env.local`

### Seed Data

**Teams**: All 20 Premier League teams with colors and branding
**Players**: 105 realistic players across 6 major teams (Arsenal, Man City, Liverpool, Chelsea, Man United, Tottenham) with:
- Balanced position distribution
- Realistic pricing (£4.0m - £15.0m)
- Current season statistics

### Testing and Validation

**Business Logic Testing**:
- Lineup validation covers all fantasy football rules
- Formation validation supports 7 common formations (4-4-2, 3-5-2, etc.)
- Price and budget constraint enforcement

**Type Safety**:
- Complete database schema types in `database.types.ts`
- API route parameters and responses fully typed
- Validation functions with TypeScript interfaces

### Project Goals

**MVP Phase**: English Premier League fantasy football with friends
- Room creation and management
- Player selection with budget/position constraints  
- Gameweek-based scoring and leaderboards
- Real-time data from FPL API

**Future Expansion**:
- NBA fantasy integration
- Web3 features (NFT badges, on-chain leaderboard verification)
- Multi-language support
- Advanced analytics and player insights