---
title: 用 Hexo 搭建属于自己的 Blog
date: 2026-05-10 02:30:00
tags:
  - Hexo
  - 博客
  - 新手教程
  - GitHub Pages
categories:
  - 教程
description: 从零开始、手把手教你搭一个和本站一样的博客。不需要会写代码，跟着一步步敲命令就能上线。涵盖环境安装、Hexo 初始化、Fluid 主题、写第一篇文章、免费部署到 GitHub Pages。读完大约 30 分钟，照做大约 1 小时就有自己的博客。
keywords: Hexo 教程, 小白 搭建博客, Hexo 新手, GitHub Pages, Fluid 主题, 免费博客, hexo 部署
og_img: /img/og/build-blog-with-hexo.svg
index_img: /img/og/build-blog-with-hexo.svg
---

> 这篇写给**完全没接触过博客搭建的人**。
>
> 只要你能复制粘贴命令、会打开浏览器，就能跟着做下来。遇到生词我都会在旁边解释。
>
> 跟完这篇文章，你会得到：一个挂在自己 GitHub 账号下的博客（像 `https://你的用户名.github.io`）、可以随时改、完全免费、还能用自定义域名。

## 这篇会用到的东西一览

开始前先说清楚我们会用到什么，不理解没关系，后面会一个个教。

| 工具 | 作用 | 要花钱吗 |
| --- | --- | --- |
| **Node.js** | 运行 Hexo 需要的环境 | 免费 |
| **Git** | 把博客文件传到网上 | 免费 |
| **Hexo** | 把你写的 markdown 变成网页 | 免费 |
| **Fluid 主题** | 决定博客长什么样 | 免费 |
| **GitHub** | 白嫖服务器，帮你免费把博客挂上网 | 免费 |
| **VS Code**（推荐） | 写文章的编辑器 | 免费 |

**总花费：0 元**。如果你想要一个自定义域名（比如 `zhangsan.com`）大概一年 50 块钱，不是必需的。

## 第一步：装 Node.js

Hexo 是用 JavaScript 写的，得先装能跑 JavaScript 的环境，叫 Node.js。

**Windows 和 macOS 通用做法**：

