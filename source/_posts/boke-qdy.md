---
title: 本站同款启动页
date: 2025-07-30 17:29:49
tags:
    - 部署博客
---

#### 前言

好久没更新了,其实早就想把这篇文章写完,一直拖

#### 代码

css

```css
/* 防止开屏动画期间页面滚动和主内容闪烁 */
body.splash-active {
    overflow: hidden;
}

/* 
 * 当 JS 移除 body.splash-active 类后，主内容区会平滑淡入。
 * 请确保 '.index-container' 是您首页主内容区域的正确选择器。
*/
body.splash-active .index-container {
    opacity: 0;
    transition: opacity 0.8s ease-in-out;
}

/* 开屏动画容器 */
.splash-screen {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    width: 100vw;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 9999;
    background-color: #121212;
    transition: background-color 1.5s cubic-bezier(0.7, 0, 0.3, 1);
    /* 性能优化 */
    will-change: background-color;
    transform: translateZ(0); /* 启用硬件加速 */
    backface-visibility: hidden;
}

/* 颜色反转时的状态 */
.splash-screen.invert-colors {
    background-color: #ffffff;
}

.logo-text {
    /* 优化字体栈：优先使用系统字体，确保快速加载和国内可访问性 */
    font-family: "Times New Roman", "Songti SC", "SimSun", "serif", "STSong", "华文宋体", "宋体", serif;
    font-weight: 500;
    display: flex;
    align-items: center;
    font-size: clamp(40px, 12vw, 110px);
    transition: opacity 0.8s ease-out, transform 0.8s ease-out;
    /* 添加字体渲染优化 */
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
}

/* Logo 退场状态 */
.logo-text.hidden {
    opacity: 0;
    transform: translateY(-60px);
}

.logo-word {
    display: flex;
}

.logo-word + .logo-word {
    margin-left: clamp(15px, 4vw, 40px);
}

.char-container {
    display: inline-block;
    overflow: hidden;
    vertical-align: bottom;
}

.logo-text span {
    display: block;
    transform: translateY(110%);
    animation: reveal 1.2s cubic-bezier(0.23, 1, 0.32, 1) forwards;
    color: #f0f0f0;
    transition: color 1.5s cubic-bezier(0.7, 0, 0.3, 1);
    /* 性能优化 */
    will-change: transform, color;
    transform: translateY(110%) translateZ(0); /* 硬件加速 */
}

/* 颜色反转时，字体颜色同步变化 */
.splash-screen.invert-colors .logo-text span {
    color: #1a1a1a;
}

@keyframes reveal {
    to { transform: translateY(0); }
}

/* 为 "Aoguxin Blog" 11个字母编排延迟 */
.logo-text .char1  { animation-delay: 0.2s; }
.logo-text .char2  { animation-delay: 0.3s; }
.logo-text .char3  { animation-delay: 0.4s; }
.logo-text .char4  { animation-delay: 0.5s; }
.logo-text .char5  { animation-delay: 0.6s; }
.logo-text .char6  { animation-delay: 0.7s; }
.logo-text .char7  { animation-delay: 0.8s; }
.logo-text .char8  { animation-delay: 0.9s; }
.logo-text .char9  { animation-delay: 1.0s; }
.logo-text .char10 { animation-delay: 1.1s; }
.logo-text .char11 { animation-delay: 1.2s; }


/* 移动设备优化 - 简化动画以提升性能 */
@media (max-width: 768px) {
    .logo-text {
        font-size: clamp(32px, 10vw, 80px);
    }

    /* 在小屏幕设备上减少动画复杂度 */
    .logo-text span {
        animation-duration: 1.0s;
    }
}

/* 低性能设备优化 - 减少动画效果 */
@media (prefers-reduced-motion: reduce) {
    .logo-text span {
        animation: none;
        transform: translateY(0);
    }

    .splash-screen {
        transition: none;
    }

    .logo-text {
        transition: none;
    }
}
```

接下来就是javascript

