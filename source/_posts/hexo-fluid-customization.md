---
title: 本站是怎么魔改出来的
date: 2026-05-10 03:30:00
tags:
  - Hexo
  - Fluid
  - CSS
  - 前端
  - 博客魔改
categories:
  - 教程
description: 上一篇把 Hexo 博客从零搭到上线。这篇接着讲本站具体做了哪些魔改——统一的设计令牌、Nord 配色、Bing 每日壁纸、音乐墙、春节灯笼、健身打卡。每一块都有完整代码、放文件的位置、接线方式，能跟着抄出来。
keywords: Hexo Fluid 美化, Hexo 自定义, CSS 设计令牌, Bing 每日壁纸, 音乐墙, 春节灯笼, Hexo 自定义页面
og_img: /img/og/hexo-fluid-customization.svg
index_img: /img/og/hexo-fluid-customization.svg
---

> **⚠️ 更新提示（2026-05-11）**
>
> 本站已从 Fluid 主题迁移到自制的 **Paper** 主题（灵感来自 Astro Paper，极简风格）。下面的内容记录的是 Fluid 时期的魔改过程，部分功能（Bing 壁纸 Banner、金山词霸打字机、3D 磁性倾斜特效）已随主题切换而退役。音乐墙、健身打卡、春节灯笼、十年留言墙等功能仍然保留。如果你用的是 Fluid 主题，本文依然适用。

> 如果你刚看完上一篇[《用 Hexo 搭建属于自己的 Blog》](/2026/05/10/build-blog-with-hexo/)，那你现在有一个能跑起来的博客。
>
> 这篇继续往下，讲我这个站后来加的那些东西——**美化、Bing 壁纸、音乐墙、春节灯笼、健身打卡**。每一块都尽量做到"复制三个文件就能用"。
>
> 难度比上一篇高，但也没多高。你不需要懂很深的 JS，按顺序抄 + 改路径就行。

## 改造的总原则

先把原则摆在前面，不然越改越乱。

**原则一：不动主题源码**
主题放在 `node_modules/hexo-theme-fluid/` 里，改了就升不动主题了。所有自定义都走 `_config.fluid.yml` 里的 `custom_css` / `custom_js` / `custom_head`，加文件不改文件。

**原则二：样式全走 CSS 变量**
一个站点颜色、字体、阴影、圆角这些东西出现的地方太多。把它们集中到一个 `:root` 里当作**设计令牌**（design tokens），其它地方只引用变量。想换风格的时候只改一处。

**原则三：自定义页面 = markdown + 自定义 JS + 自定义 CSS**
每个"花活页面"都是这个套路：一个 `.md` 负责写 HTML 结构，一个 `.js` 负责交互，一份 `.css` 负责样式。后面音乐墙、健身打卡都是这么做的。

## 一、挂载自定义样式和脚本

先把"挂"的动作做对。打开 `_config.fluid.yml`，加这一段：

```yaml
# 挂载自定义 JS
custom_js:
  - /js/bing-banner.js
  - /js/iciba-slogan.js
  - /js/site-uptime.js
  - /js/spring-festival-lanterns.js

# 挂载自定义 CSS
custom_css:
  - /css/custom.css

# 往 <head> 里追加的自定义 HTML（OG / JSON-LD / preconnect 等）
custom_head: '
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="preconnect" href="https://bing.biturl.top" crossorigin>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
'
```

Fluid 会把 `/js/xxx.js` 和 `/css/xxx.css` 映射到 `source/js/` 和 `source/css/` 这两个目录。也就是说，**把文件放到 `source/js/` 或 `source/css/`，它就会被拷到产物里**。非常适合用来塞自定义代码。

没有这两个目录的同学先建好：

```bash
mkdir -p source/js source/css
```

## 二、设计令牌 · 一切的底座

新建 `source/css/custom.css`，最顶上写这一段：

