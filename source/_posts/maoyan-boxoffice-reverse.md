---
title: 猫眼票房专业版纯算逆向
date: 2026-05-10 16:50:00
tags:
  - 逆向
  - 猫眼
  - 字体反爬
  - Python
categories:
  - 逆向
description: 把猫眼票房专业版的实时接口从浏览器环境里剥出来——signKey、mygsig、WuKong、woff 字体加密，用纯 Python 走完一次完整请求。
keywords: 猫眼票房, 猫眼逆向, signKey, mygsig, WuKong, 字体反爬, woff, fontTools, 爬虫, Python
og_img: /img/og/maoyan-boxoffice-reverse.svg
index_img: /img/og/maoyan-boxoffice-reverse.svg
---

> 这篇只做记录。文中涉及的算法、密钥、接口仅用于说明反爬机制，不提供可直接运行的采集脚本。
>

## TL;DR

目标是 `https://piaofang.maoyan.com/i/dashboard/movie` 这块实时大盘。接口一共四道坎：

1. **signKey** MD5 签名，拼接字符串里带固定密钥
2. **mygsig** 美团自研的风控签名，由 `0.0.67_tool.js` 生成
3. **WuKong** headless 检测，URL 里带个 `WuKongReady=h5` 就过
4. **woff 字体加密** 数字不是明文，是每次动态生成的字体文件里的 glyph

前三个是纯算法，可以完全脱离浏览器。第四个最烦——woff 里的 cmap 每次都不一样，Unicode 到数字的映射要你自己想办法认出来。

## 一、接口长什么样

```
GET https://piaofang.maoyan.com/i/api/dashboard-ajax/movie
```

Query 参数：

| 参数 | 说明 |
|------|------|
| `movieId` | 电影 ID，空字符串代表查全部 |
| `orderType` | 0=综合票房，1=分账票房 |
| `uuid` | 页面初始化时服务端下发 |
| `timeStamp` | 毫秒时间戳 |
| `User-Agent` | Base64(UA) 字符串 |
| `index` | `Math.floor(1000 * Math.random() + 1)` |
| `channelId` | 固定 `40009`，也可以从页面数据里读 |
| `sVersion` | 签名版本，固定 2 |
| `signKey` | MD5 签名（核心） |
| `WuKongReady` | 固定 `h5` |

请求头里另外需要：

| Header | 说明 |
|--------|------|
| `m-appkey` | 固定 `fe_com.sankuai.movie.fe.ipro` |
| `mygsig` | 风控签名 |
| `uid` | 从 HTML 里 `<meta name="csrf">` 拿，偶尔可以为空 |
| `M-TRACEID` | 一个随机负数 ID，长度 19 位左右 |

## 二、signKey

这个最简单。源码在 `https://s0.pipi.cn/festatic/moviepro/js/largeScreenMovieIndex_e52ad780.js` 第 8710 行附近，简化后的算法：

```javascript
function getQueryKey({ channelId, timeStamp }) {
  var params = {
    method: 'GET',
    timeStamp: timeStamp || +new Date(),
    'User-Agent': window.btoa(navigator.userAgent),
    index: Math.floor(1000 * Math.random() + 1),
    channelId: channelId,            // 40009
    sVersion: 2,
    key: 'A013F70DB97834C0A5492378BD76C53A'  // 固定密钥
  };

  // 按对象遍历顺序拼接 k=v&k=v（空值会写成 key=''）
  var paramStr = Object.keys(params).reduce(function (str, k) {
    return params[k] === 0 || params[k]
      ? str + '&' + k + '=' + params[k]
      : str + '&' + k + "=''";
  }, '').slice(1);

  var signKey = md5(paramStr.replace(/\s+/g, ' '));

  delete params.method;
  delete params.key;  // 这两个不发到 URL

  return { finalQuery: { ...params, signKey }, signKey };
}
```

Python 复现：

```python
def get_sign_key(timestamp, ua_b64, index, channel_id='40009'):
    params_str = (
        f"method=GET"
        f"&timeStamp={timestamp}"
        f"&User-Agent={ua_b64}"
        f"&index={index}"
        f"&channelId={channel_id}"
        f"&sVersion=2"
        f"&key=A013F70DB97834C0A5492378BD76C53A"
    )
    return hashlib.md5(params_str.encode()).hexdigest()
```

