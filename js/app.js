/* ============================================================
   我的备忘录 — 入口文件 (v2.1)

   职责：初始化顺序、PWA 注册、通知系统
   依赖：UI、TaskData、Render、Events、Notifier
   ============================================================ */

(function () {
  'use strict';

  /* ── 初始化 ── */

  // 数据完整性校验：确保 localStorage 可读可写
  (function checkDataIntegrity() {
    try {
      var testKey = '__memo_integrity_check__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      var tasks = TaskData.load();
      var taskCount = tasks.length;
      if (taskCount > 0) {
        var todayTasks = tasks.filter(function (t) { return t.date === TaskData.today(); });
      }
    } catch (e) {
      console.error('[备忘录] 存储不可用，数据可能无法保存:', e.message || e);
    }
  })();

  UI.Theme.init();
  TaskData.cleanOld();
  Render.all();
  if (typeof Anim !== 'undefined') Anim.afterRender();
  Events.init();
  Notifier.init();

  /* ── PWA: Service Worker 注册 + 更新检测 ── */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      reg.addEventListener('updatefound', function () {
        var newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', function () {
          if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
            UI.Modal.confirm('发现新版本，点击确定刷新页面').then(function (confirmed) {
              if (confirmed) window.location.reload();
            });
          }
        });
      });
    }).catch(function () { /* SW 注册失败，静默处理 */ });
  }

  /* ── PWA: 安装提示 ── */
  var deferredPrompt = null;
  var installBtn = document.getElementById('installBtn');

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'flex';
  });

  installBtn.addEventListener('click', function () {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function (result) {
      if (result.outcome === 'accepted') {
        installBtn.style.display = 'none';
      }
      deferredPrompt = null;
    });
  });

  window.addEventListener('appinstalled', function () {
    installBtn.style.display = 'none';
    deferredPrompt = null;
  });
})();