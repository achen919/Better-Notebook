# Harness Workflow

本目录用于约束本仓库中的 agent 开发流程，让任务输入、实施步骤、验证方式和交付格式保持一致。

## 目标

- 让 agent 在开始开发前先读取统一任务模板
- 让功能开发和 IPC/数据库改动都有固定检查项
- 让仓库至少具备一套可执行的最小验收流程
- 让 PR 和本地开发使用同一套 harness 入口

## 目录说明

- `templates/task.md`: 标准任务单模板
- `checklists/feature.md`: 通用功能开发 checklist
- `checklists/ipc-db.md`: 涉及 Electron IPC / 数据库时的专项 checklist
- `evals/smoke.yaml`: 最小 smoke 验收场景

## 推荐流程

1. 复制 `templates/task.md` 创建任务说明
2. 明确目标、范围、非目标、验收标准和影响文件
3. 开发前先阅读相关 checklist
4. 完成代码后执行 `yarn harness`
5. 根据 `evals/smoke.yaml` 完成手动验收
6. 在 PR 描述中贴出任务单、验证结果和剩余风险

## 适用规则

### 通用功能

- 默认使用 `checklists/feature.md`

### Electron IPC / 数据库变更

- 只要改动以下任一文件或同类模块，就必须额外检查 `checklists/ipc-db.md`
- `electron/database/services.ts`
- `electron/main.ts`
- `electron/preload.ts`
- `src/types/global.d.ts`
- `electron/database/init.ts`

## 自动化边界

当前 harness 已自动覆盖：

- ESLint
- TypeScript + Web 构建

当前 harness 仍需人工补充：

- Electron 真机流程验证
- 数据迁移兼容性验证
- 关键页面交互回归

## 后续建议

- 增加 `tests/` 中的算法与 IPC 契约测试
- 补充 Playwright 端到端流程
- 将 `evals/smoke.yaml` 逐步转换为可执行测试
