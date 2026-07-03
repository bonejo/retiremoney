# 退休财务规划 · BC Retirement Planner

为BC省华裔退休人士打造的多页面财务规划工具。管理房产、投资、支出，自动生成
收入/税务分析、GIS/OAS 预测、资产预测与遗产规划。所有数据仅保存在浏览器
localStorage，不上传服务器。

## 技术栈
- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Router
- Zustand（`persist` → localStorage）
- Recharts

## 开发
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 类型检查 + 生产构建
npm run lint       # tsc --noEmit
```

## 已实现（Phase 1 + 部分 Phase 2/3）

| 页面 | 路由 | 状态 |
|------|------|------|
| 欢迎页 | `/` | ✅ |
| Profile 设置（3步） | `/setup` | ✅ |
| 主仪表板（KPI + 30年图表 + 提醒） | `/dashboard` | ✅ |
| 房产管理（7-Tab 表单，Mortgage/出租/地税自动计算） | `/properties` | ✅ |
| 投资账户（TFSA / 非注册 / GIC / 家庭借款） | `/investments` | ✅ |
| 支出管理（房产自动导入 + 手动录入） | `/expenses` | ✅ |
| 收入总览 + GIS/OAS 计算器 | `/income` | ✅ |
| 税务摘要（近似估算） | `/tax` | ⚠️ Phase 1 近似，分档计算待 Phase 2 |
| 资产预测（参数滑块 + 数据表） | `/projections` | ✅ |
| 遗产规划（资本利得税 + Probate 表） | `/estate` | ✅ 基于当前市值 |
| 全局设置（假设参数 + 导入/导出/清除） | `/settings` | ✅ |

## 核心计算逻辑（`src/utils/`）
- `mortgageCalc.ts` — 加拿大房贷半年复利 → 月利率换算、还清年龄、剩余利息、逐年摊销
- `gisCalc.ts` — GIS 净收入测试（股息 ×1.38、资本利得 ×50%、HELOC Line 22100 抵扣、TFSA 计 $0）、OAS 分档
- `propertyCalc.ts` — 地税自动计算、房产净值、出租净收入（按面积分摊费用，T776）
- `projectionCalc.ts` — 逐年资产/负债预测
- `estateCalc.ts` — 主要住所豁免、资本利得税、BC Probate
- `incomeCalc.ts` / `expenseCalc.ts` — 收入/支出聚合

## 目录结构
```
src/
├── components/   common · property · investment · gis · charts · layout
├── pages/        11 个页面
├── store/        5 个 Zustand store（localStorage 持久化）
├── utils/        计算逻辑
├── hooks/        useProjection · useDerivedIncome
├── constants/    bcTaxRates2026（2026 默认假设参数）
└── types/        全部数据模型接口
```

## 待完成（后续 Phase）
- 税务页：完整联邦/BC 分档计算 + DTC 抵免
- 通胀区分「今天的钱 / 未来的钱」名义值↔实际值切换
- 情景对比（方案 A vs B 虚线叠加）
- GIS 优化智能建议扩展
- 打印报告视图
- 移动端侧边栏抽屉（当前 `md` 以下隐藏侧栏）
