# Repository Guidelines

## Project Structure & Module Organization

Hexo 8 博客源码仓库。`source/_posts/` 存放 Markdown 文章（permalink 由 hexo-abbrlink 生成，见根 `_config.yml`）；`themes/ylion/` 是当前启用的自定义主题（EJS 模板 + Less 样式，多语言文件在 `themes/ylion/languages/`）；站点级插件配置集中在根 `_config.yml`。`public/` 与 `.deploy_git/` 是构建产物，不要手工修改或提交。

## Build, Test, and Development Commands

- 本地预览：`hexo server`（默认 4000 端口；启动前如报端口占用，先 `netstat -ano | grep :4000` 找到残留 node 进程并结束）
- 清理缓存：`hexo clean`（改动 `_config.yml` 或主题配置后建议执行）
- 构建站点：`hexo generate`
- 发布：`hexo deploy`（经 hexo-deployer-git 把 `public/` 推到 `7788dev.github.io` 的 `gh-pages` 分支；源码提交推送到 `main` 分支）

包管理用 pnpm。`pnpm add` 末尾报 `ERR_PNPM_IGNORED_BUILDS`（exit code 1）是 pnpm 拦截了依赖的构建脚本，包本身已装好，通常可忽略；需要原生二进制的功能（如 hexo-minify 的图片压缩）才需要 `pnpm approve-builds`。

## Coding Style & Naming Conventions

模板用 EJS，样式用 Less（主题样式在 `themes/ylion/source/css/`，注意主题使用 rem 相对单位做缩放）。文案走 i18n：新增界面文字需同时补 `themes/ylion/languages/` 下 default/ko/zh-CN/zh-TW 四个文件。站点级配置写在根 `_config.yml`，主题配置写在 `themes/ylion/_config.yml`，不要混放。

## Testing Guidelines

无自动化测试。改动主题模板/样式后用 `hexo server` + 浏览器实际验证文章页与首页，确认无回归再提交。

## Commit & Pull Request Guidelines

提交信息为英文祈使句、单行、描述意图，如 `Add related posts section with hexo-related-popular-posts`、`Disable giscus comment system`。个人仓库直接推送 main，无 PR 流程。

## Agent-Specific Instructions

在终端对 hexo 执行任何命令前，确认当前工作目录是仓库根目录——在子目录运行 `hexo` 只会打印帮助信息且退出码为 0，容易误判为成功。为持久决策记录原因和备选方案，尽量随相关代码提交；完成 Git 提交后，按 [记忆维护指南](.agents/notes/README.md) 自查，命中才写，未命中静默继续。