```javascript
/**
 * 开屏动画
 *
 * By.Looks
 *
 */
(function() {
    'use.strict';

    // --- Cookie 辅助函数 ---

    /**
     * 设置一个会话 Cookie。这种 Cookie 在浏览器关闭时会自动失效。
     * @param {string} name - Cookie 的名称。
     * @param {string} value - Cookie 的值。
     */
    function setSessionCookie(name, value) {
        // 不设置 "expires" 或 "max-age" 就会创建一个会话 Cookie
        document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/`;
    }

    /**
     * 读取 Cookie 的值。
     * @param {string} name - 要读取的 Cookie 的名称。
     * @returns {string|null} - 返回 Cookie 的值，如果找不到则返回 null。
     */
    function getCookie(name) {
        const nameEQ = encodeURIComponent(name) + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') {
                c = c.substring(1, c.length);
            }
            if (c.indexOf(nameEQ) === 0) {
                return decodeURIComponent(c.substring(nameEQ.length, c.length));
            }
        }
        return null;
    }

    // --- 动画核心逻辑 ---

    const SPLASH_COOKIE_NAME = 'splash_shown_in_session';

    // 性能优化：如果设备性能较差，跳过动画
    function isLowPerformanceDevice() {
        if (navigator.deviceMemory && navigator.deviceMemory < 2) {
            console.log('跳过开屏动画：检测到低性能设备');
            return true;
        }
        if (navigator.connection && navigator.connection.effectiveType) {
            const slowConnections = ['slow-2g', '2g'];
            if (slowConnections.includes(navigator.connection.effectiveType)) {
                console.log('跳过开屏动画：检测到慢速网络');
                return true;
            }
        }
        return false;
    }

    // 检查是否为首页
    function isHomePage() {
        const path = window.location.pathname;
        const root = window.hexo_root || '/';
        return path === root || path === root + 'index.html' || path === root + '';
    }

    // 检查是否已在本会话中显示过动画 (读取 Cookie)
    function hasSplashBeenShown() {
        return getCookie(SPLASH_COOKIE_NAME) === 'true';
    }

    // 标记动画已显示 (设置 Cookie)
    function markSplashAsShown() {
        setSessionCookie(SPLASH_COOKIE_NAME, 'true');
    }

    // 创建开屏动画HTML结构
    function createSplashHTML() {
        return `
            <div class="splash-screen" id="splashScreen">
                <div class="logo-text" id="logoText">
                    <div class="logo-word">
                        <div class="char-container"><span class="char1">A</span></div>
                        <div class="char-container"><span class="char2">o</span></div>
                        <div class="char-container"><span class="char3">g</span></div>
                        <div class="char-container"><span class="char4">u</span></div>
                        <div class="char-container"><span class="char5">x</span></div>
                        <div class="char-container"><span class="char6">i</span></div>
                        <div class="char-container"><span class="char7">n</span></div>
                    </div>
                    <div class="logo-word">
                        <div class="char-container"><span class="char8">B</span></div>
                        <div class="char-container"><span class="char9">l</span></div>
                        <div class="char-container"><span class="char10">o</span></div>
                        <div class="char-container"><span class="char11">g</span></div>
                    </div>
                </div>
            </div>
        `;
    }

    // 核心初始化函数
    function initSplashScreen() {
        try {
            const body = document.body;
            const existingSplash = document.getElementById('splashScreen');
            if (existingSplash) {
                existingSplash.remove();
            }

            // 检查是否满足跳过动画的条件
            if (!isHomePage() || hasSplashBeenShown() || isLowPerformanceDevice()) {
                body.classList.remove('splash-active');
                return;
            }

            // 立刻标记，防止竞争
            markSplashAsShown();
            body.classList.add('splash-active');
            const splashHTML = createSplashHTML();
            body.insertAdjacentHTML('afterbegin', splashHTML);
            startAnimationTimeline();

        } catch (error) {
            console.error('开屏动画初始化失败:', error);
            const splashScreen = document.getElementById('splashScreen');
            if (splashScreen) splashScreen.remove();
            document.body.classList.remove('splash-active');
            markSplashAsShown(); // 即使失败也标记，防止无限循环
        }
    }

    function startAnimationTimeline() {
        try {
            const splashScreen = document.getElementById('splashScreen');
            const logoText = document.getElementById('logoText');

            if (!splashScreen || !logoText) {
                console.warn('开屏动画元素未找到，提前结束。');
                document.body.classList.remove('splash-active');
                return;
            }

            const inversionStartTime = 2800;
            const logoFadeOutTime = inversionStartTime + 1500;
            const finalCleanupTime = logoFadeOutTime + 1000;

            setTimeout(() => {
                if (splashScreen) splashScreen.classList.add('invert-colors');
            }, inversionStartTime);

            setTimeout(() => {
                if (logoText) logoText.classList.add('hidden');
            }, logoFadeOutTime);

            setTimeout(() => {
                if (splashScreen) splashScreen.remove();
                document.body.classList.remove('splash-active');
            }, finalCleanupTime);
        } catch (error) {
            console.error('开屏动画执行失败:', error);
            const splashScreen = document.getElementById('splashScreen');
            if (splashScreen) splashScreen.remove();
            document.body.classList.remove('splash-active');
        }
    }

    // --- 程序入口 ---
    initSplashScreen();

    // MutationObserver 仍然保留，作为处理单页应用（SPA）或 PJAX 导航的保险措施。
    // 对于标准网站，它会在动画结束后自行断开连接。
    const observer = new MutationObserver(() => {
        const splashInProgress = document.getElementById('splashScreen') !== null;
        if (splashInProgress) {
            return;
        }
        observer.disconnect();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();
```

关键特性：同一会话只会展示一次,关闭浏览器打开重新展示
#### 安装步骤

1. **创建CSS文件**
   在主题的`source/css/`目录下创建`splash-screen.css`文件，复制上面的CSS代码

2. **创建JS文件**  
   在主题的`source/js/`目录下创建`splash-screen.js`文件，复制上面的JS代码

3. **引入资源文件**
   在主题的`layout/_partial/head.ejs`中添加以下代码：

```html
<!-- 开屏动画CSS -->
<link rel="stylesheet" href="<%- url_for('/css/splash-screen.css') %>">

<!-- 开屏动画JS -->
<script defer src="<%- url_for('/js/splash-screen.js') %>"></script>
```

4. **确保首页容器正确**
   确保你的首页主内容区域使用了`.index-container`类名，或者修改CSS中的选择器以匹配你的主题结构

5. **在首页body 添加splash-active类名**

   ```html
   <body class="splash-active">
   
   // 此处为首页主内容区域
   
   </body>
   ```

   原本这里是根据动态js添加类名的 但是会出现**(FOUC)** 问题。

#### 自定义修改

1. **修改文字内容**：
   在`splash-screen.js`中找到`createSplashHTML()`函数，修改其中的字母和数量

2. **调整动画时间**：
   - CSS中修改`animation-delay`属性调整字母出现时间
   - JS中修改`inversionStartTime`等变量调整动画阶段时间

3. **更改颜色方案**：
   修改CSS中的`background-color`和文字颜色

4. **调整字体**：
   修改`.logo-text`中的`font-family`属性
