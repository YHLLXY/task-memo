# 极简工作任务备忘录 — 实施计划

> **For agentic workers:** 按 Task 顺序内联执行，逐步搭建。每完成一个 Task 验证效果后再进入下一个。

**Goal:** 构建移动端极简任务备忘录 PWA，单 HTML 文件，localStorage 存储，16 项功能

**Architecture:** 纯 HTML/CSS/JS 单文件。CSS 变量驱动暗色模式，JS 操作 localStorage 数据层，CSS Grid 布局。PWA 由 manifest.json + sw.js 支撑

**Tech Stack:** HTML5 + CSS3 (Grid/Flexbox/Variables) + Vanilla JS (ES6+)

**文件结构：**
```
极简工作任务备忘录/
├── index.html          # 主文件（全部结构+样式+逻辑）
├── manifest.json       # PWA 配置
├── sw.js               # Service Worker
├── README.md
└── docs/
    ├── 2026-07-13-task-memo-design.md
    └── 2026-07-13-task-memo-plan.md
```

---

### Task 1: 项目骨架 — HTML 结构 + CSS 布局 + 暗色模式

**Files:** Create `index.html`

先在移动端视口（375px）下搭好全部 DOM 结构 + CSS 布局 + 暗色模式变量，不写 JS 逻辑。

**HTML 结构：**
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#1a1a2e" media="(prefers-color-scheme: dark)">
  <link rel="manifest" href="manifest.json">
  <title>我的备忘录</title>
  <style>
    /* ===== CSS 变量（暗色模式） ===== */
    :root {
      --bg: #f5f5f7;
      --card-bg: #ffffff;
      --text: #1d1d1f;
      --text-secondary: #86868b;
      --border: #e5e5ea;
      --accent: #007aff;
      --shadow: 0 1px 3px rgba(0,0,0,0.08);
      --high: #ff3b30;
      --medium: #ff9500;
      --low: #34c759;
      --danger: #ff3b30;
      --progress-bg: #e5e5ea;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #1a1a2e;
        --card-bg: #16213e;
        --text: #e4e4e7;
        --text-secondary: #8e8e93;
        --border: #2c2c3e;
        --shadow: 0 1px 3px rgba(0,0,0,0.3);
        --progress-bg: #2c2c3e;
      }
    }
    /* 手动切换类名覆盖 */
    body.light { /* 浅色变量 */ }
    body.dark { /* 深色变量 */ }

    /* ===== 基础布局 ===== */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg); color: var(--text);
      max-width: 500px; margin: 0 auto; min-height: 100vh;
    }
    /* 顶栏 */
    .header { display: flex; justify-content: space-between; align-items: center; padding: 16px; }
    /* 进度条 */
    .progress-bar { margin: 0 16px 8px; height: 4px; border-radius: 2px; background: var(--progress-bg); }
    .progress-fill { height: 100%; border-radius: 2px; background: var(--accent); transition: width 0.3s; }
    /* 统计 */
    .stats { padding: 0 16px 12px; font-size: 13px; color: var(--text-secondary); }
    /* 任务列表 */
    .task-list { padding: 0 16px; }
    .task-card { background: var(--card-bg); border-radius: 10px; padding: 12px; margin-bottom: 8px; box-shadow: var(--shadow); display: flex; align-items: flex-start; gap: 10px; }
    .priority-bar { width: 3px; min-height: 40px; border-radius: 2px; flex-shrink: 0; }
    .priority-bar.high { background: var(--high); }
    .priority-bar.medium { background: var(--medium); }
    .priority-bar.low { background: var(--low); }
    .task-body { flex: 1; min-width: 0; }
    .task-content { font-size: 15px; line-height: 1.4; }
    .task-deadline { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
    .task-deadline.overdue { color: var(--danger); font-weight: 500; }
    .subtasks { margin-top: 6px; }
    .subtask-item { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-secondary); padding: 2px 0; }
    .task-actions { display: flex; flex-direction: column; gap: 2px; flex-shrink: 0; align-items: center; }
    .arrow-btn { background: none; border: none; color: var(--text-secondary); font-size: 12px; padding: 0 4px; cursor: pointer; }
    .circle-btn { width: 24px; height: 24px; border-radius: 50%; border: 2px solid #c7c7cc; background: none; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .circle-btn.done { background: var(--accent); border-color: var(--accent); color: white; }
    /* 已完成区 */
    .done-section { padding: 0 16px; }
    .done-header { display: flex; align-items: center; gap: 6px; font-size: 14px; color: var(--text-secondary); cursor: pointer; padding: 8px 0; }
    .done-card { opacity: 0.6; }
    .done-card .task-content { text-decoration: line-through; }
    /* 底部输入区 */
    .input-area { position: sticky; bottom: 0; background: var(--bg); padding: 12px 16px 20px; border-top: 1px solid var(--border); }
    .priority-select { display: flex; gap: 8px; margin-bottom: 8px; }
    .priority-btn { flex: 1; padding: 8px; border: 2px solid var(--border); border-radius: 8px; background: var(--card-bg); color: var(--text); font-size: 13px; cursor: pointer; text-align: center; }
    .priority-btn.active { border-color: var(--accent); }
    .input-row { display: flex; gap: 8px; }
    .task-input { flex: 1; padding: 12px; border: 1px solid var(--border); border-radius: 10px; font-size: 15px; background: var(--card-bg); color: var(--text); outline: none; }
    .add-btn { padding: 12px 20px; background: var(--accent); color: white; border: none; border-radius: 10px; font-size: 15px; cursor: pointer; }
    .clear-done { text-align: center; padding: 12px; font-size: 13px; color: var(--text-secondary); cursor: pointer; margin-bottom: 60px; }
    .empty-state { text-align: center; padding: 60px 20px; color: var(--text-secondary); font-size: 14px; }
    /* 弹窗 */
    .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100; justify-content: center; align-items: center; }
    .modal-overlay.show { display: flex; }
    .modal { background: var(--card-bg); border-radius: 14px; padding: 24px; width: 280px; text-align: center; }
    .modal-buttons { display: flex; gap: 12px; margin-top: 20px; justify-content: center; }
    .modal-btn { padding: 10px 24px; border-radius: 8px; border: none; font-size: 15px; cursor: pointer; }
    .modal-btn.cancel { background: var(--border); color: var(--text); }
    .modal-btn.confirm { background: var(--accent); color: white; }
    /* 长按菜单 */
    .context-menu { display: none; position: fixed; z-index: 200; background: var(--card-bg); border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.2); padding: 8px; min-width: 140px; }
    .context-menu.show { display: block; }
    .context-menu button { display: block; width: 100%; padding: 10px 16px; border: none; background: none; color: var(--text); font-size: 14px; text-align: left; cursor: pointer; border-radius: 8px; }
    .context-menu button.danger { color: var(--danger); }
  </style>
