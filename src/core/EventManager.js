/**
 * Centralized event management system for the RIFT UI.
 * Provides a pub/sub pattern for components to communicate without tight coupling.
 * Events have namespaced types using two formats:
 * - Standard events: 'namespace:action' (e.g., 'health:changed')
 * - Component-specific events: 'namespace:id:action' (e.g., 'ui:health-display:visible')
 * Implements Event Standardization guidelines with validation and helper methods.
 * Includes performance tracking for high-frequency events.
 * 
 * @author Cline
 */
class EventManager {
    /**
     * Initialize the EventManager
     */
    constructor() {
        this._events = new Map();
        this._subscriptionId = 0;
        this._debugMode = false;
        this._validateEventNames = false;
        this._validateEventPayloads = false;
        this._standardNamespaces = [
            'player', 'health', 'weapon', 'ammo', 'enemy', 
            'hit', 'combat', 'objective', 'ui', 'menu', 
            'notification', 'achievement', 'xp', 'environment',
            'powerup', 'input', 'game', 'round', 'system'
        ];
        
        // Performance tracking properties
        this._performanceTracking = false;
        this._eventFrequency = new Map();
        this._eventExecutionTime = new Map();
        this._eventMaxExecutionTime = new Map();
        this._eventAverageTime = new Map();
        this._highFrequencyThreshold = 60; // Events per second considered high frequency
        this._trackingStartTime = 0;
        this._lastReportTime = 0;
        this._reportIntervalMs = 5000; // Report performance data every 5 seconds in debug mode
    }
    
    /**
     * Subscribe to an event
     * @param {String} eventType - The event type to subscribe to (format: namespace:action)
     * @param {Function} handler - The event handler function
     * @return {Object} A subscription object with id and eventType
     */
    subscribe(eventType, handler) {
        // Validate event name format if enabled
        if (this._validateEventNames && !this._isValidEventName(eventType)) {
            console.warn(`[EventManager] Event name '${eventType}' does not follow either the namespace:action or namespace:id:action pattern`);
        }
        const id = this._subscriptionId++;
        
        if (!this._events.has(eventType)) {
            this._events.set(eventType, new Map());
        }
        
        this._events.get(eventType).set(id, handler);
        
        if (this._debugMode) {
            console.log(`[EventManager] New subscription #${id} to '${eventType}'`);
        }
        
        return { id, eventType };
    }
    
    /**
     * Unsubscribe from an event
     * @param {Object} subscription - The subscription object returned by subscribe
     * @return {Boolean} Whether the unsubscription was successful
     */
    unsubscribe(subscription) {
        if (!subscription || !subscription.eventType) {
            return false;
        }
        
        const eventHandlers = this._events.get(subscription.eventType);
        if (eventHandlers) {
            const result = eventHandlers.delete(subscription.id);
            
            if (this._debugMode && result) {
                console.log(`[EventManager] Unsubscribed #${subscription.id} from '${subscription.eventType}'`);
            }
            
            // Clean up empty event maps
            if (eventHandlers.size === 0) {
                this._events.delete(subscription.eventType);
            }
            
            return result;
        }
        
        return false;
    }
    