```css
/* ---- 设计令牌 ---- */
:root {
  /* 字体 */
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Text",
    "PingFang SC", "Microsoft YaHei UI", sans-serif;
  --font-mono: "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace;

  /* 圆角 */
  --radius-xs: 6px;
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --radius-xl: 28px;

  /* 多层阴影（模仿 Material / Apple 的真·阴影） */
  --shadow-1: 0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06);
  --shadow-2: 0 4px 10px -4px rgba(15, 23, 42, 0.08),
              0 8px 24px -8px rgba(15, 23, 42, 0.10);
  --shadow-3: 0 10px 20px -10px rgba(15, 23, 42, 0.12),
              0 20px 40px -20px rgba(15, 23, 42, 0.16);

  /* 缓动曲线 */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);

  /* 语义色（Nord 柔和化） */
  --accent: #5e81ac;
  --accent-strong: #4c7099;
  --accent-soft: rgba(94, 129, 172, 0.12);
  --hairline: rgba(15, 23, 42, 0.08);
  --muted-bg: rgba(15, 23, 42, 0.04);
}

/* 暗色模式覆盖 */
html[data-user-color-scheme="dark"] {
  --shadow-1: 0 1px 2px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-2: 0 4px 10px -4px rgba(0, 0, 0, 0.45),
              0 8px 24px -8px rgba(0, 0, 0, 0.40);
  --shadow-3: 0 10px 20px -10px rgba(0, 0, 0, 0.5),
              0 20px 40px -20px rgba(0, 0, 0, 0.55);

  --accent: #88c0d0;
  --accent-strong: #a6d4e0;
  --accent-soft: rgba(136, 192, 208, 0.15);
  --hairline: rgba(255, 255, 255, 0.08);
  --muted-bg: rgba(255, 255, 255, 0.04);
}

/* 全站字体 */
html, body {
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

body { font-size: 16px; line-height: 1.7; }

/* 选中态 */
::selection {
  background: var(--accent-soft);
  color: var(--accent-strong);
}
```

这几行看起来没啥效果，但整个站之后所有的卡片、按钮、阴影、边框都会从这里取值。**以后想换风格，改这一段就行**，不用全局搜索替换。

## 三、Nord 配色 · 覆盖主题颜色

Fluid 自己提供了一组变量让你在 `_config.fluid.yml` 里改：

```yaml
color:
  # 背景与文本
  body_bg_color: "#eceff4"
  body_bg_color_dark: "#1c2230"
  text_color: "#2e3440"
  text_color_dark: "#d8dee9"
  sec_text_color: "#4c566a"
  sec_text_color_dark: "#9aa4b7"

  # 顶部导航
  navbar_bg_color: "#2e3440"
  navbar_bg_color_dark: "#242933"

  # 悬浮面板、卡片
  board_color: "#ffffff"
  board_color_dark: "#2b3242"

  # 文章链接与悬浮
  post_link_color: "#5e81ac"
  post_link_color_dark: "#88c0d0"
  link_hover_color: "#88c0d0"
  link_hover_color_dark: "#8fbcbb"

  # 线条、按钮、滚动条
  line_color: "#e5e9f0"
  line_color_dark: "#3b4252"
  scrollbar_color: "#c9ccd1"
  scrollbar_hover_color: "#8fbcbb"
```

刷一下：从暖色默认变成冷静的 Nord 雪原风，Banner 上任何壁纸都压得住。

## 四、Bing 每日壁纸 Banner

默认首页 banner 是一张静态图，太无聊。做成每天自动换 Bing 首页壁纸：

**新建 `source/js/bing-banner.js`**：

