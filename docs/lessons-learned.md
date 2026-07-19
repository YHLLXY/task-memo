# 极简工作任务备忘录 — 开发经验总结

> 2026-07-13 | 纯 HTML/CSS/JS PWA 项目 | 16 项功能

---

## 一、PWA Service Worker：缓存优先是陷阱，网络优先才靠谱

### 问题

初始版本 SW 用缓存优先策略（`caches.match()` → 回退 `fetch()`）。第一次访问后 index.html 被缓存，之后所有代码更新在手机上都看不到——SW 总是返回缓存中的旧版本。

### 教训

**#1：HTML 页面文件必须用"网络优先"，静态资源才能用"缓存优先"。**

```javascript
// ❌ 缓存优先 —— HTML 更新永远不会生效
e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));

// ✅ HTML 网络优先 + 回退缓存；其他资源缓存优先
if (e.request.mode === 'navigate') {
  e.respondWith(
    fetch(e.request)
      .then(res => { /* 更新缓存 */ return res; })
      .catch(() => caches.match(e.request))
  );
}
```

### 教训

**#2：skipWaiting() + clients.claim() 是 SW 即时更新的必要条件。**

不加这两行，新 SW 安装后会等待所有旧页面关闭才激活——对于单页面应用几乎等于永远不更新。

```javascript
self.addEventListener('install', e => { self.skipWaiting(); /* ... */ });
self.addEventListener('activate', e => { self.clients.claim(); /* ... */ });
```

**#3：SW 注册时监听 updatefound 事件，弹窗提示用户刷新。**

用户不会主动清缓存，必须有"发现新版本，点确定刷新"的交互。

---

## 二、暗色模式：CSS transition 足够，不需要 JS 介入

### 问题

用户反映暗色模式切换"太慢"。排查发现 `applyTheme()` 只切换了 body class，并没有调用 `render()`，但切换感觉不够丝滑。

### 教训

**#4：`transition: background-color 0.25s ease, color 0.25s ease` 加在 body 上，所有 `var(--*)` 变量变化会自动平滑过渡。**

CSS 变量 + transition = 零 JS 开销的主题切换。不需要写复杂的状态管理。

---

## 三、render() 性能：RAF 防抖一行搞定

### 问题

大量交互（添加、完成、编辑、删除、排序）都调用 `render()`，每次渲染用 `innerHTML` 重建全部 DOM。快速操作时可能一帧内多次 rebuild。

### 教训

**#5：用 requestAnimationFrame 做渲染防抖，一帧内多次调用只执行一次。**

```javascript
var _pending = false;
function render() {
  if (_pending) return;
  _pending = true;
  requestAnimationFrame(() => {
    _pending = false;
    // ... 实际渲染
  });
}
```

对于 localStorage 级别的数据驱动 UI，这个方案足够了。不需要引入虚拟 DOM 框架。

---

## 四、移动端 datetime-local：原生控件反馈缺失

### 问题

`<input type="datetime-local">` 在安卓上选中时间后没有任何视觉反馈。placeholder 属性对它也不生效。

### 教训

**#6：datetime-local 必须自建反馈机制：change 事件 + 格式化预览文字 + 视觉高亮 + 清除按钮。**

```html
<!-- ❌ 裸用，无反馈 -->
<input type="datetime-local" id="dl" placeholder="截止时间">

<!-- ✅ 配套状态指示器 -->
<span id="deadlineLabel"></span>  <!-- 格式化显示选中值 -->
<button id="clearDeadline">✕</button>  <!-- 清除 -->
```

```css
input.has-value { border-color: var(--accent); background: var(--accent-light); }
```

---

## 五、GitHub Pages 部署：路径不是 `/`

### 问题

SW 缓存列表用绝对路径 `['/', '/index.html']`，但 GitHub Pages 部署在 `/task-memo/`，导致 `cache.addAll()` 失败，SW 安装报错。SW 失败 = Chrome 不识别为 PWA = 不弹安装提示。

### 教训

**#7：SW 内所有路径必须用 `self.location.pathname` 动态计算，绝不写死。**

```javascript
var BASE = self.location.pathname.replace(/\/[^/]*$/, '/');
var ASSETS = [BASE, BASE + 'index.html', BASE + 'manifest.json'];
```

---

## 六、PWA 安装触发：Android Chrome 条件严格

### 问题

即使 SW 注册成功、manifest 正确，Android Chrome 也不一定自动弹出安装提示。触发条件包括：
1. 用户必须与页面有交互
2. 可能需要访问两次以上
3. 某些 Chrome 版本对 PWA 检测有延迟

### 教训

**#8：监听 beforeinstallprompt 事件 + 提供手动安装按钮作为兜底。**

