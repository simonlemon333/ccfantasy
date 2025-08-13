既然你预计会错过英超首周，我们就锁定 **方案 B（08-23/24 正式试玩）**，这样可以多一周时间完善功能和稳定性。

---

## 抢跑版本发布节点（试玩版 - 方案 B）

**目标**：在 8 月 23/24 周末前，完成可让 3 名用户创建房间、选阵容、查看周榜的 MVP 版本。

### 必须完成的功能（MVP Scope）

1. **房间系统**：创建/加入房间（固定房间 ID 可选），房主可分享房间码。
2. **球员列表**：从 Supabase 获取，支持按 team/position 筛选；价格显示。
3. **阵容编辑**：11 人、预算 100、位置及同队人数限制；提交成功返回 lineupId。
4. **周榜**：基于一轮固定赛程手动录入事件数据进行排名。
5. **种子数据**：`players_seed.sql`、`fixtures_seed.sql` 及事件样例数据，便于快速复盘和测试。

### 可延迟的功能（Beta 再加）

* 用户鉴权（先匿名或统一 token）
* 实时推送（先手动刷新）
* 价格涨跌与复杂计分
* 月榜/赛季榜
* 完整 UI 美化

### 冲刺日程（方案 B）

* **D0｜08-18（周一）**

  * 确认 Alpha Scope；创建 `/api/players` `/api/lineups` `/api/leaderboard` 路由骨架
  * 添加 `scoring.ts` 及 `validateLineup` 基础逻辑
* **D1｜08-19**

  * Supabase 建表：`players`（10–20 样例数据）
  * 完成 `GET /api/players`（支持简单筛选）
  * 前端 `/players` 页：SWR 拉取 + 筛选 UI
* **D2｜08-20**

  * 阵容编辑器 V1：选择/移除/预算显示
  * `POST /api/lineups` + 基础校验
  * Thunder/Postman 接口测试脚本
* **D3｜08-21**

  * 添加 `fixtures`、`events` 表；录入一轮赛程和事件数据
  * 编写 `calcPoints` 聚合函数及 `GET /api/leaderboard`
* **D4｜08-22（功能冻结）**

  * 完成种子数据脚本与错误处理优化
  * **三人联调彩排**（记录并修复关键问题）
* **D5｜08-23（上线试玩）**

  * 部署到 Vercel，邀请 2 位朋友端到端试玩
* **D+1｜08-24（反馈与热修）**

  * 根据试玩反馈进行修补，准备进入 Beta 阶段

### 验收标准

* 三人 10 分钟内可完成：创建房间 → 选阵容 → 提交 → 刷新榜单
* 错误提示清晰，限制条件有效
* 一轮事件数据可复盘，得分与排名可复现
* 可一键重置种子数据

### 风险与应对

* 如赛程变动或数据源不稳，采用手工录入事件数据
* 没有 Redis 时用内存缓存保证响应速度
* 先保证“能玩”，工程化优化留到 Beta 阶段

---

## 方案 B 已锁定（8/23–24 正式试玩）

> 所有里程碑以 2025-08-23/24 为试玩周末对齐，以下为最新冲刺计划与可落地文件清单。

### 冲刺日程（对齐 8/23/24）

* **D0｜08-11（今晚）**：定版 Alpha Scope；创建 3 条 API 骨架；`scoring.ts`/`validateLineup` 基线；`.env.example`。
* **D1｜08-12**：Supabase `players` 表与 10–20 条样例；完成 `GET /api/players`；前端 `/players` + 筛选。
* **D2｜08-13**：阵容编辑器 v1；`POST /api/lineups` + 基础校验；Thunder/Postman 用例 3 条。
* **D3｜08-15**：`fixtures`/`events` 简化表；写入 1 个 gameweek 样例；`GET /api/leaderboard?scope=week&key=GW1`（mock→真实）。
* **D4｜08-18（功能冻结－1）**：种子脚本；错误与 Loading/Empty 统一；榜单页；一次端到端走查。
* **D5｜08-21（功能冻结）**：修复最高优先级问题；补使用说明页与演示房间；预发彩排。
* **D6｜08-23（Sat，软上线）**：邀请 2 位朋友进行 3 人端到端试玩；收集问题。
* **D+1｜08-24（Sun，回收/热修）**：修 1–2 个关键问题；产出复盘与下周计划。