```js
(function () {
  'use strict';

  var PRIMARY_API  = 'https://bing.biturl.top/?resolution=1920&format=json&index=0&mkt=zh-CN';
  var FALLBACK_IMG = 'https://bing.img.run/1920x1080.php';
  var STORAGE_KEY  = 'bing-banner-cache-v2';
  var ROLLOVER_HOUR = 7; // 每天早 7 点换图

  function currentDayKey() {
    var now = new Date();
    if (now.getHours() < ROLLOVER_HOUR) now.setDate(now.getDate() - 1);
    return now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();
  }

  function setBanner(url) {
    var banner = document.getElementById('banner');
    if (!banner || !url) return;
    // 预加载，拿到图才切，避免白屏
    var img = new Image();
    img.onload  = function () { banner.style.backgroundImage = "url('" + url + "')"; };
    img.onerror = function () { if (url !== FALLBACK_IMG) setBanner(FALLBACK_IMG); };
    img.src = url;
  }

  function readCache() {
    try {
      var obj = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return (obj && obj.day === currentDayKey()) ? obj.url : null;
    } catch (_) { return null; }
  }
  function writeCache(url) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ url: url, day: currentDayKey() })); } catch (_) {}
  }

  function fetchBing() {
    if (!('fetch' in window)) return setBanner(FALLBACK_IMG);
    fetch(PRIMARY_API, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.url) { setBanner(data.url); writeCache(data.url); }
        else setBanner(FALLBACK_IMG);
      })
      .catch(function () { setBanner(FALLBACK_IMG); });
  }

  function init() {
    var cached = readCache();
    if (cached) setBanner(cached);
    else fetchBing();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
```

几个做对的小事：

- **localStorage 缓存**：当天只请求一次接口，之后从缓存读
- **预加载再切**：如果直接 `background-image: url(...)`，图还在下载时背景是白的，闪一下很难看
- **失败降级**：Bing 接口挂了切回本地图片，不会开天窗
- **早 7 点换图**：半夜打开博客还是上一张壁纸，早上起来才换，避免凌晨写文章时壁纸突然变了

## 五、音乐墙

这个模块最有意思，做成"唱片墙 + 播放器"。不用任何 JS 库，原生 HTML5 `<audio>` 够用。

### 5.1 准备音乐文件

在 `source/music/` 下塞音频和封面：

```
source/music/
├── index.md               # 页面本身
├── audio/
│   ├── 你瞒我瞒.mp3
│   ├── 演员.mp3
│   └── ...
└── covers/
    ├── 01-cover.jpg
    └── ...
```

Hexo 会把整个 `source/music/` 原样拷贝到产物。音频文件直接可以用 `/music/audio/xxx.mp3` 访问。

### 5.2 页面结构

`source/music/index.md`：

```markdown
---
title: 音乐
layout: page
date: 2026-05-09 00:00:00
comments: false
---

{% raw %}
<div class="music-wall">
  <p class="music-intro">最近在循环的几首歌。点击封面试听，再点一次暂停。</p>

  <div id="music-grid" class="music-grid" aria-label="歌单"></div>

  <!-- 极简播放器 -->
  <div id="music-player" class="music-player" hidden>
    <div class="mp-top">
      <img class="mp-cover" alt="">
      <div class="mp-info">
        <div class="mp-title"></div>
        <div class="mp-artist"></div>
      </div>
      <div class="mp-controls">
        <button type="button" class="mp-btn mp-prev" aria-label="上一首">
          <svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" fill="currentColor"/></svg>
        </button>
        <button type="button" class="mp-btn mp-play" aria-label="播放/暂停">
          <svg class="mp-ico-play" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
          <svg class="mp-ico-pause" viewBox="0 0 24 24"><path d="M6 5h4v14H6zm8 0h4v14h-4z" fill="currentColor"/></svg>
        </button>
        <button type="button" class="mp-btn mp-next" aria-label="下一首">
          <svg viewBox="0 0 24 24"><path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z" fill="currentColor"/></svg>
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
    { title: "你瞒我瞒", artist: "陈柏宇", cover: "/music/covers/01-cover.jpg", audio: "/music/audio/你瞒我瞒.mp3" },
    { title: "演员",   artist: "薛之谦", cover: "/music/covers/04-cover.jpg", audio: "/music/audio/演员.mp3" }
  ];
</script>
<script defer src="/js/music-wall.js"></script>
{% endraw %}
```

