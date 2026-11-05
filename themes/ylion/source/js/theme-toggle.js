;(function () {
  var root = document.documentElement;
  var KEY = 'ylion-theme';
  var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function isDark () {
    return root.getAttribute('data-theme') === 'dark';
  }

  function updateMeta () {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark() ? '#0B0F14' : '#F5F7FB');
  }

  function apply (dark, persist) {
    if (dark) {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
    if (persist) {
      try {
        window.localStorage.setItem(KEY, dark ? 'dark' : 'light');
      } catch (e) {}
    }
    updateMeta();
  }

  function bind () {
    var button = document.querySelector('#theme-toggle button');
    if (!button) return;
    button.addEventListener('click', function () {
      apply(!isDark(), true);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }

  if (media) {
    var onChange = function (event) {
      var stored = null;
      try {
        stored = window.localStorage.getItem(KEY);
      } catch (e) {}
      if (!stored) apply(event.matches, false);
    };
    if (media.addEventListener) {
      media.addEventListener('change', onChange);
    } else if (media.addListener) {
      media.addListener(onChange);
    }
  }

  updateMeta();
})();