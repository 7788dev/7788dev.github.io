/**
 * 页脚 · 网站运行时长
 * DOM: <div id="site-uptime" data-since="2026-05-08T00:00:00+08:00"></div>
 * 每秒刷新，展示「已稳定运行 X 天 Y 时 Z 分 W 秒」
 */
(function () {
  'use strict';

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function render(el, since) {
    var now = Date.now();
    var diff = Math.max(0, now - since);

    var sec = Math.floor(diff / 1000);
    var days = Math.floor(sec / 86400);  sec -= days * 86400;
    var hours = Math.floor(sec / 3600);  sec -= hours * 3600;
    var mins = Math.floor(sec / 60);     sec -= mins * 60;

    el.innerHTML =
      '本站已稳定运行 ' +
      '<span class="uptime-num">' + days + '</span> 天 ' +
      '<span class="uptime-num">' + pad(hours) + '</span> 时 ' +
      '<span class="uptime-num">' + pad(mins) + '</span> 分 ' +
      '<span class="uptime-num">' + pad(sec) + '</span> 秒';
  }

  function init() {
    var el = document.getElementById('site-uptime');
    if (!el) return;
    var raw = el.getAttribute('data-since');
    var since = raw ? new Date(raw).getTime() : NaN;
    if (!since || isNaN(since)) return;

    render(el, since);
    // 用 setInterval 即可，页脚很轻量，不需要 rAF
    setInterval(function () { render(el, since); }, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
