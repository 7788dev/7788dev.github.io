# Agent Note: 主题视觉系统与暗色模式

Status: archived

Superseded by [主题切换：Redefine](../../implemented/architecture/2026-11-09-theme-switch-to-redefine.md).

## Problem

ylion 主题沿用 2017 年的视觉：灰底、硬阴影、1px 边框堆叠、圆角被注释、无暗色模式，页面层级靠边框而非空间与色彩表达。需要在保留现有左右布局、rem 缩放体系与模板结构的前提下，把导航、首页卡片、侧栏、文章页、归档、搜索层统一升级，并支持可记忆的暗色模式。

## Decision

- 设计令牌集中在 `themes/ylion/source/css/_theme.less`：浅色定义在 `:root`，暗色定义在 `html[data-theme="dark"]`，覆盖颜色、字体、阴影、圆角、代码底色与遮罩色。
- `themes/ylion/source/css/_variable.less` 把原有 Less 变量映射到 CSS 变量，使未被重写的旧样式也能自动获得暗色能力；新增样式直接使用 `var(--*)`。
- 暗色模式用 `data-theme` 属性切换：`layout/_partial/head.ejs` 内联脚本在首屏渲染前读取 `localStorage` 与 `prefers-color-scheme` 防闪烁；`source/js/theme-toggle.js` 负责切换、记忆、系统偏好同步与 `theme-color` 更新；按钮在 `layout/_partial/header.ejs`。
- 保留原有 float 布局与 610% rem 缩放，逐文件重写 Less 组件（header、sidebar、article-meta、pagination、footer、after-footer、post、archive、article-exp），不引入 UI 框架，也不新增覆盖式样式表。
- 首页摘要固定三行：`display: -webkit-box` + `-webkit-line-clamp: 3` + `flex: 0 0 auto`。摘要容器不能被 `flex: 1 1 auto` 拉伸，否则 `line-clamp` 失效、文本按容器高度排布后被硬裁切，表现为文字堆叠并压到底部元信息。
- `/tags/`、`/categories/` 列表页在 `layout/_partial/_head-sections/style.ejs` 中通过 `page.layout` 判断加载 `archive.css`，否则这两页会退化为无样式列表。

## Alternatives considered

**引入 Tailwind / Bootstrap 等 UI 框架。** 需要重写全部模板类名，构建体积和迁移成本高，且与 rem 缩放、EJS 模板耦合，输。

**新增 `dark.less` 覆盖层，不改原有变量。** 依赖选择器优先级堆叠，组件越多越难保证覆盖完整，容易漏配，输。

**只用 `prefers-color-scheme` 媒体查询。** 无法手动切换和记忆用户选择，输。

**保留固定卡片高度 + `flex: 1 1 auto` 摘要。** 在不同标题/摘要长度下无法稳定三行截断，已在实测中出现硬裁切，输。

## Consequences

所有新组件必须使用 `var(--*)`，写死十六进制颜色会在暗色下漏配；CSS 变量让 `base.css` 比原来略大，但省去了多套主题样式表。首页摘要的 flex 约束是硬性规则，后续调整卡片布局时不能把摘要重新设为可增长。视觉层与 `app.js` 的交互解耦，主题切换不依赖 `window.onload`，脚本加载完成后即可绑定。