1. 打开 [nodejs.org](https://nodejs.org/zh-cn)
2. 下载带 **LTS** 标记的版本（LTS = 长期支持版，更稳）
3. 双击安装包，一路下一步

装完之后验证一下。打开终端（Windows 搜"PowerShell"，macOS 按 `Cmd+Space` 搜"终端"），输入：

```bash
node -v
```

如果看到类似 `v20.11.0` 这样的版本号，就装好了。看到"命令找不到"之类的错误，把电脑重启一下再试。

## 第二步：装 Git

Git 是帮你把文件传到 GitHub 的工具。

- **Windows**：去 [git-scm.com](https://git-scm.com/) 下载安装，安装时一路默认即可
- **macOS**：打开终端输入 `git --version`，会自动提示安装

验证：

```bash
git --version
```

看到版本号就行。

## 第三步：注册 GitHub 账号

浏览器打开 [github.com](https://github.com)，注册一个账号。

**用户名要想好**，因为它会出现在你博客的网址里。我的用户名是 `7788dev`，所以我的博客网址就是 `https://7788dev.github.io`。建议用英文小写，不要用特殊字符。

注册完之后，新建一个仓库（Repository）：

1. 右上角点 **+** → **New repository**
2. 仓库名字**必须是**：`你的用户名.github.io`（比如我的就是 `7788dev.github.io`）
3. 选 Public（公开）
4. 不用勾 README
5. 点 **Create repository**

这一步完成之后先放着，后面会用。

## 第四步：装 Hexo

回到终端，输入：

```bash
npm install -g hexo-cli
```

`-g` 的意思是"装到全局"，这样任何地方都能用 `hexo` 这个命令。

验证：

```bash
hexo -v
```

看到一堆版本信息就是装好了。

> 如果卡住不动，可能是 npm 默认的源在国外太慢。换个国内镜像再试：
> ```bash
> npm config set registry https://registry.npmmirror.com
> ```

## 第五步：初始化你的博客

在电脑上找一个你想放博客的文件夹，比如桌面。在那个文件夹**右键 → 在终端中打开**（或者 cd 过去），然后：

```bash
hexo init blog
cd blog
npm install
```

解释一下每条命令：

- `hexo init blog`：在当前位置创建一个叫 `blog` 的文件夹，把博客的初始文件都放里面
- `cd blog`：进入这个文件夹
- `npm install`：把博客需要的依赖装上（这一步会下载很多东西，慢一点正常）

装完之后，跑一下本地预览：

```bash
hexo server
```

看到：

```
INFO  Hexo is running at http://localhost:4000/
```

**浏览器打开 http://localhost:4000** —— 恭喜，你已经有一个本地博客了。

想停掉服务器，回到终端按 `Ctrl+C`。

## 第六步：写第一篇文章

新开一个终端（保持预览服务器不关），在 `blog` 文件夹里：

```bash
hexo new "我的第一篇文章"
```

它会告诉你一个路径，类似 `source/_posts/我的第一篇文章.md`。用 VS Code 或任何文本编辑器打开这个文件，你会看到：

```markdown
---
title: 我的第一篇文章
date: 2026-05-10 15:00:00
tags:
---
```

上面这几行叫 **front-matter**，是文章的元信息。下面就可以开写了：

```markdown
---
title: 我的第一篇文章
date: 2026-05-10 15:00:00
tags:
  - 日常
categories:
  - 随笔
---

大家好，这是我的第一篇博客。

## 我在干嘛

搭博客。

## 我为什么要搭博客

因为酷。
```

保存之后，回到浏览器刷新 `http://localhost:4000`，新文章就出现了。

**这就是日常写作的流程**：

1. `hexo new "文章标题"` 生成文件
2. 用编辑器改 markdown
3. 浏览器刷新看效果

## 第七步：换个好看的主题

默认主题叫 Landscape，能用但不算好看。我推荐 **Fluid**（就是本站用的这个）。

在 `blog` 文件夹下，终端输入：

```bash
npm install --save hexo-theme-fluid
```

然后找到 `blog` 文件夹里的 `_config.yml` 文件，打开，找到这一行：

```yaml
theme: landscape
```

改成：

```yaml
theme: fluid
```

再新建一个文件叫 `_config.fluid.yml`（和 `_config.yml` 放同一层），这是 Fluid 主题的配置。先放一个最小内容：

```yaml
# 站点标题
navbar:
  blog_title: 我的博客

# 关于页
about:
  enable: true
  name: 你的名字
  intro: 一句简短的自我介绍

# 导航菜单
navbar:
  menu:
    - { key: "home", link: "/", icon: "iconfont icon-home-fill" }
    - { key: "archive", link: "/archives/", icon: "iconfont icon-archive-fill" }
    - { key: "about", link: "/about/", icon: "iconfont icon-user-fill" }
```

停掉正在跑的 `hexo server`（按 `Ctrl+C`），重新跑：

```bash
hexo server
```

刷新浏览器，主题就换了。想调细节比如颜色、字体、动画，去看 [Fluid 官方文档](https://hexo.fluid-dev.com/docs/)，它写得很详细。

## 第八步：加一个"关于"页面

主题换好了，但点导航栏的"关于"会 404，因为我们还没有这个页面。终端里：

```bash
hexo new page about
```

它会生成 `source/about/index.md`。打开改成：

```markdown
---
title: 关于
layout: about
date: 2026-05-10 15:00:00
---

## 你好

我是 XXX，一个写代码的人（或者你是啥都行）。

这里是我的博客，记录一些想法和笔记。
```

刷新浏览器，"关于"页就出来了。

## 第九步：上传到 GitHub

本地能看了，但只有你自己能看。要让所有人都能访问，得把它推到 GitHub Pages。

### 9.1 装部署插件

终端在 `blog` 文件夹下：

```bash
npm install --save hexo-deployer-git
```

### 9.2 配置部署地址

打开 `_config.yml`，找到文件底部的 `deploy`，改成：

```yaml
deploy:
  type: git
  repo: https://github.com/你的用户名/你的用户名.github.io.git
  branch: gh-pages
```

把"你的用户名"替换成你的 GitHub 用户名。

还有一个特别容易漏的地方，找到 `url`：

```yaml
url: https://你的用户名.github.io
```

这行也要改成你的地址。

### 9.3 部署

三条命令一起走：

```bash
hexo clean
hexo generate
hexo deploy
```

- `hexo clean`：清掉上一次的构建结果
- `hexo generate`：把你的 markdown 变成真正的网页（会生成在 `public/` 文件夹）
- `hexo deploy`：把 `public/` 里的东西推到 GitHub

第一次会让你输入 GitHub 的用户名和密码（或者 Token，下面讲）。

### 9.4 GitHub 密码的坑

GitHub 从 2021 年起不让用密码推代码了，要用 **Personal Access Token**。怎么生成：

1. GitHub 右上角头像 → **Settings**
2. 左侧拉到底 → **Developer settings**
3. **Personal access tokens** → **Tokens (classic)** → **Generate new token (classic)**
4. Note 随便写，Expiration 选 "No expiration"
5. 勾 **repo** 这一整块
6. 点 Generate，**立刻复制**那一串以 `ghp_` 开头的字符（关了就看不到了）

部署时需要输入密码的时候，把这串 Token 粘上去就行。

更方便的做法是让 Git 记住它，一次性配置：

```bash
git config --global credential.helper store
```

然后做一次成功的 push，以后就不用再输了。

### 9.5 开启 GitHub Pages

推完之后去 GitHub 那个仓库：

1. 点 **Settings** 标签页
2. 左侧 **Pages**
3. **Source** 选 **Deploy from a branch**
4. **Branch** 选 **gh-pages**，文件夹选 `/ (root)`
5. 保存

**等 1~3 分钟**，浏览器打开 `https://你的用户名.github.io`，你的博客上线了。

## 第十步：写作的日常流程

从此之后，写一篇新文章的完整流程只需要这五条命令：

```bash
# 1. 新建文章
hexo new "今天学了啥"

# 2. 用编辑器改 source/_posts/今天学了啥.md

# 3. 本地预览（可选，想看效果就跑）
hexo server

# 4. 发布
hexo clean
hexo generate
hexo deploy
```

第 4 步的三条命令可以合成一条，在 `package.json` 的 `scripts` 里加一行：

```json
{
  "scripts": {
    "publish": "hexo clean && hexo generate && hexo deploy"
  }
}
```

以后发文章就是：

```bash
npm run publish
```

## 常见问题

**Q：改了主题配置，但页面没变化？**
A：停掉 `hexo server`（`Ctrl+C`），重新跑一次。主题配置不会热更新。

**Q：中文标题的文章，URL 有一堆 `%e6%80%9d%e8%80%83` 怎么办？**
A：文件名改成英文。比如文件叫 `hello-world.md`，front-matter 里的 `title:` 写"你好世界"也没关系，URL 会用文件名。

**Q：部署完访问 404？**
A：三个可能：
- 等 3 分钟再试（GitHub Pages 有缓存）
- 检查 `_config.yml` 里 `url` 是不是改对了
- 去 GitHub 仓库的 **Actions** 标签页看部署有没有报错

**Q：想改文章里的图片，怎么放图？**
A：把图片放到 `source/img/` 文件夹，文章里用 `![](/img/你的图片.png)` 引用。

**Q：怎么加评论？**
A：推荐用 [giscus](https://giscus.app/zh-CN)，它用 GitHub Discussions 存评论，不用买服务器。在 Fluid 主题里配置很简单，跟着官网向导走就行。

**Q：怎么绑定自己的域名？**
A：买一个域名，在 `source/` 文件夹里新建一个叫 `CNAME` 的文件（没有后缀名），文件内容只写你的域名，比如 `myblog.com`。然后去你买域名的地方把 DNS 指向 `你的用户名.github.io`。等一会 GitHub 那边 Pages 设置里会出现 "Enforce HTTPS" 勾上就好。

## 下一步

基础博客已经搭完了。想再进一步，可以试试：

- **调 Fluid 主题的颜色和字体**：[Fluid 文档的主题配色](https://hexo.fluid-dev.com/docs/guide/#主题颜色)
- **加访问统计**：[不蒜子](https://busuanzi.ibruce.info/)，零配置
- **加搜索**：Fluid 内置 local-search，在 `_config.fluid.yml` 里一行配置就能开
- **备份你的博客源文件**：把整个 `blog` 文件夹也推到 GitHub（新建一个仓库，和那个 `.github.io` 仓库是两个）。这样换电脑也不会丢文章

想看更深入的玩法（比如用 Hexo 自定义脚本做数据归档、嵌入音乐墙这种），可以看我另一篇偏硬核的[《本站是怎么魔改出来的》](/)（之后会写）。

---

*搭博客花的时间往往比写博客多。但每一行属于你自己的 CSS、每一个你自己加的页面，都是你能在任何地方炫的"我做的"。慢慢玩，别赶。*
