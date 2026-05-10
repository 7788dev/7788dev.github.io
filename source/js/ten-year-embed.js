/**
 * 十年留言墙 · 可嵌入小组件
 * -----------------------------------------------------------------
 * 使用方式（任意页面）：
 *   <script src="https://7788dev.github.io/js/ten-year-embed.js" defer
 *           data-position="bottom-right"
 *           data-data="https://7788dev.github.io/api/ten-year-messages.json"
 *           data-link="https://778801.xyz/"
 *           data-rotate="7000"></script>
 *
 * 特性：
 *   - 右下/左下/左上/右上 四个位置；数据、跳转链接、轮播间隔都可通过 data-* 配置
 *   - 固定尺寸：280x180（移动端自动缩至 92vw）
 *   - 长文本省略：-webkit-line-clamp 多行...，hover 展示完整前若干字符 title
 *   - 用户可点右上角 × 隐藏；localStorage 记住选择（7 天内不再打扰）
 *   - 所有样式使用高特指性选择器 + 独立前缀（ty-embed-*），不污染宿主页面
 *   - 支持 prefers-reduced-motion / 暗色模式
 *
 * 数据源：
 *   我的博客构建期从 https://778801.xyz 的 giscus 讨论抓取，静态化为同站 JSON。
 *   该 JSON 由 GitHub Pages 托管，默认 Access-Control-Allow-Origin: *，跨域友好。
 */
