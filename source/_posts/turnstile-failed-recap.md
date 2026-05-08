---
title: 逆向 Cloudflare 5s 盾补环境
date: 2026-05-08 21:45:00
tags:
  - 逆向
  - Cloudflare
  - AST
  - Node.js
categories:
  - 逆向
description: 在 Node 里补全 Cloudflare Managed Challenge（俗称 5s 盾）运行所需的 DOM / 事件 / 定时器环境，逆向 orchestrate、flow、cv/result 三条接口，最终卡在哪里。
keywords: Cloudflare, 5s 盾, Managed Challenge, Turnstile, orchestrate, flow, cv/result, AST, 补环境, 逆向
index_img: /img/og-cover.svg
---

> 本文只记录方法论与接口形态，不提供任何可直接运行的绕过实现。具体字段的加密算法、VM 字节码映射、签名逻辑一律略过。

目标：在 Node 里端到端模拟 Cloudflare Managed Challenge 的挑战流程，拿到 `cf_clearance` 后用纯 HTTP 走业务接口。用到的栈是 `node-tls-client` + `node:vm` + `@babel/parser` + `piscina`。做了将近一个月，最终没过，原因放在最后。

## 链路总览

访问一个被 5s 盾保护的页面，浏览器要打三条核心接口才能拿到通行证：

```
1. GET  /<original>               → 服务器返回一个 interstitial HTML
                                     + 内嵌 window._cf_chl_opt + 加载 orchestrate
2. GET  /cdn-cgi/challenge-platform/h/{tier}/orchestrate/.../v1
                                   → 一段被混淆过的 challenge 主脚本
3. POST /cdn-cgi/challenge-platform/h/{tier}/flow/ov1/.../<seed>
                                   → VM 执行期间反复上报「当前环境快照」
4. POST /cdn-cgi/challenge-platform/h/{tier}/cv/result/<ray>/<hash>
                                   → 提交 Turnstile token 换 cf_clearance
```

tier 是 `b`（bot-management）或 `g`（generic）；ray 是这次挑战的唯一 ID，从初始 HTML 的 `window._cf_chl_opt.cRay` 读；hash 是 orchestrate 路径里的最后一段，必须原样带回。

## 三条接口的参数画像

### orchestrate（GET）

参数只有 URL 本身，关键在**请求头**和**TLS 指纹**。初始 HTML 里会注入一个 `<script src="/cdn-cgi/challenge-platform/h/g/orchestrate/chl_api_b/v1?ray=...">`，浏览器跟着请求。Cloudflare 在这一步已经开始做指纹了：

- `sec-ch-ua` / `sec-ch-ua-arch` / `sec-ch-ua-bitness` / `sec-ch-ua-full-version-list` 四件套要和声明的 UA 严格对得上
- `accept` 必须是 `*/*`，不是浏览器加载文档时那个长串
- `referer` 是初始页面
- JA4 指纹必须是 Chrome（我用 `chrome_131` profile，对 Chrome 142 足够近似）
- HTTP/2 的 HEADERS 帧里伪 header 顺序固定：`:method :authority :scheme :path` 后才是真实 header

少任何一条，服务端返回 403 + 一个假 challenge，后面所有步骤都不用做了。

### flow/ov*（POST）

这是整个流程里**交互最密集、参数最脏**的一条。VM 执行过程中会往这里反复打点，单次挑战打 3~8 次。body 是一个 binary payload（byte array），content-type 是 `application/octet-stream`。

payload 的结构，粗略是：

```
[header bytes | encrypted body]
```

header 里有 version、seq、rc（round count）这几个字段，encrypted body 是 VM 内部用 `_cf_chl_opt.cRay + flowSeed` 派生密钥加密过的一段结构化数据。数据内容大致分三类：

