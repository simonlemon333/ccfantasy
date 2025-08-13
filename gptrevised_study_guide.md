# Fantasy Sports Study Guide - 56 Day Journey（REST + Next.js 优化版）

> 目标：每天学到的知识当天就能在 `ccfantasy` 项目里落地。先跑 **mock 接口** → 接 **Supabase** → 加 **业务规则**。三大主接口：`players` / `lineups` / `leaderboard` 全程贯穿。

---

## 使用说明

* 每天包含 **Learning**（理论）+ **Practice**（编码）+ **Checkpoint**（达标）
* 勾选 ✅ 表示完成；遇到问题记录在 LEARNING.md
* 技术路线：**Next.js App Router + REST + Supabase**

---

## Week 1：JS/TS 基础 & 项目初始化

### Day 1：JavaScript 基础 & 项目初始化

**Learning Goals**：ES6+、Next.js 结构、pnpm/Corepack

**Morning Study (1h)**

* 学：`let/const`、箭头函数、解构、模板字符串
* 看：Modern JavaScript 速成视频
* 练：控制台写 5 个 ES6+ 例子

**Practice (2h)**

```bash
pnpm create next-app@latest ccfantasy --typescript --tailwind --eslint --app --src-dir
cd ccfantasy && pnpm dev
```

* [ ] 初始化 GitHub 仓库并推送
* [ ] 新建 `src/components/Welcome.tsx` 并在首页使用

**Checkpoint**：本地启动成功，首页显示自定义组件。

---

### Day 2：TypeScript 基础 & 公共类型

**Learning Goals**：TS 基本类型、`interface` vs `type`

**Practice (2h)**

```ts
// src/types/index.ts
export interface Player {
  id: string;
  name: string;
  team: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  price: number;
}

export interface Lineup {
  id: string;
  userId: string;
  players: string[]; // player IDs
  budget: number;
}

export interface LeaderboardEntry {
  userId: string;
  points: number;
}
```

* [ ] 首页用 mock 数组渲染一个球员列表（类型安全）

**Checkpoint**：前端能渲染类型安全的球员表。

---

### Day 3：Next.js API Routes（REST 入门）

**Learning Goals**：API 路由、GET/POST

**Practice (2h)**

```ts
// src/app/api/players/route.ts
import { NextResponse } from 'next/server';
import { Player } from '@/types';

const mockPlayers: Player[] = [
  { id: '1', name: 'Saka', team: 'ARS', position: 'MID', price: 9.0 },
  { id: '2', name: 'Haaland', team: 'MCI', position: 'FWD', price: 14.0 }
];

export async function GET() {
  return NextResponse.json(mockPlayers);
}
```

* [ ] 首页通过 `fetch('/api/players')` 渲染列表

**Checkpoint**：能从 API 获取并显示 mock 数据。

---

## Week 2：REST 基础 & 接入 Supabase

### Day 4：Supabase 初始化 + 连接测试

**Practice (2h)**

```bash
pnpm add @supabase/supabase-js
```

```ts
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

* [ ] `.env.local` 填入 `NEXT_PUBLIC_SUPABASE_URL` 与 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
* [ ] 新建 `/api/health`，返回 Supabase 连接状态

**Checkpoint**：API 能正确访问 Supabase。

---

### Day 5：Players 表 & GET 接口（真实数据）

**Practice (2h)**

* Supabase 建表 `players(id, name, team, position, price)` 并插入 5 条数据

```ts
// src/app/api/players/route.ts
import { supabase } from '@/lib/supabase';
export async function GET() {
  const { data, error } = await supabase.from('players').select('*');
  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data);
}
```

* [ ] 首页渲染数据库数据；支持 `?team=ARS` 筛选（前端先过滤）

**Checkpoint**：`/api/players` 返回真实 DB 数据。

---

### Day 6：Lineups POST 接口（基本校验）

**Practice (2h)**

```ts
// src/app/api/lineups/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Lineup } from '@/types';

