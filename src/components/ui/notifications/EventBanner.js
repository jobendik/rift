/**
 * EventBanner Component
 * 
 * Manages and displays important game events:
 * - Major game events (objective capture, round win/loss)
 * - Mission updates
 * - Achievement milestones
 * - Game state changes
 * 
 * Provides high-visibility notifications for critical game events
 * that should capture the player's immediate attention.
 * 
 * @extends UIComponent
 */

import UIComponent from '../UIComponent.js';
import DOMFactory from '../../../utils/DOMFactory.js';

class EventBanner extends UIComponent {
    /**
     * Create a new EventBanner
     * 
     * @param {Object} options - Component options
     * @param {number} options.displayDuration - Default display time in ms
     * @param {number} options.fadeDuration - Animation duration in ms
     */
    constructor(options = {}) {
        super({
            id: options.id || 'event-banner',
            className: 'rift-event-banner',
            container: options.container || document.body,
            ...options
        });
        
        // Configuration
        this.displayDuration = options.displayDuration || 3000;
        this.fadeDuration = options.fadeDuration || 1000;
        
        // Internal state
        this.activeMessages = [];
        this.activeTimers = [];
        this.isPaused = false;
        this.pauseStartTime = 0;
        this.queue = [];
        this.isDisplayingOutcome = false;
    }
    