- **环境指纹**：`navigator.userAgent / platform / hardwareConcurrency / languages`、`screen.width / height / colorDepth`、`document.documentElement.clientWidth`、`window.devicePixelRatio`、时区偏移、`performance.now()` 在各关键节点的读数
- **DOM 证据**：特定 id 元素的存在性、`innerText` hash、`getBoundingClientRect()` 返回值
- **事件证据**：`pointerover / pointermove / mousemove / click / focus / blur / touchstart` 的发生顺序、时间差、坐标
- **VM 自检**：对 `Function.prototype.toString`、`Error.stack`、`Object.getOwnPropertyNames(window)` 的回读

response 是一段新的 JS，用 `new Function(body)` 执行，等价于"下一轮挑战指令"。也就是说 flow 是**双向**的——你上报环境，它回一段新的代码继续跑，类似一个远程调试器。

### cv/result（POST）

最后一跳，拿 Turnstile token 换 `cf_clearance`。URL 形如：

```
POST /cdn-cgi/challenge-platform/h/{tier}/cv/result/{ray}/{hash}
Content-Type: application/x-www-form-urlencoded
```

body 是 form-encoded：

| 字段 | 含义 |
| --- | --- |
| `wp` | Turnstile widget 回调里拿到的 token（`cf-turnstile-response`） |
| `h`  | 从 orchestrate 响应里提取的一个 opaque 字段 |
| `gv` | 挑战版本号，从 `_cf_chl_opt.cH` 取 |
| `cv` | challenge variant，从 `_cf_chl_opt.bLtO6` 取 |

返回 200 + `Set-Cookie: cf_clearance=...; HttpOnly; Secure; SameSite=None; Path=/`。后续带着这个 cookie 访问业务接口，直接通行。**前提是前面所有指纹、flow 打点、token 生成都合规。**

## AST：从一堆 `oK(kM.p)` 里找东西

orchestrate.js 的混淆风格很典型：

```js
function zq(p,gD,gQ,oV,P,jM,...) {
  gD = {p:283,P:1072,jM:590,jE:1230,...};   // 数字字典
  oV = qY;                                   // 字符串解码函数
  ...
  switch(jE[jd++]) {
    case '0': jM[oV(gD.p)](p, oV(gD.P)) && ...; continue;
    case '1': jd = s[oV(gD.jM)](oV(gD.jE));   continue;
    ...
  }
}
```

特点：

1. **字符串数组 + 解码函数**：所有字符串都被 `qY` 或 `oV` 这类函数包住，真实字符串在一个 ~1400 个元素的数组里（在文件末尾的 `function j(){...}` 里）
2. **参数字典**：每个函数开头把一堆局部变量赋成一个"key → index"的对象，调用处写 `obj[f(dict.p)]` 这种形态
3. **控制流平坦化**：原本的 `if-else` 全改成 `switch(state)` 循环
4. **垃圾代码注入**：大量 `function(){return a^b}` 这种只做位运算的 helper，夹在真实逻辑里干扰阅读

解法分四步，都用 `@babel/parser` + `@babel/traverse`：

### 第一步：把字符串数组解出来

先定位那个巨大的字符串数组源头（通常是 `function j(){ return '...!...!...'.split('!') }`），把数组内容 dump 下来。然后写 visitor 替换所有 `qY(N)` 调用：

```js
// babel plugin（示意，非实际代码）
CallExpression(path) {
  if (path.node.callee.name === 'qY'
   && path.node.arguments.length === 1
   && t.isNumericLiteral(path.node.arguments[0])) {
    const idx = path.node.arguments[0].value;
    const raw = strings[idx - OFFSET];  // Cloudflare 会做一次 rotate + XOR
    if (raw) path.replaceWith(t.stringLiteral(raw));
  }
}
```

OFFSET 和 XOR 常数从 VM 初始化代码里静态算出来。这一步跑完，`oV(gD.p)` 会变成 `oV('someRealString')`，再加一次内联替换就完全去壳了。

### 第二步：展平 switch-dispatcher