export async function POST(req: NextRequest) {
  const body: Lineup = await req.json();
  const errors: string[] = [];
  if (body.players.length !== 11) errors.push('必须选择 11 名球员');
  if (body.budget > 100) errors.push('预算超出 100');
  if (errors.length) return NextResponse.json({ ok: false, errors }, { status: 400 });
  // TODO: 写入 Supabase
  return NextResponse.json({ ok: true, id: 'mock-1' }, { status: 201 });
}
```

* [ ] 用 Thunder Client/Postman 测试提交 JSON

**Checkpoint**：接口能做基本验证并返回结果。

---

### Day 7：Leaderboard GET（Mock 聚合）

**Practice (2h)**

```ts
// src/app/api/leaderboard/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get('scope'); // week|month|season
  const key = searchParams.get('key');
  return Response.json({ scope, key, items: [{ userId: 'u1', points: 87 }] });
}
```

* [ ] 前端新增排行榜页面，按 scope 展示

**Checkpoint**：能按 scope 显示 mock 榜单。

---

## Week 3：数据库写入 & 三大接口完善

### Day 8：Players API 完整版

* [ ] `POST /api/players`：向 Supabase 插入球员（含 zod 校验）
* [ ] `GET /api/players?team=ARS&pos=FWD`：后端支持条件筛选
* [ ] 加索引：`position, team, price`

### Day 9：Lineups API 接入数据库

* [ ] `POST /api/lineups`：保存到 Supabase（用户维度；预留 auth）
* [ ] 校验规则：预算、位置人数（GK1-2/DEF3-5/MID2-5/FWD1-3）、同队上限
* [ ] 返回结构：`{ ok, lineupId, errors[] }`

### Day 10：Leaderboard API 接入数据库

* [ ] 设计简化得分表（周/月/赛季）并写聚合查询
* [ ] `GET /api/leaderboard?scope=week&key=2025-W34` 返回真实数据
* [ ] 简单缓存（内存 Map 或 Edge 可选）

### Day 11-12：前端联调

* [ ] 首页球员列表 → 阵容编辑（budget/position 校验） → 提交阵容
* [ ] 排行榜页面展示

### Day 13-14：测试与打磨

* [ ] `scoring` & `validateLineup` 写成纯函数并做单测（Vitest）
* [ ] 错误处理与 Loading/Empty 状态

---

## 附录：公共工具与脚本

**环境变量校验（可选 zod）**

```ts
// src/lib/env.ts
import { z } from 'zod';
const Env = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10),
});
export const env = Env.parse(process.env);
```

**计分与校验（纯函数便于复用/测试）**

```ts
// src/lib/scoring.ts
export type Event = { goals?: number; assists?: number; cleanSheet?: boolean; red?: boolean };
export function calcPoints(e: Event) {
  return (e.goals??0)*4 + (e.assists??0)*3 + (e.cleanSheet?4:0) + (e.red?-3:0);
}

export function validateLineup(players: {position: 'GK'|'DEF'|'MID'|'FWD'; price:number; team:string}[], budget=100) {
  const limits = { GK:[1,2], DEF:[3,5], MID:[2,5], FWD:[1,3] } as const;
  const errors:string[] = [];
  if (players.length !== 11) errors.push('必须选择 11 名球员');
  const sum = players.reduce((s,p)=>s+p.price,0);
  if (sum > budget) errors.push(`预算超出：${sum}/${budget}`);
  const count = (pos:'GK'|'DEF'|'MID'|'FWD') => players.filter(p=>p.position===pos).length;
  (['GK','DEF','MID','FWD'] as const).forEach(p=>{
    const [min,max] = limits[p];
    const c = count(p);
    if (c<min || c>max) errors.push(`${p} 数量应在 ${min}-${max}`);
  });
  return { ok: errors.length===0, errors };
}
```

**package.json 脚本建议**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "vitest"
  }
}
```

---

## 每日/每周复盘模板

**Daily Checklist**

```markdown
## Day X: [Topic]
- [ ] Morning study (1h)
- [ ] Coding practice (2h)
- [ ] Tasks completed
- [ ] Evening review (30m)
- [ ] Checkpoint passed
- [ ] Notes updated
```

**Weekly Review**

```markdown
## Week X Review
**Completed**:
**Challenges**:
**Key Learnings**:
**Code Quality**:
**Next Week Goals**:
```

---

*Last Updated: 2025-08-11*

