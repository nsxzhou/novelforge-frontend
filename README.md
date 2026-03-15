# InkMuse Frontend

InkMuse 前端基于 `Vite + React + TypeScript + Tailwind CSS`。

## 当前状态

- P0 主流程已落地：灵感对话创建项目、资产 CRUD 与 AI 生成、项目/资产对话微调（含确认写回）、章节生成/续写/局部改写/当前稿确认。
- 布局已重构为 **侧边栏 + 工作区** 模式（类似 Notion/Obsidian），侧边栏集成项目列表与快捷导航。
- 首页提供「灵感对话」入口：输入一句话灵感，AI 自动构思故事框架并创建项目。
- AI 资产生成已提供 `generation_record.status` 的显式状态展示（运行中/成功/失败）。

## 快速启动

1. 安装依赖

```bash
npm install
```

2. 配置环境变量

```bash
cp .env.example .env
```

默认后端地址：`http://127.0.0.1:8080/api/v1`

3. 启动开发服务

```bash
npm run dev
```

## 可用脚本

- `npm run dev`：本地开发
- `npm run build`：生产构建
- `npm run preview`：预览构建产物
- `npm run lint`：ESLint 检查
- `npm run test`：Vitest 单测
- `npm run test:e2e`：Playwright E2E

## 目录结构

```text
src/
├── app/                    # 路由与全局 Provider
├── pages/                  # 页面层（工作台、设置、404）
├── features/               # 业务模块
│   ├── inspiration/        #   灵感对话创建项目
│   ├── assets/             #   资产管理与 AI 生成
│   ├── conversations/      #   对话微调
│   ├── chapters/           #   章节生成
│   ├── projects/           #   项目编辑面板
│   ├── prompts/            #   Prompt 模板
│   └── llm-providers/      #   LLM 配置
└── shared/                 # API、配置、工具、UI 基础组件
    └── ui/                 #   Sidebar、AppShell、Button、Card 等
```

## 布局架构

采用侧边栏 + 工作区布局，AppShell 在路由层统一包裹：

- **侧边栏**：Logo、新灵感按钮、项目列表（可滚动）、设置入口、折叠切换
- **工作区**：根据路由渲染灵感对话页 / 项目工作台 / 设置页

## 路由

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | InspirationPage | 灵感对话创建项目 |
| `/projects/:id` | ProjectWorkbenchPage | 项目工作台（设定/对话/章节/Prompt Tab 切换） |
| `/settings` | SettingsPage | LLM Provider 全局设置 |

## 功能覆盖

- 灵感对话创建项目（一句话灵感 → AI 构思 → 确认创建）
- 资产创建 / 生成 / 列表 / 过滤 / 编辑 / 删除
- 项目与资产对话微调（含确认建议写回）
- 章节生成 / 续写 / 局部改写 / 当前稿确认
- 响应式适配（桌面侧边栏 / 移动端 overlay）
