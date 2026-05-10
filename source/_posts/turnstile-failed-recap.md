---
title: 逆向 Cloudflare 5s 盾
date: 2026-05-08 21:45:00
tags:
  - 逆向
  - Cloudflare
  - Node.js
categories:
  - 逆向
description: 纯 Node 里补 Cloudflare Managed Challenge（俗称 5s 盾）的运行环境
keywords: Cloudflare, 5s 盾, Managed Challenge, Turnstile, orchestrate, flow, cv/result, 补环境, JA4, 逆向
og_img: /img/og/turnstile-failed-recap.svg
index_img: /img/og/turnstile-failed-recap.svg
---

> 这篇只做记录
>

## TL;DR

在 Node 里用 `node:vm` + `node-tls-client` 走完了 Cloudflare Managed Challenge 的前两步：

1. GET 原站拿到 interstitial HTML + `_cf_chl_opt`
2. GET orchestrate 脚本，在 VM 里执行
3. 等 orchestrate 自己发出 flow 的 POST（VM 内部搞定）
4. **卡在 Turnstile widget 不回 token**  没 token 就没法 POST `/cv/result`，拿不到 `cf_clearance`


## 链路结构

真实链路就这四步：

```
GET  /<target>
       返回 403 + interstitial HTML + window._cf_chl_opt
         + 动态插入 <script src=".../orchestrate/chl_page/v1?ray=..."> 

GET  /cdn-cgi/challenge-platform/h/{tier}/orchestrate/chl_page/v1?ray={ray}
       一段重度混淆、带 VMP 字节码的 challenge 主脚本
         在 vm.runInContext 里执行

POST /cdn-cgi/challenge-platform/h/{tier}/flow/ov1/.../{ray}/{chlVersion}
       orchestrate 执行期间自己发出
         body 是 plain text（content-type: text/plain;charset=UTF-8）
         这一步我不做 body 构造，完全由 VM 内的 orchestrate 代码负责

POST /cdn-cgi/challenge-platform/h/{tier}/cv/result/{ray}/{hash}
       拿 Turnstile token 换 cf_clearance
         form body：wp=<token>&cf-turnstile-response=<token>&h=...&gv=...&cv=...
         响应里 Set-Cookie: cf_clearance=...; HttpOnly
```

tier 从 `_cf_chl_opt.cFPWv`（或 `OwLPw9`）读，一般是 `g`；ray 从 `_cf_chl_opt.cRay`（或 `XVCKH0`）读；hash 是 orchestrate URL 路径最后一段。

flow 的 body 到底是什么格式我没有分析出来，也不打算分析  **因为 VM 内的 orchestrate 能自己把这条请求发出去**，我只需要把环境补到让它不报错即可。

## 仓库结构

打包后就这么几个文件：

```
cloudflare-env-replay.mjs      主脚本，一个文件跑完整个链路
lib/tls-fetch.mjs              node-tls-client 封装，走 chrome_131 profile
lib/event-supplement.mjs       VM 里补 Event/MouseEvent/PointerEvent/KeyboardEvent 等子类
lib/turnstile-detect.mjs       从 HTML/flow 响应里嗅出 Turnstile sitekey
lib/turnstile-flow.mjs         VM 内装 turnstile shim、加载 api.js、派发轨迹、等 token
lib/track-generator.mjs        Bezier + mulberry32 人机轨迹
lib/cv-result.mjs              把 token POST 到 /cv/result 并抓 Set-Cookie
package.json                   唯一运行时依赖：node-tls-client
```

主脚本三千多行，主要在做"给 VM 装一个够逼真的 window/document/navigator/Event"这件事。

## 踩过的坑（这些坑踩完了）

### 1. Node fetch 的 TLS 指纹发不出 /flow

Node 自带 `fetch`（undici）或 `https` 模块的 ClientHello 跟 Chrome 完全不一样。Cloudflare 的 `/cdn-cgi/challenge-platform/h/g/flow/ov*` 对 JA4+ 做了校验，Node 默认指纹直接拒。

解：用 `node-tls-client`（bogdanfinn 那套的 Node binding），选 `ClientIdentifier.chrome_131` profile，配上固定的 HTTP/2 header order：

```js
import { Session, ClientIdentifier } from 'node-tls-client';

const CHROME_XHR_HEADER_ORDER = [
  ':method', ':authority', ':scheme', ':path',
  'content-length', 'accept', 'sec-ch-ua', /* ... */
];

const session = new Session({
  clientIdentifier: ClientIdentifier.chrome_131,
  timeout: 30000,
  headerOrder: CHROME_XHR_HEADER_ORDER,
});
```