(function () {
  'use strict';

  // 幂等：同一页面多次引入只初始化一次
  if (window.__tenYearEmbedLoaded) return;
  window.__tenYearEmbedLoaded = true;

  // ---- 读配置 ----
  // 优先读当前 <script> 的 data-*；找不到（比如被打包器内联）则读最后一个 script
  var currentScript = document.currentScript ||
    (function () {
      var list = document.getElementsByTagName('script');
      return list[list.length - 1];
    })();

  function attr(name, fallback) {
    if (!currentScript) return fallback;
    var v = currentScript.getAttribute('data-' + name);
    return (v === null || v === '') ? fallback : v;
  }

  var CFG = {
    dataUrl: attr('data', 'https://7788dev.github.io/api/ten-year-messages.json'),
    targetLink: attr('link', 'https://778801.xyz/'),
    position: (attr('position', 'bottom-right') || 'bottom-right').toLowerCase(),
    offsetX: attr('offset-x', '20px'),
    offsetY: attr('offset-y', '80px'),
    rotateMs: Math.max(2000, parseInt(attr('rotate', '8000'), 10) || 8000),
    hideDays: Math.max(0, parseInt(attr('hide-days', '7'), 10) || 7),
    title: attr('title', '写给十年后的自己'),
    storageKey: 'ty-embed-hide-until',
  };

  // 用户上次关闭组件后，一段时间内不再显示
  try {
    var until = parseInt(localStorage.getItem(CFG.storageKey) || '0', 10);
    if (until && Date.now() < until) return;
  } catch (e) { /* ignore */ }

  // 位置 → CSS 偏移
  var POS_MAP = {
    'bottom-right': { bottom: CFG.offsetY, right: CFG.offsetX },
    'bottom-left':  { bottom: CFG.offsetY, left:  CFG.offsetX },
    'top-right':    { top:    CFG.offsetY, right: CFG.offsetX },
    'top-left':     { top:    CFG.offsetY, left:  CFG.offsetX },
  };
  var pos = POS_MAP[CFG.position] || POS_MAP['bottom-right'];

  // ---- 注入样式（高优先级前缀，不影响宿主样式） ----
  var STYLE_ID = 'ty-embed-style';
  if (!document.getElementById(STYLE_ID)) {
    var css =
      '.ty-embed-widget,.ty-embed-widget *{box-sizing:border-box;margin:0;padding:0;line-height:1.55;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;}' +
      '.ty-embed-widget{position:fixed;z-index:2147483000;width:280px;height:180px;background:#fff;color:#1f2937;border:1px solid rgba(15,23,42,.08);border-radius:14px;box-shadow:0 10px 30px -12px rgba(15,23,42,.22),0 4px 10px -4px rgba(15,23,42,.12);padding:14px 16px 12px;display:flex;flex-direction:column;font-size:13px;opacity:0;transform:translateY(8px);transition:opacity .35s cubic-bezier(.16,1,.3,1),transform .35s cubic-bezier(.16,1,.3,1);overflow:hidden;}' +
      '.ty-embed-widget.is-in{opacity:1;transform:translateY(0);}' +
      '.ty-embed-widget .ty-embed-head{display:flex;align-items:center;gap:8px;margin-bottom:8px;}' +
      '.ty-embed-widget .ty-embed-badge{font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#5e81ac;background:rgba(94,129,172,.12);padding:2px 7px;border-radius:999px;white-space:nowrap;}' +
      '.ty-embed-widget .ty-embed-title{font-size:12px;font-weight:600;color:#334155;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
      '.ty-embed-widget .ty-embed-close{flex:0 0 auto;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;color:#94a3b8;border:0;background:transparent;border-radius:50%;cursor:pointer;transition:background .2s,color .2s;padding:0;}' +
      '.ty-embed-widget .ty-embed-close:hover{background:rgba(15,23,42,.06);color:#1f2937;}' +
      '.ty-embed-widget .ty-embed-close svg{width:14px;height:14px;display:block;}' +
      '.ty-embed-widget .ty-embed-body{flex:1 1 auto;display:flex;flex-direction:column;min-height:0;}' +
      '.ty-embed-widget .ty-embed-text{flex:1 1 auto;color:#374151;font-size:13px;line-height:1.6;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:4;overflow:hidden;text-overflow:ellipsis;word-break:break-word;white-space:normal;transition:opacity .25s;}' +
      '.ty-embed-widget.is-switching .ty-embed-text{opacity:0;}' +
      '.ty-embed-widget .ty-embed-meta{margin-top:8px;display:flex;align-items:center;gap:6px;font-size:11px;color:#64748b;min-height:20px;}' +
      '.ty-embed-widget .ty-embed-avatar{width:18px;height:18px;border-radius:50%;object-fit:cover;flex:0 0 auto;background:rgba(15,23,42,.06);}' +
      '.ty-embed-widget .ty-embed-author{font-weight:500;color:#475569;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:0 1 auto;}' +
      '.ty-embed-widget .ty-embed-time{opacity:.65;flex:0 0 auto;font-variant-numeric:tabular-nums;}' +
      '.ty-embed-widget .ty-embed-foot{margin-top:8px;border-top:1px dashed rgba(15,23,42,.08);padding-top:8px;display:flex;align-items:center;justify-content:space-between;gap:8px;}' +
      '.ty-embed-widget .ty-embed-cta{color:#5e81ac;font-size:11px;font-weight:500;text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:transform .2s,color .2s;}' +
      '.ty-embed-widget .ty-embed-cta:hover{color:#4c7099;text-decoration:none;transform:translateX(2px);}' +
      '.ty-embed-widget .ty-embed-dots{display:inline-flex;gap:3px;flex:0 0 auto;}' +
      '.ty-embed-widget .ty-embed-dot{width:4px;height:4px;border-radius:50%;background:rgba(15,23,42,.18);transition:background .25s,transform .25s;}' +
      '.ty-embed-widget .ty-embed-dot.is-on{background:#5e81ac;transform:scale(1.25);}' +
      '@media (max-width:480px){.ty-embed-widget{width:min(92vw,280px);}}' +
      '@media (prefers-color-scheme:dark){' +
        '.ty-embed-widget{background:#1f2937;color:#e5e7eb;border-color:rgba(255,255,255,.08);box-shadow:0 10px 30px -12px rgba(0,0,0,.6),0 4px 10px -4px rgba(0,0,0,.5);}' +
        '.ty-embed-widget .ty-embed-badge{color:#88c0d0;background:rgba(136,192,208,.15);}' +
        '.ty-embed-widget .ty-embed-title{color:#cbd5e1;}' +
        '.ty-embed-widget .ty-embed-text{color:#e2e8f0;}' +
        '.ty-embed-widget .ty-embed-author{color:#cbd5e1;}' +
        '.ty-embed-widget .ty-embed-meta,.ty-embed-widget .ty-embed-time{color:#94a3b8;}' +
        '.ty-embed-widget .ty-embed-close{color:#94a3b8;}' +
        '.ty-embed-widget .ty-embed-close:hover{background:rgba(255,255,255,.08);color:#e5e7eb;}' +
        '.ty-embed-widget .ty-embed-cta{color:#88c0d0;}' +
        '.ty-embed-widget .ty-embed-cta:hover{color:#a6d4e0;}' +
        '.ty-embed-widget .ty-embed-foot{border-top-color:rgba(255,255,255,.08);}' +
        '.ty-embed-widget .ty-embed-dot{background:rgba(255,255,255,.2);}' +
        '.ty-embed-widget .ty-embed-dot.is-on{background:#88c0d0;}' +
      '}' +
      '@media (prefers-reduced-motion:reduce){.ty-embed-widget,.ty-embed-widget .ty-embed-text,.ty-embed-widget .ty-embed-cta,.ty-embed-widget .ty-embed-dot{transition:none!important;}}';

    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.appendChild(document.createTextNode(css));
    (document.head || document.documentElement).appendChild(style);
  }

  // ---- 小工具 ----
  function formatDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
  }

  function escapeAttr(v) {
    return String(v == null ? '' : v).replace(/"/g, '&quot;');
  }

  // ---- 构建 DOM ----
  function buildWidget() {
    var el = document.createElement('aside');
    el.className = 'ty-embed-widget';
    el.setAttribute('role', 'complementary');
    el.setAttribute('aria-label', '十年留言墙');

    // 位置
    Object.keys(pos).forEach(function (k) { el.style[k] = pos[k]; });

    el.innerHTML =
      '<div class="ty-embed-head">' +
        '<span class="ty-embed-badge">十年留言</span>' +
        '<div class="ty-embed-title">' + escapeAttr(CFG.title) + '</div>' +
        '<button type="button" class="ty-embed-close" aria-label="关闭">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 6.4L17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z" fill="currentColor"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="ty-embed-body">' +
        '<div class="ty-embed-text" data-role="text">加载中…</div>' +
        '<div class="ty-embed-meta">' +
          '<img class="ty-embed-avatar" data-role="avatar" alt="">' +
          '<span class="ty-embed-author" data-role="author">—</span>' +
          '<span class="ty-embed-time" data-role="time"></span>' +
        '</div>' +
      '</div>' +
      '<div class="ty-embed-foot">' +
        '<a class="ty-embed-cta" data-role="cta" href="' + escapeAttr(CFG.targetLink) + '" target="_blank" rel="noopener noreferrer">去留下你的十年 →</a>' +
        '<span class="ty-embed-dots" data-role="dots" aria-hidden="true"></span>' +
      '</div>';
    return el;
  }

  function renderMessage(widget, msg) {
    var textEl = widget.querySelector('[data-role="text"]');
    var avatarEl = widget.querySelector('[data-role="avatar"]');
    var authorEl = widget.querySelector('[data-role="author"]');
    var timeEl = widget.querySelector('[data-role="time"]');
    var ctaEl = widget.querySelector('[data-role="cta"]');
    if (!msg) {
      textEl.textContent = '暂时还没有人留下话，来写第一条？';
      textEl.removeAttribute('title');
      avatarEl.style.visibility = 'hidden';
      avatarEl.removeAttribute('src');
      authorEl.textContent = '—';
      timeEl.textContent = '';
      return;
    }
    textEl.textContent = msg.text;
    // 完整内容放在 title 里，hover 可预览（因为卡片内截断 4 行）
    textEl.title = msg.text;
    if (msg.avatar) {
      avatarEl.src = msg.avatar;
      avatarEl.style.visibility = '';
    } else {
      avatarEl.removeAttribute('src');
      avatarEl.style.visibility = 'hidden';
    }
    authorEl.textContent = '@' + (msg.author || 'anonymous');
    var date = formatDate(msg.createdAt);
    timeEl.textContent = date ? '· ' + date : '';
    // CTA 固定指向十年留言网，不跟随当前这条评论的原始链接
    ctaEl.href = CFG.targetLink;
  }

  function updateDots(widget, count, activeIdx) {
    var dots = widget.querySelector('[data-role="dots"]');
    if (!dots) return;
    var cap = Math.min(count, 5);
    if (dots.childElementCount !== cap) {
      dots.innerHTML = '';
      for (var i = 0; i < cap; i++) {
        var d = document.createElement('span');
        d.className = 'ty-embed-dot';
        dots.appendChild(d);
      }
    }
    var activeDot = Math.min(activeIdx % cap, cap - 1);
    for (var j = 0; j < dots.children.length; j++) {
      dots.children[j].classList.toggle('is-on', j === activeDot);
    }
  }

  function hideForDays(days) {
    if (days <= 0) return;
    try {
      localStorage.setItem(CFG.storageKey, String(Date.now() + days * 86400 * 1000));
    } catch (e) { /* ignore */ }
  }

  // ---- 主流程 ----
  function start() {
    var widget = buildWidget();
    (document.body || document.documentElement).appendChild(widget);

    // 入场动画（下一帧）
    requestAnimationFrame(function () { widget.classList.add('is-in'); });

    widget.querySelector('.ty-embed-close').addEventListener('click', function () {
      widget.classList.remove('is-in');
      setTimeout(function () {
        widget.parentNode && widget.parentNode.removeChild(widget);
      }, 400);
      hideForDays(CFG.hideDays);
    });

    var rotateTimer = null;
    var paused = false;
    widget.addEventListener('mouseenter', function () { paused = true; });
    widget.addEventListener('mouseleave', function () { paused = false; });

    fetch(CFG.dataUrl, { cache: 'default' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        var list = (data && Array.isArray(data.messages)) ? data.messages : [];
        if (!list.length) {
          renderMessage(widget, null);
          return;
        }
        // 打乱一次，避免每次都是同一顺序
        for (var i = list.length - 1; i > 0; i--) {
          var k = Math.floor(Math.random() * (i + 1));
          var tmp = list[i]; list[i] = list[k]; list[k] = tmp;
        }
        var idx = 0;
        var advance = function () {
          renderMessage(widget, list[idx % list.length]);
          updateDots(widget, list.length, idx);
          idx++;
        };
        advance();
        rotateTimer = setInterval(function () {
          if (paused || document.hidden) return;
          widget.classList.add('is-switching');
          setTimeout(function () {
            advance();
            widget.classList.remove('is-switching');
          }, 200);
        }, CFG.rotateMs);
      })
      .catch(function () {
        renderMessage(widget, null);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