控制流平坦化的核心是一个形如 `while(true) switch(state) { case '0':...case '1':... }` 的大循环，外加一个 shuffled 过的派发顺序（代码里的 `jd=0` 配合 `jE[jd++]`，`jE` 是像 `'3|0|5|2|1|4'.split('|')` 这样的数组，决定真实执行顺序）。

展开它的 babel plugin 逻辑：

1. 找到 `jE = '数字|数字|...'.split('|')` 这条赋值，拿到执行序列
2. 按序列顺序把 case 块取出来
3. 把每个 case 内部的 `continue` 改成顺序执行
4. 整个 `while + switch` 替换成平铺的语句块

展开完一看，原来的逻辑就露出来了——这个 `zq` 函数其实只是在做"设置若干 cookie、删除若干属性、然后调用 `z6()`"这种线性操作。

### 第三步：变量重命名

经过前两步，代码的语义密度已经恢复。接下来用 scope 分析配合启发式命名：

- `fetch` 或 `new XMLHttpRequest()` 的返回值绑定的变量 → `xhr` / `response`
- 参数位上有 `body: new Uint8Array(...)` 的 → `flowPayload`
- 赋给 `document.cookie = ...` 的右值 → `cookieStr`

这一步不追求 100% 准确，只要能让读的人判断"哦这段是在发 flow 请求"就够了。

### 第四步：摘 API 形态

走到这一步才开始真正读逻辑。重点锁定三个位置：

| 位置 | 目标 |
| --- | --- |
| `new XMLHttpRequest().open('POST', url)` 的调用处 | 拿到 flow / cv 的 URL 模板 |
| 紧接着的 `xhr.send(body)` | 看 body 怎么拼出来的 |
| `_cf_chl_opt` 的写入点 | 找到 ray、chlVersion、flowSeed 是如何从 response 回填的 |

`diff-flow-artifacts.mjs` 和 `extract-missing-methods.mjs` 做的就是把每次 replay 的这些锚点 dump 出来做 diff，挑缺的环境属性往下一轮补。

## Node 里"补环境"的工程

读懂接口只是前 30%。真正的重头戏是在 Node 里造一套足够像真浏览器的环境让 challenge VM 能跑完。

### 最外层：vm context

```js
const ctx = vm.createContext({});
// 注入合成 window / document / navigator / screen
ctx.window = ctx;  // 自引用
ctx.document = buildDocumentStub();
ctx.navigator = buildNavigatorStub(browserCapture.navigator);
ctx.screen = buildScreenStub(browserCapture.screen);
ctx.performance = buildPerformanceStub();
```

`browserCapture` 是我之前在真 Chrome 里用注入脚本抓的快照——`navigator` / `screen` 的所有属性、`document` 里一批稳定 id 元素的几何尺寸、首屏的事件序列，全部一次性导出存成 JSON。

### EventTarget / PointerEvent 这些 Node 默认没有

Node 虽然有 `EventTarget` 的部分实现，但没有 `PointerEvent / MouseEvent / TouchEvent` 这几个子类，challenge VM 一调就报 `ReferenceError`。必须手写一遍：

```js
class EnvEventBase {
  constructor(type, init = {}) {
    this.type = String(type || '');
    this.bubbles = Boolean(init.bubbles);
    this.cancelable = Boolean(init.cancelable);
    this.isTrusted = init.isTrusted !== false;  // 默认 true，对方会读
    this.timeStamp = typeof init.timeStamp === 'number' ? init.timeStamp : 0;
    // ...
  }
  preventDefault() { if (this.cancelable) this.defaultPrevented = true; }
  stopPropagation() { this.cancelBubble = true; }
  composedPath() { return this.target ? [this.target] : []; }
}
class EnvPointerEvent extends EnvUIEvent {
  constructor(type, init = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
    this.pointerType = init.pointerType || 'mouse';
    this.pressure = init.pressure ?? 0.5;
    this.tiltX = init.tiltX ?? 0;
    // ...
  }
}
```