Chrome 142 在当前 Cloudflare 规则下 `chrome_131` 够用，更接近的 profile 可能需要自己 fork tls-client 库加。

### 2. Node 没有 PointerEvent/MouseEvent

VM 里的 orchestrate 和 Turnstile SDK 都要 `new PointerEvent(...)`。Node 原生 Event 只到 Event 基类，往下全缺。

解：手写一套 `EnvEventBase / EnvUIEvent / EnvMouseEvent / EnvPointerEvent / EnvTouchEvent / EnvKeyboardEvent / EnvFocusEvent / EnvCustomEvent`，每个类完整实现字段和 `preventDefault / stopPropagation / composedPath`。`isTrusted` 默认给 `true`。

这一步没技术含量但很费劲，每发现一个字段报错就补一个。

### 3. screenX / clientX 的 chrome offset

CDP 派发合成事件时有个经典 bug：`screenX = clientX`，真浏览器里 `screenX` 应该比 `clientX` 多一段浏览器 chrome 的偏移（标题栏+tab条），Chrome 上约 80~140px。orchestrate 拿到 `screenX - clientX === 0` 就能判定"合成事件"。

解：Pointer/Mouse 事件构造器里强制加偏移：

```js
this.screenX = Number(init.screenX ?? (init.clientX + chromeOffset.x));
this.screenY = Number(init.screenY ?? (init.clientY + chromeOffset.y));
```

chromeOffset 用 `{ x: 0, y: 87 }`（典型 Chrome on Win10）。

### 4. Universal callable proxy

orchestrate 里大量动态探测：`mY[someMinifiedKey].apply(mY, args)`。随机生成 key，我不可能穷举补齐。直接 `mY[key] === undefined` 就 throw。

解：给宿主对象挂一层 Proxy，未知 key 返回一个 callable proxy  可以当函数调也可以继续取属性，apply/construct 都返回自己：

```js
function makeUniversalCallable() {
  const target = function () { return proxy; };
  let proxy;
  proxy = new Proxy(target, {
    get(obj, prop) {
      if (prop === 'then') return undefined;
      if (typeof prop === 'symbol') return undefined;
      return proxy;
    },
    apply() { return proxy; },
    construct() { return proxy; },
    has() { return true; },
  });
  return proxy;
}
```

这个 trick 救了我一堆 "X is not a function" 错误。但它也是个双刃剑  把真实错误也屏蔽掉了，后面排查要反复 toggle。

### 5. Bezier 人机轨迹 + 可复现 PRNG

Turnstile 阶段需要向 widget 容器派发一连串指针事件。直线移动太假，用 Bezier + 抖动：

