# Agent Note: 相关文章推荐选用 hexo-related-popular-posts

Status: implemented

## Problem

文章页需要"相关文章"推荐以提升内链与 SEO。候选插件需要支持中文博客、纯站内计算（无外部 API 依赖），且能与 ylion 主题集成。

## Decision

选用 `hexo-related-popular-posts`（v5.0.1，pnpm 安装）。v5 只注册 `popular_posts` / `popular_posts_json` / `popular_posts_pv` 三个 helper，**没有** `related_posts` helper；热门与相关统一走 `popular_posts(options, post)`，用 `PPMixingRate: 0.0` 表示纯相关、`1.0` 表示纯热门。站点配置键为 `popularPosts`，相关性权重键为 `weight.tagRelevancy` / `weight.contentsRelevancy`（不是 `tag`/`keyword`）。主题集成见 `themes/ylion/layout/post.ejs`（上下篇导航之后调用），输出结构为 `<ul class="related-posts-list"><li class="...-item"><div class="...-title"><h3><a>`，样式在 `themes/ylion/source/css/pages/post.less` 的 `#related-posts` 块。

相关性主要靠标签匹配：同标签文章 relatedDegree 累加；内容相关性基于日文分词库 kuromoji，对中文基本无效，因此没打标签的文章推荐列表为空，多打标签才能提升推荐质量。

## Alternatives considered

**hexo-related-posts。** 依赖 frontend-mocha 等较旧依赖链，且社区活跃度不如 hexo-related-popular-posts，输。
**hexo-generator-searchdb + 前端 JS 自算相关度。** 把计算推到客户端，文章多时 search 数据体积大、首屏负担重，输。
**直接用主题 sidebar 的最新文章凑数。** 不是"相关"推荐，语义不符，输。

## Consequences

买到了零外部依赖的站内推荐；代价是中文内容相关性失效（只有标签维度的匹配质量），以及插件依赖链较老（request、kuromoji 等约 37 个 deprecated 子依赖）。若未来换主题，集成点只在 post.ejs 与 post.less 两处。
