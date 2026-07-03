/**
 * 春节灯笼
 * -------------------------------------------------
 * 每年自动在「除夕前 1 天 ~ 正月十五」期间挂载 4 只「新年快乐」灯笼，
 * 时段之外完全不执行（不挂 DOM、不注入 CSS），对性能无影响。
 *
 * 原版思路 © 张苹果博客 https://zhangpingguo.com/
 * 改动：
 *   1. 内置 2026-2050 年春节公历日期表，自动判断当年窗口
 *   2. 移除 document.currentScript 依赖（hexo 静态注入场景不适用）
 *   3. 合并到独立文件，按需加载
 */
(function () {
  'use strict';

  // 文案：4 个字一盏灯笼
  var LANTERN_TEXT = '新年快乐';

  // 2026-2099 年春节公历日期（YYYY: 'MM-DD'）
  // 数据来源：紫金山天文台／香港天文台公布的农历转公历对照
  var SPRING_FESTIVAL = {
    2026: '02-17', 2027: '02-06', 2028: '01-26', 2029: '02-13',
    2030: '02-03', 2031: '01-23', 2032: '02-11', 2033: '01-31',
    2034: '02-19', 2035: '02-08', 2036: '01-28', 2037: '02-15',
    2038: '02-04', 2039: '01-24', 2040: '02-12', 2041: '02-01',
    2042: '01-22', 2043: '02-10', 2044: '01-30', 2045: '02-17',
    2046: '02-06', 2047: '01-26', 2048: '02-14', 2049: '02-02',
    2050: '01-23', 2051: '02-11', 2052: '02-01', 2053: '02-19',
    2054: '02-08', 2055: '01-28', 2056: '02-15', 2057: '02-04',
    2058: '01-24', 2059: '02-12', 2060: '02-02', 2061: '01-21',
    2062: '02-09', 2063: '01-29', 2064: '02-17', 2065: '02-05',
    2066: '01-26', 2067: '02-14', 2068: '02-03', 2069: '01-23',
    2070: '02-11', 2071: '01-31', 2072: '02-19', 2073: '02-07',
    2074: '01-27', 2075: '02-15', 2076: '02-05', 2077: '01-24',
    2078: '02-12', 2079: '02-02', 2080: '01-22', 2081: '02-09',
    2082: '01-29', 2083: '02-17', 2084: '02-06', 2085: '01-26',
    2086: '02-14', 2087: '02-03', 2088: '01-24', 2089: '02-10',
    2090: '01-30', 2091: '02-18', 2092: '02-07', 2093: '01-27',
    2094: '02-15', 2095: '02-05', 2096: '01-25', 2097: '02-12',
    2098: '02-01', 2099: '01-21'
  };

  /**
   * 返回指定年份的灯笼展示窗口：
   *   [ 除夕前 1 天 00:00, 正月十五 23:59 ]
   */
  function getLanternWindow(year) {
    var mmdd = SPRING_FESTIVAL[year];
    if (!mmdd) return null;
    var parts = mmdd.split('-');
    var spring = new Date(year, parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
    var start = new Date(spring); start.setDate(start.getDate() - 1);   // 除夕前一天
    start.setHours(0, 0, 0, 0);
    var end = new Date(spring);   end.setDate(end.getDate() + 14);      // 正月十五（元宵）
    end.setHours(23, 59, 59, 999);
    return { start: start, end: end };
  }

  function shouldShow() {
    var now = new Date();
    var win = getLanternWindow(now.getFullYear());
    if (!win) return false;
    return now >= win.start && now <= win.end;
  }

  // 当前不在春节窗口：直接退出，0 副作用
  if (!shouldShow()) return;

  // ---- 注入 CSS ----
  function addStyles() {
    if (document.getElementById('deng-style')) return;
    var style = document.createElement('style');
    style.id = 'deng-style';
    style.textContent = [
      '.deng-container{position:relative;top:10px;opacity:.9;z-index:9999;pointer-events:none;}',
      '.deng-box{position:fixed;right:10px;}',
      '.deng-box1{position:fixed;top:64px;left:20px;}',
      '.deng-box2{position:fixed;top:58px;left:130px;}',
      '.deng-box3{position:fixed;top:58px;right:130px;}',
      '.deng-box4{position:fixed;top:64px;right:20px;}',
      '.deng{position:relative;width:120px;height:90px;background:rgba(216,0,15,.8);border-radius:50% 50%;animation:deng-swing 3s infinite ease-in-out;box-shadow:-5px 5px 50px 4px #fa6c00;}',
      '.deng-a{width:100px;height:90px;background:rgba(216,0,15,.1);border-radius:50%;border:2px solid #dc8f03;margin-left:7px;display:flex;justify-content:center;}',
      '.deng-b{width:65px;height:83px;background:rgba(216,0,15,.1);border-radius:60%;border:2px solid #dc8f03;}',
      '.xian{position:absolute;top:-20px;left:60px;width:2px;height:20px;background:#dc8f03;}',
      '.shui-a{position:relative;width:5px;height:20px;margin:-5px 0 0 59px;animation:deng-swing 4s infinite ease-in-out;transform-origin:50% -45px;background:orange;border-radius:0 0 5px 5px;}',
      '.shui-b{position:absolute;top:14px;left:-2px;width:10px;height:10px;background:#dc8f03;border-radius:50%;}',
      '.shui-c{position:absolute;top:18px;left:-2px;width:10px;height:35px;background:orange;border-radius:0 0 0 5px;}',
      '.deng:before,.deng:after{content:" ";display:block;position:absolute;border-radius:5px;border:solid 1px #dc8f03;background:linear-gradient(to right,#dc8f03,orange,#dc8f03,orange,#dc8f03);}',
      '.deng:before{top:-7px;left:29px;height:12px;width:60px;z-index:999;}',
      '.deng:after{bottom:-7px;left:10px;height:12px;width:60px;margin-left:20px;}',
      '.deng-t{font-family:"华文行楷",Arial,Lucida Grande,Tahoma,sans-serif;font-size:3.2rem;color:#dc8f03;font-weight:700;line-height:85px;text-align:center;}',
      '@media (max-width:768px){',
        '.deng-t{font-size:2.2rem;}',
        '.deng-box{transform:scale(.55);}',
        '.deng-box1{top:48px;left:-20px;}',
        '.deng-box2{top:48px;left:40px;}',
        '.deng-box3{top:48px;right:40px;}',
        '.deng-box4{top:48px;right:-20px;}',
      '}',
      '@keyframes deng-swing{0%{transform:rotate(-10deg);}50%{transform:rotate(10deg);}100%{transform:rotate(-10deg);}}',
      '@media (prefers-reduced-motion:reduce){.deng,.shui-a{animation:none !important;}}'
    ].join('');
    document.head.appendChild(style);
  }

  // ---- 挂 4 盏灯笼 ----
  function createDengContainer() {
    if (document.querySelector('.deng-container')) return;
    var container = document.createElement('div');
    container.className = 'deng-container';
    container.setAttribute('aria-hidden', 'true');

    var chars = LANTERN_TEXT.split('');
    chars.forEach(function (text, i) {
      var box = document.createElement('div');
      box.className = 'deng-box deng-box' + (i + 1);

      var deng = document.createElement('div');
      deng.className = 'deng';

      var xian = document.createElement('div');
      xian.className = 'xian';

      var a = document.createElement('div'); a.className = 'deng-a';
      var b = document.createElement('div'); b.className = 'deng-b';
      var t = document.createElement('div'); t.className = 'deng-t';
      t.textContent = text;
      b.appendChild(t);
      a.appendChild(b);
      deng.appendChild(xian);
      deng.appendChild(a);

      var shuiA = document.createElement('div'); shuiA.className = 'shui shui-a';
      var shuiC = document.createElement('div'); shuiC.className = 'shui-c';
      var shuiB = document.createElement('div'); shuiB.className = 'shui-b';
      shuiA.appendChild(shuiC);
      shuiA.appendChild(shuiB);
      deng.appendChild(shuiA);

      box.appendChild(deng);
      container.appendChild(box);
    });

    document.body.appendChild(container);
  }

  function init() {
    addStyles();
    createDengContainer();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
