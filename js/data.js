/* ============================================================
   我的备忘录 — 数据层 (v2.0)

   职责：localStorage CRUD，零 DOM 依赖，纯数据处理
   接口：TaskData.* 命名空间
   ============================================================ */

var TaskData = (function () {
  'use strict';

  var STORAGE_KEY = 'memo_tasks';
  var RETENTION_DAYS = 30;
  var currentDate = null; // null 表示"今天"

  /* ── 工具 ── */
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 8);
  }

  /** 将 Date 对象格式化为本地时区的 YYYY-MM-DD
   *  ⚠️ 不能用 toISOString()——它是 UTC，在 UTC+8 等正时区会错一天 */
  function dateToString(d) {
    return d.getFullYear() + '-' +
           String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
  }

  function today() {
    return dateToString(new Date());
  }

  /** 当前查看的日期（null 自动解析为今天） */
  function getCurrentDate() {
    return currentDate || today();
  }

  function setCurrentDate(date) {
    currentDate = (date === today()) ? null : date;
  }

  function isTodayView() {
    return currentDate === null;
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
      console.error('[备忘录] localStorage 写入失败:', e.message || e);
      // 尝试清理旧数据后重试一次
      try {
        var cutoffRetry = new Date();
        cutoffRetry.setDate(cutoffRetry.getDate() - RETENTION_DAYS);
        var cutoffStrRetry = dateToString(cutoffRetry);
        var cleaned = tasks.filter(function (t) {
          return !t.completed || t.date >= cutoffStrRetry;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
        console.warn('[备忘录] 清理后重试保存成功，移除了 ' + (tasks.length - cleaned.length) + ' 条旧数据');
      } catch (e2) {
        console.error('[备忘录] 重试保存仍失败:', e2.message || e2);
      }
    }
  }

  /** 防御性保存：页面隐藏/退出时调用，确保数据不丢失 */
  function forceSave() {
    try {
      var tasks = loadTasks();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.error('[备忘录] 防御性保存失败:', e.message || e);
    }
  }

  /* ── 数据清理 ── */

  /** 清理 30 天前的已完成任务，返回清理后的数组 */
  function cleanOldTasks(tasks) {
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
    var cutoffStr = dateToString(cutoff);
    var cleaned = tasks.filter(function (t) {
      return !t.completed || t.date >= cutoffStr;
    });
    if (cleaned.length !== tasks.length) saveRaw(cleaned);
    return cleaned;
  }

  /* ── CRUD 操作 ── */

  /** 创建任务 */
  function createTask(content, priority, deadline) {
    // 计算新任务的 order：同钉选组中排最前面
    var tasks = cleanOldTasks(loadTasks());
    var sameGroup = tasks.filter(function (t) {
      return !t.completed && t.date === today() && !t.pinned;
    });
    var minOrder = 0;
    if (sameGroup.length > 0) {
      minOrder = sameGroup[0].order;
      for (var i = 1; i < sameGroup.length; i++) {
        if (sameGroup[i].order < minOrder) minOrder = sameGroup[i].order;
      }
    }

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
      order: minOrder - 1   // 排在此前最靠前的任务之上
    };
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

  /** 修改优先级 */
  function updatePriority(id, priority) {
    var tasks = loadTasks();
    var t = findById(tasks, id);
    if (t) t.priority = priority;
    saveRaw(tasks);
  }

  /** 调整排序 */
  function moveTask(id, direction) {
    var tasks = loadTasks();
    var todayStr = today();
    var active = tasks.filter(function (t) {
      return !t.completed && t.date === todayStr;
    });
    sortTasks(active);

    var idx = -1;
    for (var i = 0; i < active.length; i++) {
      if (active[i].id === id) { idx = i; break; }
    }
    if (idx < 0) return;
    var swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= active.length) return;

    // 在数组中交换两个任务的位置
    var temp = active[idx];
    active[idx] = active[swapIdx];
    active[swapIdx] = temp;

    // 按新位置重新分配所有 order 值，保证 sortTasks 后顺序正确
    for (var j = 0; j < active.length; j++) {
      active[j].order = j;
    }

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

  /** 获取指定日期的活跃任务（排序后），默认当前查看日期 */
  function getActiveTasks(optDate) {
    var date = optDate || getCurrentDate();
    var tasks = cleanOldTasks(loadTasks());
    var active = tasks.filter(function (t) {
      return !t.completed && t.date === date;
    });
    sortTasks(active);
    return active;
  }

  /** 获取指定日期的已完成任务，默认当前查看日期 */
  function getDoneTasks(optDate) {
    var date = optDate || getCurrentDate();
    var tasks = loadTasks();
    return tasks.filter(function (t) {
      return t.completed && t.date === date;
    }).sort(function (a, b) {
      return new Date(b.completed_at || 0) - new Date(a.completed_at || 0);
    });
  }

  /** 获取所有有任务的日期列表（倒序，最近 30 天） */
  function getAvailableDates() {
    var tasks = loadTasks();
    var dates = {};
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
    var cutoffStr = dateToString(cutoff);
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].date >= cutoffStr) {
        dates[tasks[i].date] = true;
      }
    }
    // 确保今天始终在列表中
    dates[today()] = true;
    var result = Object.keys(dates).sort().reverse();
    return result;
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
    tasks.sort(function (a, b) {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      // order 为主键，用户手动调序优先
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
    updatePriority: updatePriority,
    move: moveTask,
    subTask: subTask,
    getActive: getActiveTasks,
    getDone: getDoneTasks,
    getAll: getAllTasks,
    getAvailableDates: getAvailableDates,
    getCurrentDate: getCurrentDate,
    setCurrentDate: setCurrentDate,
    isTodayView: isTodayView,
    cleanOld: function () { return cleanOldTasks(loadTasks()); },
    forceSave: forceSave,
    today: today,
    uid: uid
  };
})();