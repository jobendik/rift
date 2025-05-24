/**
 * EnhancedEventBanner Component
 * 
 * Performance-optimized version of EventBanner that uses element pooling
 * to reduce DOM operations and improve performance.
 * 
 * Manages and displays important game events:
 * - Major game events (objective capture, round win/loss)
 * - Mission updates
 * - Achievement milestones
 * - Game state changes
 * 
 * @extends UIComponent
 */

import UIComponent from '../UIComponent.js';
import { DOMFactory } from '../../../utils/DOMFactory.js';
import { EventManager } from '../../../core/EventManager.js';
import { ElementPool } from '../../../utils/ElementPool.js';

export class EnhancedEventBanner extends UIComponent {
    /**
     * Create a new EnhancedEventBanner
     * 
     * @param {Object} options - Component options
     * @param {number} options.displayDuration - Default display time in ms
     * @param {number} options.fadeDuration - Animation duration in ms
     * @param {number} options.poolSize - Initial pool size for banner elements
     * @param {number} options.maxPoolSize - Maximum number of elements in the pool
     */
    constructor(options = {}) {
        super({
            autoInit: false,
            id: options.id || 'event-banner',
            className: 'rift-event-banner',
            container: options.container || document.body,
            ...options
        });
        
        // Configuration
        this.displayDuration = options.displayDuration || 3000;
        this.fadeDuration = options.fadeDuration || 1000;
        this.poolSize = options.poolSize || 10;
        this.maxPoolSize = options.maxPoolSize || 30;
        
        // Internal state
        this.activeBanners = [];
        this.activeTimers = [];
        this.isPaused = false;
        this.pauseStartTime = 0;
        this.queue = [];
        this.isDisplayingOutcome = false;
        this.eventSubscriptions = [];
        
        // Element pools will be initialized in init()
        this.bannerPool = null;
        this.outcomePool = null;
    }
      /**
     * Initialize the event banner
     */
    init() {
        if (this.isInitialized) return this;
        
        // Call parent init to create the element properly
        super.init();
        
        // Initialize element pools
        this._initializeElementPools();
        
        // Set up event listeners
        this._setupEventListeners();
        
        return this;
    }
    
    /**
     * Initialize element pools for banners and outcomes
     * @private
     */
    _initializeElementPools() {
        // Pool for regular event banners
        this.bannerPool = new ElementPool({
            elementType: 'div',
            className: 'rift-event-banner__message',
            container: this.element,
            initialSize: this.poolSize,
            maxSize: this.maxPoolSize,
            useBlocks: true, // Use block containers for better DOM performance
            blockSize: 5,
            resetFn: (element) => {
                // Reset element to clean state
                element.textContent = '';
                element.className = 'rift-event-banner__message';
                element.style = '';
                
                // Hide element but keep in DOM
                element.style.display = 'none';
                
                // Remove any extra attributes
                Array.from(element.attributes).forEach(attr => {
                    if (attr.name !== 'class' && attr.name !== 'style') {
                        element.removeAttribute(attr.name);
                    }
                });
                
                // Remove all children
                while (element.firstChild) {
                    element.removeChild(element.firstChild);
                }
            }
        });
        
        // Pool for round outcome banners
        this.outcomePool = new ElementPool({
            elementType: 'div',
            className: 'rift-round-outcome',
            container: document.body, // These go directly in body for full-screen effect
            initialSize: 2, // Round outcomes are less frequent
            maxSize: 5,
            useBlocks: true,
            blockSize: 2,
            resetFn: (element) => {
                // Reset element to clean state
                element.textContent = '';
                element.className = 'rift-round-outcome';
                element.style = '';
                
                // Hide element but keep in DOM
                element.style.display = 'none';
                
                // Remove any extra attributes
                Array.from(element.attributes).forEach(attr => {
                    if (attr.name !== 'class' && attr.name !== 'style') {
                        element.removeAttribute(attr.name);
                    }
                });
                
                // Remove all children
                while (element.firstChild) {
                    element.removeChild(element.firstChild);
                }
            }
        });
    }
    
    /**
     * Set up event listeners for banner events
     * @private
     */
    _setupEventListeners() {
        this.eventSubscriptions.push(
            EventManager.subscribe('objective:completed', this._onObjectiveCompleted.bind(this))
        );
        
        this.eventSubscriptions.push(
            EventManager.subscribe('round:end', this._onRoundEnd.bind(this))
        );
        
        this.eventSubscriptions.push(
            EventManager.subscribe('game:paused', this.pauseTimers.bind(this))
        );
        
        this.eventSubscriptions.push(
            EventManager.subscribe('game:resumed', this.resumeTimers.bind(this))
        );
        
        this.eventSubscriptions.push(
            EventManager.subscribe('achievement:unlocked', this._onAchievementUnlocked.bind(this))
        );
        
        this.eventSubscriptions.push(
            EventManager.subscribe('mission:updated', this._onMissionUpdated.bind(this))
        );
    }
    
