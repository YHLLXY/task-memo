/* ============================================================
   我的备忘录 — UI 工具层 (v2.0)

   职责：Modal 弹窗、主题管理、日期时间选择器
   接口：UI.* 命名空间
   依赖：无（纯 UI，不涉及数据逻辑）
   ============================================================ */

var UI = (function () {
  'use strict';

  /* ================================================================
     Modal — Promise 风格弹窗
     ================================================================ */

  function showConfirm(msg) {
    return new Promise(function (resolve) {
      document.getElementById('modalMsg').textContent = msg;
      document.getElementById('confirmModal').classList.add('show');

      function onCancel() {
        cleanup();
        resolve(false);
      }
      function onConfirm() {
        cleanup();
        resolve(true);
      }
      function cleanup() {
        document.getElementById('confirmModal').classList.remove('show');
        document.getElementById('modalCancel').removeEventListener('click', onCancel);
        document.getElementById('modalConfirm').removeEventListener('click', onConfirm);
      }

      document.getElementById('modalCancel').addEventListener('click', onCancel);
      document.getElementById('modalConfirm').addEventListener('click', onConfirm);
    });
  }

  /* ================================================================
     Theme — 主题管理
     ================================================================ */

  var THEME_KEY = 'memo_theme';
  var SWITCHING_DURATION = 250;

  function applyTheme(mode) {
    // 切换中标记：定向启用 will-change
    document.body.classList.add('theme-switching');

    document.body.classList.remove('light', 'dark');
    if (mode === 'light') document.body.classList.add('light');
    else if (mode === 'dark') document.body.classList.add('dark');

    localStorage.setItem(THEME_KEY, mode);

    // 更新 theme-color meta
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      if (mode === 'dark') meta.content = '#1a1a2e';
      else if (mode === 'light') meta.content = '#f5f5f7';
      else meta.content = window.matchMedia('(prefers-color-scheme: dark)').matches ? '#1a1a2e' : '#f5f5f7';
    }

    // 过渡完成后移除标记
    setTimeout(function () {
      document.body.classList.remove('theme-switching');
    }, SWITCHING_DURATION);
  }

  function toggleTheme() {
    var current = localStorage.getItem(THEME_KEY) || 'auto';
    var next = { auto: 'light', light: 'dark', dark: 'auto' };
    applyTheme(next[current]);
  }

  function getTheme() {
    return localStorage.getItem(THEME_KEY) || 'auto';
  }

  function initTheme() {
    var saved = getTheme();
    if (saved !== 'auto') applyTheme(saved);
  }

  /* ================================================================
     DatePicker — 日期 + 时间双输入选择器
     ================================================================ */

  var dateInput = null;
  var timeInput = null;
  var dateLabel = null;
  var timeLabel = null;
  var clearBtn = null;

  function initDatePicker() {
    dateInput = document.getElementById('deadlineDate');
    timeInput = document.getElementById('deadlineTime');
    dateLabel = document.getElementById('deadlineDateLabel');
    timeLabel = document.getElementById('deadlineTimeLabel');
    clearBtn = document.getElementById('clearDeadlineBtn');

    dateInput.addEventListener('change', updateDatePickerUI);
    timeInput.addEventListener('change', updateDatePickerUI);
    clearBtn.addEventListener('click', clearDatePicker);
  }

  function updateDatePickerUI() {
    var hasDate = !!dateInput.value;
    var hasTime = !!timeInput.value;
    var hasAny = hasDate || hasTime;

    if (hasDate) {
      dateLabel.textContent = formatDateLabel(dateInput.value);
      dateLabel.classList.add('has-value');
    } else {
      dateLabel.textContent = '选择日期';
      dateLabel.classList.remove('has-value');
    }

    if (hasTime) {
      timeLabel.textContent = timeInput.value;
      timeLabel.classList.add('has-value');
    } else {
      timeLabel.textContent = '选择时间';
      timeLabel.classList.remove('has-value');
    }

    if (hasAny) {
      clearBtn.classList.add('visible');
    } else {
      clearBtn.classList.remove('visible');
    }
  }

  function formatDateLabel(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    var now = new Date();
    var todayStr = now.toISOString().split('T')[0];
    var tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    var tomorrowStr = tomorrow.toISOString().split('T')[0];

    if (dateStr === todayStr) return '今天';
    if (dateStr === tomorrowStr) return '明天';
    var w = ['日','一','二','三','四','五','六'];
    return (d.getMonth() + 1) + '/' + d.getDate() + ' 周' + w[d.getDay()];
  }

  /** 获取合并后的 ISO 字符串，未选择返回 null */
  function getDatePickerValue() {
    var dateVal = dateInput ? dateInput.value : '';
    var timeVal = timeInput ? timeInput.value : '';
    if (!dateVal && !timeVal) return null;
    var d = dateVal || new Date().toISOString().split('T')[0];
    var t = timeVal || '23:59';
    return d + 'T' + t;
  }

  function clearDatePicker() {
    if (dateInput) dateInput.value = '';
    if (timeInput) timeInput.value = '';
    updateDatePickerUI();
  }

  /* ================================================================
     格式化工具
     ================================================================ */

  function escHTML(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function formatDateChinese(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    var w = ['日','一','二','三','四','五','六'];
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 周' + w[d.getDay()];
  }

  function formatDeadline(iso) {
    var d = new Date(iso);
    var now = new Date();
    var diffDays = Math.floor((d.getTime() - now.getTime()) / 86400000);
    var time = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    if (diffDays === 0) return '今天 ' + time;
    if (diffDays === 1) return '明天 ' + time;
    if (diffDays === -1) return '昨天 ' + time;
    if (diffDays < -1) return (d.getMonth()+1) + '/' + d.getDate() + ' ' + time + ' (已逾期)';
    return (d.getMonth()+1) + '/' + d.getDate() + ' ' + time;
  }

  /* ── 公共接口 ── */
  return {
    Modal: {
      confirm: showConfirm
    },
    Theme: {
      apply: applyTheme,
      toggle: toggleTheme,
      get: getTheme,
      init: initTheme
    },
    DatePicker: {
      init: initDatePicker,
      getValue: getDatePickerValue,
      clear: clearDatePicker,
      updateUI: updateDatePickerUI
    },
    escHTML: escHTML,
    formatDate: formatDateChinese,
    formatDeadline: formatDeadline
  };
})();