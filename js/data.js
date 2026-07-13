/* ============================================================
   我的备忘录 — 数据层 (v2.0)

   职责：localStorage CRUD，零 DOM 依赖，纯数据处理
   接口：TaskData.* 命名空间
   ============================================================ */

var TaskData = (function () {
  'use strict';

  var STORAGE_KEY = 'memo_tasks';
  var RETENTION_DAYS = 30;

  /* ── 工具 ── */
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 8);
  }

  function today() {
    return new Date().toISOString().split('T')[0];
  }

  /* ── 基础读写 ── */

  /** 加载全部任务 */
  function loadTasks() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var tasks = JSON.parse(raw);
      // 数据迁移：确保所有任务有 date 字段
      var needsSave = false;
      for (var i = 0; i < tasks.length; i++) {
        if (!tasks[i].date) {
          tasks[i].date = (tasks[i].created_at || '').split('T')[0] || today();
          needsSave = true;
        }
      }
      if (needsSave) saveRaw(tasks);
      return tasks;
    } catch (e) { return []; }
  }

  /** 直接写入（内部使用） */
  function saveRaw(tasks) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      // localStorage 满了，静默失败
    }
  }

  /* ── 数据清理 ── */

  /** 清理 30 天前的已完成任务，返回清理后的数组 */
  function cleanOldTasks(tasks) {
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
    var cutoffStr = cutoff.toISOString().split('T')[0];
    var cleaned = tasks.filter(function (t) {
      return !t.completed || t.date >= cutoffStr;
    });
    if (cleaned.length !== tasks.length) saveRaw(cleaned);
    return cleaned;
  }

  /* ── CRUD 操作 ── */

  /** 创建任务 */
  function createTask(content, priority, deadline) {
    var task = {
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
      order: Date.now()
    };
    var tasks = cleanOldTasks(loadTasks());
    tasks.push(task);
    saveRaw(tasks);
    return task;
  }

  /** 完成任务 */
  function completeTask(id) {
    var tasks = loadTasks();
    var t = findById(tasks, id);
    if (t) { t.completed = true; t.completed_at = new Date().toISOString(); }
    saveRaw(tasks);
  }

  /** 撤销完成 */
  function uncompleteTask(id) {
    var tasks = loadTasks();
    var t = findById(tasks, id);
    if (t) { t.completed = false; t.completed_at = null; }
    saveRaw(tasks);
  }

  /** 删除任务 */
  function deleteTask(id) {
    var tasks = loadTasks().filter(function (t) { return t.id !== id; });
    saveRaw(tasks);
  }

  /** 清除所有已完成 */
  function clearDoneTasks() {
    var tasks = loadTasks().filter(function (t) { return !t.completed; });
    saveRaw(tasks);
  }

  /** 更新任务内容 */
  function updateTaskContent(id, content) {
    var tasks = loadTasks();
    var t = findById(tasks, id);
    if (t) t.content = content.trim();
    saveRaw(tasks);
  }

  /** 切换钉选 */
  function togglePin(id) {
    var tasks = loadTasks();
    var t = findById(tasks, id);
    if (t) t.pinned = !t.pinned;
    saveRaw(tasks);
  }

  /** 调整排序 */
  function moveTask(id, direction) {
    var tasks = loadTasks();
    var active = getTodayActiveTasks();
    var idx = -1;
    for (var i = 0; i < active.length; i++) {
      if (active[i].id === id) { idx = i; break; }
    }
    if (idx < 0) return;
    var swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= active.length) return;
    var tmp = active[idx].order;
    active[idx].order = active[swapIdx].order;
    active[swapIdx].order = tmp;
    saveRaw(tasks);
  }

  /* ── 子任务 ── */

  var subTask = {
    /** 添加子任务 */
    add: function (taskId, content) {
      var tasks = loadTasks();
      var t = findById(tasks, taskId);
      if (t) t.sub_tasks.push({ id: uid(), content: content.trim(), completed: false });
      saveRaw(tasks);
    },

    /** 切换子任务完成 */
    toggle: function (taskId, subId) {
      var tasks = loadTasks();
      var t = findById(tasks, taskId);
      if (t) {
        for (var i = 0; i < t.sub_tasks.length; i++) {
          if (t.sub_tasks[i].id === subId) {
            t.sub_tasks[i].completed = !t.sub_tasks[i].completed;
            break;
          }
        }
      }
      saveRaw(tasks);
    },

    /** 删除子任务 */
    delete: function (taskId, subId) {
      var tasks = loadTasks();
      var t = findById(tasks, taskId);
      if (t) t.sub_tasks = t.sub_tasks.filter(function (s) { return s.id !== subId; });
      saveRaw(tasks);
    }
  };

  /* ── 查询 ── */

  /** 获取今天的活跃任务（排序后） */
  function getActiveTasks() {
    var tasks = cleanOldTasks(loadTasks());
    var active = tasks.filter(function (t) {
      return !t.completed && t.date === today();
    });
    sortTasks(active);
    return active;
  }

  /** 获取今天的已完成任务 */
  function getDoneTasks() {
    var tasks = loadTasks();
    return tasks.filter(function (t) {
      return t.completed && t.date === today();
    }).sort(function (a, b) {
      return new Date(b.completed_at || 0) - new Date(a.completed_at || 0);
    });
  }

  /** 获取全部已加载任务（用于遍历） */
  function getAllTasks() {
    return cleanOldTasks(loadTasks());
  }

  /* ── 内部辅助 ── */

  function findById(tasks, id) {
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].id === id) return tasks[i];
    }
    return null;
  }

  function sortTasks(tasks) {
    var now = new Date();
    tasks.sort(function (a, b) {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      var aOver = !!(a.deadline && new Date(a.deadline) < now);
      var bOver = !!(b.deadline && new Date(b.deadline) < now);
      if (aOver !== bOver) return aOver ? -1 : 1;
      var pri = { high: 0, medium: 1, low: 2 };
      if (pri[a.priority] !== pri[b.priority]) return pri[a.priority] - pri[b.priority];
      return a.order - b.order;
    });
  }

  /* ── 公共接口 ── */
  return {
    load: loadTasks,
    create: createTask,
    complete: completeTask,
    uncomplete: uncompleteTask,
    delete: deleteTask,
    clearDone: clearDoneTasks,
    updateContent: updateTaskContent,
    togglePin: togglePin,
    move: moveTask,
    subTask: subTask,
    getActive: getActiveTasks,
    getDone: getDoneTasks,
    getAll: getAllTasks,
    cleanOld: function () { return cleanOldTasks(loadTasks()); },
    today: today,
    uid: uid
  };
})();