/**
 * 开屏动画
 *
 * By.Looks & Gemini
 *
 */

(function() {
    'use strict';

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
    

    function hasShownSplash() {
        return localStorage.getItem('splash_shown_aoguxin') === 'true';
    }
    
    function markSplashShown() {
        localStorage.setItem('splash_shown_aoguxin', 'true');
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

    // 动画时间线控制
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

    // 页面首次加载时，立即执行一次
    initSplashScreen();

	//监视 DOM 的变化，以应对客户端导航
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                initSplashScreen();
                break; 
            }
        }
    });

    observer.observe(document.body, {
        childList: true, 
        subtree: true 
    });

})();