    /**
     * Show a banner message
     * 
     * @param {string} text - Banner text
     * @param {string} type - Banner type: 'default', 'objective', 'alert', 'success', 'danger'
     * @param {Object} options - Additional options
     * @param {string} options.title - Optional title
     * @param {string} options.subtitle - Optional subtitle
     * @param {number} options.duration - Display duration in ms
     * @param {Object} options.timer - Timer data for objectives with time remaining
     * @param {number} options.timer.duration - Total time for objective in ms
     * @param {number} options.timer.remaining - Time remaining in ms
     * @returns {Object} - Banner object with reference to DOM element and release function
     */
    showBanner(text, type = 'default', options = {}) {
        // If a round outcome is showing, queue the banner message
        if (this.isDisplayingOutcome) {
            this.queue.push({ text, type, options, method: 'showBanner' });
            return;
        }
        
        // Get a banner element from the pool
        const { element, release } = this.bannerPool.acquire();
        
        // Show the element
        element.style.display = '';
        
        // Set the banner type
        element.classList.add(`rift-event-banner__message--${type}`);
        
        // Create banner content
        const banner = {
            element,
            release,
            type,
            text,
            options
        };
        
        // Add title if provided
        if (options.title) {
            const title = DOMFactory.createElement({
                type: 'span',
                classes: ['rift-event-banner__title'],
                text: options.title
            });
            element.appendChild(title);
        }
        
        // Add main text
        const mainText = DOMFactory.createElement({
            type: 'span',
            text: text
        });
        element.appendChild(mainText);
        
        // Add subtitle if provided
        if (options.subtitle) {
            const subtitle = DOMFactory.createElement({
                type: 'span',
                classes: ['rift-event-banner__subtitle'],
                text: options.subtitle
            });
            element.appendChild(subtitle);
        }
        
        // Add timer if provided
        if (options.timer) {
            const timerContainer = DOMFactory.createElement({
                type: 'div',
                classes: ['rift-event-banner__timer']
            });
            
            // Timer bar container
            const timerBar = DOMFactory.createElement({
                type: 'div',
                classes: ['rift-event-banner__timer-bar']
            });
            
            // Timer progress element
            banner.timerBar = DOMFactory.createElement({
                type: 'div',
                classes: ['rift-event-banner__timer-progress']
            });
            
            timerBar.appendChild(banner.timerBar);
            timerContainer.appendChild(timerBar);
            
            // Add remaining time text if available
            if (options.timer.displayTime) {
                const remainingTime = Math.max(0, Math.ceil(options.timer.remaining / 1000));
                const timeText = DOMFactory.createElement({
                    type: 'span',
                    text: `${remainingTime}s`
                });
                timerContainer.appendChild(timeText);
            }
            
            element.appendChild(timerContainer);
            
            // Store timer details for pause/resume
            banner.timerDuration = options.timer.duration;
            banner.timerRemaining = options.timer.remaining;
        }
        
        // Show with animation after a brief delay
        setTimeout(() => {
            element.classList.add('rift-event-banner__message--enter');
        }, 10);
        
        // Set up timer if applicable
        if (options.timer && options.timer.duration > 0 && options.timer.remaining >= 0) {
            const percentage = options.timer.remaining / options.timer.duration;
            if (banner.timerBar) {
                banner.timerBar.style.transform = `scaleX(${percentage})`;
                
                // Animate timer bar
                if (options.timer.remaining > 0) {
                    banner.timerBar.style.transition = `transform ${options.timer.remaining}ms linear`;
                    setTimeout(() => {
                        banner.timerBar.style.transform = 'scaleX(0)';
                    }, 10);
                }
            }
        }
        
        // Add to tracked banners
        this.activeBanners.push(banner);
        
        // Set banner expiry time
        banner.expiryTime = Date.now() + (options.duration || this.displayDuration);
        
        // Set up dismiss timer
        banner.timerId = setTimeout(() => {
            this._dismissBanner(banner);
        }, options.duration || this.displayDuration);
        
        this.activeTimers.push(banner.timerId);
        
        return banner;
    }
    
