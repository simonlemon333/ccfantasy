# ccfantasy
fantasy games with bros

# Sports Fantasy – README（产品路线 & 仓库开发手册 v1）

> 学习路线：**先主流（React/Next.js + TS）→ 再重构（SvelteKit）→ 再拓展到 Web3（Solidity 等）**；后端逻辑模块化，支持 **Go/Rust** 替换计分/导入微服务，并可在后期引入区块链功能。本文既是产品路线图，也是开发手册。

---

## 0. 产品目标与范围

* **MVP 目标（4–6 周）**：实现英超 Fantasy 玩法——朋友间可玩：建房→选阵容（预算内）→锁阵→录入赛果→自动算分→排行榜（周/月/赛季）→分享链接/二维码。
* **首发范围（P0）**：邮箱/手机号登录、房间创建/加入、阵容编辑（预算/位置限制）、锁阵、管理员导入赛果（CSV/表单）、计分与排行榜（周榜每周选 3 场赛事、月榜、赛季榜）、实时刷新。
* **扩展（P1）**：第三方数据 API、房间聊天、多赛事（英超+NBA）、反作弊、赛季跨房间榜。
* **扩展（P2 / Web3）**：基于 Solidity 的链上功能，例如：

  * 链上存储赛季成绩快照（防篡改）
  * 发行房间内专属 NFT（战队徽章、赛季奖牌）
  * 用代币进行虚拟奖励结算（非真实货币，学习智能合约为主）

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
* **Web3 扩展**：Solidity（智能合约）+ Hardhat/Foundry + Ethers.js（前端交互）+ 测试网（Polygon Mumbai / Sepolia）

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

**阶段 4（P2 – Web3 扩展）**

* 学习 Solidity 基础与智能合约结构
* 使用 Hardhat/Foundry 部署测试合约到测试网（Polygon Mumbai / Sepolia）
* 链上记录赛季排行榜哈希（防篡改存证）
* 发行 NFT 奖牌（ERC-721）给赛季前三名
* 前端接入 Ethers.js 读取合约数据、展示 NFT

---

## 6. 后续优化（P1）

* 房间聊天与互动功能
* 多赛事支持（NBA 等）
* 反作弊（频繁换阵、IP 检测）
* 赛季跨房间总榜
* 阵容价值曲线、转会次数限制

---

## 6+. Web3 / Solidity 扩展（可选并行路线）

> 原则：**先 Web2 MVP**，Web3 功能作为“增量模块”并行开发；不改变核心玩法闭环，不涉及真钱交易（仅虚拟积分/NFT 徽章）。

### A. 目标与边界

* **去中心化可验证**：将关键结果（如房间配置、周/月/赛季榜摘要）上链存证。
* **社交资产化**：发放不可转让/可转让的 **NFT 徽章**（参加、周榜 Top3、赛季冠军等）。
* **钱包登录（可选）**：在邮箱/手机号之外，支持 **钱包登录（SIWE）**。
* **坚持“无现金池”**：不发币、不托管资金，平台积分仅 off-chain 记录，避免合规风险。

### B. 技术选型（推荐）

* **链**：Polygon / Base / opBNB（三选一，低 gas、生态成熟）。
* **合约开发**：Foundry 或 Hardhat；合约语言 **Solidity**（^0.8.x）。
* **前端连接**：wagmi + viem + RainbowKit（Next.js 生态最佳实践）。
* **签名规范**：SIWE（Sign-In with Ethereum）或 EIP‑4361；后续可扩展 AA（EIP‑4337）做 Gasless。
* **索引**：The Graph（可选）或简易事件抓取器。

### C. 仓库结构新增

```
contracts/                # Solidity 合约
  ├─ FantasyRegistry.sol  # 房间/赛季摘要存证 & 事件
  ├─ FantasyBadge.sol     # ERC-1155 NFT 徽章（或 SBT）
  └─ script/              # 部署脚本（Foundry/Hardhat）
apps/web/                 # 前端集成 wagmi/viem
packages/contracts/abi/   # 导出的 ABI（前端消费）
```

### D. 合约最小化设计

* **FantasyRegistry**（只存摘要 & 事件，链上不做重计算）

  * `function putDigest(bytes32 key, bytes32 digest, string calldata uri)`：

    * `key` 示例：`keccak256(roomId|scope|periodKey)`（如 room‑123|week|2025‑W34）
    * `digest`：后端对排行榜 JSON 计算的哈希（如 keccak256）
    * `uri`：指向 off-chain 明细的链接（如 IPFS / HTTPS）
  * 事件：`DigestPut(key, digest, uri, by, blockTime)`
* **FantasyBadge (ERC‑1155)**：

  * 徽章类型：`JOINED`, `WEEK_TOP3`, `MONTH_TOP3`, `SEASON_CHAMPION` 等（以 tokenId 区分）
  * 仅管理员（房主/平台签名）可批量 `mint` 指定地址名单
  * 可选：改为 **SBT（soulbound）**（不可转让）以减少投机性

**Solidity 示例（节选）**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract FantasyRegistry {
    event DigestPut(bytes32 indexed key, bytes32 digest, string uri, address indexed by);
    address public owner;
    mapping(bytes32 => bytes32) public digests;

    modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; }
    constructor() { owner = msg.sender; }

    function putDigest(bytes32 key, bytes32 digest, string calldata uri) external onlyOwner {
        digests[key] = digest;
        emit DigestPut(key, digest, uri, msg.sender);
    }
}
```

### E. 前后端流程（签名 & 存证）

1. 后端生成 **排行榜 JSON** → 计算 `digest = keccak256(jsonBytes)`。
2. 服务器用平台签名钱包调用 `FantasyRegistry.putDigest(key, digest, uri)`。
3. 前端展示排行榜时：

   * 读取链上 `digest` 并对本地 JSON 再哈希 → 一致则显示“已上链验证 ✅”。
4. 赛季结束：批量 **mint NFT 徽章** 给获奖玩家地址；前端个人页展示徽章集。

### F. 钱包登录（SIWE）

* 作为 **可选登录方式** 与 Supabase Auth 并存。
* 账户绑定：用户在“设置”页将钱包地址绑定到现有账号，避免小号滥用。

### G. 安全与合规提示

* 不设现金奖池、代币发行或托管用户资产。
* 所有链上写入仅为 **摘要/纪念品**，不影响计分与排名的真实计算（真实计算仍在后端/数据库）。
* 管理员钱包做好私钥托管（硬件钱包 / 多签），测试网先行，逐步灰度到主网。

### H. 迭代路线

* **v1.0（Web2）**：现有 MVP 闭环。
* **v1.1（可选）**：接入钱包登录（SIWE），展示地址绑定。
* **v1.2**：上链周/月/赛季榜 **摘要存证**（可验证）。
* **v1.3**：发放 **NFT 徽章**（ERC‑1155/SBT）。
* **v2.0（研究项）**：探索 AA Gasless / 二层网络优惠 / 去中心化数据索引。

---

## 7. 数据更新与维护

* **MVP 阶段**：管理员 CSV 导入/更新球员定价与赛果
* **自动化阶段**：接 EPL 官方/第三方 API 自动更新
* **价格变动**：按表现每周 ±0.1\~0.3 手动调整或规则化调整
* **MVP 阶段**：管理员 CSV 导入/更新球员定价与赛果
* **自动化阶段**：接 EPL 官方/第三方 API 自动更新
* **价格变动**：按表现每周 ±0.1\~0.3 手动调整或规则化调整