注意三件事：

- **拼接顺序固定**，跟 JS 里 `Object.keys` 的遍历顺序一致，别自作主张排序
- `User-Agent` 要先 Base64 再写进字符串，别把明文 UA 塞进去
- `key` 参与签名但**不**发到 URL

## 三、mygsig

`mygsig` 是美团风控 SDK 生成的设备指纹签名，出自 `https://s0.pipi.cn/mediaplus/basic_tools_js/0.0.67_tool.js`，代码经过重度混淆。不带这个 header 一般直接返回空数据。

结构长这样：

```json
{
  "m1": "0.0.3",
  "m2": 0,
  "m3": "0.0.67_tool",
  "ms1": "6d78fd79...",
  "ts": 1778400808222,
  "ts1": 1778400522822
}
```

- `m1`、`m3` 写死
- `m2` 写 0
- `ts` 当前时间戳（毫秒）
- `ts1` 页面加载时间戳，首次请求时可以取 `ts - 几百ms`
- `ms1` 是核心

`ms1` 的算法扒出来之后是这样：

```python
def get_mygsig(full_url, timestamp, page_load_ts):
    parsed = urlparse(full_url)
    qp = parse_qs(parsed.query, keep_blank_values=True)
    merged = {k: v[0] for k, v in qp.items()}
    merged['path'] = parsed.path  # 把 path 也塞进去

    # 按 key 字母顺序排（不区分大小写），取 value 用 "_" 连起来
    sorted_entries = sorted(merged.items(), key=lambda x: x[0].lower())
    joined = "_".join(str(v) for _, v in sorted_entries)

    # "581409236#" + joined + "$" + ts -> md5
    full = f"581409236#{joined}${timestamp}"
    ms1 = hashlib.md5(full.encode()).hexdigest()

    return json.dumps({
        "m1": "0.0.3", "m2": 0, "m3": "0.0.67_tool",
        "ms1": ms1, "ts": timestamp, "ts1": page_load_ts
    }, separators=(",", ":"))
```

几个容易踩的点：

- **value 里该有空串就给空串**，`parse_qs` 在 `keep_blank_values=False` 时会把 `movieId=` 这种空参丢掉，签出来就错
- **排序按 key 小写做**，`User-Agent` 会排到 `uid` 附近，不是按原大小写
- 要把 `path`（不带 query）作为额外字段一起参与，这个设计是想抗"改 URL 路径"的攻击

这一套算法里最容易被卡的是"忘把 `path` 加进去"以及"空参没保留"。

## 四、WuKong

`https://s0.pipi.cn/mediaplus/basic_tools_js/WuKong_1.0.2.min.js` 这个脚本干的事是：

- 浏览器环境里扫 headless 特征（`navigator.webdriver`、Plugin 数量、`window.chrome` 等）
- 通过之后在 URL 里加 `WuKongReady=h5`

纯 Python 脚本绕这一层的办法很朴素：**直接把 `WuKongReady=h5` 拼进 URL**。这是个被动检查点，服务端只是看参数在不在，不会回过头去挑战你的运行时。

## 五、woff 字体加密（最花时间的一步）

响应 body 里的票房数字不是明文，是像这样的 HTML 实体：

```
&#xe886;&#xf16b;&#xf23f;&#xf05a;
```

对应的 CSS 在 `fontStyle` 字段里，是一段 `@font-face`：

```css
@font-face {
  font-family: "mtsi-font";
  src: url("//s3plus.meituan.net/v1/mss_73a511b8f91f43d0bdae92584ea6330b/font/abc123.woff") format("woff");
}
```

每次请求 `.woff` 的 URL 和里面的 cmap 都不一样。浏览器拿到字体文件自己渲染出正确数字，我们要自己把这个映射重建出来。

### 思路

`.woff` 里的 `cmap` 表只告诉你"Unicode → GlyphID"，但没告诉你 GlyphID 对应哪个数字。数字长什么样是藏在 `glyf` 表（TrueType 字形轮廓）里的。

能跑的方案大致三条：