### 文件清单（可直接创建粘贴）

**API**

* `src/app/api/players/route.ts`（GET 列表，D1）
* `src/app/api/lineups/route.ts`（POST 提交，D2）
* `src/app/api/leaderboard/route.ts`（GET 周榜，D3）
* `src/app/api/health/route.ts`（Supabase 连接检测，D1）

**Lib**

* `src/lib/supabase.ts`（D1）
* `src/lib/scoring.ts`（`calcPoints`、`validateLineup`，D0）
* `src/lib/env.ts`（zod 环境校验，可选）

**Seed / SQL**

* `scripts/players_seed.sql`（30+ 球员，含 team/position/price）
* `scripts/fixtures_seed.sql`（1 个 gameweek 的赛程）
* `scripts/events_gw1.sql`（GW1 事件样例）

**前端页面**

* `src/app/players/page.tsx`（列表与筛选，D1）
* `src/app/lineup/page.tsx`（阵容编辑与提交，D2）
* `src/app/leaderboard/page.tsx`（榜单查看，D4）

### 验收标准（不变）

* 10 分钟内完成：建房→选阵→提交→看周榜。
* 校验提示清晰可修正；一轮数据可复盘；种子数据一键重置。

> 如果你确认了，我可以：
> 1）把这套节点同步回 `STUDY_GUIDE.md`；
> 2）一次性输出上述 **初始化代码模板**（API/Lib/页面/SQL 种子），你直接拷进仓库即可跑。


## 远程试玩部署指南

你可以完全远程分享这个试玩版，只要在部署时做好以下几点：

1. **选择线上部署平台**

   * Vercel（推荐，Next.js 项目无缝部署）
   * 或 Render / Railway / 自建 VPS

2. **准备测试用环境**

   * 独立一个 `.env` 文件放线上版本的 Supabase URL 和匿名 Key
   * 在 Supabase 里创建专用测试数据库 Schema，避免污染正式数据

3. **部署步骤（以 Vercel 为例）**

   * GitHub 仓库连接 Vercel
   * 设置 Environment Variables（对应 `.env`）
   * 部署 `main` 或 `alpha` 分支

4. **测试用户访问**

   * 部署完成后生成 URL（如 `https://ccfantasy.vercel.app`）
   * 测试者只需用浏览器访问即可，无需本地环境

5. **注意事项**

   * 初期用匿名鉴权或固定 token（避免复杂注册流程）
   * 数据清空可用 SQL 脚本快速重置（例如 `scripts/reset_seed.sql`）
   * 提前彩排一轮端到端操作，确保访问流畅

---

## 试玩版 Milestone

**Milestone 1 – 基础环境与框架搭建（2 天）**

* 完成 Node.js + pnpm + Next.js 环境配置
* 配置 TypeScript、ESLint、TailwindCSS
* 建立基本文件结构（src/app、components、lib、types、styles）

**Milestone 2 – 基础业务逻辑（3 天）**

* 用户注册与登录（Supabase Auth）
* 创建与加入房间（Room 创建 API）
* 简单的玩家数据结构（用户 ID、昵称）

**Milestone 3 – 核心玩法 MVP（3 天）**

* 手动添加比赛数据（英超赛程）
* 球员选择机制（每人限预算选球员）
* 简单积分规则（进球、助攻）

**Milestone 4 – UI 与交互优化（2 天）**

* 玩家列表与积分榜
* 基本页面路由（房间页、球员选择页、排行榜页）
* TailwindCSS 样式优化

**Milestone 5 – 线上部署与测试（1 天）**

* Vercel 部署测试环境
* 邀请至少 3 位测试玩家参与
* 收集反馈并修复关键问题

> 目标：即便错过首周，也能在英超赛季初期推出可玩的 3 人试玩版，让规则、UI 和数据流验证通过，为后续迭代打基础。


