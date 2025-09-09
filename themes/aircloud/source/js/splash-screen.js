/**
 * 开屏动画 (最终版)
 *
 * - 使用会话 Cookie 保证在整个浏览器会话中（跨所有标签页）只显示一次。
 * - 浏览器完全关闭并重启后会自动重置。
 * - 解决了快速打开多标签页时的竞争条件问题。
 *
 * By.Looks & Gemini
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