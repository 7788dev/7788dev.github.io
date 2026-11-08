# Agent Note: 主题切换：Redefine

Status: implemented

## Problem

`ylion` 主题经过多轮局部重写后，模板、Less 变量、暗色模式和交互脚本已经深度耦合。继续修补会不断堆叠覆盖规则，视觉层级、标签展示和移动端导航仍难以稳定，维护成本高于收益。用户明确要求改用现成的 Hexo 主题，并保持克制、专业的排版与动效。

## Decision

- 站点主题切换为 `hexo-theme-redefine@2.9.0`，根 `_config.yml` 的 `theme` 指向 `redefine`，依赖与锁文件记录在 `package.json`、`pnpm-lock.yaml`。
- 主题配置整份落在 `source/_data/redefine.yml`。Redefine 会以该文件替换默认配置，因此不能在项目里只写局部 YAML。
- 保留一份小型覆盖样式 `source/css/redefine-custom.css`，只处理主题默认值与本站内容不匹配的部分：导航栏对比度、文章卡与正文的统一 760px 阅读栏、元信息换行、标签去除模糊、移动端抽屉全屏与浅深色对比度。
- 首页使用静态标题与副标题，关闭打字循环、预加载、Swup 单页切换、访问统计、评论、页脚跑秒与悬浮缩放，避免装饰性动画干扰阅读。
- 分类页、标签页使用 Redefine 的 `layout: page` + `type: categories|tags` 页面模板，frontmatter 位于 `source/categories/index.md` 与 `source/tags/index.md`。
- 根配置保留 `time_format: HH:mm:ss`：Redefine 的日期模板会删除字符串中的第一个 `:00`，使用 `HH:mm` 时午夜文章会残留 `00`，完整秒格式才能正确隐藏 `00:00:00`。

## Alternatives considered

**继续修复 ylion。** 需要同时维护旧 Less 变量、模板条件分支和暗色覆盖层，任何新组件都要重复适配，边际收益持续下降，输。

**改用 Butterfly / Fluid 等主题。** 同样需要迁移配置和模板，且默认视觉更接近传统博客卡片；Redefine 的排版、字体和响应式基础更接近目标，输。

**自建 Tailwind 主题。** 可以把控每个像素，但需要重写布局、搜索、目录、图片查看器等基础设施，时间和回归风险都高于直接采用成熟主题，输。

## Consequences

主题升级通过 `pnpm` 完成，站点不再依赖 `themes/ylion`；旧主题目录和未提交改动暂时保留，确认不再回滚后可单独清理。自定义样式依赖 Redefine 的 DOM 类名，升级主题时需要重新做一次桌面、平板、移动端和浅深色验收。部署仍由 `hexo deploy` 推送到 `7788dev.github.io` 的 `gh-pages` 分支。
