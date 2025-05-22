/**
 * NotificationManager Component
 * 
 * Manages general notifications for the game UI:
 * - Informational messages
 * - Success notifications
 * - Warning alerts
 * - Error messages
 * 
 * Provides a centralized system for displaying temporary notifications
 * that appear in a designated area of the screen and automatically
 * disappear after a set duration.
 * 
 * @extends UIComponent
 */

import UIComponent from '../UIComponent.js';
import { DOMFactory } from '../../../utils/DOMFactory.js';

export class NotificationManager extends UIComponent {
    /**
     * Create a new NotificationManager
     * 
     * @param {Object} options - Component options
     * @param {number} options.displayDuration - Default display time in ms
     * @param {number} options.fadeDuration - Animation duration in ms
     * @param {number} options.cooldown - Min time between notifications in ms
     */
    constructor(options = {}) {
        super({
            id: options.id || 'notification-manager',
            className: 'rift-notifications',
            container: options.container || document.body,
            autoInit: false, // Prevent auto-init to control initialization order
            ...options
        });
        
        // Configuration
        this.displayDuration = options.displayDuration || 4000;
        this.fadeDuration = options.fadeDuration || 500;
        this.cooldown = options.cooldown || 500;
        this.spacingDelay = options.spacingDelay || 500;
        this.maxNotifications = options.maxNotifications || 5;
        
        // Internal state
        this.notifications = [];
        this.activeTimers = [];
        this.lastNotificationTime = 0;
        this.isPaused = false;
        this.pauseStartTime = 0;
        this.queue = [];
        
        // Now initialize manually after all properties are set
        this.init();
    }
    
    /**
     * Initialize the notification manager
     */
    init() {
        if (this.isInitialized) return this;
        
        // Call parent init first to create root element
        super.init();
        
        // Set initialized flag early to prevent infinite recursion
        this.isInitialized = true;
        
        return this;
    }
    
    /**
     * Add a notification to be displayed
     * 
     * @param {string} text - Notification message
     * @param {string} type - Notification type: 'info', 'success', 'warning', 'error'
     * @param {Object} options - Additional options
     * @param {string} options.title - Optional title for the notification
     * @param {number} options.duration - Custom display duration in ms
     * @param {boolean} options.dismissible - Whether notification can be dismissed (default: true)
     * @param {Function} options.onDismiss - Callback when notification is dismissed
     * @returns {Object} - Reference to the created notification
     */
    addNotification(text, type = 'info', options = {}) {
        const now = Date.now();
        
        // If on cooldown or too many active notifications, queue the notification
        if (now - this.lastNotificationTime < this.cooldown || 
            this.notifications.length >= this.maxNotifications) {
            return this._queueNotification(text, type, options);
        }
        
        this.lastNotificationTime = now;
        
        // Create notification element
        const notification = this._createNotification(text, type, options);
        
        // Add to DOM and track
        this.element.appendChild(notification.element);
        this.notifications.push(notification);
        
        // Show with animation after a brief delay (allows for CSS transitions)
        setTimeout(() => {
            notification.element.classList.add('rift-notification--enter');
        }, 10);
        
        // Set up dismiss timer
        const duration = options.duration || this.displayDuration;
        notification.timerId = setTimeout(() => {
            this._dismissNotification(notification);
        }, duration);
        
        this.activeTimers.push(notification.timerId);
        
        // Set up progress bar if present
        if (notification.progressBar) {
            notification.progressBar.style.transition = `transform ${duration}ms linear`;
            setTimeout(() => {
                notification.progressBar.style.transform = 'scaleX(1)';
            }, 10);
        }
        
        // Check queue after a delay
        setTimeout(() => this._processQueue(), this.spacingDelay);
        
        return notification;
    }
    
    /**
     * Update notification manager state
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
        this.notifications = [];
        this.queue = [];
        
        // Call parent dispose
        super.dispose();
        
        return this;
    }
    
    /**
     * Pause all notification timers (e.g., when game is paused)
     */
    pauseTimers() {
        if (this.isPaused) return;
        
        this.isPaused = true;
        this.pauseStartTime = Date.now();
        
        // Clear all active timers
        this.activeTimers.forEach(timerId => clearTimeout(timerId));
        this.activeTimers = [];
        
        // Pause all progress bars
        this.notifications.forEach(notification => {
            if (notification.progressBar) {
                notification.progressBar.style.transitionDuration = '0s';
                const computedStyle = getComputedStyle(notification.progressBar);
                notification.pausedProgress = computedStyle.transform;
            }
        });
    }
    
    /**
     * Resume notification timers after pause
     */
    resumeTimers() {
        if (!this.isPaused) return;
        
        const pauseDuration = Date.now() - this.pauseStartTime;
        this.isPaused = false;
        
        // Resume timers for all notifications with adjusted durations
        this.notifications.forEach(notification => {
            const timeRemaining = notification.expireTime - this.pauseStartTime;
            const adjustedTime = Math.max(100, timeRemaining); // Ensure at least 100ms
            
            notification.expireTime = Date.now() + adjustedTime;
            
            // Create new timer
            notification.timerId = setTimeout(() => {
                this._dismissNotification(notification);
            }, adjustedTime);
            
            this.activeTimers.push(notification.timerId);
            
            // Resume progress bar
            if (notification.progressBar && notification.pausedProgress) {
                notification.progressBar.style.transform = notification.pausedProgress;
                
                // Restart the animation with remaining time
                setTimeout(() => {
                    notification.progressBar.style.transitionDuration = `${adjustedTime}ms`;
                    notification.progressBar.style.transform = 'scaleX(1)';
                }, 10);
            }
        });
        
        // Process the queue after resuming
        setTimeout(() => this._processQueue(), this.cooldown);
    }
    