两个要点：

- **`{% raw %}`** 是必须的。Hexo 的模板引擎会尝试解析 `{{ }}`，包在 raw 里面防止它乱搞
- **歌单数据 `window.MUSIC_LIST`** 直接写在页面里，这是最简单的做法。后续想做"改歌单不用改 HTML"可以把它拆到 `/music/list.json`

### 5.3 交互逻辑

`source/js/music-wall.js` 完整版比较长，核心骨架：

```js
(function () {
  'use strict';

  function init() {
    var list = window.MUSIC_LIST;
    if (!Array.isArray(list) || !list.length) return;

    // 1. 根据 MUSIC_LIST 生成唱片卡片
    buildCards(list);

    // 2. 拿到所有 DOM
    var audio   = document.getElementById('mp-audio');
    var player  = document.getElementById('music-player');
    var cards   = document.querySelectorAll('.music-card');
    // ... 其它元素

    var state = { index: -1, seeking: false };

    // 3. 切歌 / 播放 / 暂停
    function loadSong(i, autoplay) {
      var song = list[i];
      state.index = i;
      player.removeAttribute('hidden');
      audio.src = encodeURI(song.audio);
      // 更新封面、标题、歌手 ...
      if (autoplay) audio.play().catch(function () {});
    }

    // 4. 卡片点击 -> 切歌
    cards.forEach(function (card, i) {
      card.addEventListener('click', function () {
        if (i === state.index) {
          audio.paused ? audio.play() : audio.pause();
        } else loadSong(i, true);
      });
    });

    // 5. audio 事件 -> 同步 UI（封面旋转、进度条、时间）
    audio.addEventListener('timeupdate', function () {
      var pct = audio.currentTime / audio.duration * 100;
      // 更新进度条 fill 的 width
    });

    // 6. 进度条拖动 -> seek
    // pointerdown -> pointermove 跟随 -> pointerup 一次性 commit
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
```

完整版要做的细节有：

- **封面旋转动画**：正在播放的卡片加 `.is-playing`，CSS 里 `animation: music-spin 18s linear infinite`
- **脉冲光圈**：`::after` + `box-shadow` 扩散，再加 `keyframes` 淡出
- **进度条拖动**：用 `pointerdown / pointermove / pointerup` 三件套，拖的时候只动 UI，松手才真的 `audio.currentTime = ...`。不这么做的话会听到拖拽过程中音频不断抖
- **键盘可达**：进度条按 ← → 快退/快进 5 秒，Home / End 跳到头尾
- **自动下一首**：`audio.addEventListener('ended', next)`

### 5.4 样式（节选）

几个关键 CSS 片段：

```css
/* 唱片墙自适应 */
.music-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1.5rem;
}

/* 封面旋转 */
.music-card.is-playing .music-cover {
  animation: music-spin 18s linear infinite;
}
@keyframes music-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* 播放中脉冲光圈 */
.music-card.is-playing .music-cover-wrap::after {
  content: "";
  position: absolute; inset: 0;
  border-radius: inherit;
  box-shadow: 0 0 0 0 rgba(94, 129, 172, 0.45);
  animation: music-pulse 2.2s var(--ease-out) infinite;
  pointer-events: none;
}
@keyframes music-pulse {
  0%   { box-shadow: 0 0 0 0    rgba(94, 129, 172, 0.45); }
  70%  { box-shadow: 0 0 0 14px rgba(94, 129, 172, 0); }
  100% { box-shadow: 0 0 0 0    rgba(94, 129, 172, 0); }
}

/* 玻璃态播放器 */
.music-player {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: saturate(140%) blur(10px);
  -webkit-backdrop-filter: saturate(140%) blur(10px);
  border: 1px solid var(--hairline);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-2);
}
```

