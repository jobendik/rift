/**
 * EventStandardizationImplementer
 * 
 * A utility class to help implement the Event Standardization guidelines across the codebase.
 * It provides methods to audit components for non-standardized events, generate reports,
 * and tools to assist with the migration.
 * 
 * @author Cline
 */

import { EventManager } from './EventManager.js';

export class EventStandardizationImplementer {
    constructor() {
        // Known old event names mapped to standardized event names
        this.eventNameMap = {
            // UIComponent internal events
            'ui:initialized': 'ui:initialize',
            'ui:visible': 'ui:show',
            'ui:hidden': 'ui:hide',
            'ui:disposed': 'ui:dispose',
            
            // Health events
            'health:max': 'health:max-changed',
            'health:changed': 'health:changed', // Already correct
            
            // Hit events
            'hit:landed': 'hit:registered', 
            
            // Combat events
            'combat:start': 'combat:started',
            'combat:end': 'combat:ended',
            
            // Ammo events
            'ammo:changed': 'ammo:changed', // Already correct
            'ammo:reload': 'ammo:reloaded',
            'ammo:empty': 'ammo:depleted',
            
            // Weapon events
            'weapon:switch': 'weapon:switched',
            'weapon:fire': 'weapon:fired',
            'weapon:reload': 'weapon:reloaded',
            
            // Game state events
            'game:pause': 'game:paused',
            'game:resume': 'game:resumed',
            'game:end': 'game:ended',
            'game:start': 'game:started',
            
            // Player events
            'player:damage': 'player:damaged',
            'player:heal': 'player:healed',
            'player:death': 'player:died',
            'player:respawn': 'player:spawned',
            
            // Enemy events
            'enemy:kill': 'enemy:killed',
            'enemy:damage': 'enemy:damaged',
            'enemy:spawn': 'enemy:spawned',
            
            // XP events
            'xp:gain': 'xp:gained',
            'xp:level': 'xp:levelup',
            
            // Notification events
            'notification:show': 'notification:displayed',
            'notification:hide': 'notification:hidden',
            'notification:dismiss': 'notification:dismissed',
            
            // Menu events
            'menu:open': 'menu:opened',
            'menu:close': 'menu:closed',
            
            // UI events
            'ui:resize': 'ui:resized',
            'ui:update': 'ui:updated',
            
            // Input events
            'input:key': 'input:keydown',
            'input:mouse': 'input:mousemove',
            'input:click': 'input:mousedown'
        };
        
        // Standard namespaces defined in the guidelines
        this.standardNamespaces = [
            'player', 'health', 'weapon', 'ammo', 'enemy', 
            'hit', 'combat', 'objective', 'ui', 'menu', 
            'notification', 'achievement', 'xp', 'environment',
            'powerup', 'input', 'game', 'round', 'system'
        ];
        
        // Standard event payloads by event type pattern
        this.eventPayloadTemplates = {
            // State change events (e.g., health:changed, ammo:changed)
            'changed': {
                value: null,     // Current value
                previous: null,  // Previous value
                delta: null,     // Amount changed (optional)
                max: null,       // Maximum possible value (optional)
                source: null     // What caused the change (optional)
            },
            
            // Combat events (e.g., hit:registered, enemy:damaged)
            'combat': {
                source: {        // Source entity
                    id: null,    // Entity ID
                    type: null,  // Entity type (player, enemy, etc.)
                    name: null,  // Entity name (optional)
                    position: null // 3D position (optional)
                },
                target: {        // Target entity
                    id: null,
                    type: null,
                    name: null,
                    position: null
                },
                weapon: {        // Weapon used (optional)
                    id: null,
                    type: null,
                    name: null
                },
                damage: null,      // Damage amount (optional)
                isCritical: null,  // Critical hit (optional)
                isHeadshot: null,  // Headshot (optional)
                direction: null    // Direction vector (optional)
            },
            
            // Notification events (e.g., notification:displayed)
            'notification': {
                message: null,     // Notification message
                category: null,    // Notification category
                duration: null,    // Duration in milliseconds
                priority: null,    // Priority level
                id: null,          // Unique ID for this notification (optional)
                icon: null,        // Icon to display (optional)
                actions: null      // Available actions (optional)
            },
            
            // Progress events (e.g., xp:gained)
            'progress': {
                amount: null,      // Amount of XP
                source: null,      // Source of XP
                total: null,       // New total XP
                level: {           // Level information (optional)
                    current: null, // Current level
                    previous: null, // Previous level
                    isLevelUp: null // Whether this caused a level up
                },
                rewards: null      // Any rewards earned (optional)
            }
        };
    }
    
