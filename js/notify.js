/* ============================================================
   我的备忘录 — 通知模块 (v2.1)

   职责：截止时间临近时弹出系统通知
   接口：Notifier.* 命名空间
   依赖：TaskData（数据层）、UI（格式化工具）

   当前方案：前台轮询（Notification API + setInterval）
   升级路径：打包 APK 后替换 setInterval → Android AlarmManager
             Notifier.check() 逻辑原封不动复用
   ============================================================ */

var Notifier = (function () {
  'use strict';

  var CHECK_INTERVAL = 60000;   // 轮询间隔：60 秒
  var REMIND_MINUTES = 5;       // 提前 N 分钟提醒
  var timerId = null;

  // 已通知过的任务 ID（防重复）
  var notifiedSet = {};

  /* ── 权限检查 ── */

  function isSupported() {
    return 'Notification' in window;
  }

  function hasPermission() {
    return Notification.permission === 'granted';
  }

  function requestPermission() {
    return Notification.requestPermission().then(function (perm) {
      return perm === 'granted';
    }).catch(function () {
      return false;
    });
  }

  /* ── 核心逻辑 ── */

  /** 检查所有活跃任务，对即将到期的弹出通知 */
  function check() {
    if (!hasPermission()) {
      // 权限被撤销，停止轮询
      stop();
      return;
    }

    var active = TaskData.getActive();
    var now = new Date();
    var upcoming = [];

    for (var i = 0; i < active.length; i++) {
      var t = active[i];
      if (!t.deadline) continue;           // 无截止时间
      if (notifiedSet[t.id]) continue;      // 已通知过

      var dl = new Date(t.deadline);
      var diffMs = dl.getTime() - now.getTime();
      var diffMin = diffMs / 60000;

      // 截止时间在 REMIND_MINUTES 分钟内且尚未过期
      if (diffMin >= 0 && diffMin <= REMIND_MINUTES) {
        upcoming.push(t);
      }
    }

    for (var j = 0; j < upcoming.length; j++) {
      fireNotification(upcoming[j]);
    }
  }

  /** 弹出单条通知 */
  function fireNotification(task) {
    try {
      var bodyText = task.content;
      if (bodyText.length > 40) bodyText = bodyText.substring(0, 40) + '...';

      var dl = new Date(task.deadline);
      var timeStr = String(dl.getHours()).padStart(2, '0') + ':' + String(dl.getMinutes()).padStart(2, '0');

      var notification = new Notification('⏰ 任务即将到期', {
        body: bodyText,
        tag: 'memo-' + task.id,     // 同 ID 不重复弹
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        timestamp: Date.now(),
        requireInteraction: true,   // 用户不点击不自动消失
        vibrate: [200, 100, 200],
        silent: false
      });

      // 点击通知跳回 App
      notification.addEventListener('click', function () {
        window.focus();
        notification.close();
      });

      // 标记已通知
      notifiedSet[task.id] = true;

    } catch (e) {
      // 通知失败静默处理（如权限被撤销）
    }
  }

  /* ── 公共方法 ── */

  /** 标记任务已通知（任务完成/删除时清除，避免内存泄漏） */
  function clearNotified(taskId) {
    delete notifiedSet[taskId];
  }

  /** 启动通知系统 */
  function start() {
    if (timerId) return; // 已在运行

    timerId = setInterval(check, CHECK_INTERVAL);

    // 启动后立即检查一次
    check();
  }

  /** 停止通知系统 */
  function stop() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  /** 初始化：请求权限 → 启动轮询 */
  function init() {
    if (!isSupported()) return;

    if (hasPermission()) {
      start();
      return;
    }

    // 权限未决定时请求（denied 则不打扰）
    if (Notification.permission === 'default') {
      requestPermission().then(function (granted) {
        if (granted) start();
      });
    }
    // permission === 'denied' → 静默跳过
  }

  /* ── A→D 升级预留接口 ── */

  /**
   * 未来 APK 打包后，原生端通过此函数触发检查
   * Android: window.Notifier.check() 由原生闹钟回调调用
   */
  function getCheckFunction() {
    return check;
  }

  /* ── 公共接口 ── */
  return {
    init: init,
    check: check,
    start: start,
    stop: stop,
    clearNotified: clearNotified,
    isSupported: isSupported,
    hasPermission: hasPermission,
    getCheck: getCheckFunction,
    // 暴露配置供未来修改
    getRemindMinutes: function () { return REMIND_MINUTES; },
    getCheckInterval: function () { return CHECK_INTERVAL; }
  };
})();