    /**
     * Emit an event
     * @param {String} eventType - The event type to emit (format: namespace:action)
     * @param {Object} data - The event data
     */
    emit(eventType, data = {}) {
        // Validate event name format if enabled
        if (this._validateEventNames && !this._isValidEventName(eventType)) {
            console.warn(`[EventManager] Event name '${eventType}' does not follow either the namespace:action or namespace:id:action pattern`);
        }
        
        // Validate event payload if enabled
        if (this._validateEventPayloads) {
            this._validatePayload(eventType, data);
        }
        
        // Track event frequency if performance tracking is enabled
        if (this._performanceTracking) {
            this._trackEventFrequency(eventType);
        }
        
        const eventHandlers = this._events.get(eventType);
        
        if (!eventHandlers) {
            if (this._debugMode) {
                console.log(`[EventManager] Event '${eventType}' emitted but no handlers registered`);
            }
            return;
        }
        
        if (this._debugMode) {
            console.log(`[EventManager] Emitting '${eventType}' to ${eventHandlers.size} handlers`, data);
        }
        
        // Create a standard event object
        const eventObject = {
            type: eventType,  // Event type (redundant but helpful)
            timestamp: performance.now(),  // Time of event
            ...data  // Spread the event data
        };
        
        // Track execution time if performance tracking is enabled
        if (this._performanceTracking) {
            const startTime = performance.now();
            
            eventHandlers.forEach((handler, id) => {
                try {
                    const handlerStartTime = performance.now();
                    handler(eventObject);
                    const handlerExecutionTime = performance.now() - handlerStartTime;
                    
                    // Track execution time for this specific handler
                    this._trackHandlerExecutionTime(eventType, handlerExecutionTime);
                } catch (error) {
                    console.error(`[EventManager] Error in handler #${id} for '${eventType}':`, error);
                }
            });
            
            const totalExecutionTime = performance.now() - startTime;
            this._trackTotalExecutionTime(eventType, totalExecutionTime, eventHandlers.size);
            
            // Periodically report performance data in debug mode
            this._checkPerformanceReport();
        } else {
            // Standard execution without performance tracking
            eventHandlers.forEach((handler, id) => {
                try {
                    handler(eventObject);
                } catch (error) {
                    console.error(`[EventManager] Error in handler #${id} for '${eventType}':`, error);
                }
            });
        }
    }
    
    /**
     * Check if an event type has subscribers
     * @param {String} eventType - The event type to check
     * @return {Boolean} Whether the event type has any subscribers
     */
    hasSubscribers(eventType) {
        const handlers = this._events.get(eventType);
        return handlers ? handlers.size > 0 : false;
    }
    
    /**
     * Get the count of subscribers for an event type
     * @param {String} eventType - The event type to check
     * @return {Number} The number of subscribers
     */
    subscriberCount(eventType) {
        const handlers = this._events.get(eventType);
        return handlers ? handlers.size : 0;
    }
    
    /**
     * Alias for subscribe
     * @param {String} eventType - The event type to subscribe to
     * @param {Function} handler - The event handler function
     * @return {Object} A subscription object with id and eventType
     */
    on(eventType, handler) {
        return this.subscribe(eventType, handler);
    }
    
    /**
     * Alias for unsubscribe
     * @param {String} eventType - The event type to unsubscribe from
     * @param {Function} handler - The event handler function
     * @return {Boolean} Whether the unsubscription was successful
     */
    off(eventType, handler) {
        // Find the subscription with matching handler
        let subscription = null;
        const handlers = this._events.get(eventType);
        
        if (handlers) {
            handlers.forEach((h, id) => {
                if (h === handler) {
                    subscription = { id, eventType };
                }
            });
        }
        
        return subscription ? this.unsubscribe(subscription) : false;
    }
    
    /**
     * Enable or disable event name validation
     * @param {Boolean} enabled - Whether to enable validation
     */
    setValidateEventNames(enabled) {
        this._validateEventNames = enabled;
        
        if (enabled && this._debugMode) {
            console.log('[EventManager] Event name validation enabled');
        }
    }
    
    /**
     * Enable or disable event payload validation
     * @param {Boolean} enabled - Whether to enable validation
     */
    setValidateEventPayloads(enabled) {
        this._validateEventPayloads = enabled;
        
        if (enabled && this._debugMode) {
            console.log('[EventManager] Event payload validation enabled');
        }
    }
    
    /**
     * Enable or disable debug logging
     * @param {Boolean} enabled - Whether to enable debug logging
     */
    setDebugMode(enabled) {
        this._debugMode = enabled;
    }
    
    /**
     * Create a standardized state change event payload
     * @param {String} namespace - The event namespace
     * @param {*} newValue - Current value
     * @param {*} previousValue - Previous value
     * @param {*} [delta] - Amount changed (optional)
     * @param {*} [max] - Maximum possible value (optional)
     * @param {String} [source] - What caused the change (optional)
     * @return {Object} Standardized state change event object
     */
    createStateChangeEvent(namespace, newValue, previousValue, delta, max, source) {
        return {
            value: newValue,
            previous: previousValue,
            ...(delta !== undefined && { delta }),
            ...(max !== undefined && { max }),
            ...(source !== undefined && { source })
        };
    }
    