    /**
     * Get the standardized event name for a given event
     * 
     * @param {string} eventName - The event name to standardize
     * @return {string} The standardized event name
     */
    getStandardEventName(eventName) {
        // If it's already in the map, return the mapped value
        if (this.eventNameMap[eventName]) {
            return this.eventNameMap[eventName];
        }
        
        // Check if the event follows namespace:action pattern
        const parts = eventName.split(':');
        if (parts.length !== 2) {
            console.warn(`Event name '${eventName}' does not follow the namespace:action pattern`);
            return eventName;
        }
        
        const [namespace, action] = parts;
        
        // Check if namespace is one of the standard ones
        if (!this.standardNamespaces.includes(namespace)) {
            console.warn(`Event namespace '${namespace}' is not in the standard namespaces list`);
        }
        
        // Return the original name if it already follows the pattern
        return eventName;
    }
    
    /**
     * Get a standardized event payload template for a given event type
     * 
     * @param {string} eventType - The event type (e.g., health:changed)
     * @return {Object} A template object for the event payload
     */
    getEventPayloadTemplate(eventType) {
        const parts = eventType.split(':');
        if (parts.length !== 2) return {};
        
        const [namespace, action] = parts;
        
        // Determine payload type based on event pattern
        let templateType = null;
        
        // State change events
        if (action === 'changed' || action.endsWith('-changed')) {
            templateType = 'changed';
        }
        // Combat events
        else if (['damaged', 'killed', 'registered', 'hit'].includes(action) || 
                 ['hit', 'combat'].includes(namespace)) {
            templateType = 'combat';
        }
        // Notification events
        else if (namespace === 'notification') {
            templateType = 'notification';
        }
        // Progress events
        else if (namespace === 'xp' || action === 'progress' || action === 'gained') {
            templateType = 'progress';
        }
        
        // Return the appropriate template or an empty object
        return templateType ? {...this.eventPayloadTemplates[templateType]} : {};
    }
    
    /**
     * Create a standardized event object for an event type with provided data
     * 
     * @param {string} eventType - The event type (e.g., health:changed)
     * @param {Object} data - The event data
     * @return {Object} A standardized event object
     */
    createStandardEvent(eventType, data = {}) {
        const template = this.getEventPayloadTemplate(eventType);
        
        // Create base event object
        const event = {
            type: eventType,
            timestamp: performance.now()
        };
        
        // Merge data with template structure
        if (Object.keys(template).length > 0) {
            // For each top-level property in the template
            for (const key of Object.keys(template)) {
                // If data has this property and template has a nested object
                if (data[key] !== undefined) {
                    if (template[key] !== null && typeof template[key] === 'object') {
                        event[key] = {...template[key], ...data[key]};
                    } else {
                        event[key] = data[key];
                    }
                }
            }
        } else {
            // If no template is found, just use the data as-is
            Object.assign(event, data);
        }
        
        return event;
    }
    
