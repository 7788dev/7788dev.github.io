var _ajax = {
    websiteSearch: function (path, extra) {
        'use strict';
        var input = document.getElementById('search-input');
        var resultBox = document.getElementById('search-result');
        var overlay = document.getElementById('search-overlay');
        if (!input || !resultBox) return;

        var emptyText = (overlay && overlay.getAttribute('data-empty')) || 'No posts found.';
        var errorText = (overlay && overlay.getAttribute('data-error')) || 'Failed to load the search index.';

        function escapeHtml(value) {
            return String(value == null ? '' : value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function escapeRegExp(value) {
            return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        function plainText(value) {
            return String(value || '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }

        function highlight(text, keywords) {
            var safe = escapeHtml(text);
            keywords.forEach(function (keyword) {
                var pattern = new RegExp('(' + escapeRegExp(escapeHtml(keyword)) + ')', 'gi');
                safe = safe.replace(pattern, '<strong class="search-keyword">$1</strong>');
            });
            return safe;
        }

        function render() {
            var raw = input.value.trim();
            resultBox.innerHTML = '';
            if (!raw || !extra.data.length) return;

            var keywords = raw.toLowerCase().split(/[\s\-]+/).filter(function (keyword) {
                return keyword.length > 0;
            });
            if (!keywords.length) return;

            var html = '';
            extra.data.forEach(function (data) {
                var isMatch = keywords.every(function (keyword) {
                    return data.titleLower.indexOf(keyword) !== -1 ||
                        data.searchText.indexOf(keyword) !== -1;
                });
                if (!isMatch) return;

                var firstOccur = -1;
                keywords.forEach(function (keyword) {
                    var index = data.contentLower.indexOf(keyword);
                    if (index !== -1 && (firstOccur === -1 || index < firstOccur)) {
                        firstOccur = index;
                    }
                });

                var snippet = '';
                if (firstOccur !== -1) {
                    var start = Math.max(0, firstOccur - 30);
                    var end = Math.min(data.content.length, firstOccur + 110);
                    snippet = highlight(data.content.slice(start, end), keywords);
                    if (start > 0) snippet = '...' + snippet;
                    if (end < data.content.length) snippet += '...';
                }

                html += "<li class='search-item'><a href='" + escapeHtml(data.url) + "'>" +
                    "<h3 class='search-result-title'>" + highlight(data.title, keywords) + "</h3>";
                if (snippet) {
                    html += "<p class='search-result-items'>" + snippet + "</p>";
                }
                html += "</a></li>";
            });

            resultBox.innerHTML = html ||
                "<li class='search-empty'>" + escapeHtml(emptyText) + "</li>";
        }

        function bindInput() {
            if (extra.bound) return;
            extra.bound = true;
            input.addEventListener('input', render);
        }

        function fill(xmlResponse) {
            var entries = xmlResponse.getElementsByTagName('entry');
            var datas = [];
            for (var i = 0; i < entries.length; i++) {
                var entry = entries[i];
                var titleNode = entry.getElementsByTagName('title')[0];
                var contentNode = entry.getElementsByTagName('content')[0];
                var urlNode = entry.getElementsByTagName('url')[0];
                var categoriesNode = entry.getElementsByTagName('categories')[0];
                var tagsNode = entry.getElementsByTagName('tags')[0];
                var title = titleNode ? titleNode.textContent.trim() : '';
                var content = contentNode ? plainText(contentNode.textContent) : '';
                if (!title || !content) continue;
                var categories = categoriesNode ? plainText(categoriesNode.textContent) : '';
                var tags = tagsNode ? plainText(tagsNode.textContent) : '';
                datas.push({
                    title: title,
                    titleLower: title.toLowerCase(),
                    content: content,
                    contentLower: content.toLowerCase(),
                    searchText: (categories + ' ' + tags + ' ' + content).toLowerCase(),
                    url: urlNode ? urlNode.textContent.trim() : ''
                });
            }
            extra.data = datas;
            extra.flag = true;
            extra.loading = false;
            bindInput();
            render();
        }

        if (extra.flag) {
            bindInput();
            render();
            return;
        }
        if (extra.loading) return;
        extra.loading = true;

        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;
            if (xhr.status === 200 && xhr.responseXML) {
                fill(xhr.responseXML);
            } else {
                extra.loading = false;
                resultBox.innerHTML = "<li class='search-empty'>" + escapeHtml(errorText) + "</li>";
            }
        };
        xhr.open('GET', path, true);
        xhr.send();
    },
    init: function () {
        return _ajax.websiteSearch;
    }
};