三个视觉重点：**转的唱片、脉冲光圈、玻璃态播放器**。缺一个就不像了。

### 5.5 挂到菜单

最后一步，让访客能进到这个页面。`_config.fluid.yml` 导航里加一项：

```yaml
navbar:
  menu:
    - { key: "home",    link: "/",          icon: "iconfont icon-home-fill" }
    - { key: "archive", link: "/archives/", icon: "iconfont icon-archive-fill" }
    - { name: "音乐",   link: "/music/",    icon: "iconfont icon-music" }
    - { key: "about",   link: "/about/",    icon: "iconfont icon-user-fill" }
```

## 六、春节灯笼（时间窗口内才出现）

这是个彩蛋。**只在除夕前 1 天到正月十五期间**自动挂 4 只灯笼，其它时间 0 副作用。

`source/js/spring-festival-lanterns.js`：

```js
(function () {
  'use strict';

  // 2026-2099 年春节公历日期
  var SPRING_FESTIVAL = {
    2026: '02-17', 2027: '02-06', 2028: '01-26', 2029: '02-13',
    2030: '02-03',
    // ... 数据来源：紫金山天文台 / 香港天文台
  };

  function getWindow(year) {
    var mmdd = SPRING_FESTIVAL[year];
    if (!mmdd) return null;
    var parts = mmdd.split('-');
    var spring = new Date(year, +parts[0]-1, +parts[1]);
    var start = new Date(spring); start.setDate(start.getDate() - 1);  // 除夕前一天
    var end   = new Date(spring); end.setDate(end.getDate() + 14);     // 正月十五
    start.setHours(0,0,0,0); end.setHours(23,59,59,999);
    return { start: start, end: end };
  }

  function shouldShow() {
    var now = new Date();
    var w = getWindow(now.getFullYear());
    return w && now >= w.start && now <= w.end;
  }

  if (!shouldShow()) return; // 不在窗口期，直接退出

  // 注入 CSS + 4 个 .deng-box
  // 细节略，参考 source/js/spring-festival-lanterns.js
})();
```

关键设计：

- **开头 `if (!shouldShow()) return`**，不在春节窗口直接退出。完全没有 DOM 和 CSS 被插入，其它时间的用户拿到的就是一个空函数
- **灯笼 HTML 纯 `<div>` 拼**，用 CSS 画椭圆和流苏，不用图片
- **摆动动画** `@keyframes deng-swing` 加 `prefers-reduced-motion` 媒体查询，晕动症用户会自动暂停动画

## 七、健身打卡（markdown 当数据库）

这是我个人最得意的一块。**写作是 markdown，前端是 JSON**——中间有个构建期 generator 把两者打通。

### 7.1 数据源

在 `source/_fitness/` 下每天一个文件（下划线开头，Hexo 不会把它们渲染成独立页面）：

```
source/_fitness/
├── README.md              # 使用说明
├── 2026-05-06.md
├── 2026-05-08.md
└── 2026-05-09.md
```

每个文件就是一次打卡：

```markdown
---
type: 跑步
duration: 35
title: 河边晨跑
---

配速 6'10"，心率 155。最后 1km 加速冲刺，还能再快。
```

### 7.2 构建期 generator

Hexo 允许你在 `scripts/` 下写自定义生成器，在 `hexo generate` 执行时被自动加载。

新建 `scripts/fitness-data.js`：

