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

  function buildCards(list) {
    var grid = $('music-grid');
    if (!grid) return;
    grid.innerHTML = list.map(function (song, i) {
      return (
        '<div class="music-card" data-index="' + i + '" role="button" tabindex="0" ' +
        'aria-label="播放 ' + escapeHtml(song.title) + ' - ' + escapeHtml(song.artist) + '">' +
          '<div class="music-cover-wrap">' +
            '<img class="music-cover" src="' + escapeHtml(song.cover) + '" alt="' + escapeHtml(song.title) + '" loading="lazy">' +
            '<div class="music-overlay">' +
              '<svg class="music-play-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>' +
              '<svg class="music-pause-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4z" fill="currentColor"/></svg>' +
            '</div>' +
          '</div>' +
          '<div class="music-meta">' +
            '<div class="music-title">' + escapeHtml(song.title) + '</div>' +
            '<div class="music-artist">' + escapeHtml(song.artist) + '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  function init() {
    var list = window.MUSIC_LIST;
    if (!Array.isArray(list) || list.length === 0) return;

    buildCards(list);

    var audio        = $('mp-audio');
    var playerEl     = $('music-player');
    var coverEl      = q('.mp-cover', playerEl);
    var titleEl      = q('.mp-title', playerEl);
    var artistEl     = q('.mp-artist', playerEl);
    var btnPlay      = q('.mp-play', playerEl);
    var btnPrev      = q('.mp-prev', playerEl);
    var btnNext      = q('.mp-next', playerEl);
    var progressEl   = q('.mp-progress', playerEl);
    var fillEl       = q('.mp-progress-fill', playerEl);
    var bufferEl     = q('.mp-progress-buffer', playerEl);
    var thumbEl      = q('.mp-progress-thumb', playerEl);
    var timeCurEl    = q('.mp-time-current', playerEl);
    var timeTotEl    = q('.mp-time-total', playerEl);
    var cards        = qa('.music-card');

    var state = {
      index: -1,
      seeking: false,
      targetPct: null
    };

    function renderActive() {
      var playing = !audio.paused && !audio.ended && state.index >= 0;
      cards.forEach(function (card, i) {
        card.classList.toggle('is-active', i === state.index);
        card.classList.toggle('is-playing', i === state.index && playing);
      });
      playerEl.classList.toggle('is-playing', playing);
    }

    function loadSong(i, autoplay) {
      if (i < 0 || i >= list.length) return;
      var song = list[i];
      state.index = i;

      if (playerEl.hasAttribute('hidden')) playerEl.removeAttribute('hidden');
      coverEl.src = song.cover;
      coverEl.alt = song.title;
      titleEl.textContent = song.title;
      artistEl.textContent = song.artist;
      // 显式对 URL 做编码，避免中文路径在个别浏览器/代理下的问题
      audio.src = encodeURI(song.audio);

      // 重置进度显示
      fillEl.style.width = '0%';
      thumbEl.style.left = '0%';
      bufferEl.style.width = '0%';
      timeCurEl.textContent = '0:00';
      timeTotEl.textContent = '0:00';

      renderActive();
      if (autoplay) {
        var p = audio.play();
        if (p && typeof p.catch === 'function') p.catch(function () {});
      }
    }

    function togglePlayByIndex(i) {
      if (i === state.index) {
        if (audio.paused) audio.play().catch(function () {});
        else audio.pause();
      } else {
        loadSong(i, true);
      }
    }

    function prev() {
      if (state.index < 0) return;
      var i = (state.index - 1 + list.length) % list.length;
      loadSong(i, true);
    }
    function next() {
      if (state.index < 0) return;
      var i = (state.index + 1) % list.length;
      loadSong(i, true);
    }

    // ---- 唱片卡片交互 ----
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

    // ---- 播放器按钮 ----
    btnPlay.addEventListener('click', function () {
      if (state.index < 0) { loadSong(0, true); return; }
      if (audio.paused) audio.play().catch(function () {});
      else audio.pause();
    });
    btnPrev.addEventListener('click', prev);
    btnNext.addEventListener('click', next);

    // ---- audio 事件 ----
    audio.addEventListener('play', renderActive);
    audio.addEventListener('pause', renderActive);
    audio.addEventListener('ended', function () {
      next();
    });
    audio.addEventListener('loadedmetadata', function () {
      timeTotEl.textContent = fmtTime(audio.duration);
    });
    audio.addEventListener('timeupdate', function () {
      if (state.seeking) return;
      var d = audio.duration || 0;
      var pct = d ? (audio.currentTime / d) * 100 : 0;
      fillEl.style.width = pct + '%';
      thumbEl.style.left = pct + '%';
      timeCurEl.textContent = fmtTime(audio.currentTime);
      progressEl.setAttribute('aria-valuenow', String(Math.round(pct)));
    });
    audio.addEventListener('progress', function () {
      if (!audio.duration || !audio.buffered.length) return;
      var end = audio.buffered.end(audio.buffered.length - 1);
      bufferEl.style.width = (end / audio.duration) * 100 + '%';
    });
    audio.addEventListener('error', function () {
      console.warn('audio load error:', audio.currentSrc);
    });

    // ---- 进度条拖动：拖动时只动 UI，松手一次性 seek ----
    function pctFromEvent(e) {
      var rect = progressEl.getBoundingClientRect();
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

    progressEl.addEventListener('pointerdown', function (e) {
      if (state.index < 0 || !audio.duration) return;
      state.seeking = true;
      try { progressEl.setPointerCapture(e.pointerId); } catch (_) {}
      state.targetPct = pctFromEvent(e);
      paintProgress(state.targetPct);
    });
    progressEl.addEventListener('pointermove', function (e) {
      if (!state.seeking) return;
      state.targetPct = pctFromEvent(e);
      paintProgress(state.targetPct);
    });
    function endSeek(e) {
      if (!state.seeking) return;
      state.seeking = false;
      try { progressEl.releasePointerCapture(e.pointerId); } catch (_) {}
      if (state.targetPct != null) {
        commitSeek(state.targetPct);
        state.targetPct = null;
      }
    }
    progressEl.addEventListener('pointerup', endSeek);
    progressEl.addEventListener('pointercancel', endSeek);

    progressEl.addEventListener('keydown', function (e) {
      if (state.index < 0 || !audio.duration) return;
      var step = 5; // 秒
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        audio.currentTime = Math.max(0, audio.currentTime - step);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        audio.currentTime = Math.min(audio.duration, audio.currentTime + step);
      } else if (e.key === 'Home') {
        e.preventDefault();
        audio.currentTime = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        audio.currentTime = audio.duration;
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
