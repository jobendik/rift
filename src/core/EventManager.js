/**
 * Centralized event management system for the RIFT UI.
 * Provides a pub/sub pattern for components to communicate without tight coupling.
 * Events have namespaced types (e.g., 'health:changed') and standardized data structures.
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
    }
    
    /**
     * Subscribe to an event
     * @param {String} eventType - The event type to subscribe to
     * @param {Function} handler - The event handler function
     * @return {Object} A subscription object with id and eventType
     */
    subscribe(eventType, handler) {
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
     * @param {String} eventType - The event type to emit
     * @param {Object} data - The event data
     */
    emit(eventType, data = {}) {
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
     * Enable or disable debug logging
     * @param {Boolean} enabled - Whether to enable debug logging
     */
    setDebugMode(enabled) {
        this._debugMode = enabled;
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
export default eventManagerInstance;
export { eventManagerInstance as EventManager };

// Make available globally (only in browser environments)
if (typeof window !== 'undefined') {
    window.EventManager = eventManagerInstance;
}
