/**
 * 首页 Slogan · 金山词霸每日一句
 * -----------------------------------------------------------------
 * 每次刷新都会：
 *   1) 随机生成过去 5 年内的一个日期 + 随机 type（default / next / last）
 *   2) 通过 JSONP 调用 https://open.iciba.com/dsapi/
 *   3) 只取 note（中文译）
 *   4) 覆盖式重启打字机
 *
 * 防闪烁：配合 _config.fluid.yml 中 custom_head 的前置脚本
 *   - 主题首次调用 Fluid.plugins.typing(默认文本) 会被拦截、缓存
 *   - subtitle 元素先 visibility:hidden
 *   - 本脚本在 iciba 返回后才放行 + 触发真正的打字
 *   - 2.5s 兜底：超时就用兜底文案触发打字
 *
 * 仅在首页（含分页）生效
 */
(function () {
  'use strict';

  var API = 'https://open.iciba.com/dsapi/';
  var REQ_TIMEOUT = 5000;
  var FALLBACK_TIMEOUT = 2500; // 从页面可交互起最多等 2.5s，超时走兜底
  var DAYS_RANGE = 365 * 5;
  var TYPES = ['', 'next', 'last'];

  // ---- 页面判断 ----
  function isHomePage() {
    var root = (window.CONFIG && CONFIG.root) ? CONFIG.root : '/';
    if (root.charAt(root.length - 1) !== '/') root += '/';
    var p = location.pathname || '/';
    p = p.replace(/index\.html$/, '');
    if (p.charAt(p.length - 1) !== '/') p += '/';
    if (p === root) return true;
    var pageRe = new RegExp('^' + root.replace(/[\\/]/g, '\\/') + 'page\\/\\d+\\/?$');
    return pageRe.test(p);
  }

  if (!isHomePage()) return;

  // ---- 工具 ----
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function randomDate() {
    var d = new Date();
    d.setDate(d.getDate() - Math.floor(Math.random() * DAYS_RANGE));
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function buildUrl() {
    var date = randomDate();
    var type = TYPES[Math.floor(Math.random() * TYPES.length)];
    return API + '?date=' + date + (type ? '&type=' + type : '');
  }

  function jsonp(url, cbParam, timeout) {
    return new Promise(function (resolve, reject) {
      var cbName = '__iciba_cb_' + Math.random().toString(36).slice(2) + '_' + Date.now();
      var script = document.createElement('script');
      var timer = setTimeout(function () { cleanup(); reject(new Error('timeout')); }, timeout);
      function cleanup() {
        clearTimeout(timer);
        try { delete window[cbName]; } catch (e) { window[cbName] = undefined; }
        if (script && script.parentNode) script.parentNode.removeChild(script);
      }
      window[cbName] = function (data) { cleanup(); resolve(data); };
      script.onerror = function () { cleanup(); reject(new Error('network')); };
      script.async = true;
      script.src = url + (url.indexOf('?') > -1 ? '&' : '?') + cbParam + '=' + cbName;
      document.head.appendChild(script);
    });
  }

  function pickSlogan(data) {
    if (!data || typeof data !== 'object') return null;
    var zh = (data.note || '').trim();
    return zh || null;
  }

  // ---- 放行打字机：去掉 visibility:hidden，用 text 启动打字 ----
  var released = false;
  function release(text) {
    if (released) return;
    released = true;
    document.documentElement.classList.remove('home-slogan-pending');

    var plugins = window.Fluid && window.Fluid.plugins;
    if (!plugins || typeof plugins.typing !== 'function') return;

    // 允许原 typing 真正执行
    plugins.__icibaAllow = true;

    // 优先使用 iciba 文本；否则用 head 里缓存的默认文本；再否则读 DOM 的 data-typed-text
    var fallback = plugins.__icibaPending;
    if (!fallback) {
      var sub = document.getElementById('subtitle');
      if (sub) fallback = sub.getAttribute('data-typed-text') || '';
    }
    var finalText = text || fallback || '';
    if (!finalText) return;

    // 同步到 data-typed-text，方便其它脚本读取
    var subtitle = document.getElementById('subtitle');
    if (subtitle) subtitle.setAttribute('data-typed-text', finalText);

    plugins.typing(finalText);
  }

  // ---- 启动 ----
  function start() {
    // 兜底：到时无论如何放行
    var fallbackTimer = setTimeout(function () { release(null); }, FALLBACK_TIMEOUT);

    jsonp(buildUrl(), 'callback', REQ_TIMEOUT)
      .then(function (data) {
        clearTimeout(fallbackTimer);
        release(pickSlogan(data));
      })
      .catch(function () {
        clearTimeout(fallbackTimer);
        release(null);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
