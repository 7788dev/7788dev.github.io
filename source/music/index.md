---
title: 音乐
layout: page
date: 2026-05-09 00:00:00
comments: false
---

{% raw %}
<div class="music-wall">
  <p class="music-intro">
    最近在循环的几首歌。点击封面试听，再点一次暂停。
  </p>

  <div id="music-grid" class="music-grid" aria-label="歌单"></div>

  <!-- 极简播放器：封面 · 歌曲信息 · 进度条 · 控制按钮 -->
  <div id="music-player" class="music-player" hidden>
    <div class="mp-top">
      <img class="mp-cover" alt="">
      <div class="mp-info">
        <div class="mp-title"></div>
        <div class="mp-artist"></div>
      </div>
      <div class="mp-controls">
        <button type="button" class="mp-btn mp-prev" aria-label="上一首">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" fill="currentColor"/></svg>
        </button>
        <button type="button" class="mp-btn mp-play" aria-label="播放/暂停">
          <svg class="mp-ico-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
          <svg class="mp-ico-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4z" fill="currentColor"/></svg>
        </button>
        <button type="button" class="mp-btn mp-next" aria-label="下一首">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z" fill="currentColor"/></svg>
        </button>
      </div>
    </div>
    <div class="mp-bottom">
      <span class="mp-time mp-time-current">0:00</span>
      <div class="mp-progress" role="slider" tabindex="0"
           aria-label="播放进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <div class="mp-progress-track">
          <div class="mp-progress-buffer"></div>
          <div class="mp-progress-fill"></div>
          <div class="mp-progress-thumb"></div>
        </div>
      </div>
      <span class="mp-time mp-time-total">0:00</span>
    </div>
    <audio id="mp-audio" preload="none"></audio>
  </div>
</div>

<script>
  window.MUSIC_LIST = [
    {
      title: "你瞒我瞒",
      artist: "陈柏宇",
      cover: "/music/covers/01-nimanwoman.jpg",
      audio: "/music/audio/你瞒我瞒.mp3"
    },
    {
      title: "傻得可以",
      artist: "向思思",
      cover: "/music/covers/02-shadekeyi.jpg",
      audio: "/music/audio/傻得可以.mp3"
    },
    {
      title: "根本你不懂得爱我",
      artist: "韦雄",
      cover: "/music/covers/03-genbenni.jpg",
      audio: "/music/audio/根本你不懂得爱我.mp3"
    },
    {
      title: "演员",
      artist: "薛之谦",
      cover: "/music/covers/04-yanyuan.jpg",
      audio: "/music/audio/演员.mp3"
    },
    {
      title: "多想留在你身边",
      artist: "刘增瞳",
      cover: "/music/covers/05-duoxiangliuzai.jpg",
      audio: "/music/audio/多想留在你身边.mp3"
    },
    {
      title: "请先说你好",
      artist: "贺一航",
      cover: "/music/covers/06-qingxianshuo.jpg",
      audio: "/music/audio/请先说你好.mp3"
    }
  ];
</script>
<script defer src="/js/music-wall.js"></script>
{% endraw %}
