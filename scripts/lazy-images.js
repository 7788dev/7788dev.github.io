/**
 * 给文章中的 <img> 标签自动添加 loading="lazy" 和 decoding="async"
 * 提升页面加载性能（浏览器原生懒加载）
 */
'use strict';

hexo.extend.filter.register('after_render:html', function (str) {
  // 只处理包含 <img 的页面
  if (!str || str.indexOf('<img') === -1) return str;

  // 匹配没有 loading 属性的 img 标签，添加 loading="lazy" decoding="async"
  return str.replace(
    /<img(?![^>]*\bloading\b)([^>]*?)(\s*\/?>)/gi,
    '<img loading="lazy" decoding="async"$1$2'
  );
});