```javascript
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = 'flex'; // 显示 📲 按钮
});
installBtn.addEventListener('click', () => {
  deferredPrompt.prompt();
});
```

---

## 七、单文件 HTML 架构：取舍与边界

### 优点

- 零构建、零依赖、双击即用
- 全部代码在一个文件，全局变量天然共享
- 不用管 import/export、打包配置

### 缺点

- 900+ 行维护困难，CSS 和 JS 混在一起
- 没有类型检查，变量拼写错误无法提前发现
- 主题切换时如果某个组件忘了加 `transition`，会出现硬切换

### 教训

**#9：当单文件超过 500 行时，CSS 变量驱动 + 组件化 render 函数是维持可维护性的底线。**

本项目虽只有一个文件，但逻辑分层清晰：
- CSS 变量 → 配色系统
- 数据层函数 → localStorage CRUD
- render 函数 → 视图层
- 事件处理 → 交互层

---

## 八、模块化拆分：命名空间 + IIFE = 零构建的模块系统

### 问题

单文件 1000+ 行，CSS/JS/HTML 混在一起，每次改一处都要在千行中定位。后续添加新功能需要理解全部代码，阻碍迭代。

### 教训

**#10：纯前端项目用命名空间 + IIFE 实现模块化，不依赖 ES modules 和打包工具。**

```javascript
// data.js — 零 DOM 依赖，纯数据层
var TaskData = (function () {
  'use strict';
  function createTask(content, priority, deadline) { /* ... */ }
  function getActiveTasks() { /* ... */ }
  return {
    create: createTask,
    getActive: getActiveTasks,
    // ... 公共接口
  };
})();
```

```html
<!-- 按依赖顺序加载，app.js 最后 -->
<script src="js/ui.js"></script>
<script src="js/data.js"></script>
<script src="js/render.js"></script>
<script src="js/events.js"></script>
<script src="js/app.js"></script>
```

模块间依赖关系：`app → events → render → data + ui`，单向无循环。

**优点**：
- 双击 `index.html` 即可运行，不需要 npm/server
- 文件职责清晰：哪个模块出问题一目了然
- 新功能接入只需触及对应模块 + 加一个接口函数

---

## 九、移动端输入区布局：flex 三区 + overflow-y 独立滚动

### 问题

原布局给 `.input-area` 使用 `position: sticky; bottom: 0`。当任务列表很短时，输入区跟着内容流动，无法固定在屏幕底部。`position: fixed` 在 iOS Safari 键盘弹出时有布局 bug。

### 教训

**#11：用 flex 布局代替 fixed/sticky 实现底部输入栏。**

```css
body {
  display: flex; flex-direction: column;
  height: 100dvh; overflow: hidden;
}
.scroll-area { flex: 1; overflow-y: auto; }  /* 任务列表独立滚动 */
.input-area { flex-shrink: 0; }               /* 固定在底部 */
```

`100dvh` 动态适配 Safari 地址栏的收缩/展开，比 `100vh` 更可靠。不支持 `dvh` 的浏览器降级到 `vh`。

---

## 十、datetime-local 替代方案：双原生输入 + 自定义标签

### 问题

`<input type="datetime-local">` 在安卓 Chrome 上初始渲染数字错位，且 `placeholder` 无效。

### 教训

**#12：用 `type="date"` + `type="time"` 两个独立输入替代 `datetime-local`，自定义 label 展示选中值。**

```html
<input type="date" id="deadlineDate" style="opacity:0;position:absolute;">
<input type="time" id="deadlineTime" style="opacity:0;position:absolute;">
<label for="deadlineDate" class="deadline-label-btn">选择日期</label>
<label for="deadlineTime" class="deadline-label-btn">选择时间</label>
```

- `<label for="...">` 自动关联原生输入，兼容所有浏览器
- 隐藏原生控件，用 label 展示格式化的日期文字
- 两个独立原生 picker，Android/iOS 都能正常弹出

---

## 十一、已完成列表折叠：grid-template-rows 动画

### 问题

`display: none/block` 切换无法被 CSS transition 动画化，折叠/展开是瞬间硬切换。

### 教训

**#13：用 `grid-template-rows: 1fr → 0fr` 做折叠高度动画，配合 `overflow: hidden`。**

```css
.done-list-wrap {
  display: grid;
  grid-template-rows: 1fr;
  overflow: hidden;
  transition: grid-template-rows 0.3s ease;
}
.done-list-wrap.collapsed { grid-template-rows: 0fr; }
.done-list-wrap > div { min-height: 0; }  /* 关键：防止内容溢出 */
```

比 `max-height` 方案更精确——不需要知道内容高度，`0fr → 1fr` 自适应。

---

## 十二、通知提醒：新模块即插即用，零侵入现有代码