    /**
     * Initialize the event banner
     */
    init() {
        if (!this.element) {
            this._createRootElement();
        }
        
        this.isInitialized = true;
        return this;
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
     * @returns {Object} - Banner object with reference to DOM element
     */
    showBanner(text, type = 'default', options = {}) {
        // If a round outcome is showing, queue the banner message
        if (this.isDisplayingOutcome) {
            this.queue.push({ text, type, options, method: 'showBanner' });
            return;
        }
        
        // Create banner element
        const banner = this._createBanner(text, type, options);
        
        // Add to DOM and track
        this.element.appendChild(banner.element);
        this.activeMessages.push(banner);
        
        // Show with animation after a brief delay
        setTimeout(() => {
            banner.element.classList.add('rift-event-banner__message--enter');
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
        
        // Set up dismiss timer
        const duration = options.duration || this.displayDuration;
        banner.timerId = setTimeout(() => {
            this._dismissBanner(banner);
        }, duration);
        
        this.activeTimers.push(banner.timerId);
        
        return banner;
    }
    
    /**
     * Show a round outcome banner (victory, defeat, draw)
     * 
     * @param {string} outcome - The outcome: 'victory', 'defeat', or 'draw'
     * @param {string} subtitle - Optional subtitle text
     * @returns {Object} - Banner object with reference to DOM element
     */
    showRoundOutcome(outcome, subtitle = '') {
        // Remove any existing banners
        this.clearAll(true);
        
        // Mark as displaying outcome to block other banners
        this.isDisplayingOutcome = true;
        
        // Create outcome banner element
        const outcomeElement = DOMFactory.createElement({
            type: 'div',
            classes: ['rift-round-outcome']
        });
        
        // Add main text with outcome
        const text = DOMFactory.createElement({
            type: 'div',
            classes: ['rift-round-outcome__text', `rift-round-outcome--${outcome}`],
            text: outcome.toUpperCase()
        });
        outcomeElement.appendChild(text);
        
        // Add subtitle if provided
        if (subtitle) {
            const subtitleElement = DOMFactory.createElement({
                type: 'div',
                classes: ['rift-round-outcome__subtitle'],
                text: subtitle
            });
            outcomeElement.appendChild(subtitleElement);
        }
        
        // Add to DOM
        document.body.appendChild(outcomeElement);
        
        const banner = {
            element: outcomeElement,
            type: 'outcome',
            outcome: outcome
        };
        
        this.activeMessages.push(banner);
        
        // Show with animation after a brief delay
        setTimeout(() => {
            outcomeElement.classList.add('rift-round-outcome--enter');
        }, 10);
        
        // Set up dismiss timer (longer duration for outcomes)
        const duration = 5000; // Outcomes stay longer than regular banners
        banner.timerId = setTimeout(() => {
            outcomeElement.classList.add('rift-round-outcome--exit');
            outcomeElement.classList.remove('rift-round-outcome--enter');
            
            setTimeout(() => {
                if (outcomeElement.parentNode) {
                    outcomeElement.parentNode.removeChild(outcomeElement);
                }
                
                this.activeMessages = this.activeMessages.filter(m => m !== banner);
                this.isDisplayingOutcome = false;
                
                // Process queued messages
                this._processQueue();
            }, this.fadeDuration);
        }, duration);
        
        this.activeTimers.push(banner.timerId);
        
        return banner;
    }
    
    /**
     * Update the event banner
     * 
     * @param {number} delta - Time since last update in ms
     */
    update(delta) {
        // Nothing specific to update per frame
        return this;
    }
    
    /**
     * Clean up resources and timers
     */
    dispose() {
        // Clear all timers
        this.activeTimers.forEach(timerId => clearTimeout(timerId));
        this.activeTimers = [];
        
        // Remove all active messages
        this.activeMessages.forEach(message => {
            if (message.element && message.element.parentNode) {
                message.element.parentNode.removeChild(message.element);
            }
        });
        
        this.activeMessages = [];
        this.queue = [];
        this.isDisplayingOutcome = false;
        
        // Call parent dispose
        super.dispose();
        
        return this;
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
        
        // Store remaining time for all messages
        this.activeMessages.forEach(banner => {
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
        
        // Resume timers for all messages with adjusted durations
        this.activeMessages.forEach(banner => {
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
     * Clear all current banners
     * 
     * @param {boolean} immediate - Whether to clear immediately without animations
     */
    clearAll(immediate = false) {
        // Clear timers
        this.activeTimers.forEach(timerId => clearTimeout(timerId));
        this.activeTimers = [];
        
        // Remove banners
        const currentMessages = [...this.activeMessages];
        
        currentMessages.forEach(banner => {
            if (immediate) {
                if (banner.element && banner.element.parentNode) {
                    banner.element.parentNode.removeChild(banner.element);
                }
            } else {
                if (banner.type === 'outcome') {
                    banner.element.classList.add('rift-round-outcome--exit');
                    banner.element.classList.remove('rift-round-outcome--enter');
                } else {
                    banner.element.classList.add('rift-event-banner__message--exit');
                    banner.element.classList.remove('rift-event-banner__message--enter');
                }
                
                setTimeout(() => {
                    if (banner.element && banner.element.parentNode) {
                        banner.element.parentNode.removeChild(banner.element);
                    }
                }, this.fadeDuration);
            }
        });
        
        this.activeMessages = [];
        this.isDisplayingOutcome = false;
        
        return this;
    }
    
    /**
     * Create a banner DOM element
     * 
     * @private
     * @param {string} text - Banner text
     * @param {string} type - Banner type
     * @param {Object} options - Additional options
     * @returns {Object} - Banner object with DOM element and metadata
     */
    _createBanner(text, type = 'default', options = {}) {
        const banner = {};
        
        // Create message element
        banner.element = DOMFactory.createElement({
            type: 'div',
            classes: ['rift-event-banner__message', `rift-event-banner__message--${type}`]
        });
        
        // Add title if provided
        if (options.title) {
            const title = DOMFactory.createElement({
                type: 'span',
                classes: ['rift-event-banner__title'],
                text: options.title
            });
            banner.element.appendChild(title);
        }
        
        // Add main text
        const mainText = DOMFactory.createElement({
            type: 'span',
            text: text
        });
        banner.element.appendChild(mainText);
        
        // Add subtitle if provided
        if (options.subtitle) {
            const subtitle = DOMFactory.createElement({
                type: 'span',
                classes: ['rift-event-banner__subtitle'],
                text: options.subtitle
            });
            banner.element.appendChild(subtitle);
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
            
            banner.element.appendChild(timerContainer);
            
            // Store timer details for pause/resume
            banner.timerDuration = options.timer.duration;
            banner.timerRemaining = options.timer.remaining;
        }
        
        // Set metadata
        banner.text = text;
        banner.type = type;
        banner.options = options;
        banner.expiryTime = Date.now() + (options.duration || this.displayDuration);
        
        return banner;
    }
    
    /**
     * Dismiss a banner with animation
     * 
     * @private
     * @param {Object} banner - Banner to dismiss
     */
    _dismissBanner(banner) {
        // If already removed from DOM, ignore
        if (!banner || !banner.element || !banner.element.parentNode) {
            return;
        }
        
        // Clear timer if exists
        if (banner.timerId) {
            clearTimeout(banner.timerId);
            this.activeTimers = this.activeTimers.filter(id => id !== banner.timerId);
        }
        
        // Start exit animation
        banner.element.classList.add('rift-event-banner__message--exit');
        banner.element.classList.remove('rift-event-banner__message--enter');
        
        // Remove from DOM after animation completes
        setTimeout(() => {
            if (banner.element.parentNode) {
                banner.element.parentNode.removeChild(banner.element);
            }
            
            // Remove from tracked messages
            this.activeMessages = this.activeMessages.filter(b => b !== banner);
            
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
}

export default EventBanner;
