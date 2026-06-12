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

  function getPreferredTheme() {
    var cur = document.documentElement.getAttribute('data-theme');
    if (cur) return cur;
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }

  function syncGiscusTheme() {
    var gframe = document.querySelector('iframe.giscus-frame');
    if (!gframe || !gframe.contentWindow) return false;
    gframe.contentWindow.postMessage(
      { giscus: { setConfig: { theme: getPreferredTheme() === 'dark' ? 'dark_dimmed' : 'light' } } },
      'https://giscus.app'
    );
    return true;
  }

  function initGiscusThemeSync() {
    var started = false;
    function startSyncWindow() {
      if (started) return;
      started = true;
      syncGiscusTheme();
      var count = 0;
      var timer = window.setInterval(function () {
        count++;
        syncGiscusTheme();
        if (count >= 10) window.clearInterval(timer);
      }, 500);
    }

    if (document.querySelector('iframe.giscus-frame')) {
      startSyncWindow();
      return;
    }
    if (!('MutationObserver' in window)) {
      window.setTimeout(startSyncWindow, 1000);
      return;
    }
    var observer = new MutationObserver(function () {
      if (document.querySelector('iframe.giscus-frame')) {
        startSyncWindow();
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(function () {
      startSyncWindow();
      observer.disconnect();
    }, 5000);
  }

  // ============================================================
  // 1. Theme toggle
  // ============================================================
  function initThemeToggle() {
    var btn = document.querySelector('.theme-toggle');
    if (!btn) return;

    // 同步当前状态（head 的内联脚本已经处理过，这里只处理点击）
    btn.addEventListener('click', function () {
      var cur = getPreferredTheme();
      var next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('paper-theme', next); } catch (e) {}
      syncGiscusTheme();
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
    function decodeHashId(id) {
      try { return decodeURIComponent(id); }
      catch (e) { return id; }
    }

    links.forEach(function (a) {
      var id = (a.getAttribute('href') || '').replace(/^#/, '');
      if (id) map[decodeHashId(id)] = a;
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
    var blocks = Array.prototype.slice.call(
      document.querySelectorAll('.markdown-body figure.highlight, .markdown-body pre')
    ).filter(function (block) {
      return block.matches('figure.highlight') || !block.closest('figure.highlight');
    });
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
  // 5. Search
  // ============================================================
  function initSearch() {
    var modal = document.getElementById('search-modal');
    var input = document.getElementById('search-input');
    var results = document.getElementById('search-results');
    var toggleBtn = document.querySelector('.search-toggle');
    var backdrop = modal && modal.querySelector('.search-backdrop');
    if (!modal || !input || !results) return;

    var searchData = null;
    var searchPromise = null;
    var inputTimer = null;
    var previousBodyOverflow = null;

    function loadData(cb) {
      if (searchData) { cb(searchData); return; }
      if (!searchPromise) {
        searchPromise = fetch('/search.json', { cache: 'default' })
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (data) {
          var list = Array.isArray(data) ? data : (data && (data.posts || data));
          searchData = Array.isArray(list) ? list : [];
          return searchData;
        })
        .catch(function () {
          searchData = [];
          return searchData;
        });
      }
      searchPromise.then(cb);
    }

    function openModal() {
      var wasHidden = modal.hasAttribute('hidden');
      modal.removeAttribute('hidden');
      input.value = '';
      results.textContent = '';
      results.classList.remove('has-query');
      setTimeout(function () { input.focus(); }, 50);
      if (wasHidden) {
        previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
      }
    }

    function closeModal() {
      if (modal.hasAttribute('hidden')) return;
      if (inputTimer) {
        clearTimeout(inputTimer);
        inputTimer = null;
      }
      modal.setAttribute('hidden', '');
      document.body.style.overflow = previousBodyOverflow || '';
      previousBodyOverflow = null;
    }

    function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

    function appendHighlighted(parent, text, keywords) {
      text = text || '';
      if (!text || !keywords.length) {
        parent.appendChild(document.createTextNode(text));
        return;
      }
      var re = new RegExp('(' + keywords.map(escapeRe).join('|') + ')', 'gi');
      var lastIndex = 0;
      text.replace(re, function (match, _hit, offset) {
        if (offset > lastIndex) {
          parent.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
        }
        var mark = document.createElement('mark');
        mark.textContent = match;
        parent.appendChild(mark);
        lastIndex = offset + match.length;
        return match;
      });
      if (lastIndex < text.length) {
        parent.appendChild(document.createTextNode(text.slice(lastIndex)));
      }
    }

    function stripHtml(html) {
      return (html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    }

    function safeHref(href) {
      href = String(href || '/');
      return /^[a-z][a-z0-9+.-]*:/i.test(href) && !/^https?:/i.test(href) ? '/' : href;
    }

    function renderMatches(matches, keywords) {
      results.textContent = '';
      matches.slice(0, 10).forEach(function (m) {
        var p = m.post;
        var item = document.createElement('a');
        item.className = 'search-item';
        item.href = safeHref(p.url || p.path || '/');

        var title = document.createElement('div');
        title.className = 'search-item-title';
        appendHighlighted(title, p.title || '', keywords);

        var snippet = document.createElement('div');
        snippet.className = 'search-item-snippet';
        appendHighlighted(snippet, m.snippet || '', keywords);

        item.appendChild(title);
        item.appendChild(snippet);
        results.appendChild(item);
      });
    }

    function search(query) {
      results.classList.toggle('has-query', query.length >= 2);
      if (!query || query.length < 2) { results.textContent = ''; return; }

      loadData(function (data) {
        if (input.value.trim() !== query) return;
        var keywords = query.toLowerCase().split(/\s+/).filter(Boolean);
        var matches = [];

        data.forEach(function (post) {
          var title = (post.title || '').toLowerCase();
          var content = stripHtml(post.content || '').toLowerCase();
          var score = 0;
          keywords.forEach(function (kw) {
            if (title.indexOf(kw) !== -1) score += 10;
            if (content.indexOf(kw) !== -1) score += 1;
          });
          if (score > 0) matches.push({ post: post, score: score, content: stripHtml(post.content || '') });
        });

        matches.sort(function (a, b) { return b.score - a.score; });

        if (!matches.length) { results.textContent = ''; return; }

        matches.slice(0, 10).forEach(function (m) {
          // 找到关键词附近的片段
          var snippet = '';
          var lowerContent = m.content.toLowerCase();
          for (var i = 0; i < keywords.length; i++) {
            var idx = lowerContent.indexOf(keywords[i]);
            if (idx !== -1) {
              var start = Math.max(0, idx - 30);
              var end = Math.min(m.content.length, idx + 80);
              snippet = (start > 0 ? '…' : '') + m.content.slice(start, end) + (end < m.content.length ? '…' : '');
              break;
            }
          }
          if (!snippet) snippet = m.content.slice(0, 100) + '…';
          m.snippet = snippet;
        });

        renderMatches(matches, keywords);
      });
    }

    // 事件绑定
    if (toggleBtn) toggleBtn.addEventListener('click', openModal);
    if (backdrop) backdrop.addEventListener('click', closeModal);

    modal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeModal(); e.preventDefault(); }
    });

    input.addEventListener('input', function () {
      if (inputTimer) clearTimeout(inputTimer);
      inputTimer = setTimeout(function () {
        inputTimer = null;
        search(input.value.trim());
      }, 120);
    });

    // 全局快捷键：Ctrl+K 或 Cmd+K 打开搜索
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (modal.hasAttribute('hidden')) openModal();
        else closeModal();
      }
    });
  }

  // ============================================================
  // 6. Back-to-top button
  // ============================================================
  function initBackToTop() {
    var btn = document.querySelector('.back-to-top');
    if (!btn) return;
    btn.removeAttribute('hidden');

    var threshold = 320;
    var ticking = false;
    function update() {
      var y = window.pageYOffset || document.documentElement.scrollTop;
      btn.classList.toggle('is-visible', y > threshold);
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });

    btn.addEventListener('click', function () {
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });

    update();
  }

  // ============================================================
  // Boot
  // ============================================================
  function boot() {
    initThemeToggle();
    initMobileNav();
    initToc();
    initCopyButtons();
    initSearch();
    initGiscusThemeSync();
    initBackToTop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
