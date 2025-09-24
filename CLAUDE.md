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

**Critical Data Integrity Fixes (2025-08-18)**:
- **Team Mapping Resolution**: Fixed fundamental team mapping issues between Football-Data.org API and database
- **Algorithm Improvement**: Prioritize short_name matching over complex name algorithms for 100% mapping success
- **Complete Fixtures Restoration**: Successfully restored all 380 Premier League fixtures (38 gameweeks × 10 matches)
- **Manchester Teams Fix**: Resolved missing Manchester United/City fixtures through improved mapping logic

**Debugging Tools Created**:
- `/api/admin/debug-team-mapping` - Comprehensive team mapping analysis
- `/api/admin/debug-manchester-mapping` - Manchester teams specific debugging
- `/api/admin/fix-team-mapping` - Automated team mapping corrections
- `/api/admin/restore-fixtures-fixed` - Improved fixtures restoration with zero data loss
- `/api/admin/check-teams` - Real-time database team status verification

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
- **External API Integration Types**: Strongly typed Football-Data.org API responses and mapping functions

### Critical System Fixes & Improvements

**Team Mapping Crisis Resolution (2025-08-18)**:
This section documents a critical data integrity issue discovered and resolved, serving as reference for future debugging and system improvements.

**Problem**: User reported "曼联没有比赛" (Manchester United has no fixtures), "切尔西映射了两场" (Chelsea mapped twice), "每轮都少一场" (each round missing one match).

**Root Cause**: Team mapping algorithm in fixtures restoration prioritized complex name matching over simple short_name matching, causing:
- "Manchester United FC" → "Man Utd" mapping failures
- "Nottingham Forest FC" → "Nott'm Forest" mismatches  
- Extra teams in database (Leicester, Ipswich, Southampton) causing confusion

**Solution Implemented**:
```typescript
// Before: Complex name matching (unreliable)
const findTeamId = (teamName: string) => {
  // Priority 1: Full name match - often fails
  // Priority 2: Partial name match - unreliable
  // Priority 3: Short name match - should be Priority 1
}

// After: Short name priority matching (100% reliable)
const findTeamId = (teamName: string, teamShortName?: string) => {
  // Priority 1: Direct short name match - most reliable
  if (teamShortName) {
    const team = dbTeams?.find(t => t.short_name === teamShortName);
    if (team) return team.id;
  }
  // Priority 2-4: Fallback matching strategies
}
```

**Results Achieved**:
- ✅ 380 fixtures restored (100% success rate, 0 skipped)
- ✅ All 20 Premier League teams with exactly 38 fixtures each
- ✅ Manchester United/City fixtures fully restored (74 total Manchester fixtures)
- ✅ Perfect team mapping: 20/20 Football-Data.org teams successfully matched

**Administrative Tools Created**:
```bash
# Debugging & Analysis Tools
/api/admin/debug-team-mapping          # Full team mapping analysis
/api/admin/debug-manchester-mapping    # Manchester teams specific debug
/api/admin/check-teams                 # Database team status verification

# Resolution & Restoration Tools  
/api/admin/fix-team-mapping            # Automated mapping corrections
/api/admin/restore-fixtures-fixed      # Improved zero-loss fixtures restoration
```

**Key Learning**: User feedback like "这个id真的好不方便啊" (these IDs are really inconvenient) often points to fundamental architectural issues. The UUID complexity vs simple short_name debate reflects broader usability vs "standard practice" tensions in system design.

### Interface Cleanup & User Experience Reform (2025-09-25)

This section documents a comprehensive interface reorganization based on user feedback about confusing navigation and overwhelming admin buttons.

**问题识别 (Problem Analysis)**:
User feedback: "我的数据管理页面和比赛赛程页面有太多重复和没必要的按钮了 甚至我是不是不应该有数据管理页面呢 这个也是需要李青的 到底什么是排行榜什么是联赛 需要定义一下"

**Root Issues**:
- 赛程页面混入12个管理员按钮，普通用户体验混乱
- 功能重复：数据同步按钮在多个页面出现
- 概念模糊：联赛、排行榜、数据管理职责不清
- 导航混乱：管理功能对所有用户可见

