---
title: 音乐
layout: page
date: 2026-05-09 00:00:00
comments: false
---

{% raw %}
<div class="music-wall">
  <p class="music-intro">
    最近在循环的几首歌。点击即可播放，再点一次暂停。
  </p>

  <div id="music-grid" class="music-grid" aria-label="歌单"></div>

  <audio id="mp-audio" preload="none"></audio>
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
