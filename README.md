# 📝 我的备忘录

> 极简个人任务备忘录 · 移动端 PWA · 纯前端 · 零依赖

**🌐 访问地址：[yhllxy.github.io/task-memo](https://yhllxy.github.io/task-memo/)**

## 功能

| # | 功能 | 操作 |
|:--:|------|------|
| ➕ | 添加任务 | 底部输入框 + 选择紧急程度 + 设置截止时间（可选） |
| 📋 | 任务列表 | 未完成在上（📌钉选 → ⚠️逾期 → 🔴🟡🟢优先级），已完成在下 |
| ⭕ | 完成确认 | 点击圆圈 → 弹窗确认 → 标记完成并下沉 |
| ↩️ | 撤销完成 | 点击已完成任务的 ✓ → 恢复为未完成 |
| ✏️ | 内联编辑 | 点击任务文字直接修改内容 |
| 📌 | 钉选置顶 | 长按任务（移动端）/ 右键（桌面端）→ 钉选/取消钉选 |
| 📝 | 子任务 | 每个任务下可添加子步骤，独立勾选 |
| 🔼 | 排序调整 | 每个任务右侧 ▲▼ 箭头按钮调整顺序 |
| 📊 | 进度条 | 顶部完成率进度条 + 待完成/逾期/已完成统计 |
| 📦 | 折叠已完成 | 已完成区域可折叠/展开 |
| 🗑 | 删除 | 长按 → 删除；底部"清除已完成"一键清空 |
| 🌓 | 深色模式 | 点击 🌓 按钮切换：跟随系统 → 浅色 → 深色 |
| 📅 | 按天刷新 | 新的一天自动清空列表，旧任务保留在历史中 |
| 🧹 | 30 天清理 | 每次打开自动删除 30 天前的已完成任务 |
| 📱 | PWA | 可添加到手机主屏幕，全屏 App 体验，离线可用 |

## 使用方式

### 方式一：直接打开（最简单）

双击 `index.html` 即可在浏览器中使用所有功能。

### 方式二：本地服务器（可测试 PWA）

```bash
npx serve .
# 浏览器打开 http://localhost:3000
# → 点击浏览器菜单 → "添加到主屏幕"
```

### 方式三：部署到 GitHub Pages（推荐）

1. 将文件夹推送到 GitHub 仓库
2. Settings → Pages → Source: `main` 分支，根目录 `/`
3. 手机浏览器打开 `https://<用户名>.github.io/<仓库名>`
4. 点击浏览器菜单 → "添加到主屏幕"
5. 桌面出现 App 图标，打开即全屏

## 技术说明

- 纯 HTML/CSS/JS，单文件，零依赖
- 数据全部存储在浏览器 localStorage，不上传任何服务器
- PWA：manifest.json + Service Worker，支持离线访问
- 移动端优先设计，适配 iPhone/Android 全系列
- 暗色模式通过 CSS 变量实现，平滑切换

## 文件结构

```
├── index.html          # 骨架（结构 + 模块引用）
├── css/
│   └── style.css       # 全部样式（CSS 变量 + 组件样式 + 动画）
├── js/
│   ├── app.js          # 入口：初始化 + PWA 注册 + 通知启动
│   ├── data.js         # 数据层：localStorage CRUD（零 DOM 依赖）
│   ├── render.js       # 视图层：生成 HTML，更新 DOM
│   ├── events.js       # 交互层：事件绑定 + 用户操作
│   ├── ui.js           # UI 工具：Modal、Theme、DatePicker
│   └── notify.js       # 通知模块：截止时间提醒（前台轮询）
├── manifest.json       # PWA 配置
├── sw.js               # Service Worker（离线缓存）
├── icon-192.png        # App 图标
├── icon-512.png        # App 图标（大）
├── generate-icons.js   # 图标生成脚本
├── README.md
└── docs/
    ├── 2026-07-13-task-memo-design.md   # 设计文档
    ├── 2026-07-13-task-memo-plan.md     # 实施计划
    ├── lessons-learned.md               # 开发经验总结（9条）
    └── superpowers/
        └── specs/
            └── 2026-07-13-layout-optimization-and-modularization-design.md
```

## 📚 文档

| 文档 | 说明 |
|------|------|
| [设计文档](docs/2026-07-13-task-memo-design.md) | 完整功能设计 + 数据模型 + UI 布局 |
| [实施计划](docs/2026-07-13-task-memo-plan.md) | 分 Task 实施步骤 |
| [经验教训](docs/lessons-learned.md) | 13 条开发经验 + 检查清单 |
| [v2.0 架构设计](docs/superpowers/specs/2026-07-13-layout-optimization-and-modularization-design.md) | 布局优化 + 模块化重构设计 |
| [v2.1 通知设计](docs/superpowers/specs/2026-07-13-notification-design.md) | 截止时间提醒（前台轮询 + A→D 升级路径） |

## 📋 更新日志

| 日期 | 版本 | 内容 |
|------|------|------|
| 2026-07-13 | v2.1 | **通知提醒** — 截止时间前 5 分钟系统通知（前台轮询，80 行新模块） |
| 2026-07-13 | v2.0 | **模块化重构** — 单文件拆分为 6 模块 + 三区固定布局 + 日期时间选择器修复 + 暗色模式过渡优化 + 折叠 grid 动画 |
| 2026-07-13 | v1.3 | **UI 大改版** — Indigo 配色 + iOS 风格圆角 + 主题平滑过渡 + RAF 渲染防抖 |
| 2026-07-13 | v1.2 | **SW 修复** — 网络优先策略 + 强制更新 + 版本更新提示；截止时间反馈优化 |
| 2026-07-13 | v1.1 | **PWA 修复** — SW 路径适配 GitHub Pages + 手动安装按钮 |
| 2026-07-13 | v1.0 | **初始版本** — 16 项功能，PWA 打包，移动端全屏 App |