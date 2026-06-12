/**
 * 十年留言墙 · 构建期数据生成
 * -----------------------------------------------------------------
 * 在 hexo generate 时通过 giscus 公共 API（backend 基于 GitHub Discussions 搜索）
 * 拉取 778801.xyz 对应讨论下的全部留言，处理后生成静态 JSON：
 *   public/api/ten-year-messages.json
 *
 * - 客户端直接请求 giscus.app 会被 CORS 拒绝（Access-Control-Allow-Origin: https://giscus.app）
 * - 所以改成"构建期抓一次、前端读静态 JSON"：零额外服务器、天然 CDN 加速、不怕 API 挂。
 *
 * 环境变量：
 *   TEN_YEAR_WALL_SKIP=1  跳过抓取（离线构建时使用，产物会写空数组并保留 status: "skipped"）
 *
 * 目标讨论：Master08s/master08s.github.io · category=General · term=<页面标题>
 * giscus 后端：https://giscus.app/api/discussions
 */
'use strict';

const GISCUS_API = 'https://giscus.app/api/discussions';
const REPO = 'Master08s/master08s.github.io';
const CATEGORY = 'General';
// 对应 giscus 的 data-mapping="title" —— 即目标页面的 <title>
const TERM = '人生的十年有多快 | 778801.xyz';
const PAGE_SIZE = 50;       // giscus 单次最大返回数量
const MAX_PAGES = 20;       // 安全上限，避免异常情况下无限分页
const REQUEST_TIMEOUT_MS = 15000;

function buildUrl(afterCursor) {
  const params = new URLSearchParams({
    repo: REPO,
    term: TERM,
    category: CATEGORY,
    strict: '0',
    first: String(PAGE_SIZE),
  });
  if (afterCursor) params.set('after', afterCursor);
  return `${GISCUS_API}?${params.toString()}`;
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'looks-blog-ten-year-wall/1.0',
      },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** 粗糙但够用的 HTML → 纯文本：保留换行，去除标签与多余空白。 */
function decodeEntity(entity) {
  const named = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
  };
  if (named[entity]) return named[entity];
  const dec = entity.match(/^&#(\d+);$/);
  if (dec) {
    const cp = Number(dec[1]);
    return Number.isFinite(cp) && cp >= 0 && cp <= 0x10ffff
      ? String.fromCodePoint(cp)
      : '';
  }
  const hex = entity.match(/^&#x([0-9a-f]+);$/i);
  if (hex) {
    const cp = parseInt(hex[1], 16);
    return Number.isFinite(cp) && cp >= 0 && cp <= 0x10ffff
      ? String.fromCodePoint(cp)
      : '';
  }
  return entity;
}

function htmlToText(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(?:nbsp|amp|lt|gt|quot|apos|#39);|&#\d+;|&#x[0-9a-f]+;/gi, decodeEntity)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeComment(c) {
  const text = htmlToText(c.bodyHTML);
  if (!text) return null;
  if (c.isMinimized || c.deletedAt) return null;
  return {
    id: c.id,
    author: (c.author && c.author.login) || 'anonymous',
    avatar: (c.author && c.author.avatarUrl) || '',
    profile: (c.author && c.author.url) || '',
    text,
    url: c.url || '',
    createdAt: c.createdAt || '',
  };
}

async function fetchAllMessages(log) {
  const out = [];
  let cursor = null;
  for (let i = 0; i < MAX_PAGES; i++) {
    const url = buildUrl(cursor);
    log.debug(`[ten-year-wall] GET ${url}`);
    const data = await fetchWithTimeout(url);
    const discussion = data && data.discussion;
    if (!discussion || !Array.isArray(discussion.comments)) {
      log.warn('[ten-year-wall] unexpected response shape, stopping');
      break;
    }
    for (const c of discussion.comments) {
      const n = normalizeComment(c);
      if (n) out.push(n);
    }
    const info = discussion.pageInfo || {};
    if (!info.hasNextPage || !info.endCursor) break;
    cursor = info.endCursor;
  }
  return out;
}

function buildPayload(messages, status) {
  return JSON.stringify({
    source: 'https://778801.xyz/',
    fetchedAt: new Date().toISOString(),
    status,
    count: messages.length,
    messages,
  });
}

hexo.extend.generator.register('ten-year-wall', async function () {
  const log = hexo.log || console;
  const outPath = 'api/ten-year-messages.json';

  if (process.env.TEN_YEAR_WALL_SKIP === '1') {
    log.info('[ten-year-wall] TEN_YEAR_WALL_SKIP=1, skipping fetch');
    return { path: outPath, data: buildPayload([], 'skipped') };
  }
  if (typeof fetch !== 'function') {
    log.warn('[ten-year-wall] global fetch not available (need Node 18+); skipping');
    return { path: outPath, data: buildPayload([], 'no_fetch') };
  }

  try {
    const messages = await fetchAllMessages(log);
    log.info(`[ten-year-wall] fetched ${messages.length} messages`);
    return { path: outPath, data: buildPayload(messages, 'ok') };
  } catch (err) {
    log.warn(`[ten-year-wall] fetch failed: ${err && err.message}; emitting empty payload`);
    return { path: outPath, data: buildPayload([], 'error') };
  }
});