```js
'use strict';
const fs = require('fs');
const path = require('path');

function parseFrontMatter(content) {
  const m = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: content.trim() };
  const meta = {};
  m[1].split(/\r?\n/).forEach(line => {
    const mm = line.match(/^\s*([A-Za-z0-9_-]+)\s*:\s*(.*)\s*$/);
    if (!mm) return;
    let v = mm[2].trim();
    if ((v[0] === '"' && v.at(-1) === '"') || (v[0] === "'" && v.at(-1) === "'")) v = v.slice(1, -1);
    meta[mm[1]] = v;
  });
  return { meta, body: (m[2] || '').trim() };
}

function collect(baseDir) {
  const dir = path.join(baseDir, 'source', '_fitness');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => /\.md$/i.test(f) && !/^readme\.md$/i.test(f))
    .map(f => {
      const m = f.match(/^(\d{4}-\d{2}-\d{2})\.md$/i);
      if (!m) return null;
      const { meta, body } = parseFrontMatter(fs.readFileSync(path.join(dir, f), 'utf8'));
      return {
        date: m[1],
        type: meta.type || '',
        title: meta.title || '',
        duration: meta.duration && !isNaN(+meta.duration) ? +meta.duration : null,
        note: body || '',
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));
}

hexo.extend.generator.register('fitness-data', function () {
  const items = collect(hexo.base_dir);
  return {
    path: 'api/fitness.json',
    data: JSON.stringify({ generatedAt: new Date().toISOString(), count: items.length, items }),
  };
});
```

执行 `hexo generate` 后，`public/api/fitness.json` 就有了所有打卡数据。

### 7.3 前端直接 fetch

前端页面 `source/fitness/index.md` 只负责 DOM 骨架：

```markdown
---
title: 健身打卡
layout: page
date: 2026-05-09 00:00:00
comments: false
---

{% raw %}
<div class="fit-archive" data-api="/api/fitness.json">
  <p class="h4" data-fit-summary>正在加载…</p>
  <div class="fit-tabs" data-fit-tabs></div>
  <hr>
  <div class="list-group" data-fit-list></div>
</div>
<script defer src="/js/fitness-wall.js"></script>
{% endraw %}
```

配套的 `source/js/fitness-wall.js` 拉 JSON，按年份分 Tab、按月分组渲染。代码不贴了，全文在 `source/js/fitness-wall.js`。

**加一条打卡的完整流程**：

```bash
# 1. 新建文件
echo "---`ntype: 跑步`nduration: 30`n---" > source/_fitness/2026-05-10.md

# 2. 写感受（可选）

# 3. 构建部署
hexo clean && hexo generate && hexo deploy
```

## 八、构建期抓远程数据（十年留言墙）

上面健身打卡读的是本地文件。再进一步：**构建期去远程接口拉数据，落盘成静态 JSON**。

为什么要这么做？两个问题同时解决：

- **CORS 问题消失**：前端只读自己域名下的 `/api/xxx.json`
- **源站挂了也不影响**：上次构建的数据还在，只是不更新

`scripts/ten-year-wall.js` 的样板（去掉具体接口）：

```js
'use strict';

async function fetchAllMessages(log) {
  const results = [];
  let cursor = null;
  for (let i = 0; i < 20; i++) {
    const data = await fetch(buildUrl(cursor)).then(r => r.json());
    results.push(...data.comments.map(normalize));
    if (!data.pageInfo.hasNextPage) break;
    cursor = data.pageInfo.endCursor;
  }
  return results;
}

