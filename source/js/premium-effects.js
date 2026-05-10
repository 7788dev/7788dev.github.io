/**
 * Premium Effects · $100K 级视觉交互（性能优化版）
 * -------------------------------------------------
 * 1. Scroll Reveal：元素进入视口时优雅入场（带兜底）
 * 2. Magnetic Hover：卡片跟随鼠标微倾斜（rAF 节流）
 * 3. Smooth Counter：数字滚动动画
 * 4. Cursor Glow：鼠标附近柔光跟随（lazy rAF，idle 暂停）
 * 5. Navbar Shrink：滚动收缩（passive + rAF）
 * 6. Page Entrance：页面加载完成入场
 *
 * 性能设计原则：
 *   - 所有 scroll / mousemove 监听器都是 passive
 *   - 动画用 rAF 驱动，idle 时自动停止
 *   - 移动端关闭 Cursor Glow / Magnetic Tilt
 *   - prefers-reduced-motion 尊重用户偏好
 */
(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isDesktop = window.innerWidth >= 1024;
  var isTablet = window.innerWidth >= 768;

  // ============================================================
  // rAF-throttle helper
  // ============================================================
  function rafThrottle(fn) {
    var scheduled = false;
    var lastArgs;
    return function () {
      lastArgs = arguments;
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(function () {
        scheduled = false;
        fn.apply(null, lastArgs);
      });
    };
  }

  // ============================================================
  // 1. Scroll Reveal（IntersectionObserver，只作用于大块元素）
  // ============================================================
  function initScrollReveal() {
    if (!('IntersectionObserver' in window)) return;

    var elements = document.querySelectorAll(
      '.index-card, .music-card, .ty-card'
    );
    if (!elements.length) return;

    // 给所有目标加初始隐藏态 + stagger 延迟（上限 0.4s）
    elements.forEach(function (el, i) {
      el.classList.add('sr-init');
      el.style.transitionDelay = Math.min(i * 0.06, 0.4) + 's';
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('sr-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.05,
      rootMargin: '0px 0px 200px 0px'
    });

    elements.forEach(function (el) { observer.observe(el); });

    // 兜底 1：首屏已在视口内的立刻显示
    requestAnimationFrame(function () {
      elements.forEach(function (el) {
        var rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          el.classList.add('sr-visible');
        }
      });
    });

    // 兜底 2：2.5s 后强制所有元素可见
    setTimeout(function () {
      elements.forEach(function (el) {
        el.classList.add('sr-visible');
      });
      observer.disconnect();
    }, 2500);
  }

  // ============================================================
  // 2. Magnetic 3D Tilt（rAF 节流 · 仅桌面端）
  // ============================================================
  function initMagneticTilt() {
    if (!isTablet || prefersReducedMotion) return;

    var cards = document.querySelectorAll('.index-card, .ty-card');
    cards.forEach(function (card) {
      var rect = null;
      var pendingX = 0, pendingY = 0;

      var apply = rafThrottle(function () {
        if (!rect) return;
        var x = pendingX - rect.left;
        var y = pendingY - rect.top;
        var centerX = rect.width / 2;
        var centerY = rect.height / 2;
        var rotateX = ((y - centerY) / centerY) * -2.5;
        var rotateY = ((x - centerX) / centerX) * 2.5;
        card.style.transform =
          'perspective(900px) rotateX(' + rotateX.toFixed(2) +
          'deg) rotateY(' + rotateY.toFixed(2) + 'deg) translateZ(0)';
      });

      card.addEventListener('mouseenter', function () {
        rect = card.getBoundingClientRect();
      }, { passive: true });

      card.addEventListener('mousemove', function (e) {
        pendingX = e.clientX;
        pendingY = e.clientY;
        apply();
      }, { passive: true });

      card.addEventListener('mouseleave', function () {
        rect = null;
        card.style.transform = '';
      }, { passive: true });
    });
  }

  // ============================================================
  // 3. Smooth Number Counter（不蒜子 / 运行时长）
  // ============================================================
  function initCounters() {
    var counters = document.querySelectorAll(
      '#busuanzi_value_site_pv, #busuanzi_value_site_uv'
    );
    if (!counters.length) return;

    var observers = [];
    counters.forEach(function (el) {
      var obs = new MutationObserver(function () {
        if (el.dataset.animated) return;
        var val = parseInt(el.textContent, 10);
        if (isNaN(val) || val === 0) return;
        el.dataset.animated = '1';
        animateNumber(el, 0, val, 1000);
        obs.disconnect();
      });
      obs.observe(el, { childList: true, characterData: true, subtree: true });
      observers.push(obs);
    });

    // 10s 兜底 disconnect，防止 observer 泄漏
    setTimeout(function () {
      observers.forEach(function (o) { o.disconnect(); });
    }, 10000);
  }

  function animateNumber(el, from, to, duration) {
    var start = performance.now();
    function step(now) {
      var progress = Math.min((now - start) / duration, 1);
      var ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      el.textContent = Math.round(from + (to - from) * ease);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ============================================================
  // 4. Cursor Glow（lazy rAF · 鼠标不动时不跑）
  // ============================================================
  function initCursorGlow() {
    if (!isDesktop || prefersReducedMotion) return;
    // 触屏设备直接跳过
    if ('ontouchstart' in window && !window.matchMedia('(hover: hover)').matches) return;

    // 外层包装：fixed + inset:0 + overflow:hidden
    // 把 glow 的溢出裁剪在视口内，不影响 <html> 的滚动/高度计算
    var layer = document.createElement('div');
    layer.className = 'cursor-glow-layer';
    layer.setAttribute('aria-hidden', 'true');

    var glow = document.createElement('div');
    glow.className = 'cursor-glow';
    layer.appendChild(glow);
    document.body.appendChild(layer);

    var mouseX = -9999, mouseY = -9999;
    var glowX = -9999, glowY = -9999;
    var rafId = null;
    var idleFrames = 0;

    function tick() {
      var dx = mouseX - glowX;
      var dy = mouseY - glowY;
      glowX += dx * 0.12;
      glowY += dy * 0.12;

      // 减去一半大小，让 glow 以鼠标为中心；translate 用 transform 的
      // top/left 初始值是 -200px，所以这里直接传鼠标坐标即可（已自带偏移）
      // 不做边界夹紧：contain: strict + overflow-x: clip 已经防止滚动条溢出
      glow.style.transform = 'translate3d(' + glowX + 'px, ' + glowY + 'px, 0)';

      // 如果几乎不动了，暂停 rAF，省 CPU
      if (Math.abs(dx) < 0.3 && Math.abs(dy) < 0.3) {
        idleFrames++;
        if (idleFrames > 10) {
          rafId = null;
          return;
        }
      } else {
        idleFrames = 0;
      }
      rafId = requestAnimationFrame(tick);
    }

    document.addEventListener('mousemove', function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      idleFrames = 0;
      if (!rafId) rafId = requestAnimationFrame(tick);
    }, { passive: true });

    document.addEventListener('mouseleave', function () {
      mouseX = mouseY = -9999;
      glow.style.opacity = '0';
    }, { passive: true });

    document.addEventListener('mouseenter', function () {
      glow.style.opacity = '';
    }, { passive: true });
  }

  // ============================================================
  // 5. Navbar Shrink（passive + rAF 节流）
  // ============================================================
  function initNavbarEnhance() {
    var navbar = document.getElementById('navbar');
    if (!navbar) return;

    var currentShrunk = false;
    var onScroll = rafThrottle(function () {
      var shouldShrink = window.pageYOffset > 100;
      if (shouldShrink !== currentShrunk) {
        currentShrunk = shouldShrink;
        navbar.classList.toggle('navbar-shrink', shouldShrink);
      }
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    // 初始化一次
    onScroll();
  }

  // ============================================================
  // 6. 页面入场
  // ============================================================
  function initPageEntrance() {
    document.documentElement.classList.add('page-loaded');
  }

  // ============================================================
  // Boot
  // ============================================================
  function boot() {
    initPageEntrance();       // 立刻标记，避免视觉等待
    initScrollReveal();
    initNavbarEnhance();
    initCounters();

    // 非关键路径：空闲时执行
    var schedule = window.requestIdleCallback || function (fn) {
      return setTimeout(fn, 1);
    };
    schedule(function () {
      initMagneticTilt();
      initCursorGlow();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