    /**
     * Show a round outcome banner (victory, defeat, draw)
     * 
     * @param {string} outcome - The outcome: 'victory', 'defeat', or 'draw'
     * @param {string} subtitle - Optional subtitle text
     * @returns {Object} - Outcome banner object with reference to DOM element and release function
     */
    showRoundOutcome(outcome, subtitle = '') {
        // Remove any existing banners
        this.clearAll(true);
        
        // Mark as displaying outcome to block other banners
        this.isDisplayingOutcome = true;
        
        // Get an outcome element from the pool
        const { element, release } = this.outcomePool.acquire();
        
        // Show the element
        element.style.display = '';
        
        // Create outcome banner
        const banner = {
            element,
            release,
            type: 'outcome',
            outcome
        };
        
        // Add main text with outcome
        const text = DOMFactory.createElement({
            type: 'div',
            classes: ['rift-round-outcome__text', `rift-round-outcome--${outcome}`],
            text: outcome.toUpperCase()
        });
        element.appendChild(text);
        
        // Add subtitle if provided
        if (subtitle) {
            const subtitleElement = DOMFactory.createElement({
                type: 'div',
                classes: ['rift-round-outcome__subtitle'],
                text: subtitle
            });
            element.appendChild(subtitleElement);
        }
        
        // Track the banner
        this.activeBanners.push(banner);
        
        // Show with animation after a brief delay
        setTimeout(() => {
            element.classList.add('rift-round-outcome--enter');
        }, 10);
        
        // Set up dismiss timer (longer duration for outcomes)
        const duration = 5000; // Outcomes stay longer than regular banners
        banner.timerId = setTimeout(() => {
            element.classList.add('rift-round-outcome--exit');
            element.classList.remove('rift-round-outcome--enter');
            
            setTimeout(() => {
                // Release the element back to the pool
                banner.release();
                
                // Remove from active banners
                this.activeBanners = this.activeBanners.filter(b => b !== banner);
                this.isDisplayingOutcome = false;
                
                // Process queued messages
                this._processQueue();
            }, this.fadeDuration);
        }, duration);
        
        this.activeTimers.push(banner.timerId);
        
        return banner;
    }
    
    /**
     * Handle objective:completed event
     * @param {Object} event - Standardized objective event
     * @private
     */
    _onObjectiveCompleted(event) {
        const options = {
            title: 'Objective Completed',
            subtitle: event.description || '',
            duration: 4000
        };
        
        this.showBanner(event.name || 'Objective Completed', 'objective', options);
    }
    
    /**
     * Handle round:end event
     * @param {Object} event - Standardized round event
     * @private
     */
    _onRoundEnd(event) {
        if (event.outcome) {
            this.showRoundOutcome(event.outcome, event.message || '');
        }
    }
    
    /**
     * Handle achievement:unlocked event
     * @param {Object} event - Standardized achievement event
     * @private
     */
    _onAchievementUnlocked(event) {
        const options = {
            title: 'Achievement Unlocked',
            subtitle: event.description || '',
            duration: 5000
        };
        
        this.showBanner(event.name || event.message, 'success', options);
    }
    
    /**
     * Handle mission:updated event
     * @param {Object} event - Standardized mission event
     * @private
     */
    _onMissionUpdated(event) {
        const options = {
            title: event.title || 'Mission Update',
            subtitle: event.description || '',
            duration: 4000
        };
        
        if (event.timer) {
            options.timer = {
                duration: event.timer.total || 0,
                remaining: event.timer.remaining || 0,
                displayTime: true
            };
        }
        
        this.showBanner(event.message, event.category || 'default', options);
    }
    
    /**
     * Pause all banner timers
     */
    pauseTimers() {
        if (this.isPaused) return;
        
        this.isPaused = true;
        this.pauseStartTime = Date.now();
        
        // Clear all active timers
        this.activeTimers.forEach(timerId => clearTimeout(timerId));
        this.activeTimers = [];
        
        // Store remaining time for all banners
        this.activeBanners.forEach(banner => {
            if (banner.expiryTime) {
                banner.remainingTime = banner.expiryTime - this.pauseStartTime;
            }
            
            // Pause any timer bars
            if (banner.timerBar) {
                banner.timerBar.style.transitionDuration = '0s';
                const computedStyle = getComputedStyle(banner.timerBar);
                banner.pausedProgress = computedStyle.transform;
            }
        });
    }
    
    /**
     * Resume banner timers after pause
     */
    resumeTimers() {
        if (!this.isPaused) return;
        
        const pauseDuration = Date.now() - this.pauseStartTime;
        this.isPaused = false;
        
        // Resume timers for all banners with adjusted durations
        this.activeBanners.forEach(banner => {
            if (banner.remainingTime) {
                const adjustedTime = Math.max(100, banner.remainingTime); // Ensure at least 100ms
                
                banner.expiryTime = Date.now() + adjustedTime;
                
                // Create new timer
                banner.timerId = setTimeout(() => {
                    this._dismissBanner(banner);
                }, adjustedTime);
                
                this.activeTimers.push(banner.timerId);
                
                // Resume timer bars
                if (banner.timerBar && banner.pausedProgress) {
                    banner.timerBar.style.transform = banner.pausedProgress;
                    
                    // If there's a timer with duration remaining, restart the animation
                    if (banner.timerDuration && banner.timerRemaining) {
                        const remainingPercentage = adjustedTime / banner.timerDuration;
                        banner.timerBar.style.transform = `scaleX(${remainingPercentage})`;
                        
                        setTimeout(() => {
                            banner.timerBar.style.transitionDuration = `${adjustedTime}ms`;
                            banner.timerBar.style.transform = 'scaleX(0)';
                        }, 10);
                    }
                }
            }
        });
    }
    
