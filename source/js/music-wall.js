/* ==========================================================================
 * 音乐墙 · Music Wall
 * 原生 HTML5 <audio> + 手写极简播放器
 *
 * 功能：
 *   - 唱片墙网格：点击封面切歌，正在播放的唱片旋转 + 脉冲光圈
 *   - 点击播放/暂停，自动连播下一首
 *   - 键盘可达：回车/空格 播放/暂停
 *   - 循环整个歌单
 * ========================================================================== */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function qa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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
      index: -1
    };

    function renderActive() {
      var playing = !audio.paused && !audio.ended && state.index >= 0;
      cards.forEach(function (card, i) {
        var active = i === state.index;
        card.classList.toggle('is-active', active);
        card.classList.toggle('is-playing', active && playing);
      });
    }

    function loadSong(i, autoplay) {
      if (i < 0 || i >= list.length) return;
      state.index = i;

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
    audio.addEventListener('error', function () {
      console.warn('audio load error:', audio.currentSrc);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
