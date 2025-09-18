// Tab Focus Manager Utility
// Handles tab focusing, title changes, and visibility management

class TabFocusManager {
    constructor() {
        this.originalTitle = document.title;
        this.isBlinking = false;
        this.blinkInterval = null;
        this.visibilityListeners = [];
    }

    // Enhanced tab focus with multiple strategies
    focusTab() {
        try {
            // Strategy 1: Change document title immediately
            this.setAttentionTitle();
            
            // Strategy 2: Focus the window
            if (window.focus) {
                window.focus();
            }
            
            // Strategy 3: Try parent window focus (for iframes)
            if (window.parent && window.parent !== window && window.parent.focus) {
                window.parent.focus();
            }
            
            // Strategy 4: Scroll to top to ensure content is visible
            window.scrollTo(0, 0);
            
            // Strategy 5: Use custom focus function if available
            if (window.focusTab) {
                window.focusTab();
            }
            
            // Strategy 6: Start title blinking for attention
            this.startTitleBlink();
            
            console.log('🎯 Tab focus strategies executed');
            return true;
        } catch (error) {
            console.warn('❌ Could not fully focus tab:', error);
            return false;
        }
    }

    // Set attention-grabbing title
    setAttentionTitle(title = '🎉 DeepWork - Phiên hoàn thành!') {
        document.title = title;
    }

    // Start blinking title animation
    startTitleBlink(messages = ['🎉 Phiên hoàn thành!', '⭐ Quay lại DeepWork!'], duration = 10000) {
        if (this.isBlinking) {
            this.stopTitleBlink();
        }
        
        this.isBlinking = true;
        let blinkCount = 0;
        const maxBlinks = Math.floor(duration / 1000);
        
        this.blinkInterval = setInterval(() => {
            if (blinkCount >= maxBlinks || document.hidden === false) {
                this.stopTitleBlink();
                return;
            }
            
            const messageIndex = blinkCount % messages.length;
            document.title = `${messages[messageIndex]} - DeepWork`;
            blinkCount++;
        }, 1000);
    }

    // Stop title blinking
    stopTitleBlink() {
        if (this.blinkInterval) {
            clearInterval(this.blinkInterval);
            this.blinkInterval = null;
        }
        this.isBlinking = false;
    }

    // Restore original title
    restoreTitle() {
        this.stopTitleBlink();
        document.title = this.originalTitle;
    }

    // Setup comprehensive visibility change listeners
    setupVisibilityListener() {
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                // Tab became visible - restore title and stop animations
                this.restoreTitle();
                console.log('👁️ Tab became visible - restored title');
            }
        };

        const handleWindowFocus = () => {
            this.restoreTitle();
            console.log('🎯 Window focused - restored title');
        };

        const handleWindowBlur = () => {
            console.log('😴 Window blurred');
        };

        // Add event listeners
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleWindowFocus);
        window.addEventListener('blur', handleWindowBlur);
        
        // Store listeners for cleanup
        this.visibilityListeners = [
            { element: document, event: 'visibilitychange', handler: handleVisibilityChange },
            { element: window, event: 'focus', handler: handleWindowFocus },
            { element: window, event: 'blur', handler: handleWindowBlur }
        ];

        // Return cleanup function
        return () => {
            this.visibilityListeners.forEach(({ element, event, handler }) => {
                element.removeEventListener(event, handler);
            });
            this.visibilityListeners = [];
            this.stopTitleBlink();
            this.restoreTitle();
        };
    }

    // Get current tab visibility status
    getVisibilityStatus() {
        return {
            isVisible: !document.hidden,
            hasFocus: document.hasFocus(),
            isBlinking: this.isBlinking,
            currentTitle: document.title
        };
    }

    // Enhanced notification with tab focus
    showNotificationWithFocus(title, options = {}) {
        // Focus tab first
        this.focusTab();
        
        // Show notification if permitted
        if (Notification.permission === 'granted') {
            const notification = new Notification(title, {
                icon: '/favicon.ico',
                requireInteraction: true,
                tag: 'deepwork-focus',
                ...options
            });
            
            // Focus tab when notification clicked
            notification.onclick = () => {
                this.focusTab();
                notification.close();
            };
            
            return notification;
        }
        
        return null;
    }

    // Cleanup all resources
    cleanup() {
        this.stopTitleBlink();
        this.restoreTitle();
        this.visibilityListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.visibilityListeners = [];
    }
}

// Create singleton instance
const tabFocusManager = new TabFocusManager();

export default tabFocusManager;