</head>
<body>
  <div class="header">
    <button id="themeToggle" class="icon-btn">🌓</button>
    <h1 style="font-size:18px;font-weight:600;">我的备忘录</h1>
    <span id="dateLabel" style="font-size:13px;color:var(--text-secondary);"></span>
  </div>
  <div class="progress-bar"><div class="progress-fill" id="progressFill" style="width:0%"></div></div>
  <div class="stats" id="stats"></div>
  <div class="task-list" id="taskList"></div>
  <div class="done-section" id="doneSection"></div>
  <div class="clear-done" id="clearDone">清除已完成</div>
  <div class="input-area">
    <div class="priority-select" id="prioritySelect">
      <button class="priority-btn active" data-p="medium">🟡 中等</button>
      <button class="priority-btn" data-p="high">🔴 紧急</button>
      <button class="priority-btn" data-p="low">🟢 不急</button>
    </div>
    <input type="datetime-local" id="deadlineInput" style="width:100%;padding:8px;margin-bottom:8px;border:1px solid var(--border);border-radius:8px;background:var(--card-bg);color:var(--text);font-size:13px;">
    <div class="input-row">
      <input class="task-input" id="taskInput" placeholder="添加任务...">
      <button class="add-btn" id="addBtn">添加</button>
    </div>
  </div>
  <div class="modal-overlay" id="confirmModal">
    <div class="modal">
      <p id="modalMsg">确认完成这个任务？</p>
      <div class="modal-buttons">
        <button class="modal-btn cancel" id="modalCancel">取消</button>
        <button class="modal-btn confirm" id="modalConfirm">确认</button>
      </div>
    </div>
  </div>
  <div class="context-menu" id="contextMenu"></div>
  <script>
    // JS 逻辑在后续 Task 中添加
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js');
    }
  </script>