hexo.extend.generator.register('ten-year-wall', async function () {
  const log = hexo.log || console;
  const outPath = 'api/ten-year-messages.json';

  // 离线构建时跳过
  if (process.env.TEN_YEAR_WALL_SKIP === '1') {
    return { path: outPath, data: JSON.stringify({ messages: [], status: 'skipped' }) };
  }

  try {
    const messages = await fetchAllMessages(log);
    log.info(`[ten-year-wall] fetched ${messages.length} messages`);
    return { path: outPath, data: JSON.stringify({ messages, status: 'ok' }) };
  } catch (err) {
    log.warn(`[ten-year-wall] fetch failed: ${err.message}`);
    return { path: outPath, data: JSON.stringify({ messages: [], status: 'error' }) };
  }
});
```

三个细节：

- **环境变量跳过开关** `TEN_YEAR_WALL_SKIP=1`：离线构建、网络抽风时能兜底
- **try/catch 包到最外层**：失败不能让整个 `hexo generate` 挂掉
- **空负载也要写文件**：`fetch` 失败就写空数组，前端只看到"数据为空"，不会 404

这个套路非常通用，任何"博客里想嵌外部数据但又怕依赖"的场景都能套。

## 九、几个小但很爽的增强

这些都是一行 / 几行的事，不值得单独列，但加起来很提气。

### iciba 每日一句当 slogan

首页那句副标题别写死，拉英语趣配音的每日一句 API，每天换。`source/js/iciba-slogan.js` 里 fetch 一下，拿到中英文扔给 Fluid 的 `typing` 插件打字机。

### 站点运行时长

页脚加个"本站已运行 N 天"，不蒜子做不到（它只有 PV/UV）。自己写：

```js
var since = new Date(document.getElementById('site-uptime').dataset.since);
var days  = Math.floor((Date.now() - since) / 86400000);
// 拼 "本站已运行 42 天 3 小时 12 分"
```

### 外链 nofollow

避免 SEO 权重被别人的站吸走。`_config.yml`：

```yaml
nofollow:
  enable: true
  field: site
  exclude:
    - 'github.com'
```

依赖 `hexo-filter-nofollow`。

### 产物压缩

HTML / CSS / JS 构建期压缩一次，线上省流量：

```yaml
minify:
  js:  { enable: true }
  css: { enable: true }
  html:
    enable: true
    options:
      collapseWhitespace: true
      removeComments: true
      minifyJS: true
      minifyCSS: true
```

依赖 `hexo-minify`。

## 十、最终的目录长这样

走到这里，整个博客的结构应该是：

```
blog/
├── _config.yml                 # Hexo 主配
├── _config.fluid.yml           # Fluid 覆盖配置 + custom_js / custom_css
├── scripts/                    # 构建期 generator
│   ├── ten-year-wall.js        # 抓远程数据
│   └── fitness-data.js         # 扫本地 _fitness
├── source/
│   ├── _posts/                 # 文章
│   ├── _fitness/               # 打卡原始数据（不渲染成页面）
│   ├── music/                  # 音乐页（含 audio / covers）
│   ├── fitness/                # 健身打卡页
│   ├── about/                  # 关于页
│   ├── css/custom.css          # 设计令牌 + 所有自定义样式
│   ├── js/
│   │   ├── bing-banner.js
│   │   ├── iciba-slogan.js
│   │   ├── site-uptime.js
│   │   ├── spring-festival-lanterns.js
│   │   ├── music-wall.js
│   │   └── fitness-wall.js
│   ├── img/
│   └── favicon.svg
└── package.json
```

**新增一个自定义页面的标准流程**：

1. `source/xxx/index.md` 写 HTML 骨架，挂一个 `<script src="/js/xxx.js">`
2. `source/js/xxx.js` 写交互
3. `source/css/custom.css` 里追加样式
4. 数据复杂的话在 `scripts/` 下写一个 generator 吐 JSON 到 `public/api/xxx.json`
5. `_config.fluid.yml` 菜单里加入口

跟着这个模板做，加一个新模块的时间大概是几个小时到半天。

## 最后

这些东西单看都不难，但加起来是一个 "属于你自己" 的博客。别人用 Fluid 的站和你用 Fluid 的站，一眼就能看出区别——区别不在主题，在这些散落在角落的小心思。

我知道很多人搭完博客就再也不更新了。这挺正常。博客的乐趣一半是写，一半是折腾。哪个都能让你高兴一阵。

---

*本站所有这些改造的源代码都在 [GitHub 仓库](https://github.com/7788dev/7788dev.github.io) 里公开（源码在另一个仓库，链接在 about 页）。欢迎 fork、抄、改。*