    /**
     * Analyze an event and provide recommendations for standardization
     * 
     * @param {string} eventName - The event name to analyze
     * @param {Object} payload - The event payload to analyze
     * @return {Object} Analysis results with recommendations
     */
    analyzeEvent(eventName, payload = {}) {
        const results = {
            originalName: eventName,
            originalPayload: {...payload},
            nameIsStandard: false,
            payloadIsStandard: false,
            recommendedName: null,
            recommendedPayload: null,
            nameIssues: [],
            payloadIssues: []
        };
        
        // Check event name
        const parts = eventName.split(':');
        if (parts.length !== 2) {
            results.nameIssues.push(`Event name does not follow namespace:action pattern`);
        } else {
            const [namespace, action] = parts;
            
            if (!this.standardNamespaces.includes(namespace)) {
                results.nameIssues.push(`Namespace '${namespace}' is not in the standard namespaces list`);
            }
            
            if (action.length === 0) {
                results.nameIssues.push(`Action part is empty`);
            }
        }
        
        // Get recommended name
        results.recommendedName = this.getStandardEventName(eventName);
        results.nameIsStandard = (results.recommendedName === eventName && results.nameIssues.length === 0);
        
        // Check payload
        const template = this.getEventPayloadTemplate(results.recommendedName);
        results.recommendedPayload = this.createStandardEvent(results.recommendedName, payload);
        
        // If we have a template, check payload against it
        if (Object.keys(template).length > 0) {
            // Check for missing required fields
            for (const key of Object.keys(template)) {
                // Skip null properties in template (they're optional)
                if (template[key] === null) continue;
                
                // Check for missing fields
                if (payload[key] === undefined) {
                    results.payloadIssues.push(`Missing required field: ${key}`);
                }
                // Check for nested objects
                else if (typeof template[key] === 'object' && template[key] !== null) {
                    if (typeof payload[key] !== 'object' || payload[key] === null) {
                        results.payloadIssues.push(`Field ${key} should be an object`);
                    }
                }
            }
        }
        
        results.payloadIsStandard = results.payloadIssues.length === 0;
        
        return results;
    }
    
    /**
     * Generate helper code to migrate non-standard events in a component
     * 
     * @param {string} componentName - The name of the component 
     * @param {Object} events - Map of event names to handlers from the component
     * @return {string} Generated code to help migration
     */
    generateMigrationCode(componentName, events = {}) {
        let code = `// Event standardization migration for ${componentName}\n`;
        let hasChanges = false;
        
        // Add imports
        code += `import EventManager from '../../core/EventManager.js';\n\n`;
        
        code += `// Update your registerEvents call to use standardized event names:\n`;
        code += `this.registerEvents({\n`;
        
        // Process each event
        for (const [eventName, handler] of Object.entries(events)) {
            const standardName = this.getStandardEventName(eventName);
            if (standardName !== eventName) {
                hasChanges = true;
                code += `  '${standardName}': ${handler}, // Was: ${eventName}\n`;
            } else {
                code += `  '${eventName}': ${handler},\n`;
            }
        }
        
        code += `});\n\n`;
        
        if (!hasChanges) {
            code += `// All event names are already following the standard!`;
        }
        
        return code;
    }
    
    /**
     * Analyze a component's event subscriptions
     * 
     * @param {UIComponent} component - The component to analyze
     * @return {Object} Analysis results for the component
     */
    analyzeComponent(component) {
        const results = {
            componentName: component.constructor.name,
            eventUsage: [],
            standardCompliance: 0,
            nonStandardEvents: [],
            migrationSuggestions: []
        };
        
        // Extract event subscriptions from component
        const eventSubscriptions = component.eventSubscriptions || [];
        
        eventSubscriptions.forEach(sub => {
            const eventName = sub.eventType;
            const standardName = this.getStandardEventName(eventName);
            
            results.eventUsage.push({
                currentName: eventName,
                standardName,
                isStandard: (standardName === eventName)
            });
            
            if (standardName !== eventName) {
                results.nonStandardEvents.push(eventName);
                results.migrationSuggestions.push({
                    from: eventName,
                    to: standardName,
                    code: `// Replace: this.registerEvents({'${eventName}': handler});\n` +
                          `// With:    this.registerEvents({'${standardName}': handler});`
                });
            }
        });
        
        // Calculate compliance percentage
        if (results.eventUsage.length > 0) {
            const standardCount = results.eventUsage.filter(e => e.isStandard).length;
            results.standardCompliance = Math.round((standardCount / results.eventUsage.length) * 100);
        }
        
        return results;
    }
    
