---
title: 易盾点选验证码纯 Python 逆向复现
date: 2026-06-13 00:44:00
tags:
  - 逆向
  - 易盾
  - 验证码
  - Python
  - OpenCV
categories:
  - 逆向
description: 易盾点选验证码纯 Python solver，零浏览器依赖。协议复现 + 本地视觉识别 + validate 闭环。
keywords: 易盾, 点选验证码, YiDun, core-optimi, validate, irToken, fp, OpenCV, 逆向, Python, CTF
og_img: /img/og/yidun-click-solver.svg
index_img: /img/og/yidun-click-solver.svg
---

> 项目：[7788dev/YiDun-Click-Solver](https://github.com/7788dev/YiDun-Click-Solver)

把易盾点选验证码从浏览器 SDK 里拆出来，落成纯 Python 协议复现。不依赖 Puppeteer、Playwright、Node bridge 或页面注入。

```text
getconf → IR upload → /api/v3/get → local CV solve → /api/v3/check → validate
```

懒得写太多，代码即文档，跑一遍比看文章快：

```bash
python tools/yidun_click_solver.py --json-out results/result.json
```

接口、协议、视觉、输出——全在 repo 里。
