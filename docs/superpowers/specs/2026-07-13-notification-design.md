# 截止时间通知提醒 — 设计文档

> 2026-07-13 | v2.1 通知功能 · Phase 1（前台轮询）

## 目标

任务截止时间前 N 分钟，即使 App 在前台/后台标签页，也弹出系统通知提醒用户。

## 方案：Notification API + 前台轮询

### 工作原理

```
┌─────────────┐     每60秒轮询      ┌──────────────────┐
│  app.js     │ ─────────────────→  │  notify.js       │
│  setInterval│                    │  检查所有活跃任务   │
└─────────────┘                    │  过滤：有截止时间   │
                                   │  过滤：未通知过     │
                                   │  过滤：距截止≤5分钟 │
                                   │  弹 Notification   │
                                   └──────────────────┘
```

### 模块设计

新建 `js/notify.js`，遵循现有命名空间模式：

```javascript
var Notifier = {
  init()           // 请求权限 + 启动轮询
  check()          // 单次检查 → 触发通知
  getUpcoming()    // 获取即将到期的任务列表
  isSupported()    // 浏览器是否支持 Notification API
}
```

**对外接口：** `Notifier.init()` — 一个调用即可，app.js 无需关心内部实现。

### 数据流

```
TaskData.getActive()
  → 筛选有 deadline 的任务
  → 排除已通知过的（内存 Set 记录已通知 ID）
  → 筛选 now < deadline < now+5min 的任务
  → 逐个 new Notification(title, { body, icon, tag })
```

### 通知内容

```
标题：⏰ 任务即将到期
正文：[任务内容前30字]
副标题：截止时间 14:30（5分钟后）
标识：tag = task.id（相同任务不重复弹窗）
```

### 防重复机制

- `notifiedSet` — 内存 Set，记录已通知的任务 ID
- 每次 `Notifier.check()` 时跳过已在 Set 中的任务
- 任务被完成/删除时从 Set 中移除
- 页面刷新后 Set 清空（重新开始跟踪，这是预期行为——用户刷新页面后会重新评估）

### 集成点

```
app.js:
  + Notifier.init()  // 一行调用

index.html:
  / 无修改

其他模块:
  / 无修改
```

### 权限流程

```
1. Notifier.init() 被调用
2. 检查 Notification.permission
   - 'granted' → 直接启动轮询
   - 'denied' → 静默跳过，不打扰用户
   - 'default' → 调用 requestPermission()
     - 用户同意 → 启动轮询
     - 用户拒绝 → 静默跳过
3. setInterval(check, 60000) 启动每分钟检查
```

### 性能影响

- 每分钟执行一次纯内存过滤（O(n)，n = 活跃任务数）
- 活跃任务通常 < 20 条，单次耗时 < 1ms
- 零 localStorage 写入
- 不影响 RAF 渲染管线

---

## A→D 升级路径

### Phase 1（当前）：前台轮询
- 实现：`notify.js` + Notification API + setInterval
- 限制：需 App 在浏览器标签页中
- 代码量：~80 行

### Phase 2（打包 APK 时升级）：原生 AlarmManager

打包 APK（PWA Builder / Bubblewrap）后：

1. **替换触发机制**：`setInterval` → Android `AlarmManager.setExact()`
2. **复用检查逻辑**：`Notifier.check()` 逻辑原封不动，只是调用方从 JS 定时器变为原生闹钟回调
3. **新增能力**：App 完全关闭也能准时提醒
4. **兼容处理**：检测 `window.Android` 桥接对象是否存在，存在则用原生，否则回退到 setInterval

```
if (window.AndroidBridge) {
  // APK 模式：注册原生闹钟
  AndroidBridge.scheduleAlarm(deadline - 5min, taskId);
} else {
  // 浏览器模式：JS 轮询（当前方案）
  setInterval(check, 60000);
}
```

### 不做的事情

| 方案 | 为什么不做 |
|------|-----------|
| Periodic Background Sync | Chrome 不保证执行，实际不可靠 |
| Web Push + 后端 | 改变零依赖定位，且 APK 原生通知是更好的替代 |