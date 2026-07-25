/* ==========================================================================
 * 音乐墙 · Music Wall
 * 原生 HTML5 <audio> + 手写极简播放器
 *
 * 功能：
 *   - 唱片墙网格：点击封面切歌，正在播放的唱片旋转 + 脉冲光圈
 *   - 极简播放器：播放/暂停、上一首/下一首、可拖动进度条、时间显示
 *   - 键盘可达：空格播放/暂停，← → 快退/快进 5s
 *   - 循环整个歌单
 * ========================================================================== */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function q(sel, root) { return (root || document).querySelector(sel); }
  function qa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fmtTime(sec) {
    if (!isFinite(sec) || sec < 0) return '0:00';
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' + s : s);
  }

  function safePlay(audio) {
    try {
      var p = audio.play();
      if (p && typeof p.catch === 'function') p.catch(function () {});
    } catch (e) {}
  }

  function buildCards(list) {
    var grid = $('music-grid');
    if (!grid) return;
    grid.innerHTML = list.map(function (song, i) {
      return (
        '<div class="music-card" data-index="' + i + '" role="button" tabindex="0" ' +
        'aria-label="播放 ' + escapeHtml(song.title) + ' - ' + escapeHtml(song.artist) + '">' +
          '<span class="music-num">' + (i + 1) + '</span>' +
          '<span class="music-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>' +
          '<span class="music-cover-wrap">' +
            '<img class="music-cover" src="' + escapeHtml(song.cover) + '" alt="' + escapeHtml(song.title) + '" loading="lazy">' +
            '<span class="music-overlay">' +
              '<svg class="music-play-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>' +
              '<svg class="music-pause-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4z" fill="currentColor"/></svg>' +
            '</span>' +
          '</span>' +
          '<span class="music-meta">' +
            '<span class="music-title">' + escapeHtml(song.title) + '</span>' +
            '<span class="music-artist">' + escapeHtml(song.artist) + '</span>' +
          '</span>' +
          '<span class="music-inline" hidden>' +
            '<span class="mp-time mp-time-current">0:00</span>' +
            '<span class="mp-progress" role="slider" tabindex="-1" aria-label="播放进度" ' +
              'aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' +
              '<span class="mp-progress-track">' +
                '<span class="mp-progress-buffer"></span>' +
                '<span class="mp-progress-fill"></span>' +
                '<span class="mp-progress-thumb"></span>' +
              '</span>' +
            '</span>' +
            '<span class="mp-time mp-time-total">0:00</span>' +
          '</span>' +
        '</div>'
      );
    }).join('');
  }

  function init() {
    var list = window.MUSIC_LIST;
    if (!Array.isArray(list) || list.length === 0) return;

    buildCards(list);

    var grid = $('music-grid');
    var audio = $('mp-audio');
    var cards = qa('.music-card');
    if (!audio || !grid || !cards.length) return;

    var state = {
      index: -1,
      seeking: false,
      targetPct: null
    };

    // 当前激活卡片内的进度条元素
    var inlineEl = null, progressEl = null, fillEl = null, bufferEl = null,
        thumbEl = null, timeCurEl = null, timeTotEl = null;

    function bindInline(card) {
      inlineEl   = q('.music-inline', card);
      progressEl = q('.mp-progress', card);
      fillEl     = q('.mp-progress-fill', card);
      bufferEl   = q('.mp-progress-buffer', card);
      thumbEl    = q('.mp-progress-thumb', card);
      timeCurEl  = q('.mp-time-current', card);
      timeTotEl  = q('.mp-time-total', card);
    }

    function resetInline() {
      if (!fillEl) return;
      fillEl.style.width = '0%';
      thumbEl.style.left = '0%';
      bufferEl.style.width = '0%';
      timeCurEl.textContent = '0:00';
      timeTotEl.textContent = '0:00';
    }

    function renderActive() {
      var playing = !audio.paused && !audio.ended && state.index >= 0;
      cards.forEach(function (card, i) {
        var active = i === state.index;
        card.classList.toggle('is-active', active);
        card.classList.toggle('is-playing', active && playing);
        var inl = q('.music-inline', card);
        if (inl) inl.hidden = !active;
      });
    }

    function loadSong(i, autoplay) {
      if (i < 0 || i >= list.length) return;
      state.index = i;

      bindInline(cards[i]);
      resetInline();

      // 显式对 URL 做编码，避免中文路径在个别浏览器/代理下的问题
      audio.src = encodeURI(list[i].audio);

      renderActive();
      if (autoplay) safePlay(audio);
    }

    function togglePlayByIndex(i) {
      if (i === state.index) {
        if (audio.paused) safePlay(audio);
        else audio.pause();
      } else {
        loadSong(i, true);
      }
    }

    function next() {
      if (state.index < 0) return;
      loadSong((state.index + 1) % list.length, true);
    }

    // ---- 列表行交互（点击封面行即播放/暂停） ----
    cards.forEach(function (card) {
      var idx = parseInt(card.dataset.index, 10);
      card.addEventListener('click', function () { togglePlayByIndex(idx); });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          togglePlayByIndex(idx);
        }
      });
    });

    // ---- audio 事件 ----
    audio.addEventListener('play', renderActive);
    audio.addEventListener('pause', renderActive);
    audio.addEventListener('ended', function () { next(); });
    audio.addEventListener('loadedmetadata', function () {
      if (timeTotEl) timeTotEl.textContent = fmtTime(audio.duration);
    });
    audio.addEventListener('timeupdate', function () {
      if (state.seeking || !fillEl) return;
      var d = audio.duration || 0;
      var pct = d ? (audio.currentTime / d) * 100 : 0;
      fillEl.style.width = pct + '%';
      thumbEl.style.left = pct + '%';
      timeCurEl.textContent = fmtTime(audio.currentTime);
      progressEl.setAttribute('aria-valuenow', String(Math.round(pct)));
    });
    audio.addEventListener('progress', function () {
      if (!audio.duration || !audio.buffered.length || !bufferEl) return;
      var end = audio.buffered.end(audio.buffered.length - 1);
      bufferEl.style.width = (end / audio.duration) * 100 + '%';
    });
    audio.addEventListener('error', function () {
      console.warn('audio load error:', audio.currentSrc);
    });

    // ---- 进度条拖动（事件委托到 grid，当前激活卡片生效） ----
    function activeProgress(e) {
      var bar = e.target.closest ? e.target.closest('.mp-progress') : null;
      if (!bar || state.index < 0) return null;
      if (!cards[state.index] || !cards[state.index].contains(bar)) return null;
      return bar;
    }
    function pctFromEvent(e, bar) {
      var rect = bar.getBoundingClientRect();
      var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      return Math.max(0, Math.min(1, x / rect.width));
    }
    function paintProgress(p) {
      fillEl.style.width = (p * 100) + '%';
      thumbEl.style.left = (p * 100) + '%';
      progressEl.setAttribute('aria-valuenow', String(Math.round(p * 100)));
      if (audio.duration) timeCurEl.textContent = fmtTime(p * audio.duration);
    }
    function commitSeek(p) {
      if (!audio.duration) return;
      try { audio.currentTime = p * audio.duration; } catch (_) {}
    }

    grid.addEventListener('pointerdown', function (e) {
      var bar = activeProgress(e);
      if (!bar || !audio.duration) return;
      e.preventDefault();
      e.stopPropagation();
      state.seeking = true;
      state.targetPct = pctFromEvent(e, bar);
      paintProgress(state.targetPct);
    });
    grid.addEventListener('pointermove', function (e) {
      if (!state.seeking || !progressEl) return;
      state.targetPct = pctFromEvent(e, progressEl);
      paintProgress(state.targetPct);
    });
    function endSeek(e) {
      if (!state.seeking) return;
      state.seeking = false;
      if (state.targetPct != null) {
        commitSeek(state.targetPct);
        state.targetPct = null;
      }
    }
    grid.addEventListener('pointerup', endSeek);
    grid.addEventListener('pointercancel', endSeek);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
