/**
 * Bing 每日一图 · Banner 动态替换
 * -------------------------------------------------
 * 用 CORS 友好的第三方聚合 API 拉取当天 Bing 首页壁纸 URL，
 * 成功后替换 #banner 的 background-image；若网络或接口异常，
 * 保留 _config.fluid.yml 里配置的本地 default.png 作为兜底。
 */
(function () {
  'use strict';

  var PRIMARY_API = 'https://bing.biturl.top/?resolution=1920&format=json&index=0&mkt=zh-CN';
  var FALLBACK_IMG = 'https://bing.img.run/1920x1080.php';
  var STORAGE_KEY = 'bing-banner-cache-v2';
  // 每天切换图片的本地时刻（0-23）。早于这个时刻视为“上一天”的图。
  var ROLLOVER_HOUR = 7;

  // 返回当前所处“Bing 日”的键；在 ROLLOVER_HOUR 之前算作前一天。
  function currentDayKey() {
    var now = new Date();
    if (now.getHours() < ROLLOVER_HOUR) {
      now.setDate(now.getDate() - 1);
    }
    return now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();
  }

  function setBanner(url) {
    var banner = document.getElementById('banner');
    if (!banner || !url) return;
    var preload = new Image();
    preload.onload = function () {
      banner.style.backgroundImage = "url('" + url + "')";
    };
    preload.onerror = function () {
      if (url !== FALLBACK_IMG) setBanner(FALLBACK_IMG);
    };
    preload.src = url;
  }

  function readCache() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || !obj.url || obj.day !== currentDayKey()) return null;
      return obj.url;
    } catch (e) {
      return null;
    }
  }

  function writeCache(url) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ url: url, day: currentDayKey() }));
    } catch (e) { /* ignore */ }
  }

  function fetchBing() {
    if (!('fetch' in window)) {
      setBanner(FALLBACK_IMG);
      return;
    }
    fetch(PRIMARY_API, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.url) {
          setBanner(data.url);
          writeCache(data.url);
        } else {
          setBanner(FALLBACK_IMG);
        }
      })
      .catch(function () { setBanner(FALLBACK_IMG); });
  }

  function init() {
    var cached = readCache();
    if (cached) {
      setBanner(cached);
      return;
    }
    fetchBing();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
