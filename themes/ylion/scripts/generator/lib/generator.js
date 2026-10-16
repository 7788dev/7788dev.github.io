var ejs = require('ejs');
var pathFn = require('path');
var fs = require('fs');

function cdata(str){
  return str ? '<![CDATA[' + str + ']]>' : '';
}

// Hexo 把 source/ 下的 .css/.js 等静态资源也登记为 Page（layout 置为 false），
// 全文塞进 search.xml 后前端因 title 为空永远匹配不到，属于纯下载负担。
function searchable(page){
  return String(page.layout) !== 'false';
}

var searchTmplSrc = pathFn.join(__dirname, '../../../_neededFile/search.ejs');
var searchTmpl = ejs.compile(fs.readFileSync(searchTmplSrc, 'utf8'));

module.exports = function(locals){
  var config = this.config;
  var searchConfig = config.search;
  var template = searchTmpl;
  var searchfield = searchConfig.field;

  var posts, pages;

  if(searchfield.trim() != ''){
    searchfield = searchfield.trim();
    if(searchfield == 'post'){
      posts = locals.posts.sort('-date');
    }else if(searchfield == 'page'){
      pages = locals.pages.filter(searchable);
    }else{
      posts = locals.posts.sort('-date');
      pages = locals.pages.filter(searchable);
    }
  }else{
    posts = locals.posts.sort('-date');
  }

  var xml = template({
    config: config,
    posts: posts,
    pages: pages,
    feed_url: config.root + searchConfig.path,
    cdata: cdata
  });

  return {
    path: searchConfig.path,
    data: xml
  };
};