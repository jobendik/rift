/**
 * EnhancedNotificationManager Component
 * 
 * An optimized version of NotificationManager that uses the ElementPool utility
 * for more efficient DOM element reuse. Features include:
 * - Informational messages
 * - Success notifications
 * - Warning alerts
 * - Error messages
 * - Element pooling for improved performance
 * - Block container optimization
 * 
 * @extends UIComponent
 */

import UIComponent from '../UIComponent.js';
import { DOMFactory } from '../../../utils/DOMFactory.js';
import { EventManager } from '../../../core/EventManager.js';
import { ElementPool } from '../../../utils/ElementPool.js';
import { UIConfig } from '../../../core/UIConfig.js';

export class EnhancedNotificationManager extends UIComponent {
    /**
     * Create a new EnhancedNotificationManager
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
        
        // Element pool (will be initialized in init)
        this.notificationPool = null;
        
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
        
        // Initialize element pool
        this._initElementPool();
        
        // Set up event listeners
        this._setupEventListeners();
        
        // Set initialized flag early to prevent infinite recursion
        this.isInitialized = true;
        
        return this;
    }

    /**
     * Initialize element pool for notifications
     * @private
     */
    _initElementPool() {
        // Create custom element creation function for notifications
        const createNotificationFn = () => {
            const element = document.createElement('div');
            element.className = 'rift-notification';
            element.style.display = 'none'; // Initially hidden
            return element;
        };
        
        // Create custom reset function for notifications
        const resetNotificationFn = (element) => {
            // Reset basic properties
            element.textContent = '';
            element.className = 'rift-notification';
            
            // Clear inline styles except display
            const wasHidden = element.style.display === 'none';
            element.style = '';
            if (wasHidden) {
                element.style.display = 'none';
            }
            
            // Remove any child elements
            while (element.firstChild) {
                element.removeChild(element.firstChild);
            }
        };
        
        // Create the notification pool
        this.notificationPool = new ElementPool({
            elementType: 'div',
            createFn: createNotificationFn,
            resetFn: resetNotificationFn,
            container: this.element,
            className: 'rift-notification',
            initialSize: this.maxNotifications,
            maxSize: this.maxNotifications * 2, // Allow for some buffer
            useBlocks: true,
            blockSize: 5
        });
    }
    
    /**
     * Set up event listeners for notification events
     * @private
     */
    _setupEventListeners() {
        this.eventSubscriptions.push(
            EventManager.subscribe('notification:displayed', this._onNotificationDisplay.bind(this))
        );
        
        this.eventSubscriptions.push(
            EventManager.subscribe('notification:dismissed', this._onNotificationClear.bind(this))
        );
        
        this.eventSubscriptions.push(
            EventManager.subscribe('game:paused', () => this.pauseTimers())
        );
        
        this.eventSubscriptions.push(
            EventManager.subscribe('game:resumed', () => this.resumeTimers())
        );
        
        this.eventSubscriptions.push(
            EventManager.subscribe('achievement:unlocked', this._onAchievementUnlocked.bind(this))
        );
        
        this.eventSubscriptions.push(
            EventManager.subscribe('objective:completed', this._onObjectiveCompleted.bind(this))
        );
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
        
        // Create notification using the element pool
        const notification = this._createNotification(text, type, options);
        
        // Add to tracked notifications
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
        
        // Release all notifications
        this.notifications.forEach(notification => {
            if (notification.release) {
                notification.release();
            }
        });
        this.notifications = [];
        this.queue = [];
        
        // Dispose element pool
        if (this.notificationPool) {
            this.notificationPool.dispose();
            this.notificationPool = null;
        }
        
        // Unsubscribe from events
        this.eventSubscriptions.forEach(subscription => {
            EventManager.unsubscribe(subscription);
        });
        this.eventSubscriptions = [];
        
        // Call parent dispose
        super.dispose();
        
        return this;
    }
    
    /**
     * Handle notification:displayed event
     * @param {Object} event - Standardized notification event
     * @param {string} event.message - The notification message text
     * @param {string} event.category - Notification category (e.g., "info", "warning")
     * @param {number} event.duration - Duration to display the notification in milliseconds
     * @param {number} event.priority - Priority level of the notification
     * @param {string} event.id - Unique identifier for the notification
     * @param {string} event.icon - Icon to display with the notification
     * @private
     */
    _onNotificationDisplay(event) {
        // Map notification category to type
        const typeMap = {
            'info': 'info',
            'warning': 'warning',
            'error': 'error',
            'success': 'success',
            'achievement': 'success',
            'objective': 'info'
        };
        
        const type = typeMap[event.category] || 'info';
        const options = {
            title: event.title,
            duration: event.duration,
            dismissible: true,
            onDismiss: () => {
                // Emit notification:dismissed event
                EventManager.emit('notification:dismissed', {
                    id: event.id,
                    category: event.category
                });
            },
            id: event.id
        };
        
        this.addNotification(event.message, type, options);
    }
    