**解决方案实施 (Solution Implementation)**:

**1. 比赛赛程页面简化 (`/fixtures`)**:
```typescript
// 移除内容:
- 所有12个管理员按钮 (同步、调试、清理等)
- 复杂的系统状态面板
- 结算管理链接
- 用户权限检查逻辑

// 保留内容:
- 轮次选择器
- 基本刷新按钮
- 比赛列表和详情模态框
- 比赛事件查看功能

// 结果: 界面清爽，专注于赛程查看
```

**2. 数据管理页面增强 (`/admin`)**:
```typescript
// 新增功能区域:
- 系统状态监控 (Teams/Players/Fixtures count)
- 赛程管理专区 (简化更新、快速更新、调试)
- 高级管理功能 (数据清理、过期数据处理)
- 智能建议系统 (基于syncStatus.recommendations)

// 页面结构:
1. 系统状态监控卡片
2. 赛程管理卡片
3. 球员数据同步卡片
4. 高级管理功能卡片
5. 系统说明文档

// 结果: 管理员功能集中化，专业化
```

**3. 导航栏重组 (`Header.tsx`)**:
```typescript
// 主导航栏 (所有用户可见):
- 我的球队
- 联赛
- 球员市场
- 比赛赛程
- 排行榜

// 用户菜单 (仅登录用户):
- 欢迎信息
- "管理" 小链接 (text-xs, 低调)
- 退出登录

// 移动端菜单:
- 主导航项目
- "系统管理" 按钮 (仅登录用户)

// 结果: 清晰的功能层级，管理功能不干扰普通用户
```

**4. 概念澄清与定义**:
```markdown
核心概念重新定义:

- **我的球队** = 个人阵容管理中心
- **联赛** = 创建/加入朋友间的竞赛房间 (rooms)
- **球员市场** = 浏览和选择球员数据库
- **比赛赛程** = 查看真实足球比赛时间表
- **排行榜** = 显示联赛内或全球的积分排名
- **系统管理** = 管理员专用后台工具 (隐藏入口)
```

**实施结果 (Implementation Results)**:
- ✅ 比赛赛程页面从臃肿变为清爽 (12个按钮 → 1个刷新按钮)
- ✅ 数据管理页面成为完整的管理中心 (4个专业区域)
- ✅ 导航栏实现用户角色分离 (普通用户vs管理员)
- ✅ 用户流程概念清晰化，消除功能重复

**代码文件变更**:
- `src/app/fixtures/page.tsx` - 大幅简化，移除所有管理逻辑
- `src/app/admin/page.tsx` - 全面增强，添加4大功能区域
- `src/components/Header.tsx` - 导航重组，管理功能隐藏化

**Key Learning**: "太多重复和没必要的按钮" 反映了功能边界不清的系统设计问题。通过明确每个页面的核心职责，可以大幅提升用户体验的清晰度。

### Current Implementation Status (Updated: 2025-09-24)

**✅ Fully Implemented Core Features**:
- **User Authentication** - Supabase Auth with email/password
- **Player Database** - 741 Premier League players with complete stats
- **Fixtures System** - 380 matches across 38 gameweeks, fully synchronized
- **Squad Editor** - 11-player formation system with budget/position constraints
- **Room Management** - Create/join leagues with participant limits
- **Global Leaderboard** - Points-based ranking system (fixed Sept 2024)
- **Responsive UI** - Mobile-first design with hamburger navigation (fixed Sept 2024)
- **Admin Tools** - Comprehensive debugging and data management suite
- **Real-time Data Sync** - FPL API + Football-Data.org integration

**🔧 Recent Critical Bug Fixes (Sept 2024)**:
- Mobile hamburger menu functionality restored
- Position slot JavaScript errors eliminated (safe null checking)
- Leaderboard API 400 errors fixed (global leaderboard support)
- Cross-device responsive design improvements

**✨ Interface Cleanup & UX Improvements (Sept 25, 2024)**:
- **比赛赛程页面简化**: 移除了12个混乱的管理员按钮，普通用户界面清爽专注
- **数据管理页面增强**: 添加系统状态监控、赛程管理区域和高级管理功能
- **导航栏优化**: 将管理功能从主导航移到用户菜单，清晰区分普通用户和管理员功能
- **用户体验改善**: 简化了用户流程，解决了功能重复和界面混乱问题

