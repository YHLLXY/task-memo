/* ============================================================
   我的备忘录 — 动画模块 (v2.2)

   职责：封装 anime.js 为项目专用动画函数
   接口：Anim.* 命名空间
   依赖：anime.js (全局 anime 对象，UMD 加载)
   兼容：anime 未加载时静默降级，不影响核心功能
   ============================================================ */

var Anim = (function () {
  'use strict';

  var hasAnime = typeof anime !== 'undefined';

  /* ── 安全包装器：anime 未加载时静默降级 ── */
  function safe(fn, fallback) {
    if (!hasAnime) {
      if (fallback) fallback();
      return null;
    }
    try {
      return fn();
    } catch (e) {
      if (fallback) fallback();
      return null;
    }
  }

  /* ================================================================
     1. 任务完成：卡片缩小 + 淡出 → 回调触发 render
     ================================================================ */

  function cardComplete(id, callback) {
    var card = document.getElementById('card-' + id);
    if (!card) {
      if (callback) callback();
      return;
    }
    safe(function () {
      return anime({
        targets: card,
        scale: [1, 0.92],
        opacity: [1, 0],
        translateX: [0, 24],
        duration: 250,
        easing: 'easeOutCubic',
        complete: function () {
          if (callback) callback();
        }
      });
    }, function () {
      // 降级：立即执行回调
      if (callback) callback();
    });
  }

  /* ================================================================
     2. 进度条：Spring 弹性动画
     ================================================================ */

  function progressTo(percent) {
    safe(function () {
      return anime({
        targets: document.getElementById('progressFill'),
        width: percent + '%',
        duration: 700,
        easing: 'easeOutElastic(1, .55)'
      });
    });
  }

  /* ================================================================
     3. 弹窗入场：Spring 弹入
     ================================================================ */

  function modalOpen() {
    safe(function () {
      var modal = document.querySelector('#confirmModal .modal');
      if (!modal) return;
      return anime({
        targets: modal,
        scale: [0.85, 1],
        opacity: [0, 1],
        duration: 400,
        easing: 'easeOutElastic(1, .45)'
      });
    });
  }

  /* ================================================================
     4. 新任务滑入
     ================================================================ */

  function cardEnter(id) {
    safe(function () {
      var card = document.getElementById('card-' + id);
      if (!card) return;
      return anime({
        targets: card,
        translateY: [-16, 0],
        opacity: [0, 1],
        duration: 320,
        easing: 'easeOutCubic'
      });
    });
  }

  /* ================================================================
     5. 页面加载 Stagger 序列入场
     ================================================================ */

  function staggerCards() {
    safe(function () {
      var cards = document.querySelectorAll('#taskList .task-card');
      if (!cards.length) return;
      return anime({
        targets: cards,
        translateY: [18, 0],
        opacity: [0, 1],
        delay: anime.stagger(45, { from: 'first' }),
        duration: 320,
        easing: 'easeOutCubic'
      });
    });
  }

  /* ── 工具：页面加载后统一钩子 ── */

  function afterRender() {
    staggerCards();
  }

  /* ── 公共接口 ── */
  return {
    cardComplete: cardComplete,
    cardEnter: cardEnter,
    progressTo: progressTo,
    modalOpen: modalOpen,
    staggerCards: staggerCards,
    afterRender: afterRender,
    isAvailable: function () { return hasAnime; }
  };
})();