/* ==========================================================================
 * 健身打卡 · Fitness Archive
 *
 * 数据来源：/api/fitness.json（由 scripts/fitness-data.js 在构建期生成）
 * 风格：仿站点归档页的列表样式（.list-group）
 *
 *   共计 N 次 · 累计 X 分钟
 *   [2026] [2025] [2024]
 *   ───────
 *   05-09  跑步 · 河边晨跑          35 min
 *          配速 6'10"，心率 155...
 *   05-08  力量 · 胸 + 三头         50 min
 *          ...
 *
 * 数据多的时候按年分档，Tab 切换：一次只渲染当年的，不滚穿屏幕。
 * note 直接展示在条目下方，单行省略，鼠标悬停看完整文本。
 * ========================================================================== */
(function () {
  'use strict';

  var ROOT = document.querySelector('.fit-archive');
  if (!ROOT) return;

  var API = ROOT.getAttribute('data-api') || '/api/fitness.json';
  var $summary = ROOT.querySelector('[data-fit-summary]');
  var $tabs = ROOT.querySelector('[data-fit-tabs]');
  var $list = ROOT.querySelector('[data-fit-list]');

  var STATE = {
    byYear: {},   // { '2026': [...], '2025': [...] }
    years: [],    // ['2026', '2025', ...] 降序
    active: null,
  };

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderSummary(items) {
    var minutes = 0;
    for (var i = 0; i < items.length; i++) {
      if (typeof items[i].duration === 'number') minutes += items[i].duration;
    }
    var text = '共计 ' + items.length + ' 次打卡';
    if (minutes > 0) text += ' · 累计 ' + minutes + ' 分钟';
    $summary.textContent = text;
  }

  function renderTabs() {
    if (STATE.years.length <= 1) {
      $tabs.innerHTML = '';
      $tabs.hidden = true;
      return;
    }
    $tabs.hidden = false;
    var html = STATE.years.map(function (y) {
      var count = STATE.byYear[y].length;
      var active = y === STATE.active ? ' is-active' : '';
      return (
        '<button type="button" class="fit-tab' + active + '" ' +
          'role="tab" aria-selected="' + (y === STATE.active) + '" ' +
          'data-year="' + y + '">' +
          y + '<span class="fit-tab-count">' + count + '</span>' +
        '</button>'
      );
    }).join('');
    $tabs.innerHTML = html;
  }

  function renderYear(year) {
    var items = (STATE.byYear[year] || []).slice().sort(function (a, b) {
      return b.date.localeCompare(a.date);
    });
    if (!items.length) {
      $list.innerHTML =
        '<div class="fit-empty-tip">还没有打卡记录。新建 ' +
        '<code>source/_fitness/YYYY-MM-DD.md</code> 就能记录一次。</div>';
      return;
    }

    // 按月分组，避免一年 300 多条全糊在一起
    var byMonth = {};
    var monthOrder = [];
    items.forEach(function (it) {
      var mm = it.date.slice(5, 7);
      if (!byMonth[mm]) { byMonth[mm] = []; monthOrder.push(mm); }
      byMonth[mm].push(it);
    });

    var html = '';

    // 当年打卡超过 60 条时，加一个月份锚点条，方便跳转
    if (items.length > 60 && monthOrder.length > 1) {
      html += '<div class="fit-months">';
      monthOrder.forEach(function (mm) {
        html += '<a class="fit-month-chip" href="#fit-m-' + year + '-' + mm + '">' +
          Number(mm) + ' 月' +
          '<span class="fit-month-count">' + byMonth[mm].length + '</span>' +
        '</a>';
      });
      html += '</div>';
    }

    monthOrder.forEach(function (mm) {
      html += '<p class="h5" id="fit-m-' + year + '-' + mm + '">' +
        year + ' · ' + Number(mm) + ' 月' +
        '<span class="fit-h5-count">' + byMonth[mm].length + ' 次</span>' +
      '</p>';
      byMonth[mm].forEach(function (it) {
        var mmdd = it.date.slice(5);
        var tag = it.type
          ? '<span class="fit-item-tag">' + escapeHtml(it.type) + '</span>'
          : '';
        var dur = (typeof it.duration === 'number')
          ? '<span class="fit-item-dur">' + it.duration + ' min</span>'
          : '';
        var title = escapeHtml(it.title || it.type || '打卡');
        var note = (it.note && it.note.trim())
          ? '<div class="fit-item-note" title="' +
              escapeHtml(it.note) + '">' + escapeHtml(it.note) + '</div>'
          : '';

        html +=
          '<div class="list-group-item fit-item" data-date="' + escapeHtml(it.date) + '">' +
            '<div class="fit-item-row">' +
              '<time>' + escapeHtml(mmdd) + '</time>' +
              tag +
              '<div class="list-group-item-title fit-item-title">' + title + '</div>' +
              dur +
            '</div>' +
            note +
          '</div>';
      });
    });
    $list.innerHTML = html;
  }

  function activate(year) {
    STATE.active = year;
    renderTabs();
    renderYear(year);
    // 滚动到列表顶部，避免切年后用户困惑
    var top = ROOT.getBoundingClientRect().top + window.pageYOffset - 80;
    if (window.pageYOffset > top + 10) window.scrollTo({ top: top, behavior: 'smooth' });
  }

  function bind() {
    $tabs.addEventListener('click', function (e) {
      var tab = e.target.closest('.fit-tab');
      if (!tab) return;
      var year = tab.getAttribute('data-year');
      if (year && year !== STATE.active) activate(year);
    });
  }

  function load() {
    var url = API + (API.indexOf('?') >= 0 ? '&' : '?') + 't=' + Date.now();
    fetch(url, { credentials: 'omit' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        var items = (data && Array.isArray(data.items)) ? data.items : [];
        renderSummary(items);

        // 按年分桶
        items.forEach(function (it) {
          var y = it.date.slice(0, 4);
          if (!STATE.byYear[y]) STATE.byYear[y] = [];
          STATE.byYear[y].push(it);
        });
        STATE.years = Object.keys(STATE.byYear).sort(function (a, b) {
          return b.localeCompare(a);
        });
        STATE.active = STATE.years[0] || null;

        if (!STATE.active) {
          $tabs.hidden = true;
          $list.innerHTML =
            '<div class="fit-empty-tip">还没有打卡记录。新建 ' +
            '<code>source/_fitness/YYYY-MM-DD.md</code> 就能记录一次。</div>';
          return;
        }
        renderTabs();
        renderYear(STATE.active);
        bind();
      })
      .catch(function (err) {
        $summary.textContent = '加载失败：' + err.message;
      });
  }

  load();
})();
