/* ============================================================
   我的备忘录 — 入口文件 (v2.3.2)

   职责：初始化顺序、版本检测、PWA 注册、通知系统
   依赖：UI、TaskData、Render、Events、Notifier
   ============================================================ */

(function () {
  'use strict';

  var VERSION = 'v2.3.2';
  var VERSION_KEY = 'memo_version';

  /* ── 版本检测 + Toast 提示 ── */
  function checkVersion() {
    var lastVer = null;
    try { lastVer = localStorage.getItem(VERSION_KEY); } catch (e) { /* 降级 */ }

    // 在标题旁显示版本号（始终可见，方便确认当前版本）
    var h1 = document.querySelector('.header h1');
    if (h1) {
      h1.innerHTML = '我的备忘录 <span class="version-tag">' + VERSION + '</span>';
    }

    // 版本变了 → 弹 toast 提示
    if (lastVer && lastVer !== VERSION) {
      showUpdateToast();
    }

    // 记录当前版本
    try { localStorage.setItem(VERSION_KEY, VERSION); } catch (e) { /* 降级 */ }
  }

  function showUpdateToast() {
    // 防止重复弹出
    if (document.querySelector('.version-toast')) return;
    var toast = document.createElement('div');
    toast.className = 'version-toast';
    toast.textContent = '✅ 已更新到 ' + VERSION;
    document.body.appendChild(toast);
    // 动画结束后自动移除
    toast.addEventListener('animationend', function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    });
  }

  /* ── 初始化 ── */

  // 1. 版本检测（最先执行，让用户看到版本号）
  checkVersion();

  // 2. 数据完整性校验
  (function checkDataIntegrity() {
    try {
      var testKey = '__memo_integrity_check__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      var tasks = TaskData.load();
    } catch (e) {
      console.error('[备忘录] 存储不可用，数据可能无法保存:', e.message || e);
    }
  })();

  // 3. 主题、数据、渲染、动画、事件、通知
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