# Fantasy Sports Study Guide - 56 Day Journey（REST + Next.js 优化版）

> 目标：每天学到的知识当天就能在 `ccfantasy` 项目里落地。先跑 **mock 接口** → 接 **Supabase** → 加 **业务规则**。三大主接口：`players` / `lineups` / `leaderboard` 全程贯穿。

---

## Week 4：核心玩法实现

### Day 13-14：球员选择 UI

**Learning Goals**：复杂表单状态、UI 交互

* [ ] 创建 `src/hooks/useTeamSelection.ts` 管理阵容选择、预算、位置限制
* [ ] 在 `src/components/TeamSelection.tsx` 渲染 11 个位置槽位和候选球员列表
* [ ] 实现球员添加/移除交互

**Checkpoint**：可视化编辑阵容，并实时显示剩余预算与位置数量。

---

### Day 15-16：比赛结果系统

**Learning Goals**：比赛数据录入、计分逻辑

* [ ] Supabase 新建 `matches` 表（含主队、客队、比分、进球、助攻等）
* [ ] 编写 `/api/matches`（POST 创建、GET 查询）
* [ ] 在 `src/lib/scoring.ts` 扩展 `calcPoints`，支持进球/助攻/零封/红牌

**Checkpoint**：能录入比赛并计算球员得分。

---

### Day 17-18：排行榜系统

**Learning Goals**：聚合查询、得分汇总

* [ ] Supabase 建 `scores` 表，记录每位用户每轮总分
* [ ] `/api/leaderboard` 根据 scope（周/月/赛季）聚合排序
* [ ] 加缓存层（内存或 Redis 可选）

**Checkpoint**：访问 `/leaderboard` 页面可显示真实榜单。

---

### Day 19-20：实时更新

**Learning Goals**：Supabase Realtime、前端订阅

* [ ] 为 `matches` 和 `scores` 表开启实时订阅
* [ ] 前端通过 Supabase client 监听变化并自动更新 UI
* [ ] 增加 Loading/空状态

**Checkpoint**：比赛结果录入后，前端榜单自动刷新。

---

### Day 21：Week 4 集成与测试

* [ ] 全流程测试：球员选择 → 阵容提交 → 比赛结果 → 榜单刷新
* [ ] 补充 Vitest 单测（`scoring`、`validateLineup`）
* [ ] 优化错误处理与用户提示

**Checkpoint**：核心玩法无重大 Bug，三大接口稳定运行。

---

## Week 5-6：高级功能

### Day 22-24：用户房间与联赛系统

* [ ] Supabase 建 `rooms` 表，支持私有/公开房间
* [ ] `/api/rooms`（POST 创建、GET 列表、POST 加入）
* [ ] 前端房间管理页（创建、加入、退出）

### Day 25-27：赛程管理

* [ ] Supabase 建 `fixtures` 表，存储比赛时间与参与球队
* [ ] `/api/fixtures`（CRUD）
* [ ] 前端赛程展示与筛选

### Day 28-30：数据导入与批量操作

* [ ] CSV 导入球员数据（POST `/api/players/import`）
* [ ] 数据校验（zod）与批量插入
* [ ] 进度与错误提示

---

## Week 7-8：优化与扩展

### Day 31-35：性能优化

* [ ] 数据查询加索引、分页
* [ ] API 响应缓存
* [ ] 前端组件懒加载与代码分割

### Day 36-40：安全与权限

* [ ] 接入 Supabase Auth 保护接口
* [ ] 基于用户的阵容/房间访问控制
* [ ] API Rate Limiting

### Day 41-45：UI 与用户体验

* [ ] Tailwind UI 组件替换基础样式
* [ ] 动画与交互优化
* [ ] 移动端适配

### Day 46-50：部署与监控

* [ ] 部署到 Vercel（前端）+ Supabase（后端 DB）
* [ ] 错误监控（Sentry）
* [ ] 日志与健康检查

### Day 51-56：复盘与扩展

* [ ] 项目代码重构与文档完善
* [ ] 准备开源 README、使用指南
* [ ] 思考下一阶段：Fastify/NestJS 重构、GraphQL、tRPC 等

---

*Last Updated: 2025-08-12*
