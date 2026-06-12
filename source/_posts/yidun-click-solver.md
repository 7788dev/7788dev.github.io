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
description: 基于 YiDun-Click-Solver 项目，复盘一次易盾点选验证码的端到端拆解：core-optimi 协议加密、IR 运行态参数、本地 OpenCV 图像识别，以及最终 validate 的纯 Python 生成链路。
keywords: 易盾, 点选验证码, YiDun, core-optimi, validate, irToken, fp, OpenCV, 逆向, Python, CTF
og_img: /img/og/yidun-click-solver.svg
index_img: /img/og/yidun-click-solver.svg
---

> 项目地址：[7788dev/YiDun-Click-Solver](https://github.com/7788dev/YiDun-Click-Solver)
>
> 这篇只做技术复盘，默认场景是 CTF、授权测试和本地沙箱研究。文中提到的接口、参数和算法只用于解释验证码 SDK 的工作方式，不建议也不允许拿去打未授权真实业务。

## TL;DR

这次做的是易盾 **点选验证码** 的完整闭环，不是“浏览器里注入一段 JS 拿结果”，而是把页面 SDK 里的关键逻辑拆出来，用本地 Python 跑完：

```text
getconf -> IR upload -> ensure fp -> /api/v3/get
        -> local CV solve -> /api/v3/check -> validate
```

整个项目最值得记录的点有三个：

1. **协议层纯 Python**：`cb`、点选 `data`、`raw_validate -> validate` 都不依赖浏览器运行时。
2. **运行态参数可控**：`irToken`、`fp`、`dt`、`zoneId` 的来源都被拆清楚，可以自动获取，也可以从抓到的 `/get` URL 里反解析。
3. **识别层本地化**：不用远程打码平台，直接用 OpenCV 做提示图标提取、候选框生成、多维评分和全局分配。

最后输出的不是一堆 debug 噪声，而是业务侧真正有用的字段：`validate`、`raw_validate`、`token`、`points`、`fp`、`irToken`、`dt`、`zoneId`。

## 一、这个项目和普通“过验证码脚本”不一样

很多验证码逆向项目最后会变成两类东西：

- 一类是 **浏览器桥接**：Puppeteer / Playwright / DevTools 接上页面，直接调 SDK 内部函数。
- 另一类是 **接口硬怼**：抓一次包，把参数复制出来，能跑一两次，但换 token、换图片、换环境就碎。

`YiDun-Click-Solver` 做得更工程化一点。它把验证码链路拆成三层：

| 层级 | 对应文件 | 做什么 |
| --- | --- | --- |
| 协议与加密层 | `src/yidun_crypto.py` | 复现 `core-optimi 2.28.5` 里的 `cb`、点选 `data`、`validate` 包装 |
| 运行态参数层 | `src/yidun_ir.py`、`tools/yidun_click_solver.py` | 自动准备 `irToken`、`fp`、`dt`、`zoneId`，并完成 `/get`、`/check` |
| 本地图像识别层 | `src/yidun_vision.py` | 用 OpenCV 从验证码图里找出三枚需要点击的图标坐标 |

分析阶段可以借助 JS 对照工具，比如 `tools/js_crypto_oracle.mjs` 去跑捕获下来的 `core-optimi` bundle；但最终 CLI 不依赖 Node、不依赖页面、不依赖浏览器注入。这个边界很重要：**逆向阶段可以借黑盒校验，交付阶段必须能独立复现**。

## 二、请求链路先跑通

验证码的接口链路可以概括成四步：

| 步骤 | 作用 | 关键字段 |
| --- | --- | --- |
| `/api/v2/getconf` | 拉取当前验证码配置 | `dt`、`zoneId`、IR 配置 |
| `/v4/j/up` | 上报 IR 传感数据，换取运行态 token | `irToken` |
| `/api/v3/get` | 获取本轮验证码图片和 token | `token`、`bg` |
| `/api/v3/check` | 提交点选数据，校验坐标 | `raw_validate`、`result` |

项目里的自动流程是：

```bash
python tools/yidun_click_solver.py --json-out results/live_auto_validation_compact.json
```

如果只想拿验证码图、不提交校验，可以先停在 `/get`：

```bash
python tools/yidun_click_solver.py --get-only --json-out results/get_only.json
```

如果已经有 token 和坐标，也可以直接复放 `/check`：

```bash
python tools/yidun_click_solver.py --token <token> --points "51,67;181,88;112,42"
```

这里有个实战细节：这个挑战里的 token 更接近“首个 `/check` 决定成败”。第一次坐标错了，再拿同一个 token 继续试后续候选，收益很低。因此默认策略是 **每轮只提交视觉评分最高的一组坐标，失败就刷新 token 和图片重来**。

## 三、协议层：把 `core-optimi` 的黑盒拆成 Python

核心文件是 `src/yidun_crypto.py`。它复现的不是标准 AES，而是 SDK 里命名为 `aes` 的一套自定义 64 字节分组变换：

- 私有 base64 字母表和 padding；
- 字符串转字节、signed byte 归一化；
- CRC32 拼接；
- SBOX、轮函数、feedback；
- 最终再走私有 base64 输出。

### 1. `cb` 的构造

`/api/v3/get` 和 `/api/v3/check` 都需要 `cb`。项目里对应 `make_cb()`：

```python
def make_cb(raw=None):
    code = "vfnv46"
    pos = [0x1, 0xA, 0xC, 0xD, 0x1A, 0x1F]
    chars = list(raw if raw is not None else uuid(0x20))
    for i, p in enumerate(pos):
        chars[p] = code[i]
    return aes_encrypt("".join(chars[:0x20]))
```

这个逻辑本质上是：先生成 32 位随机种子，再把固定版本标识塞进固定位置，最后走 SDK 的自定义加密。

### 2. 点选 `data` 的构造

点选验证码提交的不是明文坐标。`build_click_data()` 会把三类数据分别封进去：

| 字段 | 含义 |
| --- | --- |
| `p` | 三个点击点：`x,y,dt`，每个点先用 token 做 xor，再整体加密 |
| `m` | 鼠标轨迹采样；当前项目默认可以为空轨迹 |
| `ext` | 点击次数、轨迹数量等扩展信息 |
| `d` | 预留字段，保持空字符串 |

自动识别出来的点会被补上一个接近真实点击的时间线：第一下接近 `0ms`，后面大约几百毫秒间隔。坐标顺序比时间线更关键，但时间线不能太离谱。

### 3. `validate` 的包装

`/check` 返回的是原始 `raw_validate`。页面侧真正拿去用的值还要再包一层：

```text
validate = zoneId + "_" + safe(aes(raw_validate + "::" + fp)) + "_v_i_1"
```

也就是说，`validate` 不是单纯服务端返回值，它还绑定了本轮 `fp` 和区域信息。这也是为什么项目默认会同时输出 `raw_validate` 和最终 `validate`：一个用于排查协议，一个用于业务侧接入。

## 四、运行态：`irToken` 和 `fp` 不要硬编码

协议层能算出来之后，下一道坎是运行态参数。

### `irToken`

`src/yidun_ir.py` 里准备了一个脱敏后的、浏览器形态的 IR sensor blob。每次请求时重新生成 nonce，然后 POST 到 IR 接口换取 `irToken`。

这里保留了两个模式：

| 模式 | 用途 |
| --- | --- |
| `template` | 默认模式，复用脱敏传感数据主体，刷新随机项，稳定性更高 |
| `empty` | 边界探测模式，用于确认服务端对低质量 IR 上报的容忍度 |

这一步的关键不是“伪造得多复杂”，而是先证明 IR token 的来源和消耗位置：`getconf` 给 IR 配置，`/v4/j/up` 产出 `tk`，`/api/v3/get` 带上 `irToken`。

### `fp`

`fp` 的策略也很实用：

- 如果命令行或环境变量传入了合法 `fp`，就复用主体并刷新尾部时间戳；
- 如果没有，就从本地 cache 或历史结果 JSON 里找；
- 再没有，才生成一个同形状的新值，并写入 `results/fp_current.txt`。

这样比每轮完全随机稳定，也比把一次抓包里的 `fp` 永久写死安全。运行态字段都具备时效性，项目也明确把 `captures/`、`results/` 加进忽略规则，避免把 token、fp、validate 之类的东西误提交。

## 五、视觉层：点选的难点不在接口，在“点哪里”

点选验证码的图片布局在这个项目里被抽象成：

```text
320x160 顶部区域：候选图标 + 背景图
x=0..80, y=161..180：底部提示区，展示三枚需要依次点击的图标
```

下面是项目文档里的 debug 示例：

![debug 总览](/img/uploads/yidun-click-solver/debug_captcha_overview.png)

| 原始验证码 | 提示区图标 | 候选框叠加 |
| --- | --- | --- |
| ![原始验证码](/img/uploads/yidun-click-solver/debug_captcha_original.jpg) | ![提示区图标](/img/uploads/yidun-click-solver/debug_captcha_prompt.png) | ![候选框叠加](/img/uploads/yidun-click-solver/debug_captcha_overlay.png) |

识别流程大概是这样：

1. **裁提示区**：从底部白条里分割出三枚目标图标。
2. **生成候选框**：
   - 可选 `ddddocr` 只当检测器，补充候选框；
   - 暗色连通域找可能的图标主体；
   - 多尺度模板匹配在顶部区域搜索相似轮廓。
3. **构造多视图搜索图**：dark、light、gray-dark、gray-light、edge，多种渲染假设一起打分。
4. **局部评分**：NCC、Chamfer、Shape/SSIM、TemplateDirect、SIFT。
5. **全局分配**：不是贪心选三个最高分，而是枚举三枚提示图标到不同候选框的排列，取总分最高的一组。

固定评分公式是：

```text
total = 0.50*NCC + 0.20*Chamfer + 0.15*Shape + 0.10*TemplateDirect + 0.05*SIFT
```

这里 SIFT 只有 `0.05` 的兼容权重，不是主信号。原因也很现实：点选图标通常是小尺寸、低纹理、风格化渲染，靠特征点容易飘；NCC、轮廓距离和结构评分反而更可解释。

另一个细节是候选来源会影响权重：

- `ddddocr` 给出的框通常更紧，会有轻微加成；
- 纯 `dark` 连通域容易扫到背景阴影，会被压低；
- 纯 `tmpl` 的候选能补漏，但也容易撞上水彩背景，需要边缘惩罚。

这套策略的目的不是让某个模型“一票通过”，而是让每个候选都留下可解释的评分证据。失败时看 debug 图和 `score_gaps`，能判断到底是协议错了，还是视觉误判。

## 六、输出要“有用”，debug 要“可关”

项目默认输出是精简 JSON：

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

排查问题时再打开完整调试：

```bash
python tools/yidun_click_solver.py \
  --output-detail debug \
  --vision-detail \
  --json-out results/debug_full.json
```

这点我觉得挺重要。逆向脚本如果默认把完整请求 URL、候选矩阵、debug 图片、运行态 token 全吐出来，后面很容易误提交。这个项目把“平时接入需要什么”和“排查时才看什么”分开了：

- 默认 `useful`：只保留最终需要的字段；
- 调试 `debug`：保留请求、候选、评分、失败边界；
- `captures/`、`results/` 默认只提交 `.gitkeep`；
- 旧 debug 图会按 TTL 和数量自动清理。

## 七、几个值得记下来的工程细节

### 1. 先 JS 对照，再 Python 固化

`tools/js_crypto_oracle.mjs` 是分析期工具：它把捕获的 `core-optimi.deob.strings.js` 放进 Node `vm`，只用来对照 SDK 输出。等 Python 版本对齐之后，最终 CLI 就不再依赖它。

这个方法适合处理混淆 SDK：不要一开始就硬猜算法，先用原始函数做 oracle，确定输入输出，再逐个替换成本地实现。

### 2. Unicode 路径兼容

Windows 路径里有中文时，`cv2.imread()` 经常翻车。项目里用了：

```python
np.fromfile(path, dtype=np.uint8)
cv2.imdecode(data, cv2.IMREAD_COLOR)
```

这个细节很小，但对实际使用体验影响很大。逆向工程不是只在英文路径、干净容器里跑，工具链越贴近日常环境越省心。

### 3. 失败边界比成功样例更值钱

项目里把失败情况分成几类：

- `get failed`：运行态参数或配置问题；
- `auto vision failed`：图片识别没给出足够候选；
- `check returned result=false`：坐标、时间线或 token 消耗问题。

有了这些边界，排查时不会盲目改参数。比如 `/get` 成功、图片也下载了，但 `/check` false，就别再回头怀疑 `getconf`；先看视觉候选和点选顺序。

## 八、局限和后续方向

这个项目目前针对的是易盾点选类 `type=7`，并且默认假设了固定图片布局。如果目标站点换了：

- 验证码尺寸；
- 提示区位置；
- 图标渲染风格；
- IR 风控要求；
- token 消耗策略；

就需要重新校准视觉裁剪、候选过滤和运行态参数。它不是一个“所有易盾验证码通吃”的黑盒工具，更像是一套可复用的方法论和工程骨架。

后续如果继续加强，我会优先看这几块：

1. **更多样本的离线评测集**：把成功/失败验证码脱敏后沉淀成测试集，给视觉评分做回归。
2. **评分权重自动搜索**：当前权重是经验值，可以用历史样本做网格搜索或贝叶斯调参。
3. **更细的 token 生命周期观测**：确认不同错误类型是否都会消费 token。
4. **IR 上报质量分层**：比较 `template`、`empty`、更完整 sensor 的通过率和稳定性。

## 最后

这次复盘最大的感受是：验证码逆向不是单点算法题，而是一条链路题。

`cb` 算出来不代表能过，`data` 格式对了不代表坐标对，坐标对了还要 token 没被消费，`raw_validate` 拿到了还要按页面 SDK 的方式包成最终 `validate`。

所以真正稳定的解法，一定是把链路拆清楚：

```text
参数从哪来 -> 算法怎么复现 -> 图片怎么识别 -> 服务端怎么判定 -> 输出怎么接入
```

`YiDun-Click-Solver` 这个项目的价值就在这里：它不是把浏览器当黑盒跑一遍，而是把易盾点选验证码从协议、运行态、视觉三层拆开，再用一个可复现的 Python CLI 串起来。