### 问题

需要截止时间提醒功能，但担心增加后端依赖或影响现有模块的稳定性。

### 教训

**#14：新功能做成独立模块，一个接口函数接入 app.js，不触及现有 data/render/events。**

```javascript
// notify.js — 独立模块，零侵入
var Notifier = (function () {
  function check() {
    var active = TaskData.getActive();  // 只读调用现有接口
    // ... 过滤、通知
  }
  function init() {
    if (!hasPermission()) { requestPermission().then(start); }
    else { start(); }
  }
  return { init: init, check: check };
})();

// app.js — 只需一行接入
Notifier.init();
```

### A→D 升级路径（前台轮询 → APK 原生闹钟）

| 阶段 | 触发机制 | 覆盖场景 |
|------|---------|---------|
| Phase 1（当前） | `setInterval` 60s 轮询 | App 前台/后台标签页 |
| Phase 2（打包 APK） | Android AlarmManager | App 完全关闭也能准时提醒 |

升级时 `Notifier.check()` 逻辑原封不动复用——只换触发源，不换检查逻辑。在 `notify.js` 中已预留 `Notifier.getCheck()` 接口供原生端调用。

---

## 十三、toISOString() 是日期计算的定时炸弹

### 问题

日期导航（← →）在手机上点击后日期跳跃（如 19 号直接跳到 17 号）、右箭头按了没反应。

### 根因

```javascript
// ❌ 错误：toISOString() 返回 UTC，new Date('YYYY-MM-DD') 按本地时间解析
// 在 UTC+8（中国），两者差 8 小时，输出会错一天
var d = new Date('2026-07-19T00:00:00');  // 本地 7/19 00:00
d.setDate(d.getDate() - 1);               // 本地 7/18 00:00
d.toISOString().split('T')[0];            // → '2026-07-17' ← 错！跳了两天

// ✅ 正确：用 getFullYear/getMonth/getDate（都是本地时间）
var newDate = d.getFullYear() + '-' +
              String(d.getMonth() + 1).padStart(2, '0') + '-' +
              String(d.getDate()).padStart(2, '0');
// → '2026-07-18' ← 正确
```

### 教训

**#15：`toISOString()` 只用于两个场景——① 存储完整时间戳（`created_at`/`completed_at`）；② 不需要。任何需要提取日期（YYYY-MM-DD）的地方，必须用 `getFullYear()` + `getMonth()` + `getDate()` 手动格式化。**

这三兄弟永远返回**本地时间**的值，不会有时区偏差。

### 受影响位置（本次修复 10 处）

| 文件 | 函数 | 影响 |
|------|------|------|
| data.js | `today()` | 凌晨可能日期错一天 |
| data.js | `cleanOldTasks()` | 清理判断偏差 |
| data.js | `saveRaw` 重试 | 清理判断偏差 |
| data.js | `getAvailableDates()` | 日期范围偏差 |
| events.js | `handleDatePrev()` | ← 跳两天 |
| events.js | `handleDateNext()` | → 不生效 |
| render.js | `renderDateNav()` | ← 禁用判断偏差 |
| ui.js | `formatDateLabel()` | "今天/明天"判断偏差 |
| ui.js | `getDatePickerValue()` | 默认日期偏差 |

### 判断标准

一个 `toISOString()` 调用是否正确，问自己：**它是在存"时间戳"还是取"日期"？**

| 用途 | 例子 | 用 toISOString？ |
|------|------|:--:|
| 存完整时间戳 | `created_at: new Date().toISOString()` | ✅ 正确 |
| 取日期 YYYY-MM-DD | `new Date().toISOString().split('T')[0]` | ❌ 有 Bug |

---

## 检查清单

后续类似项目（纯前端 PWA）启动时：

```
□ SW: 网络优先处理 HTML，缓存优先处理静态资源
□ SW: skipWaiting() + clients.claim()
□ SW: updatefound 事件监听 + 用户刷新提示
□ SW: 路径用 self.location.pathname 动态计算
□ 主题: CSS 变量 + body transition，不依赖 JS
□ 渲染: RAF 防抖 render()
□ PWA: beforeinstallprompt + 手动安装按钮
□ 输入: datetime-local → date + time + label 替代
□ 部署: GitHub Pages Source 设为 Deploy from Branch
□ 布局: flex 三区（header + scroll-area + input-area）
□ 动画: grid-template-rows 折叠 > display:none
□ 架构: 命名空间模块化（单文件 >500 行即拆分）
□ 新功能: 独立模块 + 一行接入 app.js（零侵入现有代码）
□ 日期: 绝不用 toISOString().split('T')[0] 取日期
□ 日期: 历史视图下必须禁用交互（完成/编辑/排序/子任务）
```