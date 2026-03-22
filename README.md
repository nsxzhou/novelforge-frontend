# InkMuse Frontend

基于 Vite + React 18 + TypeScript + Tailwind CSS 的单用户本地 AI 小说创作前端。

## 技术栈

| 类别 | 技术 |
|------|------|
| 构建 | Vite 6、TypeScript 5.8 |
| 框架 | React 18、React Router 6 |
| 状态 | TanStack React Query 5 |
| 编辑器 | Tiptap 3（富文本）|
| 样式 | Tailwind CSS 3、Inter 字体 |
| 表单 | React Hook Form 7、Zod 3 |
| 动画 | Framer Motion 12（仅 tab 指示器/dialog 入场） |
| 图标 | Lucide React |
| 测试 | Vitest（当前覆盖纯逻辑模块）+ `build` / `lint`；Playwright 依赖与脚本仍为预留 |

## 快速启动

```bash
npm install
cp .env.example .env   # 默认后端地址 http://127.0.0.1:8080/api/v1
npm run dev
```

## 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 本地开发服务 |
| `npm run build` | 生产构建（tsc + vite） |
| `npm run preview` | 预览构建产物 |
| `npm run lint` | ESLint 检查（zero-warning 策略） |
| `npm run test` | 运行当前已提交的 Vitest 单测（以纯逻辑模块为主） |
| `npm run test:e2e` | 预留 Playwright 命令；当前仓库未提交测试配置 |

## 前后端交互方式

- API Base 来自 `VITE_API_BASE_URL`，默认值是 `http://127.0.0.1:8080/api/v1`。
- 普通 JSON 请求统一走 `shared/api/http-client.ts` 的 `request()`；统一处理超时、错误体解析和 `X-User-ID` 注入。
- 文件导出走同一客户端里的 `requestRaw()`，由 `shared/api/export.ts` 负责下载文件流与 `Content-Disposition` 文件名解析。
- 流式接口统一走 `shared/api/sse-client.ts`；章节生成、章节续写、章节改写、Ghost Text、灵感 brainstorm、资产生成都通过 SSE 消费。
- SSE done/result 事件在进入 UI 前会通过 `shared/api/runtime-schemas.ts` 做运行时校验；格式不合法会直接报错，而不是静默吞掉。
- 当前前后端共享元数据有两层：
  `shared/api/generated/contracts.ts` 由后端 `contractgen` 生成，提供资产 schema 映射和默认关系类型配置。
  `shared/api/types.ts` 和 `shared/api/runtime-schemas.ts` 负责前端静态类型与运行时校验。
- 当前关键契约：
  `CharacterState.relationships` 是结构化数组，不再是 string DTO。
  Provider 列表展示字段是 `api_key_masked`，表单提交字段仍是 `api_key`。
  关系图、关系编辑器和关系展示优先消费 `/relation-types` 返回的配置，生成文件只作为默认回退。

## 路由

| 路径 | 组件 | 说明 |
|------|------|------|
| `/` | HomePage | 项目仪表盘：统计卡片 + 三列看板（草稿/进行中/已归档） |
| `/new-project` | InspirationPage | 新建项目中心：AI 组合创建或手动创建 |
| `/projects/:projectId` | ProjectWorkbenchPage | 项目工作台：概览 / 设定工坊 / 章节 / 记忆层 / Prompts / 知识图谱 / 指标（全屏，不含 AppShell） |
| `/write/:chapterId` | WritePage | 沉浸式写作工作台：全屏编辑器 + 可折叠侧栏（全屏，不含 AppShell） |
| `/settings` | SettingsPage | 全局设置：LLM Provider 管理 |
| `*` | NotFoundPage | 404 |

## 目录结构

