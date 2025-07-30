/**
 * 开屏动画控制脚本 (优化版)
 * 功能：
 * 1. 只在首页显示
 * 2. 使用sessionStorage确保同一会话中只显示一次
 * 3. 优化渲染时序，防止主内容闪烁
 * 4. 优化性能检测，兼容移动设备
 * 5. 健壮的错误处理
 */

(function() {
    'use strict';

    // 性能优化：如果设备性能较差，跳过动画
    function isLowPerformanceDevice() {
        // 检查设备内存（如果可用）
        if (navigator.deviceMemory && navigator.deviceMemory < 2) {
            console.log('跳过开屏动画：检测到低性能设备');
            return true;
        }

        // 检查连接速度（如果可用）
        if (navigator.connection && navigator.connection.effectiveType) {
            const slowConnections = ['slow-2g', '2g'];
            if (slowConnections.includes(navigator.connection.effectiveType)) {
                console.log('跳过开屏动画：检测到慢速网络');
                return true;
            }
        }
        
        // [已修复] 不再将所有移动设备都视为低性能设备
        return false;
    }
    
    // 检查是否为首页
    function isHomePage() {
        const path = window.location.pathname;
        // 兼容 Hexo 等博客框架的根路径配置
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
            // 如果不满足条件，直接返回，此时 body 没有 splash-active 类，内容正常显示
            if (!isHomePage() || hasShownSplash() || isLowPerformanceDevice()) {
                if (isLowPerformanceDevice() || hasShownSplash()) {
                     markSplashShown(); // 标记已显示，避免重复检查
                }
                return;
            }
        
            // 标记已显示
            markSplashShown();
            
            // 添加 body 类，CSS 会据此隐藏主内容并防止滚动，从根源解决内容闪烁问题
            document.body.classList.add('splash-active');
            
            // 创建并插入开屏动画
            const splashHTML = createSplashHTML();
            document.body.insertAdjacentHTML('afterbegin', splashHTML);
            
            // 开始动画时间线
            startAnimationTimeline();
        } catch (error) {
            // 错误处理：如果初始化失败，确保移除控制类，让页面恢复正常
            console.error('开屏动画初始化失败:', error);
            const splashScreen = document.getElementById('splashScreen');
            if (splashScreen) {
                splashScreen.remove();
            }
            document.body.classList.remove('splash-active');
            markSplashShown(); // 标记已显示，避免无限重试
        }
    }
    
    // 动画时间线控制
    function startAnimationTimeline() {
        try {
            const splashScreen = document.getElementById('splashScreen');
            const logoText = document.getElementById('logoText');

            if (!splashScreen || !logoText) {
                console.warn('开屏动画元素未找到，提前结束。');
                document.body.classList.remove('splash-active'); // 确保恢复页面
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
        
            // 步骤3: 彻底移除开屏页，并移除 body 的控制类，让主内容平滑显示
            setTimeout(() => {
                if (splashScreen) {
                    splashScreen.remove();
                }
                document.body.classList.remove('splash-active');
            }, finalCleanupTime);
        } catch (error) {
            // 动画执行过程中的错误处理
            console.error('开屏动画执行失败:', error);
            const splashScreen = document.getElementById('splashScreen');
            if (splashScreen) {
                splashScreen.remove();
            }
            document.body.classList.remove('splash-active'); // 确保恢复页面
        }
    }
    
    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSplashScreen);
    } else {
        initSplashScreen();
    }
    
})();