```js
function mulberry32(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

每次 run 记录 seed，出问题时拿同一个 seed 复现。28~42 个中间点、ease-in-out 的时间分布、pointerover  pointerenter  pointermove  pointerdown  pointerup  click 的完整序列。这一套跟真浏览器的宏观形状差不多。

### 6. Turnstile api.js 的 currentScript 校验

Turnstile SDK 执行时会做：

```js
if (!(document.currentScript instanceof HTMLScriptElement)
 || !/api\.js/.test(document.currentScript.src)) {
  throw new Error('Could not find Turnstile valid script tag');
}
```

我的 document.createElement 返回的不是真的 HTMLScriptElement 实例，会死在这。

解：执行 api.js 前临时重写 `HTMLScriptElement[Symbol.hasInstance]` 让它认 `tagName === 'SCRIPT'` 的对象，执行完再还原：

```js
Object.defineProperty(HTMLScriptElement, Symbol.hasInstance, {
  value: (obj) => obj?.tagName?.toUpperCase() === 'SCRIPT',
  configurable: true, writable: true,
});
try { vm.runInContext(apiJsText, ctx, { filename: 'turnstile-api.js' }); }
finally { /* 还原原来的 hasInstance */ }
```

### 7. cv/result 的 body 格式

社区有帖子说 body 是 JSON，有人说 form-urlencoded。我实测 form-urlencoded 能走（至少服务器接受请求进到下一步判断），JSON 直接 400。字段 `wp` 和 `cf-turnstile-response` 同时塞同一个 token 最稳：

```js
const params = new URLSearchParams();
params.set('wp', token);
params.set('cf-turnstile-response', token);
// 可选附加字段（从 _cf_chl_opt 读）
params.set('h',  opt.cH || opt.bLtO6 || '');
params.set('gv', opt.cFPWv || opt.OwLPw9 || '');
params.set('cv', opt.cType || opt.qklD0 || '');
```

返回 200 + `Set-Cookie: cf_clearance=...` 才算真的过了。**前提是 token 必须是真的。**

## 卡死的地方：Turnstile 不出 token

前面六个坑填完，在真实 run 里看到的最终状态：

```json
{
  "turnstile": {
    "detection": {
      "source": "managed-implicit",
      "siteKey": "0x00e9d3dca1328a49ad...",
      "apiJsUrl": "https://challenges.cloudflare.com/turnstile/v0/api.js"
    },
    "attempted": true,
    "stage": {
      "ok": false,
      "tokenLength": 0,
      "reason": "no-token",
      "log": [
        "detected source=managed-implicit sitekey=0x00e9d3dca...",
        "api.js fetched length=61556",
        "turnstile.render() captured widget cf-chl-widget-xxx",
        "explicit render() returned widgetId=cf-chl-widget-xxx",
        "dispatched 91 synthetic events",
        "no token surfaced before timeout"
      ]
    }
  },
  "error": { "code": "RISK_CONTROL", "httpStatus": 403 }
}
```

分开看：

- **api.js 成功拉下来**（61KB 左右，Turnstile 公共 SDK）
- **SDK 在 VM 里跑完了**，调用了我的 turnstile shim 的 `render()`，我抓到了 widget
- **合成事件全派发完**（91 个 pointer/mouse 事件，seed 可复现）
- **widget 的 callback 从来没回过 token**

到这一步，VM 本身的环境"看上去"是让 api.js 跑通了的。但 Turnstile 判定"你不是真浏览器"这件事，是在 SDK 内部和 challenges.cloudflare.com 之间的黑盒里完成的。它可能做了但不限于：

- **WASM 模块里采样 GPU/layout 时序**：纯 Node VM 没有 GPU、没有 layout，这里大概率直接失败
- **AudioContext 指纹**：我的 AudioContext 是空 stub，分析音频指纹的路径一看就是假的
- **WebGL 指纹**：同上，`document.createElement('canvas').getContext('webgl')` 我只返回了个 noop
- **性能指纹**：`performance.now()` 的分布、Promise/microtask 队列的时序，跟 V8 in Chrome 不是一个抖动特征
- **真浏览器主动信号**：像 `user-activation`、`isInputPending()`、Permission API 的 state，都是 SDK 可以读到但合成事件不会触发的东西

上面这些**我没有单独验证过是哪一条在拦**，只是根据 Turnstile 公开资料 + 常见反自动化检测套路的合理怀疑。

这一步就是我过不去的。

## 为什么补不全

前面六个坑都是 "缺什么补什么" 的力气活，能做到 100% 过检吗？不能。原因：

### orchestrate 本身还在偶发报错

即使 universal callable proxy 兜底了一大堆 "X is not a function"，实际跑完还是会看到类似：

```
TypeError: ml[uA(...)] is not a function
```

这说明混淆 dispatcher 里还有某个槽位探测到 native 方法缺失。换 ray 换版本后错误信息会换一个函数名，但"探测到缺失"这件事是稳定的。

### `missingProps` 日志里常年有残留

跑完一次，capture 对象里的 `missingProps` 数组里总有：

```
{ scope: 'xhr', prop: 'content-type', ... }
```

以及一些 tagName 为空、prop 是 Symbol 的访问。这些 probe 不致命，但每一个都会留下案底
## 为什么不上真浏览器

这是自我约束的选择：

- **目标本来就是想摆脱浏览器依赖**。如果上 Playwright，整个项目没意义，直接 `context.storageState()` 把 cookie 序列化就完事了。
- **想理解这玩意是怎么工作的**。黑盒调真浏览器学不到东西。
- **想看看纯 JS 到底能走到哪一步**。现在答案是：能走到 Turnstile 门口，但推不开门。

仓库没开源，不提供现成的"过墙"实现。这篇文章的目的是复盘，不是发布绕过工具。

## 参考

- [bogdanfinn/tls-client](https://github.com/bogdanfinn/tls-client)  JA4+ 指纹的核心
- [node-tls-client](https://www.npmjs.com/package/node-tls-client)  上面那个的 Node binding
- Cloudflare 官方 Turnstile 文档（只写了接入，没写内部）

---

> 本文仅记录方法论和接口形态，不提供任何可直接运行的绕过实现。具体字段的加密算法、VM 字节码映射、符号逻辑一律略过。
> 技术点适用于合法场景：E2E 测试、SDK 审计、自家站点监控、前端混淆代码的逆向分析。