```text
src/
├── app/                    # 路由定义、React Query 配置
├── pages/                  # 页面组件
│   ├── home-page.tsx       #   仪表盘（统计 + 看板）
│   ├── project-workbench-page.tsx
│   ├── settings-page.tsx
│   └── not-found-page.tsx
├── features/               # 业务模块
│   ├── inspiration/        #   新建项目中心（组合式 + 手动创建）
│   ├── assets/             #   资产管理（CRUD + AI 生成 + 结构化表单）
│   ├── chapters/           #   章节编辑（Tiptap 编辑器 + AI 续写/改写 + AI 评审）
│   ├── knowledge-graph/    #   知识图谱（力导向图可视化 + 节点 CRUD + 同步）
│   ├── metrics/            #   成本看板（统计卡片 + CSS 柱状图）
│   ├── memory/             #   记忆工作区（状态/时间线/图谱三视图 + 关系编辑）
│   ├── prompts/            #   Prompt 模板管理
│   ├── projects/           #   项目编辑面板
│   └── llm-providers/      #   LLM Provider 配置
└── shared/
    ├── api/                # HTTP 客户端、SSE 客户端、类型定义、各域 API 函数
    ├── ui/                 # 基础组件（AppShell、Button、Card、Dialog、Tabs 等）
    ├── lib/                # 工具函数（cn、motion、error-message）
    └── config/             # 环境变量
```

## 布局

顶部导航栏 + 居中工作区（`max-w-5xl`），由 `AppShell` 统一包裹：

- **导航栏**：PenTool 图标 + "InkMuse" 标识、仪表盘/设置链接
- **移动端**：导航折叠为 hamburger menu

## 设计系统

采用 **scheme-05-minimal** 极简设计语言：

| Token | 值 | 用途 |
|---|---|---|
| background | `#FAFAFA` | 页面背景 |
| foreground | `#0F172A` | 主文字、主色 |
| muted | `#F1F5F9` | 次级背景 |
| muted-foreground | `#64748B` | 次级文字 |
| border | `#E2E8F0` | 边框 |

设计约束：不使用阴影、不使用渐变、标题字重 300（light）、过渡统一 150ms。

## 功能清单

- **仪表盘**：项目总数/章节总数/总字数统计，按状态分组的看板视图
- **新建项目**：双入口创建中心；支持组合式条件生成 3 个候选方案并选择性落库大纲/世界观/主角种子，也支持直接手动创建项目
- **设定工坊**：资产 CRUD、AI 流式生成（生成后自动打开编辑面板供预览修改）、按类型过滤，角色 DNA 结构化表单、世界观分区表单、结构化 ↔ 原始文本切换
- **章节编辑**：Tiptap 富文本编辑器（排版/撤销/重做）、AI Ghost Text 续写建议、选中文本触发改写、草稿手动保存、当前稿确认/取消确认（有未保存编辑时禁用确认按钮，防止确认旧内容）
- **章节生成**：AI 生成/续写/局部改写，流式输出
- **记忆工作区**：三视图（角色状态 / 时间线 / 关系图谱）、按章节或最新状态浏览、结构化关系编辑、覆盖风险显式提示、图上交互式增删改关系（RelationModal）
- **章节评审**：AI 多维度评审面板（逻辑一致性/角色忠实度/节奏感/文笔质量 + 总评），评分进度条 + 颜色编码
- **Prompt 管理**：查看/覆盖/重置项目级 Prompt 模板（后端对变量名做白名单校验，拒绝引用不存在的变量）
- **LLM 配置**：Provider 增删改查、启用/禁用切换
- **导出**：项目导出为 Markdown、纯文本或 EPUB 文件下载
- **知识图谱**：角色-地点-事件-物品关系网络可视化（react-force-graph-2d 力导向图），节点 CRUD + 从现有数据同步构建
- **消痕润色**：AI 文本风格优化，SSE 流式输出，原文与润色后文本并排对比，支持采纳或放弃
- **视角过滤**：章节创建时可指定 POV 角色，生成时自动过滤非 POV 角色可感知的信息
- **成本看板**：token 消耗、生成次数、成功率、平均耗时统计，按日趋势 CSS 柱状图，按类型/项目分组
- **响应式**：桌面顶部导航 / 移动端 hamburger menu

