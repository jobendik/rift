/**
 * Centralized event management system for the RIFT UI.
 * Provides a pub/sub pattern for components to communicate without tight coupling.
 * Events have namespaced types (e.g., 'health:changed') and standardized data structures.
 * Implements Event Standardization guidelines with validation and helper methods.
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
            console.warn(`[EventManager] Event name '${eventType}' does not follow the namespace:action pattern`);
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
            console.warn(`[EventManager] Event name '${eventType}' does not follow the namespace:action pattern`);
        }
        
        // Validate event payload if enabled
        if (this._validateEventPayloads) {
            this._validatePayload(eventType, data);
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
        
        eventHandlers.forEach((handler, id) => {
            try {
                handler(eventObject);
            } catch (error) {
                console.error(`[EventManager] Error in handler #${id} for '${eventType}':`, error);
            }
        });
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
     * Validate if an event name follows the namespace:action pattern
     * @param {String} eventName - Event name to validate
     * @return {Boolean} Whether the event name is valid
     * @private
     */
    _isValidEventName(eventName) {
        // Check for namespace:action pattern
        const parts = eventName.split(':');
        if (parts.length !== 2) return false;
        
        const [namespace, action] = parts;
        
        // Check if namespace is one of the standard ones
        return namespace.length > 0 && action.length > 0;
    }
    
    /**
     * Validate event payload based on event type
     * @param {String} eventType - Event type
     * @param {Object} data - Event data
     * @private
     */
    _validatePayload(eventType, data) {
        const parts = eventType.split(':');
        if (parts.length !== 2) return;
        
        const [namespace, action] = parts;
        
        // Validate state change events
        if (action === 'changed') {
            if (data.value === undefined) {
                console.warn(`[EventManager] State change event '${eventType}' missing 'value' property`);
            }
            if (data.previous === undefined) {
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
}

// Create singleton instance
const eventManagerInstance = new EventManager();

// Export as a module and also attach to window for global access
export { eventManagerInstance as EventManager };

// Make available globally (only in browser environments)
if (typeof window !== 'undefined') {
    window.EventManager = eventManagerInstance;
}
