/**
 * 开屏动画
 *
 * By.Looks
 *
 */

(function() {
    'use.strict';

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


     initSplashScreen();

    // 仅在单页应用或类似场景下，你才需要 MutationObserver。
    // 如果你的网站不是单页应用（每次都重新加载页面），可以考虑完全移除下面的观察者代码。
    // 如果确实需要，请按如下方式优化：

    const observer = new MutationObserver((mutations) => {
        // 检查开屏动画是否正在进行或已经显示过
        // 如果 splashScreen 元素还存在，说明动画还在进行中，或者还未清理。
        const splashInProgress = document.getElementById('splashScreen') !== null;
        
        // 如果动画正在进行，则不做任何操作，防止中断。
        if (splashInProgress) {
            console.log('动画进行中，忽略DOM变化。');
            return;
        }

        // 只有当动画已经完全结束后，才考虑在页面路由变化时重新显示动画
        // 这需要一个更复杂的逻辑来重置状态，例如在路由变化时手动调用
        // sessionStorage.removeItem('splash_shown'); 并重新初始化。
        // 对于一个简单的博客，更常见的做法是在路由变化时不显示开屏动画。
        
        // 简单的场景下，我们可以断开观察者，因为它已经完成了它的使命（处理首次加载）。
        // observer.disconnect(); 
    });

    observer.observe(document.body, {
        childList: true, 
        subtree: true 
    });

})();