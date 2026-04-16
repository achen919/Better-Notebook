# IPC / Database Checklist

适用于新增或修改 Electron IPC、数据库 schema、持久化逻辑和预加载桥接能力。

## 服务层

- [ ] 已在 `electron/database/services.ts` 中补齐服务方法
- [ ] 服务方法的输入输出结构清晰、字段命名一致
- [ ] 已处理空值、默认值和异常场景

## IPC 暴露

- [ ] 已在 `electron/main.ts` 中添加或更新 `ipcMain.handle()`
- [ ] IPC channel 命名保持清晰且稳定
- [ ] 主进程没有把不必要的 Node 能力直接暴露给渲染进程

## 预加载桥接

- [ ] 已在 `electron/preload.ts` 中通过 `contextBridge` 暴露 API
- [ ] 只暴露当前功能需要的最小接口
- [ ] 渲染进程调用路径与预加载暴露的方法名一致

## 类型声明

- [ ] 已同步更新 `ElectronAPI` 或相关全局类型声明
- [ ] 渲染进程侧没有出现 `any` 兜底调用

## 数据库变更

- [ ] 如果有 schema 变更，已在 `electron/database/init.ts` 中补 migration
- [ ] 迁移逻辑具备幂等性，不会重复报错
- [ ] 老数据在新版本中可继续读取

## 验证

- [ ] 新增/修改的数据可成功写入
- [ ] 应用重启后数据可成功读取
- [ ] 错误输入不会导致主进程崩溃
- [ ] 已补充至少一条手动回归验证记录
