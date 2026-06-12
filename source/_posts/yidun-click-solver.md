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
description: YiDun-Click-Solver 项目复盘：把易盾点选验证码从浏览器 SDK 中拆出来，落成纯 Python 协议复现、本地视觉识别和 validate 生成闭环。
keywords: 易盾, 点选验证码, YiDun, core-optimi, validate, irToken, fp, OpenCV, 逆向, Python, CTF
og_img: /img/og/yidun-click-solver.svg
index_img: /img/og/yidun-click-solver.svg
---

> 项目：[7788dev/YiDun-Click-Solver](https://github.com/7788dev/YiDun-Click-Solver)
>
> 仅记录 CTF / 授权研究场景下的 SDK 拆解过程。运行态 token、fp、validate 均有时效和环境绑定，不适合作为静态样本传播。

## 0x00 目标

这次不是写一个“浏览器里 hook SDK”的脚本，而是把易盾点选验证码的关键链路落成可审计的本地实现：

![执行链路](/img/uploads/yidun-click-solver/yidun-flow.svg)

最终闭环：

```text
getconf -> IR upload -> /api/v3/get -> local CV solve -> /api/v3/check -> validate
```

产物只依赖普通 HTTP + Python：

- `src/yidun_crypto.py`：`cb`、点选 `data`、`validate` 包装。
- `src/yidun_ir.py`：IR 上报体和 `irToken` 准备。
- `src/yidun_vision.py`：点选图片的本地 OpenCV 识别。
- `tools/yidun_click_solver.py`：串联取参、下载、识别、校验和输出。

核心边界：**分析期可以用 JS oracle 对照，最终运行不依赖浏览器、Node bridge、Puppeteer、Playwright 或页面注入。**

## 0x01 请求链路

接口面很窄：

| 阶段 | Endpoint | 产物 |
| --- | --- | --- |
| 配置 | `/api/v2/getconf` | `dt`、`zoneId`、IR 配置 |
| IR | `/v4/j/up` | `irToken` |
| 取图 | `/api/v3/get` | `token`、`bg` |
| 校验 | `/api/v3/check` | `raw_validate`、`result` |

自动运行：

```bash
python tools/yidun_click_solver.py --json-out results/live_auto_validation_compact.json
```

只取图不提交：

```bash
python tools/yidun_click_solver.py --get-only --json-out results/get_only.json
```

已知 token / 坐标时复放校验：

```bash
python tools/yidun_click_solver.py --token <token> --points "51,67;181,88;112,42"
```

实测这个挑战里的 token 基本是 **first-check decisive**：同一个 token 首次 `/check` 错了，继续枚举候选意义不大。默认策略因此改成 top-1 提交；失败则刷新 `irToken`、token 和图片。

## 0x02 协议面

SDK 里真正需要搬出来的只有三块：

![协议面](/img/uploads/yidun-click-solver/yidun-crypto.svg)

### `cb`

`/get` 和 `/check` 都带 `cb`。逻辑很短：

```python
seed = uuid(32)
seed[1], seed[10], seed[12], seed[13], seed[26], seed[31] = "vfnv46"
cb = aes(seed)
```

这里的 `aes` 不是标准 AES，而是 `core-optimi 2.28.5` 里的自定义变换：私有 base64、CRC32、SBOX、round transform、feedback 链。

### 点选 `data`

点选坐标不是明文提交：

```text
p   = aes(":".join(xor(token, "x,y,dt")))
m   = aes(sample(mouse_trace))
ext = aes(xor(token, "click_count,trace_count"))
d   = ""
```

项目里默认轨迹可以为空，但点选点会补时间线：`0 / 520 / 900ms`。坐标顺序是主判定信号，时间线用于维持 SDK 行为形态。

### `validate`

`/check` 返回的是 `raw_validate`，页面侧使用的是再次包装后的值：

```text
validate = zoneId + "_" + safe(aes(raw_validate + "::" + fp)) + "_v_i_1"
```

所以输出里同时保留：

- `raw_validate`：服务端原始校验值，便于定位协议问题；
- `validate`：页面/业务侧最终消费值，绑定 `fp` 和 `zoneId`。

## 0x03 运行态参数

`irToken` 和 `fp` 不建议硬编码。

`irToken` 来自 IR 上报：`getconf` 返回 IR 配置，`/v4/j/up` 返回 `tk`，再带入 `/api/v3/get`。项目保留两个模式：

| 模式 | 说明 |
| --- | --- |
| `template` | 默认。复用脱敏 sensor 主体，刷新 nonce，稳定性更高 |
| `empty` | 边界探测。用于观察低质量 IR 上报的容忍度 |

`fp` 的处理更偏工程化：

1. 显式传入合法 `fp`：保留主体，刷新尾部时间戳。
2. 没传：从 cache / 历史结果里恢复。
3. 仍没有：生成同形状 `fp`，写入 `results/fp_current.txt`。

这样避免每轮全随机，也避免把一次抓包里的环境值永久写死。

## 0x04 本地视觉识别

点选类的真正不稳定点在视觉，不在接口。

验证码布局：

```text
0..159px     顶部候选区域
161..180px   底部提示区，三枚目标图标
```

原始样本和调试叠加：

| 原图 | 提示区 | 候选叠加 |
| --- | --- | --- |
| ![原始验证码](/img/uploads/yidun-click-solver/debug_captcha_original.jpg) | ![提示图标](/img/uploads/yidun-click-solver/debug_captcha_prompt.png) | ![候选叠加](/img/uploads/yidun-click-solver/debug_captcha_overlay.png) |

完整 debug：

![debug 总览](/img/uploads/yidun-click-solver/debug_captcha_overview.png)

识别管线：

![视觉管线](/img/uploads/yidun-click-solver/yidun-vision.svg)

候选来源：

- `ddddocr`：只作为本地检测器补框，不作为最终识别结论；
- dark component：补暗色图标，但对背景阴影敏感；
- prompt template：从提示图标出发，多尺度搜索顶部区域；
- multi-view map：dark / light / gray-dark / gray-light / edge 多种渲染假设并行。

评分公式固定：

```text
total = 0.50*NCC
      + 0.20*Chamfer
      + 0.15*Shape
      + 0.10*TemplateDirect
      + 0.05*SIFT
```

SIFT 只保留低权重兼容项。小图标、低纹理、风格化渲染下，稳定信号主要来自 NCC、边缘距离、Shape/SSIM 和 prompt-driven template evidence。

最后不是贪心取三个最高分，而是枚举三枚提示图标到不同候选框的唯一排列：

```text
best = argmax Σ score(prompt_i, candidate_perm_i)
```

这一步可以避免同一个高纹理候选被多个提示图标重复“吸走”。

## 0x05 输出与调试

默认输出压到可接入字段：

```json
{
  "ok": true,
  "result": true,
  "validate": "CN31_xxx_v_i_1",
  "raw_validate": "76PdCuS...",
  "token": "...",
  "points": [[78, 83, 0], [176, 97, 520], [131, 41, 900]],
  "zoneId": "CN31",
  "dt": "...",
  "irToken": "...",
  "fp": "...:1781246706648"
}
```

需要排查再打开重日志：

```bash
python tools/yidun_click_solver.py \
  --output-detail debug \
  --vision-detail \
  --json-out results/debug_full.json
```

失败边界也做了收敛：

| boundary | 优先排查 |
| --- | --- |
| `get failed` | `dt`、`zoneId`、`irToken`、`fp` |
| `auto vision failed` | 裁剪、候选检测、图片布局 |
| `check returned result=false` | 坐标顺序、视觉误判、token 消耗 |

## 0x06 细节

几个实现点比较关键：

- `tools/js_crypto_oracle.mjs` 只做分析期 oracle；Python 对齐后不进入最终链路。
- Windows 中文路径下 OpenCV 读图使用 `np.fromfile + cv2.imdecode`，避开 `cv2.imread` 的路径兼容问题。
- `captures/`、`results/` 默认只提交 `.gitkeep`，避免泄露 token、fp、validate 或验证码缓存。
- debug 图按 TTL / 数量清理，默认输出不带完整请求和重型评分矩阵。

## 0x07 结论

这个项目的重点不是“某个签名怎么算”，而是把验证码拆成可验证的状态机：

```text
配置 -> 运行态 -> 取图 -> 本地识别 -> 加密提交 -> validate 包装
```

当每一层都能独立验证，问题就不会混在一起：

- `/get` 失败，查运行态；
- 图片识别失败，查候选和评分；
- `/check` false，查点序、token 消耗和 `data`；
- `raw_validate` 有了但业务侧不可用，查 `validate` 包装。

最终 `YiDun-Click-Solver` 给出的不是浏览器黑盒调用，而是一套可复现、可审计、可调试的纯 Python solver 骨架。