1. **轮廓特征匹配**（本文方案）：提取每个 glyph 的轮廓数量、点数、宽高比、内外轮廓位置，按规律分配数字
2. **OCR**：把字体渲染成图片后用 tesseract 或自训模型认
3. **模板字体对比**：找一份正常的数字字体做基准，用 glyph 路径做相似度匹配

方案一最快、不依赖额外模型，但要你亲自看过几个样本的 glyph 轮廓找规律。

### 用 fontTools 提特征

```python
from fontTools.ttLib import TTFont
from io import BytesIO
import requests

def collect_glyphs(woff_url):
    resp = requests.get(woff_url)
    font = TTFont(BytesIO(resp.content))
    cmap = font.getBestCmap()
    glyf = font['glyf']

    info = []
    for code, name in cmap.items():
        if code <= 0xFF:            # 只看自定义区
            continue
        g = glyf[name]
        if g.numberOfContours <= 0:
            continue
        coords = list(g.coordinates)
        xs = [c[0] for c in coords]
        ys = [c[1] for c in coords]
        info.append({
            'unicode': code,
            'name': name,
            'contours': g.numberOfContours,
            'points': len(coords),
            'width':  max(xs) - min(xs),
            'height': max(ys) - min(ys),
            'endPts': list(g.endPtsOfContours),
        })
    return info, glyf, cmap
```

### 按轮廓数分组

看过几个样本后，规律其实挺稳：

| 数字 | 轮廓数 | 备注 |
|------|--------|------|
| 1 | 1 | 宽度最小 |
| 7 | 1 | 除 1 外点数最少 |
| 2 / 3 / 5 | 1 | 上下半部分 x 坐标偏移区分 |
| 4 | 2 | 内轮廓就是一个三角形，点数最少 |
| 0 | 2 | 内轮廓居中 |
| 6 | 2 | 内轮廓偏下 |
| 9 | 2 | 内轮廓偏上 |
| 8 | 3（或 2 里点数最多） | 有两个内空洞 |

识别逻辑大致长这样：

```python
def identify(glyphs, glyf, cmap):
    mapping = {}
    one   = [g for g in glyphs if g['contours'] == 1]
    two   = [g for g in glyphs if g['contours'] == 2]
    three = [g for g in glyphs if g['contours'] >= 3]

    # 8: 三轮廓
    for g in three:
        mapping[g['unicode']] = 8

    # 1: 一轮廓里最窄
    one.sort(key=lambda x: x['width'])
    mapping[one[0]['unicode']] = 1
    # 7: 剩下里点数最少
    rest = one[1:]
    rest.sort(key=lambda x: x['points'])
    mapping[rest[0]['unicode']] = 7
    # 2/3/5: 上下 x 重心偏移
    others = rest[1:]
    for g in others:
        cs = list(glyf[cmap[g['unicode']]].coordinates)
        mid = (min(c[1] for c in cs) + max(c[1] for c in cs)) / 2
        up = [c[0] for c in cs if c[1] >  mid]
        lo = [c[0] for c in cs if c[1] <= mid]
        g['shift'] = (sum(up)/len(up) if up else 0) - (sum(lo)/len(lo) if lo else 0)
    others.sort(key=lambda x: x['shift'], reverse=True)
    mapping[others[0]['unicode']] = 2  # 上重心偏右
    mapping[others[1]['unicode']] = 3  # 居中
    mapping[others[2]['unicode']] = 5  # 上重心偏左

    # 2轮廓: 4, 0, 6, 9
    two.sort(key=lambda x: x['points'])
    mapping[two[0]['unicode']] = 4     # 点数最少 = 三角形内轮廓
    rest2 = two[1:]
    for g in rest2:
        cs = list(glyf[cmap[g['unicode']]].coordinates)
        end = list(glyf[cmap[g['unicode']]].endPtsOfContours)
        c1 = cs[:end[0]+1]
        c2 = cs[end[0]+1:end[1]+1] if len(end) > 1 else []
        inner = c1 if len(c1) < len(c2) else c2
        if inner:
            mid = (min(c[1] for c in cs) + max(c[1] for c in cs)) / 2
            g['inner_rel'] = sum(c[1] for c in inner)/len(inner) - mid
    rest2.sort(key=lambda x: abs(x.get('inner_rel', 0)))
    mapping[rest2[0]['unicode']] = 0   # 最居中
    tail = sorted(rest2[1:], key=lambda x: x.get('inner_rel', 0))
    mapping[tail[0]['unicode']] = 6    # 偏下
    mapping[tail[1]['unicode']] = 9    # 偏上
    return mapping
```