</body>
</html>
```

**验收：** 在浏览器中打开，看到完整静态布局（无数据），暗色模式跟随系统。

---

### Task 2: localStorage 数据层

**Files:** Modify `index.html` — `<script>` 部分

实现全部数据操作函数，纯函数，不涉及 DOM。

```javascript
// ===== 常量 =====
const STORAGE_KEY = 'memo_tasks';
const RETENTION_DAYS = 30;

// ===== 工具函数 =====
function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 6); }
function today() { return new Date().toISOString().split('T')[0]; }

// ===== 数据读写 =====
function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveTasks(tasks) { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }

// ===== 30天清理 =====
function cleanOldTasks(tasks) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  return tasks.filter(t => !t.completed || t.date >= cutoffStr);
}

// ===== 创建任务 =====
function createTask(content, priority, deadline) {
  const task = {
    id: uid(),
    content: content.trim(),
    priority: priority || 'medium',
    deadline: deadline || null,
    pinned: false,
    sub_tasks: [],
    created_at: new Date().toISOString(),
    date: today(),
    completed: false,
    completed_at: null,
    order: Date.now(),
  };
  const tasks = cleanOldTasks(loadTasks());
  tasks.push(task);
  saveTasks(tasks);
  return task;
}

// ===== 完成任务 =====
function completeTask(id) {
  const tasks = loadTasks();
  const t = tasks.find(t => t.id === id);
  if (t) { t.completed = true; t.completed_at = new Date().toISOString(); }
  saveTasks(tasks);
}

// ===== 撤销完成 =====
function uncompleteTask(id) {
  const tasks = loadTasks();
  const t = tasks.find(t => t.id === id);
  if (t) { t.completed = false; t.completed_at = null; }
  saveTasks(tasks);
}

// ===== 删除任务 =====
function deleteTask(id) {
  const tasks = loadTasks().filter(t => t.id !== id);
  saveTasks(tasks);
}

// ===== 清除已完成 =====
function clearDoneTasks() {
  const tasks = loadTasks().filter(t => !t.completed);
  saveTasks(tasks);
}

// ===== 更新内容 =====
function updateTaskContent(id, content) {
  const tasks = loadTasks();
  const t = tasks.find(t => t.id === id);
  if (t) t.content = content.trim();
  saveTasks(tasks);
}

// ===== 更新优先级 =====
function updateTaskPriority(id, priority) {
  const tasks = loadTasks();
  const t = tasks.find(t => t.id === id);
  if (t) t.priority = priority;
  saveTasks(tasks);
}

// ===== 切换钉选 =====
function togglePin(id) {
  const tasks = loadTasks();
  const t = tasks.find(t => t.id === id);
  if (t) t.pinned = !t.pinned;
  saveTasks(tasks);
}

// ===== 移动顺序 =====
function moveTask(id, direction) { // direction: 'up' | 'down'
  const tasks = loadTasks();
  const active = tasks.filter(t => !t.completed && t.date === today());
  active.sort((a, b) => { /* 按钉选→逾期→优先级→order */ });
  const idx = active.findIndex(t => t.id === id);
  if (idx < 0) return;
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= active.length) return;
  const tmp = active[idx].order;
  active[idx].order = active[swapIdx].order;
  active[swapIdx].order = tmp;
  saveTasks(tasks);
}

// ===== 子任务 CRUD =====
function addSubTask(taskId, content) {
  const tasks = loadTasks();
  const t = tasks.find(t => t.id === taskId);
  if (t) t.sub_tasks.push({ id: uid(), content: content.trim(), completed: false });
  saveTasks(tasks);
}

function toggleSubTask(taskId, subId) {
  const tasks = loadTasks();
  const t = tasks.find(t => t.id === taskId);
  if (t) {
    const s = t.sub_tasks.find(s => s.id === subId);
    if (s) s.completed = !s.completed;
  }
  saveTasks(tasks);
}

function deleteSubTask(taskId, subId) {
  const tasks = loadTasks();
  const t = tasks.find(t => t.id === taskId);
  if (t) t.sub_tasks = t.sub_tasks.filter(s => s.id !== subId);
  saveTasks(tasks);
}

