/* ============================================================
   我的备忘录 — 交互层 (v2.0)

   职责：事件绑定、用户交互处理
   接口：Events.* 命名空间
   依赖：TaskData（数据）、Render（渲染）、UI（工具）
   注意：部分函数暴露到 window 供 render.js 的 inline onclick 调用
   ============================================================ */

var Events = (function () {
  'use strict';

  /* ── 状态 ── */
  var currentPriority = 'medium';
  var contextTaskId = null;

  // 已完成折叠状态（挂 window 方便 render.js 读取）
  window._doneCollapsed = false;

  /* ── 添加任务 ── */

  function handleAddTask() {
    var input = document.getElementById('taskInput');
    var content = input.value.trim();
    if (!content) return;
    var deadline = UI.DatePicker.getValue();
    var task = TaskData.create(content, currentPriority, deadline);
    input.value = '';
    UI.DatePicker.clear();
    Render.all();
    if (task && typeof Anim !== 'undefined') Anim.cardEnter(task.id);
    input.focus();
  }

  /* ── 优先级选择 ── */

  function handlePriorityClick(e) {
    var btn = e.target.closest('.priority-btn');
    if (!btn) return;
    currentPriority = btn.dataset.p;
    var buttons = document.querySelectorAll('.priority-btn');
    for (var i = 0; i < buttons.length; i++) { buttons[i].classList.remove('active'); }
    btn.classList.add('active');
  }

  /* ── 完成任务 ── */

  function handleCompleteClick(id) {
    UI.Modal.confirm('确认完成这个任务？').then(function (confirmed) {
      if (confirmed) {
        TaskData.complete(id);
        if (typeof Anim !== 'undefined') {
          Anim.cardComplete(id, function () { Render.all(); });
        } else {
          Render.all();
        }
      }
    });
  }

  /* ── 撤销完成 ── */

  function handleUncomplete(id) {
    UI.Modal.confirm('撤销完成，恢复为未完成？').then(function (confirmed) {
      if (confirmed) {
        TaskData.uncomplete(id);
        Render.all();
      }
    });
  }

  /* ── 排序箭头 ── */

  function handleMove(id, dir) {
    TaskData.move(id, dir);
    Render.all();
  }

  /* ── 内联编辑 ── */

  function handleEditTask(id) {
    var tasks = TaskData.load();
    var t = null;
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].id === id) { t = tasks[i]; break; }
    }
    if (!t) return;
    var card = document.getElementById('card-' + id);
    if (!card) return;
    var body = card.querySelector('.task-body');
    body.innerHTML = '<input class="task-input" id="edit-' + id + '" value="' + UI.escHTML(t.content) + '" style="flex:1;font-size:15px;padding:8px;">';
    var inp = document.getElementById('edit-' + id);
    inp.focus();
    inp.select();
    function save() {
      TaskData.updateContent(id, inp.value);
      Render.all();
    }
    inp.addEventListener('blur', save);
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { inp.blur(); }
      if (e.key === 'Escape') { inp.value = t.content; inp.blur(); }
    });
  }

  /* ── 子任务 ── */

  function handleSubTaskToggle(taskId, subId) {
    TaskData.subTask.toggle(taskId, subId);
    Render.all();
  }

  function handleAddSubTask(taskId) {
    var inp = document.getElementById('subinp-' + taskId);
    if (!inp) return;
    var content = inp.value.trim();
    if (!content) return;
    TaskData.subTask.add(taskId, content);
    inp.value = '';
    Render.all();
  }

  function handleSubTaskKey(e, taskId) {
    if (e.key === 'Enter') handleAddSubTask(taskId);
  }

  /* ── 长按菜单 ── */

  var longPressTimer = null;

  function initLongPress() {
    var taskList = document.getElementById('taskList');

    taskList.addEventListener('touchstart', function (e) {
      var card = e.target.closest('.task-card');
      if (!card) return;
      var id = card.dataset.id;
      longPressTimer = setTimeout(function () { showContextMenu(id, e); }, 600);
    });
    taskList.addEventListener('touchend', function () { clearTimeout(longPressTimer); });
    taskList.addEventListener('touchmove', function () { clearTimeout(longPressTimer); });

    // 桌面端右键菜单
    taskList.addEventListener('contextmenu', function (e) {
      var card = e.target.closest('.task-card');
      if (!card) return;
      e.preventDefault();
      showContextMenu(card.dataset.id, e);
    });
  }

  function showContextMenu(id, e) {
    contextTaskId = id;
    var tasks = TaskData.load();
    var t = null;
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].id === id) { t = tasks[i]; break; }
    }
    if (!t) return;
    var menu = document.getElementById('contextMenu');
    menu.innerHTML =
      '<button onclick="Events.handleContextPin()">' + (t.pinned ? '📌 取消钉选' : '📌 钉选置顶') + '</button>' +
      '<button class="danger" onclick="Events.handleContextDelete()">🗑 删除任务</button>';
    var x = e.touches ? e.touches[0].clientX : e.clientX;
    var y = e.touches ? e.touches[0].clientY : e.clientY;
    menu.style.left = Math.min(x, window.innerWidth - 170) + 'px';
    menu.style.top = Math.min(y - 80, window.innerHeight - 120) + 'px';
    menu.classList.add('show');
  }

  function handleContextPin() {
    if (contextTaskId) { TaskData.togglePin(contextTaskId); Render.all(); }
    document.getElementById('contextMenu').classList.remove('show');
  }

  function handleContextDelete() {
    document.getElementById('contextMenu').classList.remove('show');
    if (contextTaskId) {
      var deleteId = contextTaskId;
      UI.Modal.confirm('确认删除这个任务？').then(function (confirmed) {
        if (confirmed) {
          TaskData.delete(deleteId);
          if (typeof Anim !== 'undefined') {
            Anim.cardComplete(deleteId, function () { Render.all(); });
          } else {
            Render.all();
          }
        }
      });
    }
  }

  function closeContextMenu(e) {
    if (!e.target.closest('.context-menu') && !e.target.closest('.task-card')) {
      document.getElementById('contextMenu').classList.remove('show');
    }
  }

  /* ── 折叠已完成 ── */

  function toggleDone() {
    window._doneCollapsed = !window._doneCollapsed;
    Render.all();
  }

  /* ── 清除已完成 ── */

  function handleClearDone() {
    var done = TaskData.getDone();
    if (done.length === 0) return;
    UI.Modal.confirm('确认清除全部 ' + done.length + ' 个已完成任务？').then(function (confirmed) {
      if (confirmed) {
        TaskData.clearDone();
        Render.all();
      }
    });
  }

  /* ── 初始化所有事件 ── */

  function init() {
    // 添加任务按钮
    document.getElementById('addBtn').addEventListener('click', handleAddTask);
    document.getElementById('taskInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') handleAddTask();
    });

    // 优先级选择
    document.getElementById('prioritySelect').addEventListener('click', handlePriorityClick);

    // 日期选择器
    UI.DatePicker.init();

    // 清除已完成
    document.getElementById('clearDone').addEventListener('click', handleClearDone);

    // 长按菜单
    initLongPress();
    document.addEventListener('click', closeContextMenu);

    // 主题切换
    document.getElementById('themeToggle').addEventListener('click', function () {
      UI.Theme.toggle();
    });
  }

  /* ── 暴露到 window 的 inline onclick 回调 ── */

  return {
    init: init,
    handleCompleteClick: handleCompleteClick,
    handleUncomplete: handleUncomplete,
    handleMove: handleMove,
    handleEditTask: handleEditTask,
    handleSubTaskToggle: handleSubTaskToggle,
    handleAddSubTask: handleAddSubTask,
    handleSubTaskKey: handleSubTaskKey,
    handleContextPin: handleContextPin,
    handleContextDelete: handleContextDelete,
    toggleDone: toggleDone
  };
})();

/* ── 将 inline 回调挂到 window ── */
window.Events = Events;