这段逻辑我跑过一批样本，准确率在 99% 左右。偶尔会在字体 hinting 比较奇怪的情况下把 3 和 5 认反，容忍不了的话可以再加一层"上半部分开口方向"的特征做 double check。

### 拿到映射之后

替换 HTML 实体就简单了：

```python
import re

def decode(encoded, mapping):
    def repl(m):
        code = int(m.group(1), 16)
        return str(mapping.get(code, '?'))
    return re.sub(r'&#x([a-f0-9]+);', repl, encoded)
```

响应里 `movieList.list[i].boxSplitUnit.num` 就是加密数字，配合 `.unit`（万 / 亿）拼回去。

## 六、踩过的坑

除了算法本身，零零碎碎的细节踩过好几次：

**响应里其实有两套数字字段**。`boxSplitUnit` 是综合票房，`splitBoxSplitUnit` 是分账票房，别只解了一个。

**字体文件偶尔返回 0 字节**。美团的 CDN 在切源时会抽风，重试一次就好，别立刻判定算法错了。

**UA 一定要和 sign 时用的同一个**。发请求用的 `User-Agent`、签名里做 Base64 的 `User-Agent`、浏览器里看到的 `User-Agent`，三者要完全一致，差一个字符都算错签。

**`updateGapSecond` 告诉你下次该几秒后请求**。猫眼大盘默认 5 秒一刷，如果你硬刷密度过高会直接进风控名单，需要尊重这个字段。

**`uid` 可以留空**，但留空时有小概率拿到空 list。最稳的做法是走一次首页 `dashboard/movie`，从 HTML 里 `<meta name="csrf">` 读出来塞进去。

## 七、完整链路

从零到拿到一行明文数据，实际走的链路：

```
1. GET /i/dashboard/movie
     拉 HTML，正则扒出 uuid、csrf、channelId
     记一下 page_load_ts = 当前毫秒

2. 本地算 signKey(ts, base64(UA), index, channelId)

3. 拼 URL，加 WuKongReady=h5

4. 本地算 mygsig(url, ts, page_load_ts)

5. GET /i/api/dashboard-ajax/movie
     Headers: m-appkey, mygsig, uid, M-TRACEID
     拿到 JSON + fontStyle

6. 从 fontStyle 里 regex 出 .woff URL
     下载 -> fontTools 解析 -> 按轮廓特征认数字

7. 对 movieList 里每条 boxSplitUnit.num 做实体替换
```

这一套跑通之后，每 5 秒拉一次即可，纯 Python，不需要 Chrome，不需要 Playwright。

## 为什么不上浏览器

- **目标本来就是去浏览器化**。上 Playwright 的话，直接 `page.content()` 抓渲染后的 DOM 就完事了，这篇文章就不存在
- **想把字体反爬这个玩法搞清楚**。动态字体 + cmap 每次变，是国内反爬的"阳关道 + 独木桥"组合：简单粗暴但拿捏新手
- **想看看字形识别到底要做多细**。现在答案是：10 个数字用 4~5 个轮廓特征就能 99% 正确

## 写在最后

从"看源码"到"签名算对"，整个链路大概花了一个半小时；字体识别逻辑又花了两个半小时——几乎所有时间都在看 glyph 轮廓。这也是国内反爬的常态：加密本身不难，烦的是那些**不太成文的规则**，比如空参该怎么拼、path 要不要进签、UA 用哪一版。一个一个试，试到字节完全一致为止。

---

> 文章仅记录方法论和接口形态，不提供任何可直接运行的采集脚本。
> 具体字段值、字体识别的完整训练数据、批量采集框架一律不公开。
> 技术点适用于合法场景：E2E 测试、数据接口文档化、前端混淆代码的逆向分析。