// ===== 获取当天未完成任务（排序后） =====
function getTodayActiveTasks() {
  const tasks = cleanOldTasks(loadTasks());
  const active = tasks.filter(t => !t.completed && t.date === today());
  // 排序：钉选优先 → 逾期优先 → 高优先级 → 低 order
  const now = new Date();
  active.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const aOverdue = a.deadline && new Date(a.deadline) < now;
    const bOverdue = b.deadline && new Date(b.deadline) < now;
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
    const pri = { high: 0, medium: 1, low: 2 };
    if (pri[a.priority] !== pri[b.priority]) return pri[a.priority] - pri[b.priority];
    return a.order - b.order;
  });
  return active;
}

// ===== 获取已完成任务 =====
function getTodayDoneTasks() {
  const tasks = loadTasks();
  return tasks.filter(t => t.completed && t.date === today()).sort((a, b) =>
    new Date(b.completed_at || 0) - new Date(a.completed_at || 0)
  );
}
```

**验收：** 打开浏览器控制台，手动调用 `createTask('测试', 'high')` → `loadTasks()` 返回数组。

---

### Task 3: 任务渲染 + 交互逻辑

**Files:** Modify `index.html` — `<script>` 部分，追加渲染函数和事件绑定

```javascript
// ===== 全局状态 =====
let currentPriority = 'medium';
let doneCollapsed = false;
let contextTaskId = null;
let confirmCallback = null;

// ===== 渲染全部 =====
function render() {
  renderStats();
  renderActiveTasks();
  renderDoneTasks();
}

// ===== 统计 + 进度条 =====
function renderStats() {
  const active = getTodayActiveTasks();
  const done = getTodayDoneTasks();
  const now = new Date();
  const overdueCount = active.filter(t => t.deadline && new Date(t.deadline) < now).length;
  const total = active.length + done.length;
  const pct = total === 0 ? 0 : Math.round((done.length / total) * 100);
  
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('stats').textContent =
    `待完成 ${active.length} · 逾期 ${overdueCount} · 已完成 ${done.length}`;
  document.getElementById('dateLabel').textContent = formatDate(today());
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const w = ['日','一','二','三','四','五','六'];
  return `${d.getMonth()+1}月${d.getDate()}日 周${w[d.getDay()]}`;
}

// ===== 渲染活跃任务 =====
function renderActiveTasks() {
  const list = document.getElementById('taskList');
  const active = getTodayActiveTasks();
  if (active.length === 0) {
    list.innerHTML = '<div class="empty-state">🎉 今天没有待办</div>';
    return;
  }
  list.innerHTML = active.map((t, i) => renderTaskCard(t, i, active.length)).join('');
}

function renderTaskCard(t, index, total) {
  const now = new Date();
  const isOverdue = t.deadline && new Date(t.deadline) < now;
  const deadlineHtml = t.deadline
    ? `<div class="task-deadline${isOverdue ? ' overdue' : ''}">⏰ ${formatDeadline(t.deadline)}${isOverdue ? ' ⚠️已逾期' : ''}</div>`
    : '';
  const pinIcon = t.pinned ? '📌 ' : '';
  const subtasksHtml = t.sub_tasks.length > 0
    ? `<div class="subtasks">${t.sub_tasks.map(s =>
        `<div class="subtask-item" data-subid="${s.id}">
          <input type="checkbox" ${s.completed ? 'checked' : ''} onchange="handleSubTaskToggle('${t.id}','${s.id}')">
          <span${s.completed ? ' style="text-decoration:line-through"' : ''}>${esc(s.content)}</span>
        </div>`
      ).join('')}</div>`
    : '';
  
  return `
  <div class="task-card" data-id="${t.id}" id="card-${t.id}">
    <div class="priority-bar ${t.priority}"></div>
    <div class="task-body" onclick="handleEditTask('${t.id}')">
      <div class="task-content">${pinIcon}${esc(t.content)}</div>
      ${subtasksHtml}
      ${deadlineHtml}
    </div>
    <div class="task-actions">
      <button class="arrow-btn" onclick="handleMove('${t.id}','up')" ${index === 0 ? 'disabled' : ''}>▲</button>
      <button class="arrow-btn" onclick="handleMove('${t.id}','down')" ${index === total - 1 ? 'disabled' : ''}>▼</button>
    </div>
    <button class="circle-btn" onclick="handleCompleteClick('${t.id}')">○</button>
  </div>`;
}

