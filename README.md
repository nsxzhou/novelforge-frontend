# NovelForge Frontend

NovelForge 前端（V1）基于 `Vite + React + TypeScript + Tailwind CSS`。

## 当前状态

- P0 主流程已落地：项目创建/列表/编辑、资产 CRUD 与 AI 生成、项目/资产对话微调（含确认写回）、章节生成/续写/局部改写/当前稿确认。
- AI 资产生成已提供 `generation_record.status` 的显式状态展示（运行中/成功/失败）。
- 联调验收条目仍保持“待联调验收”状态，详见 `docs/前端开发优先级-V1.md`。
- P1 增强项（页面埋点、集成测试/E2E 补强、设计系统进一步抽象）本轮未纳入。

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
├── pages/                  # 页面层
├── features/               # 业务模块（projects/assets/conversations/chapters）
└── shared/                 # API、配置、工具、UI 基础组件
```

## V1 功能覆盖

- 项目创建 / 列表 / 编辑
- 资产创建 / 生成 / 列表 / 过滤 / 编辑 / 删除
- 项目与资产对话微调（含确认建议写回）
- 章节生成 / 续写 / 局部改写 / 当前稿确认

详见：`docs/前端开发优先级-V1.md`