这部分没什么技术含量，纯苦力活。坑在对方会读一些冷门属性——`twist`、`tangentialPressure`、`isPrimary`——漏一个就被标记。

### 鼠标轨迹合成

flow 上报里最关键的是事件序列。直接构造一串 `{ x: 100, y: 100 }`、`{ x: 150, y: 100 }` 这种线性点位一眼假。用三阶贝塞尔配合可复现的 PRNG：

```js
function mulberry32(seed) {
  let s = seed | 0;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function humanTrack(x0, y0, x1, y1, seed) {
  const rand = mulberry32(seed);
  const cx1 = x0 + (x1 - x0) * (0.25 + rand() * 0.2);
  const cy1 = y0 + (y1 - y0) * rand();
  const cx2 = x0 + (x1 - x0) * (0.55 + rand() * 0.2);
  const cy2 = y0 + (y1 - y0) * (0.5 + rand() * 0.5);
  const steps = 24 + Math.floor(rand() * 12);
  const points = [];
  let t = 0;
  for (let i = 0; i <= steps; i++) {
    t = i / steps;
    // Bezier + per-axis jitter
    const x = bezier(x0, cx1, cx2, x1, t) + (rand() - 0.5) * 2;
    const y = bezier(y0, cy1, cy2, y1, t) + (rand() - 0.5) * 2;
    points.push({ x, y, dt: 8 + Math.floor(rand() * 10) });  // 8~17ms 一个点
  }
  return points;
}
```

生成的轨迹会被再包一层 `PointerEvent`，按每个点的 `dt` 设 `timeStamp`，一次性 dispatch 给 widget 容器。可复现这一点在调试时很有用——同样的 seed 出同样的轨迹，出错了方便 diff。

### 缺什么补什么

每次跑 VM 都会有新的报错，主要两类：

- `TypeError: X is not a function` → 说明 VM 调用了某个我没实现的方法
- `TypeError: Cannot read properties of undefined (reading 'Y')` → 说明 VM 访问了某个我没实现的属性

写了两个扫描脚本，跑完一轮 replay 后自动扫出 top N 的 missing，下一轮开跑前统一补进 stub：

```js
// extract-missing-methods.mjs 的核心
function scan(logs) {
  const missing = new Map();
  for (const err of logs.filter(l => l.type === 'TypeError')) {
    const m = err.message.match(/(\w+)\.(\w+) is not a function/);
    if (!m) continue;
    const key = `${m[1]}.${m[2]}`;
    missing.set(key, (missing.get(key) || 0) + 1);
  }
  return [...missing.entries()].sort((a, b) => b[1] - a[1]);
}
```

这一步效率很高。前三四轮补得很快，`Intl.Segmenter`、`ReadableStream.pipeTo`、`crypto.subtle.digest` 这些都补齐之后，VM 能跑到 flow 上报了。

## 为什么还是没过

单说"跑到 flow 能上报"是够呛的表面胜利。真正的问题在后面。

### 一、flow 上报通过不了服务端校验

flow 的 body 不只是把环境字段 JSON 序列化那么简单。encrypted body 用的密钥派生方式是 `SHA-256(cRay + flowSeed + counter)` 然后 AES-CTR，而**加密的 payload 里还混入了 challenge VM 自己的"执行指纹"**——比如它在 VM 里调了 `Object.getOwnPropertyNames(window)`，预期结果是一个特定的名字排列，这个排列会被揉进加密输入。

我的 `window` stub 虽然属性齐全，但 **V8 的属性枚举顺序**（涉及 numeric key 先枚举、然后是 string key 的插入顺序）不完全等价于真 Chrome 的 `window`，因为我是一层一层往 ctx 上 `defineProperty` 加的，顺序跟真 Chrome 由 IDL 生成的顺序不同。对方在 encrypted payload 里夹了这个枚举结果的 hash。