**⚡ Beyond MVP Features Delivered**:
- **Automated Data Pipeline** - Zero-manual CSV import, full API automation
- **Advanced Admin Dashboard** - 25+ debugging/management endpoints
- **Multi-source Data Integration** - FPL + Football-Data.org with fallback logic
- **Formation System** - 7 tactical formations (4-4-2, 3-5-2, etc.)
- **Team Mapping Engine** - Resolved complex team name matching issues
- **Draft Auto-save** - Local storage with conflict resolution

### Project Goals

**Original MVP Vision** (from README.md):
- Room-based fantasy with manual CSV data management
- 15-player squads (2 GK, 5 DEF, 5 MID, 3 FWD)
- Weekly 3-match selection system
- Manual fixture result entry

**Actual MVP Delivered**:
- Fully automated fantasy platform with real-time data
- 11-player tactical squads with formation system
- Complete gameweek scoring (all matches count)
- Zero-maintenance data synchronization

**Future Expansion**:
- NBA fantasy integration
- Web3 features (NFT badges, on-chain leaderboard verification)
- Multi-language support
- Advanced analytics and player insights

## User Story Deviation Analysis

This section documents significant differences between the original product vision (README.md) and actual implementation, analyzing the reasons and impact of each deviation.

### 🔍 Major Deviations

**1. Player Pricing System**
- **Original Plan**: Manual `players.price` field with CSV import
- **Actual Implementation**: Real-time FPL API pricing with automatic sync
- **Impact**: ✅ **Positive** - Eliminated manual maintenance, always current prices
- **Reason**: FPL API provided superior, real-time pricing data

**2. Squad Composition Rules**
- **Original Plan**: 15-player squads (2 GK, 5 DEF, 5 MID, 3 FWD)
- **Actual Implementation**: 11-player tactical formations (1 GK + formation-based)
- **Impact**: ⚖️ **Mixed** - More tactical depth, less bench strategy
- **Reason**: Simplified UI/UX, aligned with standard fantasy formats

**3. Weekly Match Selection**
- **Original Plan**: Each week select 3 specific matches for scoring
- **Actual Implementation**: All gameweek matches count toward total
- **Impact**: 🔄 **Neutral** - Different strategic focus, arguably simpler
- **Reason**: Eliminated complex match selection UI, standard FPL approach

**4. Data Management Philosophy**
- **Original Plan**: CSV imports, manual fixture entry by admins
- **Actual Implementation**: Fully automated API synchronization
- **Impact**: ✅ **Highly Positive** - Zero maintenance burden, real-time accuracy
- **Reason**: Available APIs eliminated need for manual processes

**5. Leaderboard Scope**
- **Original Plan**: Room-focused rankings primarily
- **Actual Implementation**: Global leaderboards with optional room filtering
- **Impact**: ⚖️ **Mixed** - Broader competition, less intimate room feel
- **Reason**: API design naturally supported global scope

### 📈 Unplanned Value-Add Features

**Advanced Admin Tools Suite**:
- 25+ debugging endpoints for data integrity
- Automated team mapping resolution
- Comprehensive fixture restoration tools
- Real-time database health monitoring

**Multi-Source Data Integration**:
- Primary: FPL API (unlimited requests)
- Secondary: Football-Data.org (rate-limited, detailed events)
- Intelligent fallback and conflict resolution

**Enhanced User Experience**:
- Draft auto-save with local storage backup
- Mobile-responsive design with touch optimization
- Formation preview system
- Captain/vice-captain visual indicators

### 🎯 Alignment Assessment

**Core Vision Maintained**: ✅
- English Premier League fantasy football ✅
- Friends-based competitive gameplay ✅
- Budget/position constraints ✅
- Gameweek-based scoring ✅

**Implementation Philosophy Shift**:
- **From**: Manual, controlled, simple
- **To**: Automated, comprehensive, feature-rich

**Net Result**: A more sophisticated product than originally envisioned, with higher automation and lower maintenance needs.