/* ============================================================
   我的备忘录 — 视图层 (v2.0)

   职责：生成 HTML 字符串，更新 DOM
   接口：Render.* 命名空间
   依赖：TaskData（数据层）、UI（格式化工具）
   ============================================================ */

var Render = (function () {
  'use strict';

  var _renderPending = false;

  /** RAF 防抖：一帧内多次调用只执行一次 */
  function scheduleRender(fn) {
    if (_renderPending) return;
    _renderPending = true;
    requestAnimationFrame(function () {
      _renderPending = false;
      fn();
    });
  }

  /* ── 统计信息 + 进度条 ── */

  function renderStats() {
    var active = TaskData.getActive();
    var done = TaskData.getDone();
    var now = new Date();
    var overdueCount = 0;
    for (var i = 0; i < active.length; i++) {
      if (active[i].deadline && new Date(active[i].deadline) < now) overdueCount++;
    }
    var total = active.length + done.length;
    var pct = total === 0 ? 0 : Math.round((done.length / total) * 100);

    document.getElementById('progressFill').style.width = pct + '%';
    var statsHtml = '待完成 ' + active.length + ' · ';
    if (overdueCount > 0) {
      statsHtml += '<span class="stat-overdue">逾期 ' + overdueCount + '</span> · ';
    }
    statsHtml += '已完成 ' + done.length;
    document.getElementById('stats').innerHTML = statsHtml;
    document.getElementById('dateLabel').textContent = UI.formatDate(TaskData.today());
  }

  /* ── 活跃任务列表 ── */

  function renderActiveTasks() {
    var list = document.getElementById('taskList');
    var active = TaskData.getActive();
    var doneCount = TaskData.getDone().length;
    var totalCount = active.length + doneCount;

    if (active.length === 0 && totalCount === 0) {
      list.innerHTML = '<div class="empty-state">✨ 今天没有待办<br><span style="font-size:13px;">添加一个任务开始吧</span></div>';
      return;
    }
    if (active.length === 0) {
      list.innerHTML = '<div class="empty-state">🎉 全部完成！</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < active.length; i++) {
      html += renderTaskCard(active[i], i, active.length);
    }
    list.innerHTML = html;
  }

  function renderTaskCard(t, index, total) {
    var now = new Date();
    var isOverdue = !!(t.deadline && new Date(t.deadline) < now);
    var deadlineHtml = t.deadline
      ? '<div class="task-deadline' + (isOverdue ? ' overdue' : '') + '">⏰ ' + UI.formatDeadline(t.deadline) + '</div>'
      : '';
    var pinIcon = t.pinned ? '<span style="font-size:12px;">📌</span> ' : '';

    // 子任务
    var subtasksHtml = '';
    if (t.sub_tasks.length > 0) {
      subtasksHtml += '<div class="subtasks">';
      for (var i = 0; i < t.sub_tasks.length; i++) {
        var s = t.sub_tasks[i];
        subtasksHtml += '<div class="subtask-item">' +
          '<input type="checkbox" ' + (s.completed ? 'checked' : '') + ' onchange="Events.handleSubTaskToggle(\'' + t.id + '\',\'' + s.id + '\')">' +
          '<span' + (s.completed ? ' style="text-decoration:line-through"' : '') + '>' + UI.escHTML(s.content) + '</span>' +
          '</div>';
      }
      subtasksHtml += '</div>';
    }
    subtasksHtml += '<div class="subtask-add">' +
      '<input type="text" placeholder="+ 添加子步骤" id="subinp-' + t.id + '" onkeydown="Events.handleSubTaskKey(event,\'' + t.id + '\')">' +
      '<button onclick="Events.handleAddSubTask(\'' + t.id + '\')">添加</button>' +
      '</div>';

    var upDisabled = index === 0 ? ' disabled' : '';
    var downDisabled = index === total - 1 ? ' disabled' : '';

    return '<div class="task-card" data-id="' + t.id + '" id="card-' + t.id + '">' +
      '<div class="priority-bar ' + t.priority + '"></div>' +
      '<div class="task-body">' +
        '<div class="task-content" onclick="Events.handleEditTask(\'' + t.id + '\')">' + pinIcon + UI.escHTML(t.content) + '</div>' +
        subtasksHtml +
        deadlineHtml +
      '</div>' +
      '<div class="task-actions">' +
        '<button class="arrow-btn" data-action="move-up" data-id="' + t.id + '" onclick="Events.handleMove(\'' + t.id + '\',\'up\')"' + upDisabled + '>▲</button>' +
        '<button class="arrow-btn" data-action="move-down" data-id="' + t.id + '" onclick="Events.handleMove(\'' + t.id + '\',\'down\')"' + downDisabled + '>▼</button>' +
      '</div>' +
      '<button class="circle-btn" data-action="complete" data-id="' + t.id + '" onclick="Events.handleCompleteClick(\'' + t.id + '\')">○</button>' +
      '</div>';
  }

  /* ── 已完成区域 ── */

  function renderDoneTasks() {
    var section = document.getElementById('doneSection');
    var done = TaskData.getDone();
    var clearBtn = document.getElementById('clearDone');

    if (done.length === 0) {
      section.innerHTML = '';
      clearBtn.style.display = 'none';
      return;
    }
    clearBtn.style.display = 'block';

    // 读取当前折叠状态（由 events.js 维护）
    var collapsed = window._doneCollapsed || false;

    var itemsHtml = '';
    for (var i = 0; i < done.length; i++) {
      var t = done[i];
      itemsHtml += '<div class="task-card done-card" data-id="' + t.id + '">' +
        '<div class="priority-bar ' + t.priority + '"></div>' +
        '<div class="task-body">' +
          '<div class="task-content">' + UI.escHTML(t.content) + '</div>' +
        '</div>' +
        '<button class="circle-btn done" data-action="uncomplete" data-id="' + t.id + '" onclick="Events.handleUncomplete(\'' + t.id + '\')">✓</button>' +
        '</div>';
    }

    section.innerHTML =
      '<div class="done-header" onclick="Events.toggleDone()">' +
        '<span class="done-arrow' + (collapsed ? ' collapsed' : '') + '">▼</span>' +
        ' 已完成 (' + done.length + ')' +
      '</div>' +
      '<div class="done-list-wrap' + (collapsed ? ' collapsed' : '') + '">' +
        '<div>' + itemsHtml + '</div>' +
      '</div>';
  }

  /* ── 全量渲染 ── */

  function renderAll() {
    scheduleRender(function () {
      renderStats();
      renderActiveTasks();
      renderDoneTasks();
    });
  }

  /* ── 公共接口 ── */
  return {
    stats: renderStats,
    activeList: renderActiveTasks,
    doneList: renderDoneTasks,
    all: renderAll,
    schedule: scheduleRender
  };
})();