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
□ 输入: datetime-local 自建反馈机制
□ 部署: GitHub Pages Source 设为 Deploy from Branch
```