    /**
     * Handle notification:dismissed event
     * @param {Object} event - Event data
     * @param {string} event.id - Optional ID of notification to clear, if not provided all notifications will be cleared
     * @param {string} event.category - Optional category of notifications to clear
     * @private
     */
    _onNotificationClear(event) {
        if (!event.id && !event.category) {
            // Clear all notifications if no specific ID or category
            this.clearAll();
            return;
        }
        
        // Filter notifications to dismiss based on ID or category
        const notificationsToDismiss = this.notifications.filter(notif => {
            if (event.id && notif.options && notif.options.id === event.id) {
                return true;
            }
            if (event.category && notif.type === event.category) {
                return true;
            }
            return false;
        });
        
        // Dismiss matching notifications
        notificationsToDismiss.forEach(notif => {
            this._dismissNotification(notif);
        });
    }
    
    /**
     * Handle achievement:unlocked event
     * @param {Object} event - Achievement event data
     * @private
     */
    _onAchievementUnlocked(event) {
        const options = {
            title: 'Achievement Unlocked',
            duration: 6000, // Show achievements for longer
            dismissible: true,
            id: `achievement-${event.id || Date.now()}`
        };
        
        this.addNotification(event.name || event.message, 'success', options);
    }
    
    /**
     * Handle objective:completed event
     * @param {Object} event - Objective event data
     * @private
     */
    _onObjectiveCompleted(event) {
        const options = {
            title: 'Objective Completed',
            duration: 5000,
            dismissible: true,
            id: `objective-${event.id || Date.now()}`
        };
        
        this.addNotification(event.description || event.message, 'info', options);
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
            
            // Store remaining time
            notification.remainingTime = notification.expireTime - this.pauseStartTime;
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
            const timeRemaining = notification.remainingTime || 
                (notification.expireTime - this.pauseStartTime);
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
                if (notification.release) {
                    notification.release();
                }
            }, this.fadeDuration);
        });
        
        this.notifications = [];
        
        return this;
    }
    
    /**
     * Create a notification using element from pool
     * 
     * @private
     * @param {string} text - Notification message
     * @param {string} type - Notification type
     * @param {Object} options - Additional options
     * @returns {Object} - Notification object with DOM element and metadata
     */
    _createNotification(text, type = 'info', options = {}) {
        // Get element from pool
        const { element, release } = this.notificationPool.acquire();
        
        // Create notification object
        const notification = {
            element,
            release,
            type,
            options,
            expireTime: Date.now() + (options.duration || this.displayDuration)
        };
        
        // Set display to block and add appropriate classes
        element.style.display = 'block';
        element.className = `rift-notification rift-notification--${type}`;
        
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
            element.appendChild(header);
        }
        
        // Add content
        const content = DOMFactory.createElement({
            type: 'div',
            classes: ['rift-notification__content'],
            text: text
        });
        element.appendChild(content);
        
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
            
            element.appendChild(closeBtn);
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
        element.appendChild(progressContainer);
        
        return notification;
    }
    
    /**
     * Dismiss a notification with animation
     * 
     * @private
     * @param {Object} notification - Notification to dismiss
     */
    _dismissNotification(notification) {
        // If already removed or no element, ignore
        if (!notification || !notification.element) {
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
        
        // Release element back to pool after animation completes
        setTimeout(() => {
            if (notification.release) {
                notification.release();
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
    
    /**
     * Test method to generate a simulated notification
     * For development/debugging only
     * 
     * @param {string} [type='info'] - Notification type ('info', 'success', 'warning', 'error')
     * @param {boolean} [withTitle=false] - Whether to include a title
     */
    testNotification(type = 'info', withTitle = false) {
        const types = ['info', 'success', 'warning', 'error'];
        const titles = ['System Message', 'Success', 'Warning', 'Error'];
        const messages = [
            'This is a test notification message',
            'Operation completed successfully',
            'Please check your settings',
            'An error occurred during the operation',
            'New items available in the inventory',
            'Mission updated with new objectives',
            'Connection status changed'
        ];
        
        const notificationType = types.includes(type) ? type : types[Math.floor(Math.random() * types.length)];
        const message = messages[Math.floor(Math.random() * messages.length)];
        const options = {};
        
        if (withTitle) {
            options.title = titles[types.indexOf(notificationType)];
        }
        
        this.addNotification(message, notificationType, options);
        
        console.log(`Test notification: ${notificationType}${withTitle ? ' with title' : ''}`, message);
    }
    
    /**
     * Test method to generate a burst of notifications
     * For development/debugging and performance testing only
     * 
     * @param {number} [count=5] - Number of notifications to create
     * @param {number} [delay=300] - Delay between notifications in ms
     */
    testNotificationBurst(count = 5, delay = 300) {
        const types = ['info', 'success', 'warning', 'error'];
        
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const type = types[Math.floor(Math.random() * types.length)];
                const withTitle = Math.random() > 0.5;
                this.testNotification(type, withTitle);
            }, i * delay);
        }
        
        console.log(`Testing notification burst: ${count} notifications with ${delay}ms delay`);
    }
}