    /**
     * Create a standardized combat event payload
     * @param {Object} source - Source entity data
     * @param {Object} target - Target entity data
     * @param {Object} [weapon] - Weapon data (optional)
     * @param {Number} [damage] - Damage amount (optional)
     * @param {Boolean} [isCritical] - Critical hit (optional)
     * @param {Boolean} [isHeadshot] - Headshot (optional)
     * @param {Object} [direction] - Direction vector (optional)
     * @return {Object} Standardized combat event object
     */
    createCombatEvent(source, target, weapon, damage, isCritical, isHeadshot, direction) {
        return {
            source,
            target,
            ...(weapon !== undefined && { weapon }),
            ...(damage !== undefined && { damage }),
            ...(isCritical !== undefined && { isCritical }),
            ...(isHeadshot !== undefined && { isHeadshot }),
            ...(direction !== undefined && { direction })
        };
    }
    
    /**
     * Create a standardized notification event payload
     * @param {String} message - Notification message
     * @param {String} category - Notification category
     * @param {Number} [duration] - Duration in milliseconds (optional)
     * @param {Number} [priority] - Priority level (optional)
     * @param {String} [id] - Unique ID for this notification (optional)
     * @param {String} [icon] - Icon to display (optional)
     * @param {Array} [actions] - Available actions (optional)
     * @return {Object} Standardized notification event object
     */
    createNotificationEvent(message, category, duration, priority, id, icon, actions) {
        return {
            message,
            category,
            ...(duration !== undefined && { duration }),
            ...(priority !== undefined && { priority }),
            ...(id !== undefined && { id }),
            ...(icon !== undefined && { icon }),
            ...(actions !== undefined && { actions })
        };
    }
    
    /**
     * Create a standardized player progress event payload
     * @param {Number} amount - Amount of XP or progress
     * @param {String} source - Source of progress
     * @param {Number} total - New total
     * @param {Object} [level] - Level information (optional)
     * @param {Array} [rewards] - Rewards earned (optional)
     * @return {Object} Standardized player progress event object
     */
    createProgressEvent(amount, source, total, level, rewards) {
        return {
            amount,
            source,
            total,
            ...(level !== undefined && { level }),
            ...(rewards !== undefined && { rewards })
        };
    }
    
    /**
     * Clear all event subscriptions
     */
    clear() {
        this._events.clear();
        if (this._debugMode) {
            console.log('[EventManager] All event subscriptions cleared');
        }
    }
    
    /**
     * Validate if an event name follows either the namespace:action pattern
     * or the namespace:id:action pattern (for component-specific events)
     * @param {String} eventName - Event name to validate
     * @return {Boolean} Whether the event name is valid
     * @private
     */
    _isValidEventName(eventName) {
        // Check for namespace:action or namespace:id:action pattern
        const parts = eventName.split(':');
        
        // Accept both 2-part and 3-part event names
        if (parts.length < 2 || parts.length > 3) return false;
        
        // For 2-part events: namespace:action
        if (parts.length === 2) {
            const [namespace, action] = parts;
            return namespace.length > 0 && action.length > 0;
        }
        
        // For 3-part events (component-specific): namespace:id:action
        if (parts.length === 3) {
            const [namespace, id, action] = parts;
            return namespace.length > 0 && id.length > 0 && action.length > 0;
        }
        
        return false;
    }
    
    /**
     * Validate event payload based on event type
     * @param {String} eventType - Event type
     * @param {Object} data - Event data
     * @private
     */
    _validatePayload(eventType, data) {
        const parts = eventType.split(':');
        
        // Skip validation if the event name doesn't match expected patterns
        if (parts.length < 2 || parts.length > 3) return;
        
        // Extract namespace and action
        let namespace, action;
        
        if (parts.length === 2) {
            // Two-part event: namespace:action
            [namespace, action] = parts;
        } else {
            // Three-part event: namespace:id:action
            [namespace, , action] = parts;
        }
        
        // Validate state change events
        if (action === 'changed' || action === 'visible' || action === 'hidden') {
            if (data.value === undefined && action === 'changed') {
                console.warn(`[EventManager] State change event '${eventType}' missing 'value' property`);
            }
            if (data.previous === undefined && action === 'changed') {
                console.warn(`[EventManager] State change event '${eventType}' missing 'previous' property`);
            }
        }
        
        // Validate combat-related events
        if (['hit', 'damaged', 'killed'].includes(action)) {
            if (!data.source) {
                console.warn(`[EventManager] Combat event '${eventType}' missing 'source' property`);
            }
            if (!data.target) {
                console.warn(`[EventManager] Combat event '${eventType}' missing 'target' property`);
            }
        }
        
        // Validate notification events
        if (namespace === 'notification') {
            if (!data.message) {
                console.warn(`[EventManager] Notification event '${eventType}' missing 'message' property`);
            }
            if (!data.category) {
                console.warn(`[EventManager] Notification event '${eventType}' missing 'category' property`);
            }
        }
        
        // Validate progress events
        if (namespace === 'xp' || action === 'progress') {
            if (data.amount === undefined) {
                console.warn(`[EventManager] Progress event '${eventType}' missing 'amount' property`);
            }
            if (!data.source) {
                console.warn(`[EventManager] Progress event '${eventType}' missing 'source' property`);
            }
        }
    }
    
