/**
 * Paper theme · 前端脚本
 * -----------------------------------------------------------------
 *   1. 主题切换（light / dark，持久化到 localStorage）
 *   2. 移动端菜单开合
 *   3. 文章 TOC 高亮（桌面端）
 *   4. 代码块一键复制按钮
 * -----------------------------------------------------------------
 */
(function () {
  'use strict';

  // ============================================================
  // 1. Theme toggle
  // ============================================================
  function initThemeToggle() {
    var btn = document.querySelector('.theme-toggle');
    if (!btn) return;

    // 同步当前状态（head 的内联脚本已经处理过，这里只处理点击）
    btn.addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme');
      var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (!cur) cur = prefersDark ? 'dark' : 'light';

      var next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('paper-theme', next); } catch (e) {}

      // 切换 giscus iframe 主题（如果页面里有）
      var gframe = document.querySelector('iframe.giscus-frame');
      if (gframe && gframe.contentWindow) {
        gframe.contentWindow.postMessage(
          { giscus: { setConfig: { theme: next === 'dark' ? 'dark_dimmed' : 'light' } } },
          'https://giscus.app'
        );
      }
    });
  }

  // ============================================================
  // 2. Mobile nav
  // ============================================================
  function initMobileNav() {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('mobile-nav');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      if (open) nav.setAttribute('hidden', '');
      else nav.removeAttribute('hidden');
    });

    // 窗口放大时自动关闭移动端菜单
    window.addEventListener('resize', function () {
      if (window.innerWidth > 720) {
        nav.setAttribute('hidden', '');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ============================================================
  // 3. TOC active link（IntersectionObserver 跟随滚动）
  // ============================================================
  function initToc() {
    var toc = document.querySelector('.post-toc');
    if (!toc || !('IntersectionObserver' in window)) return;

    var links = toc.querySelectorAll('.toc-link');
    if (!links.length) return;

    var map = {};
    links.forEach(function (a) {
      var id = (a.getAttribute('href') || '').replace(/^#/, '');
      if (id) map[decodeURIComponent(id)] = a;
    });

    var headings = [];
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) headings.push(el);
    });
    if (!headings.length) return;

    var current = null;
    function setActive(el) {
      if (current === el) return;
      current = el;
      links.forEach(function (a) { a.classList.remove('is-active'); });
      if (el && map[el.id]) map[el.id].classList.add('is-active');
    }

    var observer = new IntersectionObserver(function (entries) {
      // 选择最靠近视口顶部、仍在视口里的 heading
      var visible = entries.filter(function (e) { return e.isIntersecting; });
      if (visible.length) {
        visible.sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; });
        setActive(visible[0].target);
      }
    }, { rootMargin: '-80px 0px -70% 0px', threshold: 0 });

    headings.forEach(function (h) { observer.observe(h); });
  }

  // ============================================================
  // 4. Code block copy button
  // ============================================================
  function initCopyButtons() {
    var blocks = document.querySelectorAll('.markdown-body pre, .markdown-body figure.highlight');
    if (!blocks.length) return;

    blocks.forEach(function (block) {
      // 避免重复
      if (block.querySelector('.copy-btn')) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'copy-btn';
      btn.textContent = 'Copy';
      btn.setAttribute('aria-label', '复制代码');

      var hostStyle = getComputedStyle(block);
      if (hostStyle.position === 'static') block.style.position = 'relative';
      // 简单行内样式，避免往主 CSS 里再加一坨
      btn.style.cssText =
        'position:absolute;top:.5em;right:.5em;border:1px solid var(--border);' +
        'background:var(--bg);color:var(--fg-muted);font-size:.75rem;' +
        'padding:.15em .5em;border-radius:6px;cursor:pointer;opacity:0;' +
        'transition:opacity 200ms, color 200ms;z-index:1;font-family:var(--font-sans);';

      block.addEventListener('mouseenter', function () { btn.style.opacity = '1'; });
      block.addEventListener('mouseleave', function () { btn.style.opacity = '0'; });
      btn.addEventListener('focus', function () { btn.style.opacity = '1'; });
      btn.addEventListener('blur', function () { btn.style.opacity = '0'; });

      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var codeEl = block.matches('figure.highlight')
          ? block.querySelector('td.code, td:not(.gutter)')
          : block.querySelector('code') || block;
        var text = codeEl ? codeEl.innerText : block.innerText;
        var done = function () {
          var prev = btn.textContent;
          btn.textContent = 'Copied';
          btn.style.color = 'var(--accent)';
          setTimeout(function () {
            btn.textContent = prev;
            btn.style.color = '';
          }, 1500);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done).catch(function () { fallback(text); done(); });
        } else {
          fallback(text); done();
        }
      });

      block.appendChild(btn);
    });

    function fallback(text) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  // ============================================================
  // Boot
  // ============================================================
  function boot() {
    initThemeToggle();
    initMobileNav();
    initToc();
    initCopyButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
