# ccfantasy
fantasy games with bros

# Sports Fantasy – README（产品路线 & 仓库开发手册 v1）

> 学习路线：**先主流（React/Next.js + TS）→ 再重构（SvelteKit）**；后端逻辑模块化，支持 **Go/Rust** 替换计分/导入等微服务。本文既是产品路线图，也是开发手册。

---

## 0. 产品目标与范围

* **MVP 目标（4–6 周）**：实现英超 Fantasy 玩法——朋友间可玩：建房→选阵容（预算内）→锁阵→录入赛果→自动算分→排行榜（周/月/赛季）→分享链接/二维码。
* **首发范围（P0）**：邮箱/手机号登录、房间创建/加入、阵容编辑（预算/位置限制）、锁阵、管理员导入赛果（CSV/表单）、计分与排行榜（周榜每周选 3 场赛事、月榜、赛季榜）、实时刷新。
* **扩展（P1）**：第三方数据 API、房间聊天、多赛事（英超+NBA）、反作弊、赛季跨房间榜。

---

## 1. 技术栈与部署策略

* **前端/全栈**：Next.js（TypeScript, App Router）+ Tailwind CSS + shadcn/ui（按需）
* **API**：Next.js Route Handlers（MVP 阶段简单高效）
* **数据库/认证/实时/存储**：Supabase（PostgreSQL）
* **部署**：Vercel（前端+API）+ Supabase（DB/Auth/Realtime/Storage/Edge Functions）
* **测试**：Vitest（TS 逻辑）、Go test（后续）、Pytest（导入器）
* **包管理**：pnpm
* **代码规范**：ESLint + Prettier + commitlint + Husky（pre-commit/CI）
* **域名**：可选，Vercel 自带或绑定自有域名（几十元/年）
* **运维压力**：低（托管平台自动扩展，主要工作是数据维护与配置）

---

## 2. 核心玩法（英超 Fantasy）

* **球员定价**：`players.price` 字段存储，每赛季初导入定价（预算单位百万英镑）。
* **预算上限**：`rooms.budget` 设置，例如 100M；阵容总价不可超预算。
* **位置限制**：按英超 Fantasy 规则（例：GK 2, DEF 5, MID 5, FWD 3）。
* **周榜**：每周选定 3 场赛事计入总分。
* **月榜**：当月全部纳入赛事总分。
* **赛季榜**：整个赛季累计总分。

---

## 3. 数据库扩展（预算 & 排行榜）

```sql
alter table public.rooms add column budget int not null default 100;
alter table public.players add column price int not null;
alter table public.fixtures add column gameweek int;
alter table public.fixtures add column season text;

create table if not exists public.room_period_rules (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  period_type text check (period_type in ('week','month','season')),
  period_key text not null,
  fixture_ids uuid[] not null,
  created_at timestamptz default now(),
  unique(room_id, period_type, period_key)
);

create table if not exists public.leaderboards (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  scope text check (scope in ('week','month','season')),
  period_key text not null,
  user_id uuid references public.profiles(id) on delete cascade,
  points int not null,
  detail jsonb not null,
  calculated_at timestamptz default now(),
  unique(room_id, scope, period_key, user_id)
);
```

---

## 4. API 草案

```
GET    /api/leaderboard?room_id=&scope=week&key=2025-W34
GET    /api/leaderboard?room_id=&scope=month&key=2025-08
GET    /api/leaderboard?room_id=&scope=season&key=2025-26
POST   /api/leaderboard/recalc   # body: { room_id, scope, key }
```

---

## 5. 产品路线（阶段任务）

**阶段 1（第 1–2 周）**

* 环境搭建：Next.js + Supabase 项目初始化
* 基础数据表创建（rooms, players, fixtures）
* 房间创建/加入 API 与前端页面
* 导入球员定价 CSV（初始英超球员池）
* 阵容编辑器（预算+位置限制）

**阶段 2（第 3–4 周）**

* 锁阵逻辑（比赛前冻结阵容）
* 周榜配置管理（选择 3 场赛事）
* 计分函数（TS 纯函数 + 单测）
* 排行榜计算与 API（周/月/赛季）
* 前端排行榜展示（实时刷新）

**阶段 3（第 5–6 周）**

* MVP 部署（Vercel + Supabase）
* 种子用户测试与反馈修正
* 优化交互与错误提示
* 可选接入 EPL 数据 API（赛程+球员动态价格）

---

## 6. 后续优化（P1）

* 房间聊天与互动功能
* 多赛事支持（NBA 等）
* 反作弊（频繁换阵、IP 检测）
* 赛季跨房间总榜
* 阵容价值曲线、转会次数限制

---

## 7. 数据更新与维护

* **MVP 阶段**：管理员 CSV 导入/更新球员定价与赛果
* **自动化阶段**：接 EPL 官方/第三方 API 自动更新
* **价格变动**：按表现每周 ±0.1\~0.3 手动调整或规则化调整