想绕过这条只有一条路：**把 stub 换成从真 Chrome dump 的 proto chain 原样重放**。但这样又引入另一个问题——它怎么可能和一台真浏览器产生的打点**在时序上**完全一致？flow 里含 `performance.now()` 的读数分布，我的代码跑得再慢都不像人手。

### 二、challenge VM 自带完整性检查

VM 会反复读几样东西：

- `Function.prototype.toString` 的返回值里是否包含 `[native code]`（Proxy 代理过的函数这里会露馅）
- `Error().stack` 的格式（Node 的 stack 格式和 V8 浏览器上下文的格式略有不同）
- `performance.now()` 的抖动分布（真浏览器是亚毫秒，Node 里用 `performance.now()` 更干净，反而像假的）
- `document.createElement('canvas').getContext('2d').measureText(...)` 的返回（跟渲染引擎强绑定，我没法实现）

想补齐 canvas / WebGL / AudioContext 就是在 Node 里重做半个浏览器。开源方案有 `jsdom` + `canvas` + `headless-gl`，但它们产生的指纹和真 Chrome 不一致，等于换了个靶子给对方打。

### 三、每周更新

抓了两次 orchestrate 快照，文件 hash 一次是 `9f7a3617`，一周后变成 `9f81c061`。diff 一下发现：

- 字符串数组的 OFFSET 变了
- switch dispatcher 的执行序列打乱方式换了一种
- 新增了两个从前没见过的"环境探针"（读 `navigator.connection.rtt`、`WebAssembly.instantiate` 的 hook）

这意味着 AST 工具链里所有跟数组索引相关的 magic number 全要重算。一次迭代我要花半天到一天，Cloudflare 那边估计是自动发布。算力不对等，一个人跟不动。

### 四、最后那个路线也塌了

既然 VM 过不了，退一步——**不自己解 Turnstile，外接 solver**。`turnstile-solver.mjs` 就是这条兜底路线：向 2captcha / capsolver / 自建 CDP 节点提交 sitekey + 页面 URL，由它们用真浏览器解出 token，我只负责拿着 token 去 POST `cv/result`。

这条路技术上通——我跑通过几次，但它的问题是：

- **没解决最初想解决的问题**。我一开始是为了不启动浏览器，结果解成依赖别人的浏览器
- **token 和 session 强绑定**。拿 solver 提交的 token 必须来自同一 IP、同一 UA 的 session，外接 solver 意味着要把整个 session 透传给它们，或者它们解完我再带着 token 回来——后者会因为时间差被 cv/result 拒掉
- **成本**。商用 solver 按次计费，自建 CDP 节点又回到"为什么不直接用 Playwright"的问题

## 结语

做完这个项目，我对 Cloudflare Managed Challenge 的看法是：

- **单点接口（orchestrate / flow / cv）形态是可以逆出来的**，AST 工具链足够处理它的混淆层
- **challenge VM 的完整性校验 + 加密 payload 的执行指纹绑定**，这两层组合起来让"在 Node 里补环境"成为近乎不可能的任务，除非你有团队 + 真浏览器级别的原型基线
- **正确的工程选择是尊重它**：如果你在做合法的可用性监控，直接用 Playwright 带 `storageState` 复用；如果你是站点方，把 5s 盾当成已经足够好的默认方案，不用焦虑有人能"破解"它

这个仓库我封存了，当做一次 AST + 补环境 + TLS 指纹的综合训练。顺手收获的几样东西——`node-tls-client` 的用法、`@babel/parser` 写 visitor 的手感、Node VM context 隔离的边界——之后会长期用得上。

---

> 本文不含任何可执行的绕过实现。所有技术点（AST、TLS 指纹、事件补全、鼠标轨迹生成）都适用于合法场景：E2E 测试、SDK 审计、自家站点监控、前端混淆代码的逆向分析。