## 已知限制

### 契约生成仍不完整

- 当前生成层只覆盖资产 schema 映射和默认关系类型配置
- 共享 DTO 与 SSE runtime schema 仍有一部分手写维护
- 若后续扩展更多接口字段，仍可能出现“生成元数据已更新，但运行时校验未同步”的漂移风险

### 跨章节数据依赖

- MemoryPanel 独立拉取全量 chapters/assets，不再依赖父组件传入（避免 200 条截断限制）
- 父组件（ProjectWorkbenchPage）仍保留独立的数据加载，但 React Query 通过相同 queryKey 自动去重，不产生重复 HTTP 请求
- Assets 使用不同 queryKey 属于设计意图

### 人工修订覆盖风险（已缓解）

- `character_states` 和 `timeline_events` 新增 `source` 字段（`'extracted'` | `'manual'`）
- 提取时仅删除 `source='extracted'` 的记录，手动创建或编辑的记录标记为 `source='manual'` 不受影响
- UX 层面已更新提示文案，反映当前保护策略

### 流式内容校验边界

- SSE 的 done/result 事件已做 runtime schema 校验
- `content` 增量事件仍按纯文本块消费，不做逐块 schema 校验
- 若后续引入结构化 progress event，需要同步补充事件级 schema

## Roadmap / 原型差异

`ui-designs/` 目录包含产品原型（HTML），以下为尚未实现的原型页面：

| 原型 | 描述 | 差异 |
|---|---|---|
| `03-split-editor.html` | AI 分屏对比编辑器 | 当前改写以 popover 形式呈现，无 diff 高亮对比 |

## Roadmap

### 已完成 ✓

| 项目 | 实现位置 |
|------|----------|
| **首页统计优化** | `shared/api/stats.ts` + 后端 `/api/v1/stats` 聚合接口 |
| **记忆工作区** | `features/memory/memory-panel.tsx` 三视图（状态/时间线/图谱）+ 结构化编辑 |
| **灵感工作台增强** | `features/inspiration/` 多轮对话式灵感探索和头脑风暴功能 |
| **覆盖风险提示** | `features/memory/memory-panel.tsx` overwrite 风险显式提示 |

### 近期：编辑器体验增强

1. **AI 分屏对比编辑器** — 基于 Tiptap diff 扩展，左右并排展示原文与 AI 改写结果，新增内容绿色高亮、删除内容红色划线，支持逐段接受或拒绝。当前改写以 popover 形式呈现，无法直观对比。

### 已完成 ✓（Phase 2）

| 项目 | 实现位置 |
|------|----------|
| **关系图交互编辑** | `features/memory/graph/relation-modal.tsx` 图上直接增删改关系 |
| **章节质量评审面板** | `features/chapters/components/review-panel.tsx` AI 多维度评分展示 |
| **沉浸式写作工作台** | `pages/write-page.tsx` 独立 `/write/:chapterId` 全屏路由 |

### 已完成 ✓（Phase 3）

| 项目 | 实现位置 |
|------|----------|
| **知识图谱可视化** | `features/knowledge-graph/` 力导向图 + 节点 CRUD + 同步构建 |
| **消痕润色面板** | `features/chapters/components/polish-panel.tsx` SSE 流式 + 原文对比 |
| **视角角色选择** | `features/chapters/chapters-panel.tsx` POV 选择器 + 章节列表 POV 标签 |
| **EPUB 导出** | `shared/api/export.ts` 导出下拉增加 EPUB 选项 |
| **成本看板** | `features/metrics/` 统计卡片 + CSS 柱状图（无图表库依赖） |

### 远期：高级交互

6. **AI 修改消痕对比增强** — 在消痕润色基础上增加 diff 高亮标注修改位置，支持逐段选择性采纳。
7. **伏笔管理** — 伏笔 CRUD + 时间线可视化（章节序列横轴、伏笔条目纵轴、状态颜色编码）。
