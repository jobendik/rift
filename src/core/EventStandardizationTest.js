/**
 * Test file for Event Standardization implementation
 * This file demonstrates how to use the enhanced EventManager with standardized events
 * 
 * @author Cline
 */

import { EventManager } from './EventManager.js';

export class EventStandardizationTest {
    constructor() {
        this.testResults = document.createElement('div');
        this.testResults.className = 'test-results';
        document.body.appendChild(this.testResults);
        
        // Enable debug and validation
        EventManager.setDebugMode(true);
        EventManager.setValidateEventNames(true);
        EventManager.setValidateEventPayloads(true);
        
        this.logMessage('Event Standardization Test Initialized');
        this.runTests();
    }
    
    /**
     * Run all test cases
     */
    runTests() {
        this.testStateChangeEvents();
        this.testCombatEvents();
        this.testNotificationEvents();
        this.testProgressEvents();
        this.testNamingValidation();
        this.testEventAliases();
    }
    
    /**
     * Test state change event standardization
     */
    testStateChangeEvents() {
        this.logHeader('Testing State Change Events');
        
        // Create a state change event
        const healthChangeEvent = EventManager.createStateChangeEvent(
            'health',       // namespace
            80,             // new value
            100,            // previous value
            -20,            // delta
            100,            // max value
            'enemy-attack'  // source
        );
        
        // Subscribe to the event
        const subscription = EventManager.subscribe('health:changed', (event) => {
            this.logMessage(`Health changed: ${event.previous} → ${event.value} (${event.delta})`);
            this.logMessage(`Source: ${event.source}, Maximum: ${event.max}`);
        });
        
        // Emit the event
        EventManager.emit('health:changed', healthChangeEvent);
        
        // Unsubscribe after test
        EventManager.unsubscribe(subscription);
    }
    
    /**
     * Test combat event standardization
     */
    testCombatEvents() {
        this.logHeader('Testing Combat Events');
        
        // Create a combat event
        const hitEvent = EventManager.createCombatEvent(
            {                               // source
                id: 'player-1',
                type: 'player',
                name: 'Player',
                position: { x: 0, y: 1.8, z: 0 }
            },
            {                               // target
                id: 'enemy-442',
                type: 'enemy',
                name: 'Grunt',
                position: { x: 5, y: 1.8, z: 3 }
            },
            {                               // weapon
                id: 'weapon-2',
                type: 'rifle',
                name: 'Assault Rifle'
            },
            25,                             // damage
            false,                          // isCritical
            true,                           // isHeadshot
            { x: 0.7, y: 0, z: 0.3 }        // direction
        );
        
        // Subscribe to the event
        const subscription = EventManager.subscribe('hit:registered', (event) => {
            this.logMessage(`Hit registered: ${event.source.name} → ${event.target.name}`);
            this.logMessage(`Weapon: ${event.weapon.name}, Damage: ${event.damage}`);
            this.logMessage(`Headshot: ${event.isHeadshot}, Critical: ${event.isCritical}`);
        });
        
        // Emit the event
        EventManager.emit('hit:registered', hitEvent);
        
        // Unsubscribe after test
        EventManager.unsubscribe(subscription);
    }
    
    /**
     * Test notification event standardization
     */
    testNotificationEvents() {
        this.logHeader('Testing Notification Events');
        
        // Create a notification event
        const achievementEvent = EventManager.createNotificationEvent(
            'Sharpshooter',                  // message
            'achievement',                    // category
            5000,                             // duration
            2,                                // priority
            'achievement-sharpshooter',       // id
            'trophy-icon',                    // icon
            [{                                // actions
                label: 'View',
                action: 'view-achievement'
            }]
        );
        
        // Subscribe to the event
        const subscription = EventManager.subscribe('notification:achievement', (event) => {
            this.logMessage(`Achievement notification: ${event.message}`);
            this.logMessage(`Category: ${event.category}, Duration: ${event.duration}ms`);
            this.logMessage(`Priority: ${event.priority}, Icon: ${event.icon}`);
        });
        
        // Emit the event
        EventManager.emit('notification:achievement', achievementEvent);
        
        // Unsubscribe after test
        EventManager.unsubscribe(subscription);
    }
    
    /**
     * Test progress event standardization
     */
    testProgressEvents() {
        this.logHeader('Testing Progress Events');
        
        // Create a progress event
        const xpEvent = EventManager.createProgressEvent(
            100,                // amount
            'enemy-kill',       // source
            1250,               // total
            {                   // level
                current: 5,
                previous: 4,
                isLevelUp: true
            },
            ['skill-point']     // rewards
        );
        
        // Subscribe to the event
        const subscription = EventManager.subscribe('xp:gained', (event) => {
            this.logMessage(`XP gained: ${event.amount} from ${event.source}`);
            this.logMessage(`Total XP: ${event.total}, Level: ${event.level.previous} → ${event.level.current}`);
            this.logMessage(`Rewards: ${event.rewards.join(', ')}`);
        });
        
        // Emit the event
        EventManager.emit('xp:gained', xpEvent);
        
        // Unsubscribe after test
        EventManager.unsubscribe(subscription);
    }
    
    /**
     * Test event name validation
     */
    testNamingValidation() {
        this.logHeader('Testing Event Name Validation');
        
        // Valid event name
        EventManager.emit('player:jump', { height: 2 });
        
        // Invalid event name (missing namespace)
        EventManager.emit('jumped', { height: 2 });
        
        // Invalid event name (missing action)
        EventManager.emit('player:', { height: 2 });
        
        // Invalid event name (too many parts)
        EventManager.emit('player:jump:high', { height: 4 });
    }
    
    /**
     * Test event alias methods (on/off)
     */
    testEventAliases() {
        this.logHeader('Testing Event Aliases');
        
        // Handler function
        const handler = (event) => {
            this.logMessage(`Alias test: ${event.message}`);
        };
        
        // Subscribe using 'on' alias
        EventManager.on('test:alias', handler);
        
        // Emit the event
        EventManager.emit('test:alias', { message: 'This works with on/off aliases' });
        
        // Unsubscribe using 'off' alias
        EventManager.off('test:alias', handler);
        
        // Emit again (should not trigger handler)
        EventManager.emit('test:alias', { message: 'This should not appear' });
    }
    
    /**
     * Log a message to the test results
     * @param {String} message - Message to log
     */
    logMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'test-message';
        messageElement.textContent = message;
        this.testResults.appendChild(messageElement);
        console.log(message);
    }
    
    /**
     * Log a section header to the test results
     * @param {String} title - Header title
     */
    logHeader(title) {
        const headerElement = document.createElement('h3');
        headerElement.className = 'test-header';
        headerElement.textContent = title;
        this.testResults.appendChild(headerElement);
        console.log(`\n=== ${title} ===`);
    }
}

// Create test instance when included