    /**
     * Get all registered event types
     * @return {Array} Array of event types
     */
    getEventTypes() {
        return Array.from(this._events.keys());
    }
    
    /**
     * Get stats about registered events
     * @return {Object} Event stats
     */
    getStats() {
        const stats = {
            eventTypeCount: this._events.size,
            totalSubscriptions: 0,
            eventTypes: {}
        };
        
        this._events.forEach((handlers, eventType) => {
            const count = handlers.size;
            stats.totalSubscriptions += count;
            stats.eventTypes[eventType] = count;
        });
        
        return stats;
    }
    
    /**
     * Enable performance tracking
     * @param {Number} [highFrequencyThreshold=60] - Events per second considered high frequency
     * @param {Number} [reportInterval=5000] - How often to report performance in debug mode (ms)
     */
    enablePerformanceTracking(highFrequencyThreshold = 60, reportInterval = 5000) {
        this._performanceTracking = true;
        this._trackingStartTime = performance.now();
        this._lastReportTime = this._trackingStartTime;
        this._highFrequencyThreshold = highFrequencyThreshold;
        this._reportIntervalMs = reportInterval;
        this._resetPerformanceMetrics();
        
        if (this._debugMode) {
            console.log('[EventManager] Performance tracking enabled');
        }
    }
    
    /**
     * Disable performance tracking
     */
    disablePerformanceTracking() {
        this._performanceTracking = false;
        
        if (this._debugMode) {
            console.log('[EventManager] Performance tracking disabled');
        }
    }
    
    /**
     * Reset all performance metrics
     * @private
     */
    _resetPerformanceMetrics() {
        this._eventFrequency.clear();
        this._eventExecutionTime.clear();
        this._eventMaxExecutionTime.clear();
        this._eventAverageTime.clear();
        this._trackingStartTime = performance.now();
    }
    
    /**
     * Track event frequency
     * @param {String} eventType - Event type
     * @private
     */
    _trackEventFrequency(eventType) {
        const currentCount = this._eventFrequency.get(eventType) || 0;
        this._eventFrequency.set(eventType, currentCount + 1);
    }
    
    /**
     * Track handler execution time
     * @param {String} eventType - Event type
     * @param {Number} executionTime - Execution time in ms
     * @private
     */
    _trackHandlerExecutionTime(eventType, executionTime) {
        // Track maximum execution time
        const maxTime = this._eventMaxExecutionTime.get(eventType) || 0;
        if (executionTime > maxTime) {
            this._eventMaxExecutionTime.set(eventType, executionTime);
        }
    }
    
    /**
     * Track total execution time for all handlers of an event
     * @param {String} eventType - Event type
     * @param {Number} totalTime - Total execution time in ms
     * @param {Number} handlerCount - Number of handlers
     * @private
     */
    _trackTotalExecutionTime(eventType, totalTime, handlerCount) {
        // Track cumulative execution time
        const currentTotal = this._eventExecutionTime.get(eventType) || 0;
        this._eventExecutionTime.set(eventType, currentTotal + totalTime);
        
        // Update rolling average
        const currentAvg = this._eventAverageTime.get(eventType) || 0;
        const callCount = this._eventFrequency.get(eventType) || 1;
        const newAvg = ((currentAvg * (callCount - 1)) + (totalTime / handlerCount)) / callCount;
        this._eventAverageTime.set(eventType, newAvg);
    }
    
