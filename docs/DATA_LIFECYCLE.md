# 数据生命周期管理策略

## 📊 Supabase 500MB 免费额度优化方案

### 🎯 数据分层存储策略

#### 热数据 (Supabase PostgreSQL)
**保留时间**: 当前 + 最近3个Gameweek  
**估计大小**: 200-300MB  
**更新频率**: 实时/每日

```sql
-- 保留的核心数据
✅ 用户账户和当前阵容
✅ 活跃房间和当前排行榜  
✅ 球员基础信息和当前赛季统计
✅ 最近3个Gameweek的比赛数据
✅ 当前赛季的关键事件和得分
```

#### 温数据 (压缩JSON文件)
**保留时间**: 4-10个Gameweek前  
**存储位置**: `historical_data/gameweeks/`  
**访问方式**: 按需加载到临时表

#### 冷数据 (历史存档)
**保留时间**: 整个历史  
**存储位置**: `historical_data/seasons/`  
**格式**: 压缩JSON + 汇总统计

### 🔄 自动化清理机制

#### 每周清理任务
```typescript
// scripts/weekly-cleanup.ts
export async function weeklyDataMaintenance() {
  const currentGW = await getCurrentGameweek();
  
  // 1. 导出即将过期的数据
  const expiredData = await exportGameweekData(currentGW - 3);
  await saveToFile(`historical_data/gameweeks/2024-25_gw${currentGW-3}.json`, expiredData);
  
  // 2. 清理详细比赛事件
  await cleanupDetailedEvents({ 
    gameweeksBefore: 3,
    keepSummary: true  // 保留汇总统计
  });
  
  // 3. 清理非活跃房间
  await cleanupInactiveRooms({ 
    daysSinceLastActivity: 30 
  });
  
  // 4. 压缩历史文件
  await compressHistoricalFiles();
  
  // 5. 数据库维护
  await optimizeDatabase();
}
```

#### 每日轻量清理
```typescript
// scripts/daily-cleanup.ts  
export async function dailyMaintenance() {
  // 清理临时缓存
  await cleanupTempTables();
  
  // 清理过期会话
  await cleanupExpiredSessions();
  
  // 更新统计缓存
  await refreshStatsCaches();
}
```

### 📁 本地文件结构

```bash
historical_data/
├── gameweeks/           # 历史Gameweek数据
│   ├── 2024-25_gw01.json.gz   # 压缩的完整GW数据
│   ├── 2024-25_gw02.json.gz
│   └── 2024-25_gw03.json.gz
├── seasons/             # 赛季汇总数据  
│   ├── 2023-24_final.json.gz  # 上赛季完整数据
│   └── 2024-25_mid.json.gz     # 当前赛季中期汇总
├── analytics/           # 分析和统计数据
│   ├── player_trends.json     # 球员表现趋势
│   ├── team_performance.json  # 球队统计
│   └── user_patterns.json     # 用户行为模式
└── backups/             # 定期备份
    ├── weekly/          # 每周备份
    └── monthly/         # 每月备份
```

### 🎮 数据访问模式

#### 当前数据查询 (常用)
```typescript
// 直接查询Supabase (快速)
const currentStats = await supabase
  .from('player_gameweek_stats')
  .select('*')
  .gte('gameweek', currentGW - 2);
```

#### 历史数据查询 (偶尔)
```typescript
// 从本地文件加载 (较慢但节约空间)
const historicalData = await loadHistoricalGameweek('2024-25_gw05');
const tempTable = await createTempTable(historicalData);
// 查询后清理临时表
```

### 📈 数据大小估算

#### 单个Gameweek数据量
```bash
核心数据:
- 球员统计: 600球员 × 20字段 ≈ 15KB
- 比赛事件: 10场比赛 × 50事件 ≈ 25KB  
- 用户阵容: 100用户 × 15球员 ≈ 10KB
- 排行榜: 100用户 × 5统计 ≈ 2KB

详细数据:
- 比赛详情: 10场 × 200字段 ≈ 50KB
- 事件时间线: 10场 × 100事件 ≈ 30KB

总计: ~130KB/Gameweek (未压缩)
压缩后: ~30KB/Gameweek
```

#### 赛季总量控制
```bash
活跃数据 (3个GW): 130KB × 3 = 390KB
球员基础信息: ~200KB  
用户和房间数据: ~100KB
系统数据: ~50KB

数据库总使用: ~740KB << 500MB ✅

历史文件: 30KB × 35个GW = 1MB (本地)
```

### 🚨 存储监控和告警

#### 监控指标
```typescript
interface StorageMetrics {
  databaseSize: number;      // 当前数据库大小
  tablesSizes: {            // 各表大小分布
    players: number;
    gameweek_stats: number;
    match_events: number;
    user_lineups: number;
  };
  usagePercentage: number;   // 使用率 (相对500MB)
  lastCleanup: Date;        // 上次清理时间
  nextCleanup: Date;        // 下次清理时间
}
```

#### 自动告警
```typescript
async function checkStorageHealth() {
  const metrics = await getStorageMetrics();
  
  if (metrics.usagePercentage > 80) {
    await sendAlert({
      type: 'storage_warning',
      message: `数据库使用率达到 ${metrics.usagePercentage}%`,
      action: 'trigger_emergency_cleanup'
    });
  }
  
  if (metrics.usagePercentage > 95) {
    await emergencyCleanup();
  }
}
```

### 💾 备份和恢复策略

#### 自动备份
```bash
# 每周完整备份
weekly_backup_$(date +%Y%m%d).sql.gz

# 每日增量备份  
daily_delta_$(date +%Y%m%d).json.gz
```

#### 恢复流程
```typescript
async function restoreHistoricalData(gameweek: number) {
  // 1. 从本地文件读取
  const data = await loadCompressedFile(`gameweeks/2024-25_gw${gameweek}.json.gz`);
  
  // 2. 创建临时表
  const tempTable = await createTempTable(`temp_gw${gameweek}`, data);
  
  // 3. 执行查询
  const results = await queryTempTable(tempTable, query);
  
  // 4. 清理临时表
  await dropTempTable(tempTable);
  
  return results;
}
```

这个数据生命周期管理策略确保了在Supabase免费限制内的长期可持续运营，同时保持了数据的完整性和查询性能。