// ===== 渲染已完成 =====
function renderDoneTasks() {
  const section = document.getElementById('doneSection');
  const done = getTodayDoneTasks();
  if (done.length === 0) { section.innerHTML = ''; return; }
  section.innerHTML = `
    <div class="done-header" onclick="toggleDone()">
      ${doneCollapsed ? '▶' : '▼'} 已完成 (${done.length})
    </div>
    <div id="doneList" style="display:${doneCollapsed ? 'none' : 'block'}">
      ${done.map(t => `
        <div class="task-card done-card" data-id="${t.id}">
          <div class="priority-bar ${t.priority}"></div>
          <div class="task-body">
            <div class="task-content">${esc(t.content)}</div>
          </div>
          <button class="circle-btn done" onclick="handleUncomplete('${t.id}')">✓</button>
        </div>
      `).join('')}
    </div>`;
}

// ===== 格式化截止时间 =====
function formatDeadline(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((d - now) / 86400000);
  const time = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  if (diffDays === 0) return `今天 ${time}`;
  if (diffDays === 1) return `明天 ${time}`;
  if (diffDays === -1) return `昨天 ${time}`;
  return `${d.getMonth()+1}/${d.getDate()} ${time}`;
}

// ===== HTML 转义 =====
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

// ===== 事件处理 =====
function handleCompleteClick(id) {
  showConfirm('确认完成这个任务？', () => {
    completeTask(id);
    render();
  });
}

function handleUncomplete(id) {
  showConfirm('撤销完成，恢复为未完成？', () => {
    uncompleteTask(id);
    render();
  });
}

function handleMove(id, dir) {
  moveTask(id, dir);
  render();
}

function handleSubTaskToggle(taskId, subId) {
  toggleSubTask(taskId, subId);
  render();
}

function handleEditTask(id) {
  const tasks = loadTasks();
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  const card = document.getElementById('card-' + id);
  if (!card) return;
  const body = card.querySelector('.task-body');
  const old = body.querySelector('.task-content');
  body.innerHTML = `<input class="task-input" id="edit-${id}" value="${esc(t.content)}" style="flex:1;font-size:15px;">`;
  const inp = document.getElementById('edit-' + id);
  inp.focus();
  inp.select();
  inp.addEventListener('blur', () => {
    updateTaskContent(id, inp.value);
    render();
  });
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { inp.blur(); }
  });
}

// ===== 弹窗 =====
function showConfirm(msg, onConfirm) {
  document.getElementById('modalMsg').textContent = msg;
  document.getElementById('confirmModal').classList.add('show');
  confirmCallback = onConfirm;
}

document.getElementById('modalCancel').addEventListener('click', () => {
  document.getElementById('confirmModal').classList.remove('show');
  confirmCallback = null;
});
document.getElementById('modalConfirm').addEventListener('click', () => {
  document.getElementById('confirmModal').classList.remove('show');
  if (confirmCallback) confirmCallback();
  confirmCallback = null;
});

// ===== 长按菜单 =====
let longPressTimer;
document.getElementById('taskList').addEventListener('touchstart', (e) => {
  const card = e.target.closest('.task-card');
  if (!card) return;
  const id = card.dataset.id;
  longPressTimer = setTimeout(() => showContextMenu(id, e), 600);
});
document.getElementById('taskList').addEventListener('touchend', () => clearTimeout(longPressTimer));
document.getElementById('taskList').addEventListener('touchmove', () => clearTimeout(longPressTimer));

function showContextMenu(id, e) {
  contextTaskId = id;
  const tasks = loadTasks();
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  const menu = document.getElementById('contextMenu');
  menu.innerHTML = `
    <button onclick="handleContextPin()">${t.pinned ? '📌 取消钉选' : '📌 钉选置顶'}</button>
    <button class="danger" onclick="handleContextDelete()">🗑 删除任务</button>
  `;
  menu.style.left = Math.min(e.touches[0].clientX, window.innerWidth - 160) + 'px';
  menu.style.top = (e.touches[0].clientY - 80) + 'px';
  menu.classList.add('show');
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.context-menu')) {
    document.getElementById('contextMenu').classList.remove('show');
  }
});

function handleContextPin() {
  if (contextTaskId) { togglePin(contextTaskId); render(); }
  document.getElementById('contextMenu').classList.remove('show');
}
function handleContextDelete() {
  document.getElementById('contextMenu').classList.remove('show');
  if (contextTaskId) {
    showConfirm('确认删除这个任务？', () => {
      deleteTask(contextTaskId);
      render();
    });
  }
}

