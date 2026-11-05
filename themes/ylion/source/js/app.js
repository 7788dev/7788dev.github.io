;(function () {
  document.body.insertAdjacentHTML("beforeend", "<div id=\"loading\"><i class=\"load-info\"></i></div>");
  document.addEventListener("readystatechange", function () {
    if (document.readyState === "complete") {
      var $load = document.getElementById("loading");
      document.body.removeChild($load);
    }
  });
})();

window.onload = function () {
  var $main = document.getElementById("main"),
    $container = document.getElementById("container"),
    $totop = document.querySelector("#tools .totop-btn"),
    $processDiv = document.getElementById("process"),
    $body = document.body,
    scrollTimer = null,
    hashTimer = null,
    $postExpWrap = document.querySelector("ul#main"),
    $searchBtn = document.getElementById("search"),
    $searchOverlay = document.getElementById("search-overlay"),
    $searchClose = document.querySelector(".search-close"),
    $toolButtons = document.querySelectorAll("#tools li[role='button']"),
    $tocBtn = document.querySelector("#tools .toc-btn"),
    $tocWrap = document.querySelector(".toc"),
    $searchInput = document.getElementById("search-input"),
    $header = document.getElementsByTagName("header")[0],
    $post = document.getElementById("post"),
    $postBody = document.getElementById("post-body"),
    $aboutBody = document.getElementById("about"),
    $highSongBtn = document.querySelector(".high-song"),
    $donateBtn = document.querySelector(".donate"),
    $donateWrap = document.getElementById("donate-wrap"),
    $commentsCounter = document.getElementById("comments-count"),
    $ajaxImgs = document.querySelectorAll(".img-ajax"),
    $postList = document.getElementById("post-list"),
    $postFooter = document.getElementById("post-footer"),
    $exchangeBtn = document.querySelector("#tools .exchange-btn"),
    $prompt = document.querySelector("#error .prompt input"),
    $terminal = document.querySelector("#error .terminal"),
    $terminalRun = document.querySelector("#error .terminal-run"),
    $urlPlaceHolders = document.querySelectorAll(".error-url"),
    $datePlaceHolders = document.querySelectorAll(".error-date"),
    $hostPlaceHolders = document.querySelectorAll(".error-host"),
    $gitcomment = document.getElementById("gitcomment"),
    _originalTableWidth = [];
  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  //responsive design
  var isPC = true;
  (function (designPercent) {
    function params (u, p) {
      var m = new RegExp("(?:&|/?)" + p + "=([^&$]+)").exec(u);
      return m ? m[1] : "";
    }

    if (/iphone|ios|android|ipod/i.test(navigator.userAgent.toLowerCase()) ==
      true && params(location.search, "from") != "mobile") {
      $header.style.position = "relative";
      var mainWidth = document.body.clientWidth;
      var fontSize = mainWidth / designPercent + "px";
      document.documentElement.style.fontSize = fontSize;
      window.onresize = function () {
        var mainWidth = document.body.clientWidth;
        fontSize = mainWidth / designPercent + "px";
        document.documentElement.style.fontSize = fontSize;

      };
      isPC = false;
    }
    else {
      document.documentElement.style.fontSize = "610%";
      fixPostFooterStyle();
      window.onresize = function () {
        fixPostFooterStyle();
        handleLongTable();
      };
    }
  })(450 / 100);
  function fixPostFooterStyle () {
    if ($postFooter) {
      if (parseInt(window.getComputedStyle($postFooter).width, 10) <= 880) {
        $postFooter.classList.add("short-footer");
      } else {
        $postFooter.classList.remove("short-footer");
      }
    }

  }

  var clickTimes = 0;
  $exchangeBtn && $exchangeBtn.addEventListener("click", function () {
    if (clickTimes % 2 === 0) {
      $container.classList.add("exchange-sidebar");
    } else {
      $container.classList.remove("exchange-sidebar");
    }
    clickTimes++;
  }, false);
  autoFocus();
  function autoFocus () {
    if ($prompt) {
      $prompt.focus();
    }
  }

  function generateFormattedDate (now) {
    var year = now.getFullYear(),
      month = now.getMonth() + 1,
      date = now.getDate(),
      hour = now.getHours(),
      minute = now.getMinutes(),
      second = now.getSeconds(),
      formattedDate = "--" + year + "-" + month + "-" + date + " " +
        (hour < 10 ? "0" : "") + hour +
        ":" + (minute < 10 ? "0" : "") + minute + ":" +
        (second < 10 ? "0" : "") + second + "--";
    return formattedDate;
  }

  (function () {
    if ($prompt) {
      $urlPlaceHolders[0].innerHTML = window.location.href;
      $urlPlaceHolders[1].innerHTML = window.location.href;
      $hostPlaceHolders[0].innerHTML = window.location.origin;
      $hostPlaceHolders[1].innerHTML = window.location.origin;
      var now = new Date();
      $datePlaceHolders[0].innerHTML = generateFormattedDate(now);
      now.setSeconds(now.getSeconds() + Math.floor(Math.random() * 20) + 1);
      $datePlaceHolders[1].innerHTML = generateFormattedDate(now);
      $terminalRun.classList.add("show");
    }
  })();
  $terminal && $terminal.addEventListener("click", function () {
    autoFocus();
  });
  $prompt && $prompt.addEventListener("keypress", function (event) {
    if (event.keyCode === 13) {
      var clickEvent = document.createEvent("HTMLEvents");
      var inputEvent = document.createEvent("HTMLEvents");
      clickEvent.initEvent("click", false, true);
      inputEvent.initEvent("input", false, true);
      $searchBtn.dispatchEvent(clickEvent);
      $searchInput.value = $prompt.value.trim();
      document.getElementById("search-input").dispatchEvent(inputEvent);
    }
  });
  //classList ployfill
  if (!("classList" in document.documentElement) && Object.defineProperty &&
    typeof HTMLElement !== "undefined") {
    Object.defineProperty(HTMLElement.prototype, "classList", {
      get: function () {
        var self = this;

        function update (fn) {
          return function (value) {
            var classes = self.className.split(/\s+/),
              index = classes.indexOf(value);
            fn(classes, index, value);
            self.className = classes.join(" ");
          };
        }

        var ret = {
          add: update(function (classes, index, value) {
            ~index || classes.push(value);
          }),

          remove: update(function (classes, index) {
            ~index && classes.splice(index, 1);
          }),

          toggle: update(function (classes, index, value) {
            ~index ? classes.splice(index, 1) : classes.push(value);
          }),

          contains: function (value) {
            return !!~self.className.split(/\s+/).indexOf(value);
          },

          item: function (i) {
            return self.className.split(/\s+/)[i] || null;
          }
        };

        Object.defineProperty(ret, "length", {
          get: function () {
            return self.className.split(/\s+/).length;
          }
        });

        return ret;
      }
    });
  }
  function getScrollTop () {
    return ($body.scrollTop || document.documentElement.scrollTop);
  }

  /*append copyright func*/

  if (Boolean(copyrightObj.enable)) {
    function appendCopyright (arg, triggerLength) {
      var selectionObj = window.getSelection();
      if (selectionObj.toString().length <=
        (parseInt(triggerLength) || 20)) {
        return selectionObj;
      }
      var $body = document.body,
        pageLink = "<br/><br/>url：" + window.location.href,
        copyrightText = selectionObj + pageLink +
          "<br/>" + arg,
        tempDiv = document.createElement("div");
      tempDiv.style.display = "absolute";
      tempDiv.style.left = "-99999px";
      $body.appendChild(tempDiv);
      tempDiv.innerHTML = copyrightText;
      selectionObj.selectAllChildren(tempDiv);
      setTimeout(function () {
        $body.removeChild(tempDiv);
      }, 500);
    }

    $main && $main.addEventListener("copy", function () {
      appendCopyright(copyrightObj.appendText, copyrightObj.triggerCopyLength);
    });
  }
  /*animation to targetEle*/
  if ($totop) {
    $totop.onclick = function () {
      if (reduceMotion) window.scrollTo(0, 0);
      else scrollTo(0, 600);
    };
  }

  function loadLazyImage ($this) {
    var src = $this.getAttribute("data-src");
    if (!src) return;
    if ($this.nodeName.toLowerCase() === "img") {
      $this.src = src;
      $this.style.display = "block";
    } else {
      var imgObj = new Image();
      imgObj.onload = function () {
        $this.style.backgroundImage = "url(\"" + src + "\")";
        $this.classList.add("img-loaded");
        var $loading = $this.querySelector(".loading-img");
        if ($loading && $loading.parentNode) {
          $loading.parentNode.removeChild($loading);
        }
      };
      imgObj.src = src;
    }
    $this.removeAttribute("data-src");
  }

  //imgs ajax fallback for browsers without IntersectionObserver
  function imgsAjax ($targetEles) {
    if (!$targetEles) return;
    var scrollBottom = getScrollTop() + window.innerHeight;
    Array.prototype.forEach.call($targetEles, function ($this) {
      if (!$this.getAttribute("data-src")) return;
      //fix offset bug...
      var $thisOffset = $this.getBoundingClientRect().top +
        window.pageYOffset - document.documentElement.clientTop;
      if (scrollBottom >= $thisOffset) loadLazyImage($this);
    });
  }

  var lazyObserver = null;
  if ("IntersectionObserver" in window && $ajaxImgs.length) {
    lazyObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        loadLazyImage(entry.target);
      });
    }, {rootMargin: "200px 0px"});
    Array.prototype.forEach.call($ajaxImgs, function ($img) {
      lazyObserver.observe($img);
    });
  }

  var scrollCallback = function () {
    var scrollTop = getScrollTop();
    //totop
    if ($totop) {
      $totop.style.display = scrollTop > 260 ? "block" : "none";
    }
    //header
    //getComputedStyle() fix 'fixed' style bug
    if (window.getComputedStyle($header).position === "fixed") {
      if (scrollTop > 0) {
        $header.classList.add("fixed");
      } else {
        $header.classList.remove("fixed");
      }
    }

    //rate of progress
    var scrollable = $body.scrollHeight - window.innerHeight;
    if ($processDiv) {
      $processDiv.style.width = (scrollable > 0 ? scrollTop / scrollable * 100 : 0) + "%";
    }
    //imgs ajax (only needed without IntersectionObserver)
    if (!lazyObserver) {
      imgsAjax($ajaxImgs);
    }
  };
  scrollCallback();
  window.addEventListener("scroll", function () {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function () {
      scrollCallback();
    }, 100);
  });
  /*hash click*/
  function scrollTo (to, duration) {
    if (getScrollTop() == to) return;
    var diff = to - getScrollTop();
    var scrollStep = Math.PI / (duration / 10);
    var count = 0, currPos;
    var start = getScrollTop();
    var scrollInterval = setInterval(function () {
      if (getScrollTop() != to) {
        count = count + 1;
        currPos = start + diff * (0.5 - 0.5 * Math.cos(count * scrollStep));
        if ($body.scrollTop) {
          $body.scrollTop = currPos;
        } else {
          document.documentElement.scrollTop = currPos;
        }
      }
      else {
        clearInterval(scrollInterval);
      }
    }, 10);
  }

  function toHash (e) {
    var _that = e.target;
    var targetTag = _that.tagName.toLowerCase();
    if (targetTag === "h1" || targetTag === "h2" || targetTag === "h3" ||
      targetTag === "h4" || targetTag === "h5" || targetTag === "h6") {
      // scrollTo(_that.offsetTop, 200);
      clearTimeout(hashTimer);
      hashTimer = setTimeout(function () {
        var hash = window.location.hash;
        var result = null;
        if (hash === "") {
          result = window.location.href += "#" + _that.id;
        } else {
          result = window.location.href.replace(hash, "#" + _that.id);
        }
        window.location.href = result;
      }, 100);
    }
  }

  $postBody && $postBody.addEventListener("click", function (e) {
    toHash(e);
  });
  $aboutBody && $aboutBody.addEventListener("click", function (e) {
    toHash(e);
  });
  // click fake links
  function clickLink (e, bounce) {
    //let real links keep native behaviour (middle-click, new tab, modifiers)
    if (e.target.closest && e.target.closest("a")) return;
    var selection = window.getSelection && window.getSelection();
    if (selection && String(selection).trim().length) return;
    e.preventDefault();
    var $listenEle = e.target;
    while ($listenEle !== this && $listenEle.tagName.toLowerCase() !== "li") {
      $listenEle = $listenEle.parentNode;
    }
    if ($listenEle !== this) {
      if (bounce) $listenEle.classList.add("bounce");
      $body.style.opacity = "0.5";
      var href = $listenEle.getAttribute("data-href");
      if (href) {
        window.location.href = href;
      }
    }

  }

  $postList && $postList.addEventListener("click", function (e) {
    clickLink(e, true);
  }, false);
  $postExpWrap && $postExpWrap.addEventListener("click", function (e) {
    clickLink(e, false);
  }, false);
  /*search function*/
  var extra = {flag: false, data: []};
  function openSearch () {
    if (!$searchOverlay) return;
    $searchOverlay.classList.add("show");
    $searchOverlay.setAttribute("aria-hidden", "false");
    $body.classList.add("search-open");
    if (typeof search !== "undefined" && search.func) {
      search.func(search.path, extra);
    }
    if ($searchInput) $searchInput.focus();
  }
  function closeSearch () {
    if (!$searchOverlay) return;
    $searchOverlay.classList.remove("show");
    $searchOverlay.setAttribute("aria-hidden", "true");
    $body.classList.remove("search-open");
    var $trigger = $searchBtn && $searchBtn.querySelector("button");
    if ($trigger) $trigger.focus();
  }
  $searchBtn && $searchBtn.addEventListener("click", openSearch, false);
  $searchClose && $searchClose.addEventListener("click", closeSearch, false);
  $searchOverlay && $searchOverlay.addEventListener("click", function (e) {
    if (e.target.classList.contains("search-area-wrap")) closeSearch();
  }, false);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && $searchOverlay &&
      $searchOverlay.classList.contains("show")) {
      closeSearch();
    }
  });
  /*fix bug*/
  if (!$tocWrap && $tocBtn) {
    $tocBtn.style.display = "none";
  }
  $tocBtn && $tocBtn.addEventListener("click", function (e) {
    if ($tocWrap) {
      if ($tocWrap.classList.contains("show")) {
        $tocWrap.classList.remove("show");
      } else {
        $tocWrap.classList.add("show");
      }
    }
  }, false);
  Array.prototype.forEach.call($toolButtons, function ($btn) {
    $btn.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        $btn.click();
      }
    });
  });
  if ($searchInput) {
    $searchInput.onfocus = function () {
      this.parentNode.classList.add("focus");
    };
    $searchInput.onblur = function () {
      this.parentNode.classList.remove("focus");
    };
  }
  /*change comments original text*/
  function changeText () {
    $commentsCounter.removeEventListener("DOMNodeInserted", changeText);
    /*fix IE stackoverflow bug*/
    var text = $commentsCounter.textContent.trim().toLowerCase();
    var re = /.*(\d+).*/;
    var result = 0;
    if (text.match(re)) {
      result = text.replace(re, "$1");
    }
    $commentsCounter.textContent = result;
  }

  $commentsCounter &&
  $commentsCounter.addEventListener("DOMNodeInserted", changeText);
  var canClick = true;
  /*high song and donate*/
  /*fix the multi-click bug*/
  $highSongBtn && $highSongBtn.addEventListener("click", function (e) {
    if (canClick) {
      canClick = false;
      setTimeout(function () {
        canClick = true;
      }, 60000);
      highSong();
    }
  });
  $donateBtn && $donateBtn.addEventListener("click", function (e) {
    $donateWrap && $donateWrap.classList.add("show");
  });
  $donateWrap && $donateWrap.addEventListener("click", function (e) {
    $donateWrap.classList.remove("show");
  });

  /*counter -- leancloud*/
  if (leancloudObj.enable) {
    (function () {
      var $targetArr = document.querySelectorAll(".article-meta .hits");
      // var className = $body.getAttribute('data-leancloud-classname');
      var className = leancloudObj.className.trim();
      if ($targetArr) var arrLength = $targetArr.length;
      if (arrLength > 0) {
        function addCount () {
          var Counter = AV.Object.extend(className);
          var query = new AV.Query(className);
          var $target = document.querySelector("#post .hits");
          var url = $target.getAttribute("data-leadcloud-url");
          var title = $target.getAttribute("data-leadcloud-title").trim();
          query.equalTo("url", url);
          query.find().then(function (results) {
            if (results.length > 0) {
              var counter = results[0];
              counter.increment("times", 1);
              counter.save(null, {fetchWhenSave: true});
            }
            else {
              var newcounter = new Counter();
              newcounter.set("title", title);
              newcounter.set("url", url);
              newcounter.set("times", 1);
              newcounter.save(null, {
                success: function (newcounter) {
                },
                error: function (newcounter, error) {
                  console.error("Failed to create!");
                }
              });
            }
          });
        }

        if ($post) addCount();//if the layout of post, increase first
        for (var i = 0; i < arrLength; i++) {
          (function (index) {
            var query = new AV.Query(className);
            var item = null, url = "";
            item = $targetArr[index];
            url = item.getAttribute("data-leadcloud-url");
            query.equalTo("url", url);
            query.find().then(function (results) {
              if (results.length > 0) {
                var counter = results[0];
                var times = counter.get("times");
                item.innerHTML = times.toString().trim();
              }
              else {
                item.innerHTML = 0;
              }
            });
          })(i);
        }
      }
    })();
    //popular posts
    (function () {
      var $popular = document.getElementById("popular-posts");
      var className = leancloudObj.className.trim();
      var limits = leancloudObj.limits;
      var $popularContent = document.getElementById("popular-content");
      var title = "", url = "", times = "";
      var $result = "";
      //if popular posts widget exits
      if ($popular) {
        var query = new AV.Query(className);
        query.descending("times");
        query.limit(limits);
        query.find().then(function (results) {
          for (var i = 0, length = results.length; i < length; i++) {
            (function (index) {
              var item = results[index];
              title = item.get("title") || "No Title!";
              url = item.get("url");
              times = item.get("times");
              $result += "<li class=\"popular-item popular-item-" +
                (index + 1) +
                "\">";
              $result += "<a href=\"" + url + "\">" + title + "<sup>" + times +
                "</sup></a>";
              $result += "</li>";
            })(i);
          }
          $popularContent.innerHTML = $result;
        });
      }
    })();
  }
  function handleLongTable(){
   if($postBody){
     var tables = document.querySelectorAll('#post-body > table');
     var length = tables.length;
     for(var i = 0;i< length;i++){
       var item = tables[i];
       var tableWidth = window.getComputedStyle(item).width;
       var postBodyWidth = window.getComputedStyle($postBody).width;
       _originalTableWidth[i] = _originalTableWidth[i] || tableWidth;
       if(parseInt(_originalTableWidth[i]) > parseInt(postBodyWidth)){
         item.classList.add('scroll-table');
       }else{
         item.classList.remove('scroll-table');
       }
     }

   }
  }
  handleLongTable();
};
