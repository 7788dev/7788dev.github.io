/**
 * 开屏动画控制脚本 (最终优化版 - 兼容自定义AJAX导航)
 *
 * 功能：
 * 1. 使用 MutationObserver 适配自定义的客户端导航，解决页面切换后内容空白问题。
 * 2. 仅在首页显示，且在同一浏览器会话中只显示一次。
 * 3. 预先在HTML的<body>标签添加 `splash-active` 类，从根源上防止了主内容闪烁。
 * 4. 包含低性能设备和慢速网络的检测，自动跳过动画。
 * 5. 结构清晰，包含完整的错误处理。
 */

(function() {
    'use.strict';

    // ... (isLowPerformanceDevice, isHomePage, hasShownSplash, markSplashShown, createSplashHTML 函数保持不变) ...

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
    
    // 检查是否已经显示过开屏动画
    function hasShownSplash() {
        return sessionStorage.getItem('splash_shown') === 'true';
    }
    
    // 标记开屏动画已显示
    function markSplashShown() {
        sessionStorage.setItem('splash_shown', 'true');
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

            if (!isHomePage() || hasShownSplash() || isLowPerformanceDevice()) {
                if (hasShownSplash() || isLowPerformanceDevice()) {
                    markSplashShown();
                }
                body.classList.remove('splash-active');
                return;
            }
            
            markSplashShown();
            body.classList.add('splash-active');
            const splashHTML = createSplashHTML();
            body.insertAdjacentHTML('afterbegin', splashHTML);
            startAnimationTimeline();
        } catch (error) {
            console.error('开屏动画初始化失败:', error);
            const splashScreen = document.getElementById('splashScreen');
            if (splashScreen) splashScreen.remove();
            document.body.classList.remove('splash-active');
            markSplashShown();
        }
    }

    // ... (startAnimationTimeline 函数保持不变) ...
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

    // --- 关键修改：使用 MutationObserver 监听 DOM 变化 ---

    // 1. 页面首次加载时，立即执行一次
    initSplashScreen();

    // 2. 创建一个“哨兵”来监视 DOM 的变化
    const observer = new MutationObserver((mutations) => {
        // 我们只关心子元素列表的变化（即页面内容的替换）
        // 并且我们检查 URL 是否已更改，这通常是页面导航的标志
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                // 当 DOM 变化时，重新运行初始化逻辑
                console.log('检测到页面内容变化，重新初始化开屏动画逻辑。');
                initSplashScreen();
                // 找到变化后就可以停止检查了，避免不必要的重复执行
                break; 
            }
        }
    });

    // 3. 让“哨兵”开始工作：
    //    - 监视 document.body
    //    - 配置为只关心子元素的添加或删除（childList: true）
    observer.observe(document.body, {
        childList: true, 
        subtree: true // 也监视子树的变化，更可靠
    });

})();