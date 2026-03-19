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

## 路由

| 路径 | 组件 | 说明 |
|------|------|------|
| `/` | HomePage | 项目仪表盘：统计卡片 + 三列看板（草稿/进行中/已归档） |
| `/new-project` | InspirationPage | 新建项目中心：AI 组合创建或手动创建 |
| `/projects/:id` | ProjectWorkbenchPage | 项目工作台：概览 / 设定工坊 / 章节 / 记忆层 / Prompts 五个 Tab |
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
│   ├── chapters/           #   章节编辑（Tiptap 编辑器 + AI 续写/改写）
│   ├── memory/             #   记忆工作区（状态/时间线/图谱三视图）
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
- **记忆工作区**：三视图（角色状态 / 时间线 / 关系图谱）、按章节或最新状态浏览、结构化关系编辑、覆盖风险显式提示
- **Prompt 管理**：查看/覆盖/重置项目级 Prompt 模板（后端对变量名做白名单校验，拒绝引用不存在的变量）
- **LLM 配置**：Provider 增删改查、启用/禁用切换
- **导出**：项目导出为 Markdown 或纯文本文件下载
- **响应式**：桌面顶部导航 / 移动端 hamburger menu

## 已知限制

### Relationships 数据契约

- 前后端仍为 **string-based DTO**（后端 JSONB → API string → 前端 parse）
- `parseRelationships()` 解析失败时静默返回 `[]`，不展示原始异常值
- 用户再次保存时，旧脏值可能被静默覆盖

改进方向：升级为结构化 DTO（`CharacterRelationship[]`），彻底消除 string 序列化开销。

### 跨章节数据依赖

- MemoryPanel 自行拉取全量 chapters/assets，不再依赖父组件传入（避免 200 条截断限制）
- 父组件（ProjectWorkbenchPage）仍保留独立的数据加载，存在重复请求

### 人工修订覆盖风险

- 人工修订写入主表（`character_states` / `timeline_events`）
- 后续章节重提取会 **覆盖** 人工修订（delete-and-recreate）
- UX 层面已通过显式提示告知用户覆盖风险
- 架构上无独立的 durable override 层

## Roadmap / 原型差异

`ui-designs/` 目录包含产品原型（HTML），以下为尚未实现的原型页面：

| 原型 | 描述 | 差异 |
|---|---|---|
| `02-writing-workbench.html` | 沉浸式写作工作台 | 当前章节编辑嵌入在项目工作台 Tab 内，无独立全屏路由 |
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

1. **沉浸式写作工作台** — 独立 `/write/:chapterId` 路由，全屏编辑器 + 可折叠侧栏（大纲导航、角色卡片、对话历史）。当前章节编辑嵌套在项目工作台 Tab 内，缺乏沉浸感。
2. **AI 分屏对比编辑器** — 基于 Tiptap diff 扩展，左右并排展示原文与 AI 改写结果，新增内容绿色高亮、删除内容红色划线，支持逐段接受或拒绝。当前改写以 popover 形式呈现，无法直观对比。

### 中期：可视化增强

3. **人物关系图谱增强** — 现有基础可视化需升级：支持拖拽编辑节点与连线，关系类型可视化（盟友/敌对/亲属/师徒等），数据同步至后端知识图谱表。
4. **伏笔时间线视图** — 横轴为章节序列，纵轴为伏笔条目，颜色区分状态（已埋设/已回收/逾期未回收），点击伏笔跳转到相关章节段落。当前仅有通用时间线，缺少伏笔专属功能。
5. **章节质量评审面板** — 展示后端质量评审结果：多维度评分（逻辑一致性/角色还原度/节奏感/文笔质量）+ 具体问题列表与章节内定位。

### 远期：高级交互

6. **AI 修改消痕对比** — 并排展示原始 AI 生成文本与消痕润色后文本，高亮标注修改位置，支持选择性采纳。当前仅有改写功能，缺少对比展示。