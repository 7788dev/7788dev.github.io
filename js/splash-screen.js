/**
 * 开屏动画 (增强版)
 *
 * - 跨标签页只显示一次
 * - 浏览器重启后重置
 *
 * By.Looks & Gemini
 *
 */

(function() {
    'use strict';

    // === 新增：在页面加载时，处理会话和存储状态 ===
    // 这个函数用于模拟 "会话级别" 的 localStorage
    function manageSessionAndStorage() {
        const sessionFlag = 'splash_session_active';
        const localFlag = 'splash_shown_globally';

        // 如果 sessionStorage 中没有标记，说明这是一个新的浏览器会话
        if (sessionStorage.getItem(sessionFlag) === null) {
            // 因此，我们清除上一个会话在 localStorage 中留下的标记
            localStorage.removeItem(localFlag);
            // 然后在 sessionStorage 中设置标记，表示当前会话已经激活
            sessionStorage.setItem(sessionFlag, 'true');
        }
    }

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

    // 检查是否已经在任何标签页显示过开屏动画 (使用 localStorage)
    function hasSplashBeenShownGlobally() {
        return localStorage.getItem('splash_shown_globally') === 'true';
    }

    // 标记开屏动画已显示 (使用 localStorage)
    function markSplashAsShownGlobally() {
        localStorage.setItem('splash_shown_globally', 'true');
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
            // 防御性检查：如果页面上已经有动画，先移除，防止重复
            const existingSplash = document.getElementById('splashScreen');
            if (existingSplash) {
                existingSplash.remove();
            }

            // 检查是否满足跳过动画的条件
            if (!isHomePage() || hasSplashBeenShownGlobally() || isLowPerformanceDevice()) {
                body.classList.remove('splash-active');
                return;
            }

            markSplashAsShownGlobally();
            body.classList.add('splash-active');
            const splashHTML = createSplashHTML();
            body.insertAdjacentHTML('afterbegin', splashHTML);
            startAnimationTimeline();
        } catch (error) {
            console.error('开屏动画初始化失败:', error);
            const splashScreen = document.getElementById('splashScreen');
            if (splashScreen) splashScreen.remove();
            document.body.classList.remove('splash-active');
            markSplashAsShownGlobally(); // 即使失败也标记，防止无限循环
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

    // === 程序入口 ===
    manageSessionAndStorage(); // 首先管理会话状态
    initSplashScreen(); // 然后根据状态初始化动画

    const observer = new MutationObserver(() => {
        // 如果 splashScreen 元素还存在，说明动画还在进行中，则不做任何操作，防止中断。
        const splashInProgress = document.getElementById('splashScreen') !== null;
        if (splashInProgress) {
            return;
        }
        // 当动画结束后，可以断开观察者，因为它已经完成了首次加载的使命。
        // 对于需要 PJAX 或 Turbolinks 的网站，这里的逻辑可能需要调整，但对于标准博客，断开是安全的。
        observer.disconnect();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();