    /**
     * Dismiss a banner with animation
     * 
     * @private
     * @param {Object} banner - Banner to dismiss
     */
    _dismissBanner(banner) {
        // If already removed from DOM, ignore
        if (!banner || !banner.element) {
            return;
        }
        
        // Clear timer if exists
        if (banner.timerId) {
            clearTimeout(banner.timerId);
            this.activeTimers = this.activeTimers.filter(id => id !== banner.timerId);
        }
        
        // Start exit animation
        if (banner.type === 'outcome') {
            banner.element.classList.add('rift-round-outcome--exit');
            banner.element.classList.remove('rift-round-outcome--enter');
        } else {
            banner.element.classList.add('rift-event-banner__message--exit');
            banner.element.classList.remove('rift-event-banner__message--enter');
        }
        
        // Release element back to pool after animation completes
        setTimeout(() => {
            // Release element back to pool
            if (banner.release) {
                banner.release();
            }
            
            // Remove from tracked banners
            this.activeBanners = this.activeBanners.filter(b => b !== banner);
            
            // Process queue if applicable
            if (this.queue.length > 0 && !this.isDisplayingOutcome) {
                this._processQueue();
            }
        }, this.fadeDuration);
    }
    
    /**
     * Process the message queue
     * 
     * @private
     */
    _processQueue() {
        if (this.queue.length === 0 || this.isDisplayingOutcome) {
            return;
        }
        
        const nextItem = this.queue.shift();
        
        if (nextItem.method === 'showBanner') {
            this.showBanner(nextItem.text, nextItem.type, nextItem.options);
        } else if (nextItem.method === 'showRoundOutcome') {
            this.showRoundOutcome(nextItem.outcome, nextItem.subtitle);
        }
    }
    
    /**
     * Clear all current banners
     * 
     * @param {boolean} immediate - Whether to clear immediately without animations
     */
    clearAll(immediate = false) {
        // Clear timers
        this.activeTimers.forEach(timerId => clearTimeout(timerId));
        this.activeTimers = [];
        
        // Remove banners
        const currentBanners = [...this.activeBanners];
        
        currentBanners.forEach(banner => {
            if (immediate) {
                // Immediately release the element back to pool
                if (banner.release) {
                    banner.release();
                }
            } else {
                // Start exit animation
                if (banner.type === 'outcome') {
                    banner.element.classList.add('rift-round-outcome--exit');
                    banner.element.classList.remove('rift-round-outcome--enter');
                } else {
                    banner.element.classList.add('rift-event-banner__message--exit');
                    banner.element.classList.remove('rift-event-banner__message--enter');
                }
                
                // Release after animation completes
                setTimeout(() => {
                    if (banner.release) {
                        banner.release();
                    }
                }, this.fadeDuration);
            }
        });
        
        // Clear tracking
        this.activeBanners = [];
        this.isDisplayingOutcome = false;
        
        return this;
    }
    
    /**
     * Update the event banner
     * 
     * @param {number} delta - Time since last update in ms
     */
    update(delta) {
        // ElementPool-based implementation doesn't need per-frame updates
        return this;
    }
    
    /**
     * Get statistics about element pools
     * 
     * @returns {Object} Pool statistics
     */
    getStats() {
        return {
            banners: this.bannerPool ? this.bannerPool.getStats() : null,
            outcomes: this.outcomePool ? this.outcomePool.getStats() : null,
            activeBanners: this.activeBanners.length,
            queue: this.queue.length,
            isDisplayingOutcome: this.isDisplayingOutcome
        };
    }
    
    /**
     * Clean up resources and timers
     */
    dispose() {
        // Clear all timers
        this.activeTimers.forEach(timerId => clearTimeout(timerId));
        this.activeTimers = [];
        
        // Clear all banners
        this.clearAll(true);
        
        // Dispose element pools
        if (this.bannerPool) {
            this.bannerPool.dispose();
        }
        
        if (this.outcomePool) {
            this.outcomePool.dispose();
        }
        
        // Unsubscribe from events
        this.eventSubscriptions.forEach(subscription => {
            EventManager.unsubscribe(subscription);
        });
        this.eventSubscriptions = [];
        
        // Reset state
        this.activeBanners = [];
        this.queue = [];
        this.isDisplayingOutcome = false;
        
        // Call parent dispose
        super.dispose();
        
        return this;
    }
}
