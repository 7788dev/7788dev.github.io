/**
 * 开屏动画控制脚本
 * 功能：
 * 1. 只在首页显示
 * 2. 使用sessionStorage确保同一会话中只显示一次
 * 3. 性能优化，避免影响博客加载速度
 * 4. 错误处理，确保动画失败时不影响正常浏览
 */

(function() {
    'use strict';

    // 性能优化：如果设备性能较差，跳过动画
    function isLowPerformanceDevice() {
        // 检查设备内存（如果可用）
        if (navigator.deviceMemory && navigator.deviceMemory < 2) {
            return true;
        }

        // 检查连接速度（如果可用）
        if (navigator.connection && navigator.connection.effectiveType) {
            const slowConnections = ['slow-2g', '2g'];
            if (slowConnections.includes(navigator.connection.effectiveType)) {
                return true;
            }
        }

        // 检查是否为移动设备且屏幕较小
        if (window.innerWidth < 768 && /Mobi|Android/i.test(navigator.userAgent)) {
            return true;
        }

        return false;
    }
    
    // 检查是否为首页
    function isHomePage() {
        // 检查当前路径是否为根路径或首页
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
                    <!-- 第一个单词 -->
                    <div class="logo-word">
                        <div class="char-container"><span class="char1">A</span></div>
                        <div class="char-container"><span class="char2">o</span></div>
                        <div class="char-container"><span class="char3">g</span></div>
                        <div class="char-container"><span class="char4">u</span></div>
                        <div class="char-container"><span class="char5">x</span></div>
                        <div class="char-container"><span class="char6">i</span></div>
                        <div class="char-container"><span class="char7">n</span></div>
                    </div>
                    <!-- 第二个单词 -->
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
    
    // 初始化开屏动画
    function initSplashScreen() {
        try {
            // 检查条件：必须是首页且未显示过
            if (!isHomePage() || hasShownSplash()) {
                return;
            }

            // 性能优化：低性能设备跳过动画
            if (isLowPerformanceDevice()) {
                console.log('跳过开屏动画：检测到低性能设备或慢速网络');
                markSplashShown(); // 标记已显示，避免重复检查
                return;
            }
        
        // 标记已显示
        markSplashShown();
        
        // 添加body类防止滚动
        document.body.classList.add('splash-active');
        
        // 创建并插入开屏动画
        const splashHTML = createSplashHTML();
        document.body.insertAdjacentHTML('afterbegin', splashHTML);
        
        // 为主内容添加淡入动画类
        const indexContainer = document.querySelector('.index-container');
        if (indexContainer) {
            indexContainer.classList.add('main-content-fade-in');
        }
        
            // 开始动画时间线
            startAnimationTimeline();
        } catch (error) {
            // 错误处理：如果动画初始化失败，确保不影响正常浏览
            console.error('开屏动画初始化失败:', error);
            // 移除可能已添加的元素和类
            const splashScreen = document.getElementById('splashScreen');
            if (splashScreen) {
                splashScreen.remove();
            }
            document.body.classList.remove('splash-active');
            // 标记已显示，避免重复尝试
            markSplashShown();
        }
    }
    
    // 动画时间线控制
    function startAnimationTimeline() {
        try {
            const splashScreen = document.getElementById('splashScreen');
            const logoText = document.getElementById('logoText');

            if (!splashScreen || !logoText) {
                console.warn('开屏动画元素未找到');
                return;
            }
        
        // 时间线配置
        const inversionStartTime = 2800; // 动画呈现后，开始颜色反转
        const logoFadeOutTime = inversionStartTime + 1500; // 颜色反转结束后，Logo开始退场
        const finalCleanupTime = logoFadeOutTime + 1000; // Logo退场后，清理DOM
        
        // 步骤1: 触发颜色反转
        setTimeout(() => {
            splashScreen.classList.add('invert-colors');
        }, inversionStartTime);
        
        // 步骤2: 触发Logo退场
        setTimeout(() => {
            logoText.classList.add('hidden');
        }, logoFadeOutTime);
        
            // 步骤3: 彻底移除开屏页并恢复页面滚动
            setTimeout(() => {
                if (splashScreen) {
                    splashScreen.remove();
                }
                // 移除防滚动类
                document.body.classList.remove('splash-active');
            }, finalCleanupTime);
        } catch (error) {
            // 动画执行过程中的错误处理
            console.error('开屏动画执行失败:', error);
            // 立即清理并恢复正常状态
            const splashScreen = document.getElementById('splashScreen');
            if (splashScreen) {
                splashScreen.remove();
            }
            document.body.classList.remove('splash-active');
        }
    }
    
    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSplashScreen);
    } else {
        initSplashScreen();
    }
    
})();