// ===== 折叠已完成 =====
function toggleDone() {
  doneCollapsed = !doneCollapsed;
  render();
}

// ===== 添加任务 =====
function handleAddTask() {
  const input = document.getElementById('taskInput');
  const content = input.value.trim();
  if (!content) return;
  const deadline = document.getElementById('deadlineInput').value || null;
  createTask(content, currentPriority, deadline);
  input.value = '';
  document.getElementById('deadlineInput').value = '';
  render();
}

// ===== 优先级选择 =====
document.getElementById('prioritySelect').addEventListener('click', (e) => {
  const btn = e.target.closest('.priority-btn');
  if (!btn) return;
  currentPriority = btn.dataset.p;
  document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
});

// ===== 事件绑定 =====
document.getElementById('addBtn').addEventListener('click', handleAddTask);
document.getElementById('taskInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleAddTask();
});
document.getElementById('clearDone').addEventListener('click', () => {
  const done = getTodayDoneTasks();
  if (done.length === 0) return;
  showConfirm(`确认清除全部 ${done.length} 个已完成任务？`, () => {
    clearDoneTasks();
    render();
  });
});

// ===== 暗色模式 =====
function applyTheme(mode) {
  document.body.classList.remove('light', 'dark');
  if (mode === 'light') document.body.classList.add('light');
  else if (mode === 'dark') document.body.classList.add('dark');
  localStorage.setItem('memo_theme', mode);
  document.querySelector('meta[name="theme-color"]').content =
    mode === 'dark' ? '#1a1a2e' : '#ffffff';
}

document.getElementById('themeToggle').addEventListener('click', () => {
  const current = localStorage.getItem('memo_theme') || 'auto';
  const next = { auto: 'light', light: 'dark', dark: 'auto' };
  applyTheme(next[current]);
});

// ===== 初始化 =====
(function init() {
  const saved = localStorage.getItem('memo_theme') || 'auto';
  if (saved === 'auto') {
    // 靠 CSS media query 自动处理
  } else {
    applyTheme(saved);
  }
  cleanOldTasks(loadTasks()); // 启动时清理
  render();
})();
```

**验收：** 添加任务 → 列表显示 → 点击圆圈完成 → 弹窗确认 → 下沉到已完成。

---

### Task 4: PWA 配置文件

**Files:** Create `manifest.json`, Create `sw.js`

**manifest.json：**
```json
{
  "name": "我的备忘录",
  "short_name": "备忘录",
  "description": "极简个人任务备忘录",
  "start_url": ".",
  "display": "standalone",
  "background_color": "#f5f5f7",
  "theme_color": "#ffffff",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**sw.js：**
```javascript
const CACHE = 'memo-v1';
const ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
});
```

---

### Task 5: 生成 App 图标 + README

生成两个纯色 SVG 图标（192px 和 512px），README 写使用说明。

**README 内容要点：**
- 功能介绍（16 项）
- 如何使用：双击 index.html / npx serve
- 添加主屏幕：浏览器打开 → 菜单 → 添加到主屏幕
- 技术说明：localStorage，数据在本地，不联网
- 部署到 GitHub Pages 步骤

---

### 自检清单

| # | 功能 | 覆盖 |
|:--:|------|:--:|
| 1 | 添加任务 | Task 3 handleAddTask |
| 2 | 任务列表 | Task 3 renderActiveTasks |
| 3 | 完成确认 | Task 3 handleCompleteClick + modal |
| 4 | 撤销完成 | Task 3 handleUncomplete |
| 5 | 内联编辑 | Task 3 handleEditTask |
| 6 | 钉选置顶 | Task 2 togglePin + Task 3 context menu |
| 7 | 子任务 | Task 2 subTask CRUD + Task 3 render |
| 8 | 排序箭头 | Task 2 moveTask + Task 3箭头按钮 |
| 9 | 进度条 | Task 3 renderStats |
| 10 | 折叠已完成 | Task 3 toggleDone |
| 11 | 删除 | Task 3 handleContextDelete |
| 12 | 清除已完成 | Task 3 clearDone 按钮 |
| 13 | 深色模式 | Task 1 CSS变量 + Task 3 applyTheme |
| 14 | 按天刷新 | Task 2 getTodayActiveTasks (date === today) |
| 15 | 30天清理 | Task 2 cleanOldTasks |
| 16 | PWA | Task 4 manifest + sw |