    /**
     * Generate documentation for standardized event usage
     * 
     * @param {string} eventName - The standardized event name
     * @return {string} JSDoc comment for the event handler
     */
    generateEventHandlerDocs(eventName) {
        const template = this.getEventPayloadTemplate(eventName);
        let docs = `/**\n * Handle ${eventName} event\n`;
        docs += ` * @param {Object} event - Standardized ${this._getEventCategory(eventName)} event\n`;
        
        // Add param docs for main payload properties
        for (const key of Object.keys(template)) {
            if (template[key] === null) {
                docs += ` * @param {*} event.${key} - ${this._getPropertyDescription(key)}\n`;
            }
            else if (typeof template[key] === 'object') {
                docs += ` * @param {Object} event.${key} - ${this._getPropertyDescription(key)}\n`;
                
                // Add nested properties if available
                for (const nestedKey of Object.keys(template[key])) {
                    docs += ` * @param {*} event.${key}.${nestedKey} - ${this._getPropertyDescription(`${key}.${nestedKey}`)}\n`;
                }
            }
        }
        
        docs += ` * @private\n */`;
        return docs;
    }
    
    /**
     * Get a description for an event property
     * 
     * @param {string} propertyPath - The property path (e.g., "value" or "source.id")
     * @return {string} Human-readable description
     * @private
     */
    _getPropertyDescription(propertyPath) {
        const descriptions = {
            // State change properties
            'value': 'Current value',
            'previous': 'Previous value',
            'delta': 'Amount changed',
            'max': 'Maximum possible value',
            'source': 'What caused the change',
            
            // Combat properties
            'source': 'Source entity information',
            'source.id': 'Unique identifier for the source entity',
            'source.type': 'Type of source entity (e.g., "player", "enemy")',
            'source.name': 'Name of the source entity',
            'source.position': '3D position of the source entity',
            
            'target': 'Target entity information',
            'target.id': 'Unique identifier for the target entity',
            'target.type': 'Type of target entity (e.g., "player", "enemy")',
            'target.name': 'Name of the target entity',
            'target.position': '3D position of the target entity',
            
            'weapon': 'Weapon information',
            'weapon.id': 'Unique identifier for the weapon',
            'weapon.type': 'Type of weapon (e.g., "rifle", "shotgun")',
            'weapon.name': 'Name of the weapon',
            
            'damage': 'Amount of damage dealt',
            'isCritical': 'Whether the hit was a critical hit',
            'isHeadshot': 'Whether the hit was a headshot',
            'direction': 'Direction vector of the hit',
            
            // Notification properties
            'message': 'The notification message text',
            'category': 'Notification category (e.g., "info", "warning")',
            'duration': 'Duration to display the notification in milliseconds',
            'priority': 'Priority level of the notification',
            'id': 'Unique identifier for the notification',
            'icon': 'Icon to display with the notification',
            'actions': 'Available actions for the notification',
            
            // Progress properties
            'amount': 'Amount of progress gained',
            'total': 'New total progress amount',
            'level': 'Level information',
            'level.current': 'Current level after the change',
            'level.previous': 'Previous level before the change',
            'level.isLevelUp': 'Whether this progress caused a level up',
            'rewards': 'Rewards earned from this progress'
        };
        
        return descriptions[propertyPath] || 'Event data';
    }
    
    /**
     * Get the category of an event based on its name
     * 
     * @param {string} eventName - The event name
     * @return {string} Category description
     * @private
     */
    _getEventCategory(eventName) {
        const parts = eventName.split(':');
        if (parts.length !== 2) return 'event';
        
        const [namespace, action] = parts;
        
        // Determine category based on event pattern
        if (action === 'changed' || action.endsWith('-changed')) {
            return 'state change';
        } else if (['damaged', 'killed', 'registered'].includes(action) || 
                   ['hit', 'combat'].includes(namespace)) {
            return 'combat';
        } else if (namespace === 'notification') {
            return 'notification';
        } else if (namespace === 'xp' || action === 'progress') {
            return 'progress';
        }
        
        return 'event';
    }
}

export default new EventStandardizationImplementer();