    /**
     * Clear all current notifications
     */
    clearAll() {
        // Clear timers
        this.activeTimers.forEach(timerId => clearTimeout(timerId));
        this.activeTimers = [];
        
        // Remove notifications with exit animation
        const currentNotifications = [...this.notifications];
        currentNotifications.forEach(notification => {
            notification.element.classList.add('rift-notification--exit');
            notification.element.classList.remove('rift-notification--enter');
            
            setTimeout(() => {
                if (notification.element.parentNode) {
                    notification.element.parentNode.removeChild(notification.element);
                }
            }, this.fadeDuration);
        });
        
        this.notifications = [];
        
        return this;
    }
    
    /**
     * Create a notification DOM element
     * 
     * @private
     * @param {string} text - Notification message
     * @param {string} type - Notification type
     * @param {Object} options - Additional options
     * @returns {Object} - Notification object with DOM element and metadata
     */
    _createNotification(text, type = 'info', options = {}) {
        const notification = {};
        
        // Create main container
        notification.element = DOMFactory.createElement({
            type: 'div',
            classes: ['rift-notification', `rift-notification--${type}`]
        });
        
        // Add header if there's a title
        if (options.title) {
            const header = DOMFactory.createElement({
                type: 'div',
                classes: ['rift-notification__header']
            });
            
            const title = DOMFactory.createElement({
                type: 'strong',
                classes: ['rift-notification__title'],
                text: options.title
            });
            
            header.appendChild(title);
            notification.element.appendChild(header);
        }
        
        // Add content
        const content = DOMFactory.createElement({
            type: 'div',
            classes: ['rift-notification__content'],
            text: text
        });
        notification.element.appendChild(content);
        
        // Add close button if dismissible
        if (options.dismissible !== false) {
            const closeBtn = DOMFactory.createElement({
                type: 'div',
                classes: ['rift-notification__close']
            });
            
            // Add "X" to close button
            closeBtn.innerHTML = '&times;';
            
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._dismissNotification(notification);
                if (typeof options.onDismiss === 'function') {
                    options.onDismiss();
                }
            });
            
            notification.element.appendChild(closeBtn);
        }
        
        // Add progress bar
        const progressContainer = DOMFactory.createElement({
            type: 'div',
            classes: ['rift-notification__progress']
        });
        
        notification.progressBar = DOMFactory.createElement({
            type: 'div',
            classes: ['rift-notification__progress-bar']
        });
        
        progressContainer.appendChild(notification.progressBar);
        notification.element.appendChild(progressContainer);
        
        // Set expiration time
        notification.expireTime = Date.now() + (options.duration || this.displayDuration);
        notification.type = type;
        notification.options = options;
        
        return notification;
    }
    
    /**
     * Dismiss a notification with animation
     * 
     * @private
     * @param {Object} notification - Notification to dismiss
     */
    _dismissNotification(notification) {
        // If already removed from DOM, ignore
        if (!notification || !notification.element || !notification.element.parentNode) {
            return;
        }
        
        // Start exit animation
        notification.element.classList.add('rift-notification--exit');
        notification.element.classList.remove('rift-notification--enter');
        
        // Clear timer if exists
        if (notification.timerId) {
            clearTimeout(notification.timerId);
            this.activeTimers = this.activeTimers.filter(id => id !== notification.timerId);
        }
        
        // Remove from DOM after animation completes
        setTimeout(() => {
            if (notification.element.parentNode) {
                notification.element.parentNode.removeChild(notification.element);
            }
            
            // Remove from tracked notifications
            this.notifications = this.notifications.filter(n => n !== notification);
            
            // Process queue after removal
            setTimeout(() => this._processQueue(), 100);
        }, this.fadeDuration);
    }
    
    /**
     * Queue a notification for later display
     * 
     * @private
     * @param {string} text - Notification text
     * @param {string} type - Notification type
     * @param {Object} options - Notification options
     * @returns {Object} - A placeholder notification object
     */
    _queueNotification(text, type, options) {
        const queuedNotification = {
            text, 
            type, 
            options,
            queued: true
        };
        
        this.queue.push(queuedNotification);
        
        return queuedNotification;
    }
    
    /**
     * Process the notification queue
     * 
     * @private
     */
    _processQueue() {
        if (this.isPaused || this.queue.length === 0 || 
            this.notifications.length >= this.maxNotifications) {
            return;
        }
        
        const now = Date.now();
        if (now - this.lastNotificationTime < this.cooldown) {
            // Not enough time has passed, try again later
            setTimeout(() => this._processQueue(), this.cooldown);
            return;
        }
        
        // Display the next notification
        const next = this.queue.shift();
        this.addNotification(next.text, next.type, next.options);
    }
}