    /**
     * Check if it's time to report performance metrics
     * @private
     */
    _checkPerformanceReport() {
        if (!this._debugMode) return;
        
        const now = performance.now();
        if (now - this._lastReportTime > this._reportIntervalMs) {
            this._reportPerformanceMetrics();
            this._lastReportTime = now;
        }
    }
    
    /**
     * Report performance metrics to console in debug mode
     * @private
     */
    _reportPerformanceMetrics() {
        const highFrequencyEvents = this.getHighFrequencyEvents();
        const slowEvents = this.getSlowestEvents(5);
        
        if (highFrequencyEvents.length > 0) {
            console.log('[EventManager] High frequency events detected:', highFrequencyEvents);
        }
        
        if (slowEvents.length > 0) {
            console.log('[EventManager] Slowest events (avg handler time):', slowEvents);
        }
    }
    
    /**
     * Get all performance metrics
     * @return {Object} Performance metrics
     */
    getPerformanceMetrics() {
        const elapsedSeconds = (performance.now() - this._trackingStartTime) / 1000;
        const metrics = {
            trackingTimeSeconds: elapsedSeconds,
            eventCounts: {},
            eventsPerSecond: {},
            totalExecutionTime: {},
            maxExecutionTime: {},
            averageHandlerTime: {},
            highFrequencyEvents: this.getHighFrequencyEvents(),
            slowestEvents: this.getSlowestEvents(10)
        };
        
        // Process event frequency
        this._eventFrequency.forEach((count, eventType) => {
            metrics.eventCounts[eventType] = count;
            metrics.eventsPerSecond[eventType] = count / elapsedSeconds;
        });
        
        // Process execution times
        this._eventExecutionTime.forEach((time, eventType) => {
            metrics.totalExecutionTime[eventType] = time;
        });
        
        // Process max execution times
        this._eventMaxExecutionTime.forEach((time, eventType) => {
            metrics.maxExecutionTime[eventType] = time;
        });
        
        // Process average handler times
        this._eventAverageTime.forEach((time, eventType) => {
            metrics.averageHandlerTime[eventType] = time;
        });
        
        return metrics;
    }
    
    /**
     * Get high frequency events that might need optimization
     * @return {Array} Array of {eventType, frequency, avgTime} objects
     */
    getHighFrequencyEvents() {
        const result = [];
        const elapsedSeconds = (performance.now() - this._trackingStartTime) / 1000;
        
        this._eventFrequency.forEach((count, eventType) => {
            const frequency = count / elapsedSeconds;
            if (frequency >= this._highFrequencyThreshold) {
                result.push({
                    eventType,
                    frequency,
                    count,
                    avgTime: this._eventAverageTime.get(eventType) || 0,
                    totalTime: this._eventExecutionTime.get(eventType) || 0,
                    maxTime: this._eventMaxExecutionTime.get(eventType) || 0
                });
            }
        });
        
        // Sort by frequency (highest first)
        return result.sort((a, b) => b.frequency - a.frequency);
    }
    
    /**
     * Get the slowest events by average handler execution time
     * @param {Number} [limit=5] - Maximum number of events to return
     * @return {Array} Array of {eventType, avgTime, frequency} objects
     */
    getSlowestEvents(limit = 5) {
        const result = [];
        const elapsedSeconds = (performance.now() - this._trackingStartTime) / 1000;
        
        this._eventAverageTime.forEach((avgTime, eventType) => {
            const count = this._eventFrequency.get(eventType) || 0;
            result.push({
                eventType,
                avgTime,
                count,
                frequency: count / elapsedSeconds,
                totalTime: this._eventExecutionTime.get(eventType) || 0,
                maxTime: this._eventMaxExecutionTime.get(eventType) || 0
            });
        });
        
        // Sort by average time (highest first) and limit results
        return result.sort((a, b) => b.avgTime - a.avgTime).slice(0, limit);
    }
    
    /**
     * Reset performance metrics and start fresh tracking
     */
    resetPerformanceMetrics() {
        this._resetPerformanceMetrics();
        
        if (this._debugMode) {
            console.log('[EventManager] Performance metrics reset');
        }
    }
}

// Create singleton instance
const eventManagerInstance = new EventManager();

// Export as a module and also attach to window for global access
export { eventManagerInstance as EventManager };

// Make available globally (only in browser environments)
if (typeof window !== 'undefined') {
    window.EventManager = eventManagerInstance;
}
