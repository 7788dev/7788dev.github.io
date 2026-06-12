/**
 * 修复 Fluid 主题 og:image / twitter:image 被站级默认覆盖的问题
 * -----------------------------------------------------------------
 * 上游 layout/_partials/head.ejs 里用：
 *   Object.assign({ image: pageImage }, theme.open_graph)
 * 导致 theme.open_graph.image（_config.fluid.yml 里的兜底图）永远覆盖
 * page.og_img / page.index_img。
 *
 * 这里不改主题源文件（pnpm/node_modules 升级时会丢），改为构建期
 * 在 HTML 渲染完成后扫一遍：如果该页面声明了 og_img 或 index_img，
 * 就把产物里的 og:image / twitter:image 替换成页面级的值。
 *
 * 正则需同时兼容：
 *   - 带双引号：<meta property="og:image" content="...">
 *   - 带单引号：<meta property='og:image' content='...'>
 *   - 被 minify 去引号：<meta property=og:image content=...>
 * 三种形态，属性顺序任意。
 */
'use strict';

const urlMod = require('url');

function absolutize(siteUrl, p) {
  if (!p) return '';
  if (/^https?:\/\//i.test(p)) return p;
  try {
    return new urlMod.URL(p, siteUrl).toString();
  } catch (_) {
    return siteUrl.replace(/\/$/, '') + '/' + String(p).replace(/^\//, '');
  }
}

function escapeAttr(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// 匹配任意属性值：带双/单引号或无引号，返回捕获组
const ATTR_VALUE = '(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))';

/**
 * 替换某个 meta 标签里 content 的值
 * @param {string} html
 * @param {string} propAttr  例如 'property'
 * @param {string} propValue 例如 'og:image'
 * @param {string} newContent 新的 content 值
 */
function replaceMetaContent(html, propAttr, propValue, newContent) {
  // 两种属性顺序都要覆盖：property 在前 或 content 在前
  const reForward = new RegExp(
    '<meta\\s+' + propAttr + '\\s*=\\s*["\']?' + propValue.replace(/[:\/]/g, m => '\\' + m) + '["\']?\\s+' +
    'content\\s*=\\s*' + ATTR_VALUE + '\\s*/?>',
    'gi'
  );
  const reBackward = new RegExp(
    '<meta\\s+content\\s*=\\s*' + ATTR_VALUE + '\\s+' +
    propAttr + '\\s*=\\s*["\']?' + propValue.replace(/[:\/]/g, m => '\\' + m) + '["\']?\\s*/?>',
    'gi'
  );

  const replaced = '<meta ' + propAttr + '="' + propValue + '" content="' + escapeAttr(newContent) + '">';
  return html.replace(reForward, replaced).replace(reBackward, replaced);
}

hexo.extend.filter.register('after_render:html', function (str, data) {
  const page = data && data.page;
  if (!page) return str;
  const target = page.og_img || page.index_img;
  if (!target) return str;

  const siteUrl = (hexo.config && hexo.config.url) || '';
  const absolute = absolutize(siteUrl, target);

  str = replaceMetaContent(str, 'property', 'og:image', absolute);
  str = replaceMetaContent(str, 'name', 'twitter:image', absolute);

  return str;
});
