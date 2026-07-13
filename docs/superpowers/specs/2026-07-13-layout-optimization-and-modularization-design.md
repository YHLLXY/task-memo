# 布局优化 + 模块化重构 — 设计文档

> 2026-07-13 | v2.0 架构升级

## 目标

1. 修复输入区域位置随任务数量变化的问题
2. 修复 datetime-local 数字错位
3. 优化暗色模式切换灵敏度
4. 已完成折叠增加平滑动画
5. 单文件拆分为模块化架构，支持未来功能"即插即用"

---

## 一、布局：三区弹性布局

### 结构

```
┌──────────────────────────┐
│  Header (sticky)         │  ← z-index: 10
├──────────────────────────┤
│  Progress + Stats        │  ← 不滚动
├──────────────────────────┤
│  Scroll Area (flex:1)    │  ← overflow-y: auto
│  - 活跃任务               │     -webkit-overflow-scrolling: touch
│  - 已完成区域             │     padding-bottom: 20px
│  - 清除已完成             │
├──────────────────────────┤
│  Input Area (flex-shrink)│  ← 不滚动，固定底部
│                          │     safe-area-inset-bottom
└──────────────────────────┘
```

### 关键 CSS

- `body` → `display: flex; flex-direction: column; height: 100dvh; overflow: hidden`
- `.scroll-area` → `flex: 1; overflow-y: auto;`
- `.input-area` → `flex-shrink: 0;`（自然固定在 flex 容器底部）
- 不使用 `position: fixed`，避免 iOS Safari 键盘弹出时的布局 bug

---

## 二、日期时间选择器：date + time 双输入

用两个独立原生 input 替代 `datetime-local`：

```html
<input type="date" id="deadlineDate">   ← 原生日期选择器
<input type="time" id="deadlineTime">   ← 原生时间选择器
```

- 两个 input 视觉上并排显示
- 未选择时显示占位文字
- 已选择时蓝色高亮
- 清除按钮一键清除
- 合并为 ISO 字符串传给数据层

---

## 三、暗色模式：分层 transition

- 去掉 body 上的全局 `transition` 广播
- 只在需要过渡的元素上单独声明 `transition: background-color 0.2s, border-color 0.2s`
- 切换时给 body 加 `.theme-switching` 临时 class（250ms 后自动移除），启用 `will-change`
- `will-change` 只在切换瞬间使用，不常驻

---

## 四、折叠动画：grid-template-rows

```css
.done-list-wrap {
  display: grid;
  grid-template-rows: 1fr;
  overflow: hidden;
  transition: grid-template-rows 0.3s ease;
}
.done-list-wrap.collapsed {
  grid-template-rows: 0fr;
}
.done-list-wrap > div { min-height: 0; }
```

箭头同步旋转：
```css
.done-arrow {
  transition: transform 0.3s ease;
}
.done-arrow.collapsed {
  transform: rotate(-90deg);
}
```

---

## 五、模块化架构

### 文件结构

```
├── index.html          # 骨架（只含结构和引用）
├── css/
│   └── style.css       # 全部样式
├── js/
│   ├── app.js          # 入口：初始化 + 主题 + PWA
│   ├── data.js         # 数据层：localStorage CRUD（零 DOM 依赖）
│   ├── render.js       # 视图层：生成 HTML，更新 DOM
│   ├── events.js       # 交互层：事件绑定 + 调用 data → 触发 render
│   └── ui.js           # UI 工具：Modal、Toast、DatePicker、Theme
├── manifest.json
├── sw.js
└── README.md
```

### 依赖关系

```
app.js
  ├─→ ui.js       (独立)
  ├─→ data.js     (独立，纯数据)
  ├─→ render.js   (依赖 data.js)
  └─→ events.js   (依赖 data.js + render.js + ui.js)
```

单向依赖，无循环。

### 对外接口

**data.js** — 全局命名空间 `TaskData`
```
load() → tasks[], save(tasks), create(content, pri, dl) → task
complete(id), uncomplete(id), delete(id), clearDone()
updateContent(id, content), togglePin(id), move(id, dir)
subTask.add(tid, content), subTask.toggle(tid, sid), subTask.delete(tid, sid)
getActive() → sorted[], getDone() → sorted[], cleanOld()
```

**render.js** — 全局命名空间 `Render`
```
stats(), activeList(), doneList(), all()
```

**events.js** — 全局命名空间 `Events`
```
init()  — 绑定所有事件
// 通过 window 暴露给 inline onclick 的回调
handleCompleteClick(id), handleUncomplete(id), handleMove(id, dir)
handleEditTask(id), handleAddSubTask(tid), handleSubTaskKey(e, tid)
handleSubTaskToggle(tid, sid), toggleDone()
handleContextPin(), handleContextDelete()
```

**ui.js** — 全局命名空间 `UI`
```
Modal.confirm(msg) → Promise<boolean>
Theme.apply(mode), Theme.toggle()
DatePicker.init(), DatePicker.getValue() → ISO string | null
DatePicker.clear()
```

### 模块接入规范

添加新功能时：
1. 在对应模块添加函数（新数据操作 → data.js，新 UI → ui.js）
2. 在 render.js 的 HTML 模板中加 `data-action="xxx"` 标记
3. 在 events.js 添加 handler
4. 无需修改其他模块

---

## 兼容性说明

- `grid-template-rows` 动画：Chrome 57+, Safari 10.1+, Firefox 52+
- `100dvh`：iOS Safari 15+, Chrome 108+（有 `100vh` 降级）
- 命名空间模式：所有浏览器均支持
- SW 策略不变：网络优先 HTML，缓存优先静态资源