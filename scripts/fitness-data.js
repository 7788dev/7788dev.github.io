/**
 * 健身打卡 · 构建期数据生成
 * -----------------------------------------------------------------
 * 在 hexo generate 时扫描 source/_fitness/ 目录下所有 markdown 文件，
 * 每个文件代表一次打卡记录：
 *   - 文件名必须为 YYYY-MM-DD.md（日期即主键）
 *   - 可选 front-matter：type（项目）、duration（时长/分钟）、title（副标题）
 *   - 正文为当天的随笔/心得
 *
 * 结果写入 public/api/fitness.json：
 *   {
 *     generatedAt: ISOString,
 *     count: N,
 *     items: [ { date, type, duration, title, note }, ... ]
 *   }
 *
 * 下划线开头的目录会被 hexo 默认跳过渲染，不会作为独立文章页生成。
 */
'use strict';

const fs = require('fs');
const path = require('path');

function parseFrontMatter(content) {
  const m = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: content.trim() };
  const raw = m[1];
  const body = (m[2] || '').trim();
  const meta = {};
  raw.split(/\r?\n/).forEach(function (line) {
    const mm = line.match(/^\s*([A-Za-z0-9_-]+)\s*:\s*(.*)\s*$/);
    if (!mm) return;
    let v = mm[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    meta[mm[1]] = v;
  });
  return { meta, body };
}

function collect(log, baseDir) {
  const absDir = path.join(baseDir, 'source', '_fitness');
  if (!fs.existsSync(absDir)) {
    log.info('[fitness] source/_fitness/ not found, emitting empty list');
    return [];
  }
  const files = fs.readdirSync(absDir).filter(function (f) {
    return /\.md$/i.test(f) && !/^readme\.md$/i.test(f);
  });
  const out = [];
  for (const f of files) {
    const name = f.replace(/\.md$/i, '');
    const dm = name.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!dm) {
      log.warn('[fitness] skip ' + f + ': filename must be YYYY-MM-DD.md');
      continue;
    }
    const date = dm[1] + '-' + dm[2] + '-' + dm[3];
    const full = path.join(absDir, f);
    let content = '';
    try {
      content = fs.readFileSync(full, 'utf8');
    } catch (err) {
      log.warn('[fitness] read failed ' + f + ': ' + err.message);
      continue;
    }
    const parsed = parseFrontMatter(content);
    const meta = parsed.meta || {};
    const duration =
      meta.duration && !isNaN(Number(meta.duration))
        ? Number(meta.duration)
        : null;
    out.push({
      date: date,
      type: meta.type || '',
      title: meta.title || '',
      duration: duration,
      note: parsed.body || '',
    });
  }
  out.sort(function (a, b) {
    return a.date.localeCompare(b.date);
  });
  return out;
}

hexo.extend.generator.register('fitness-data', function () {
  const log = hexo.log || console;
  const outPath = 'api/fitness.json';
  const items = collect(log, hexo.base_dir);
  log.info('[fitness] collected ' + items.length + ' check-in(s)');
  const payload = {
    generatedAt: new Date().toISOString(),
    count: items.length,
    items: items,
  };
  return { path: outPath, data: JSON.stringify(payload) };
});
