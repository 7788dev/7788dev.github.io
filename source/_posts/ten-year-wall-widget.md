---
title: 给你的网站加一个「十年留言墙」小组件
date: 2026-05-11 14:00:00
tags:
  - 博客
  - 前端
  - 小组件
  - 教程
categories:
  - 教程
description: 一行 script 标签，就能在你的网站右下角嵌入一个轮播留言卡片。数据来自 GitHub Discussions，零服务器成本，支持暗色模式，7 天内可关闭不再打扰。本文讲清楚原理、用法和自定义方式。
keywords: 十年留言墙, 博客小组件, giscus, GitHub Discussions, 嵌入式留言, 前端组件
---

> 你有没有想过，十年后的自己会是什么样？
>
> 我在 [778801.xyz](https://778801.xyz/) 上做了一个「十年留言墙」——任何人都可以写一段话给十年后的自己。然后我把这些留言做成了一个可嵌入的小组件，挂在本站右下角轮播展示。
>
> 这篇文章教你怎么把同款组件加到自己的网站上。**一行代码，零依赖，零服务器。**

## 效果预览

组件长这样：一个 280×180 的浮动卡片，固定在页面右下角。每隔几秒自动切换一条留言，显示内容、作者头像、日期。用户可以点右上角 × 关闭，关闭后 7 天内不再出现。

特性一览：

- 🌗 自动跟随系统暗色模式
- 📱 移动端自适应宽度（最大 92vw）
- ♿ 无障碍友好（`role="complementary"`、`aria-label`）
- 🚫 用户可关闭，localStorage 记住偏好
- 🎲 每次刷新随机打乱顺序
- ⚡ 纯静态 JSON 数据源，CDN 加速

## 最简用法

在你网站的任意页面（或全局模板）里加一行：

```html
<script
  src="https://7788dev.github.io/js/ten-year-embed.js"
  defer
></script>
```

就这样。刷新页面，右下角就会出现留言卡片。

## 自定义配置

通过 `data-*` 属性可以控制组件的行为：

```html
<script
  src="https://7788dev.github.io/js/ten-year-embed.js"
  defer
  data-position="bottom-right"
  data-data="https://7788dev.github.io/api/ten-year-messages.json"
  data-link="https://778801.xyz/"
  data-rotate="8000"
  data-title="写给十年后的自己"
  data-hide-days="7"
  data-offset-x="20px"
  data-offset-y="80px"
></script>
```

各参数说明：

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `data-position` | `bottom-right` | 卡片位置：`bottom-right` / `bottom-left` / `top-right` / `top-left` |
| `data-data` | 本站 JSON 地址 | 留言数据的 JSON URL（需要 CORS 允许） |
| `data-link` | `https://778801.xyz/` | 卡片底部「去留下你的十年 →」链接指向 |
| `data-rotate` | `8000` | 轮播间隔（毫秒），最小 2000 |
| `data-title` | `写给十年后的自己` | 卡片顶部标题 |
| `data-hide-days` | `7` | 用户关闭后多少天内不再显示 |
| `data-offset-x` | `20px` | 水平偏移 |
| `data-offset-y` | `80px` | 垂直偏移 |

## 数据源格式

组件会 `fetch` 你指定的 JSON URL，期望的格式是：

```json
{
  "source": "https://778801.xyz/",
  "fetchedAt": "2026-05-11T06:00:00.000Z",
  "status": "ok",
  "count": 12,
  "messages": [
    {
      "id": "DC_xxx",
      "author": "someone",
      "avatar": "https://avatars.githubusercontent.com/u/xxx",
      "profile": "https://github.com/someone",
      "text": "十年后的我，希望你还在写代码。",
      "url": "https://github.com/xxx/discussions/1#discussioncomment-xxx",
      "createdAt": "2026-05-08T12:00:00Z"
    }
  ]
}
```

关键字段：

- `messages[].text`：留言正文（纯文本）
- `messages[].author`：GitHub 用户名
- `messages[].avatar`：头像 URL
- `messages[].createdAt`：ISO 时间字符串

其他字段可选，缺了不会报错。

## 自建数据源（进阶）

默认数据源是我的博客构建时从 [giscus](https://giscus.app/) 抓取的。如果你想用自己的留言数据，有两种方式：

### 方式一：手写 JSON

最简单。新建一个 `messages.json`，按上面的格式填内容，部署到任何支持 CORS 的静态托管（GitHub Pages、Vercel、Cloudflare Pages 都行）。然后把 `data-data` 指向它。

### 方式二：从 GitHub Discussions 自动抓取

这是本站的做法。原理：

1. 在 GitHub 仓库开启 Discussions
2. 用 [giscus](https://giscus.app/) 让访客在页面上留言（留言会自动变成 Discussion 的 comment）
3. 博客构建时，用一个 Node.js 脚本调用 giscus 的公开 API，把所有留言拉下来，生成静态 JSON
4. JSON 随博客一起部署到 GitHub Pages

构建脚本的核心逻辑（Hexo generator 插件）：

```javascript
// scripts/ten-year-wall.js
const GISCUS_API = 'https://giscus.app/api/discussions';

hexo.extend.generator.register('ten-year-wall', async function () {
  const params = new URLSearchParams({
    repo: '你的用户名/你的仓库',
    term: '你的讨论标题',
    category: 'General',
    strict: '0',
    first: '50',
  });

  const res = await fetch(`${GISCUS_API}?${params}`);
  const data = await res.json();

  const messages = data.discussion.comments
    .filter(c => !c.isMinimized && !c.deletedAt)
    .map(c => ({
      id: c.id,
      author: c.author?.login || 'anonymous',
      avatar: c.author?.avatarUrl || '',
      text: htmlToText(c.bodyHTML),
      createdAt: c.createdAt,
    }));

  return {
    path: 'api/ten-year-messages.json',
    data: JSON.stringify({ status: 'ok', count: messages.length, messages }),
  };
});
```

> 完整版带分页、超时处理、错误兜底，可以直接看本站源码：[scripts/ten-year-wall.js](https://github.com/7788dev/7788dev.github.io)

### 为什么不直接让前端调 giscus API？

因为 giscus 的 API 响应头是 `Access-Control-Allow-Origin: https://giscus.app`，不允许第三方域名跨域请求。所以必须在构建期（服务端）抓一次，生成静态 JSON，前端读 JSON 就没有 CORS 问题了。

## 样式隔离

组件的所有 CSS 都用 `.ty-embed-widget` 前缀 + 高特指性选择器，不会污染你的页面样式。暗色模式通过 `@media (prefers-color-scheme: dark)` 自动适配，不需要你做任何额外配置。

如果你想覆盖样式，可以用更高优先级的选择器：

```css
/* 例：把卡片圆角改大 */
.ty-embed-widget.ty-embed-widget {
  border-radius: 20px;
}

/* 例：隐藏底部 CTA 链接 */
.ty-embed-widget .ty-embed-cta {
  display: none;
}
```

## 性能影响

- 脚本体积：约 5KB（未压缩），gzip 后约 2KB
- 网络请求：1 次 fetch（JSON 数据，通常 < 10KB）
- DOM 节点：约 20 个
- 无任何第三方依赖
- 页面加载完成后才初始化，不阻塞渲染

对 Lighthouse 分数基本没有影响。

## 常见问题

**Q：我不想用十年留言的数据，能换成自己的内容吗？**

A：当然可以。只要你的 JSON 符合上面的格式，`data-data` 指向它就行。你可以用它做「读者反馈墙」「团队感言」「产品评价」——任何需要轮播展示短文本的场景。

**Q：组件加载后页面闪了一下？**

A：组件有 350ms 的淡入动画，正常情况下不会闪。如果你的页面有其他脚本在操作 DOM 导致重排，可以把 script 标签放到 `</body>` 前面。

**Q：怎么彻底移除组件？**

A：删掉那一行 `<script>` 标签就行。组件不会在你的页面上留下任何持久化的东西（localStorage 里的关闭记录会自然过期）。

**Q：能同时在多个页面使用吗？**

A：可以。放在全局模板里就是全站显示，放在单个页面里就是单页显示。脚本内置了幂等检测，同一页面多次引入也只会初始化一次。

---

*如果你也做了一个留言墙，欢迎在评论区贴出来，我去看看大家十年后想对自己说什么。*
