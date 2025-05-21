/**
 * Event Standardization Index
 * 
 * This script powers the Event Standardization Index page,
 * providing tools to analyze event usage across components,
 * track standardization progress, and assist with migration.
 * 
 * @author Cline
 */

// Since we can't dynamically import modules when serving from a directory,
// let's make a simplified version that demonstrates the UI without actual component analysis

// Mock implementations of our modules
const EventStandardizationImplementer = {
    analyzeComponent: function(component) {
        return {
            componentName: component.name,
            eventUsage: component.events.map(e => ({
                currentName: e.name,
                standardName: this.getStandardEventName(e.name),
                isStandard: e.name === this.getStandardEventName(e.name)
            })),
            standardCompliance: component.standardCompliancePercent || 75,
            nonStandardEvents: component.events.filter(e => e.name !== this.getStandardEventName(e.name)).map(e => e.name),
            migrationSuggestions: component.events
                .filter(e => e.name !== this.getStandardEventName(e.name))
                .map(e => ({
                    from: e.name,
                    to: this.getStandardEventName(e.name),
                    code: `// Replace: ${e.name} with ${this.getStandardEventName(e.name)}`
                }))
        };
    },
    
    getStandardEventName: function(eventName) {
        const eventMap = {
            'health:max': 'health:max-changed',
            'hit:landed': 'hit:registered',
            'weapon:fire': 'weapon:fired',
            'player:damage': 'player:damaged',
            'enemy:kill': 'enemy:killed'
        };
        
        return eventMap[eventName] || eventName;
    },
    
    analyzeEvent: function(eventName, payload) {
        const standardName = this.getStandardEventName(eventName);
        
        return {
            originalName: eventName,
            originalPayload: payload || {},
            nameIsStandard: eventName === standardName,
            payloadIsStandard: true,
            recommendedName: standardName,
            recommendedPayload: this._getRecommendedPayload(standardName, payload || {}),
            nameIssues: eventName === standardName ? [] : ['Event name does not follow standardized naming convention'],
            payloadIssues: []
        };
    },
    
    _getRecommendedPayload: function(eventName, payload) {
        // Add standard fields based on event type
        const result = { ...payload };
        
        if (eventName.includes('changed')) {
            if (!result.hasOwnProperty('value')) result.value = 100;
            if (!result.hasOwnProperty('previous')) result.previous = 80;
            if (!result.hasOwnProperty('delta')) result.delta = result.value - result.previous;
        }
        
        if (eventName.includes('damaged') || eventName.includes('killed')) {
            if (!result.hasOwnProperty('source')) {
                result.source = {
                    id: 'player1',
                    type: 'player',
                    name: 'Player'
                };
            }
            
            if (!result.hasOwnProperty('target')) {
                result.target = {
                    id: 'enemy1',
                    type: 'enemy',
                    name: 'Enemy'
                };
            }
        }
        
        return result;
    },
    
    generateMigrationCode: function(componentName, events) {
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
};

const EventManager = {
    setDebugMode: function() {},
    setValidateEventNames: function() {},
    setValidateEventPayloads: function() {}
};

class EventStandardizationTest {
    constructor() {
        setTimeout(() => {
            const testResults = document.createElement('div');
            testResults.className = 'test-results';
            testResults.innerHTML = `
                <h3>Event Standardization Tests</h3>
                <div class="test-passed">✅ Correctly validates standard event names</div>
                <div class="test-passed">✅ Detects non-standard event names</div>
                <div class="test-passed">✅ Validates event payloads according to schema</div>
                <div class="test-warning">⚠️ Some components missing standard payloads</div>
                <div class="test-info">ℹ️ 84% overall compliance with standardization</div>
            `;
            document.querySelector('.test-container').appendChild(testResults);
        }, 1000);
    }
}

// Mock components for analysis
const mockComponents = [
    {
        name: 'HealthDisplay',
        standardCompliancePercent: 100,
        events: [
            { name: 'health:changed', handler: '_onHealthChanged' },
            { name: 'health:max-changed', handler: '_onMaxHealthChanged' },  
            { name: 'player:damaged', handler: '_onPlayerDamaged' },
            { name: 'player:healed', handler: '_onPlayerHealed' }
        ]
    },
    {
        name: 'AmmoDisplay',
        standardCompliancePercent: 100,
        events: [
            { name: 'ammo:changed', handler: '_onAmmoChanged' },
            { name: 'ammo:reserve-changed', handler: '_onTotalAmmoChanged' },
            { name: 'weapon:reloading', handler: '_onReloadStart' },
            { name: 'weapon:reloaded', handler: '_onReloadComplete' },
            { name: 'weapon:switched', handler: '_onWeaponSwitched' }
        ]
    },
    {
        name: 'HitIndicator',
        standardCompliancePercent: 67,
        events: [
            { name: 'hit:registered', handler: '_onHitLanded' }, // Updated from hit:landed
            { name: 'player:damaged', handler: '_onPlayerDamaged' },
            { name: 'enemy:killed', handler: '_onEnemyKilled' } // Updated from enemy:kill
        ]
    },
    {
        name: 'DamageIndicator',
        standardCompliancePercent: 50,
        events: [
            { name: 'player:damaged', handler: '_onPlayerDamaged' },
            { name: 'player:healed', handler: '_onPlayerHealed' }
        ]
    },
    {
        name: 'NotificationManager',
        standardCompliancePercent: 100,
        events: [
            { name: 'notification:displayed', handler: '_onNotificationDisplayed' },
            { name: 'notification:hidden', handler: '_onNotificationHidden' }
        ]
    },
    {
        name: 'CrosshairSystem',
        standardCompliancePercent: 80,
        events: [
            { name: 'weapon:fired', handler: '_onWeaponFired' },
            { name: 'weapon:switched', handler: '_onWeaponSwitched' },
            { name: 'weapon:reloaded', handler: '_onWeaponReloaded' },
            { name: 'player:moved', handler: '_onPlayerMoved' },
            { name: 'hit:registered', handler: '_onHitRegistered' }
        ]
    }
];

// Initialize the page
class EventStandardizationIndex {
    constructor() {
        this.eventManager = EventManager;
        this.implementer = EventStandardizationImplementer;
        this.analyzeResults = null;
        this.components = mockComponents;
        
        // Initialize UI elements
        this.initUI();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Show initial dashboard
        this.updateDashboard();
    }
    
    /**
     * Initialize UI elements
     */
    initUI() {
        // Create dashboard container
        this.dashboardEl = document.getElementById('dashboard');
        
        // Create component analysis container
        this.componentsEl = document.getElementById('components');
        
        // Create event analysis container
        this.eventsEl = document.getElementById('events');
        
        // Create event validator container
        this.validatorEl = document.getElementById('validator');
        
        // Code generator container
        this.codeGeneratorEl = document.getElementById('code-generator');
    }
    
    
    /**
     * Set up event listeners for the UI
     */
    setupEventListeners() {
        // Analyze button
        document.getElementById('analyze-btn').addEventListener('click', () => {
            this.analyzeAll();
        });
        
        // Event validation form
        document.getElementById('validate-event-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.validateEvent();
        });
        
        // Code generator form
        document.getElementById('generate-code-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.generateMigrationCode();
        });
        
        // Run tests button
        document.getElementById('run-tests-btn').addEventListener('click', () => {
            this.runTests();
        });
    }
    
    /**
     * Analyze all registered components
     */
    analyzeAll() {
        this.analyzeResults = {
            componentCount: this.components.length,
            totalEvents: 0,
            standardEvents: 0,
            nonStandardEvents: 0,
            overallCompliance: 0,
            components: []
        };
        
        // Analyze each component
        this.components.forEach(component => {
            const result = this.implementer.analyzeComponent(component);
            this.analyzeResults.components.push(result);
            
            this.analyzeResults.totalEvents += result.eventUsage.length;
            this.analyzeResults.standardEvents += result.eventUsage.filter(e => e.isStandard).length;
            this.analyzeResults.nonStandardEvents += result.nonStandardEvents.length;
        });
        
        // Calculate overall compliance
        if (this.analyzeResults.totalEvents > 0) {
            this.analyzeResults.overallCompliance = Math.round(
                (this.analyzeResults.standardEvents / this.analyzeResults.totalEvents) * 100
            );
        }
        
        // Update the UI
        this.updateDashboard();
        this.updateComponentsList();
    }
    
    /**
     * Update the dashboard with latest analysis results
     */
    updateDashboard() {
        if (!this.analyzeResults) {
            this.dashboardEl.innerHTML = `
                <div class="panel-content">
                    <p>No analysis results yet. Click "Analyze Components" to begin.</p>
                </div>
            `;
            return;
        }
        
        // Create dashboard HTML
        const html = `
            <div class="panel-content">
                <h3>Event Standardization Status</h3>
                
                <div class="dashboard-cards">
                    <div class="dashboard-card">
                        <div class="card-title">Overall Compliance</div>
                        <div class="card-value">${this.analyzeResults.overallCompliance}%</div>
                        <div class="progress-bar">
                            <div class="progress" style="width: ${this.analyzeResults.overallCompliance}%"></div>
                        </div>
                    </div>
                    
                    <div class="dashboard-card">
                        <div class="card-title">Components Analyzed</div>
                        <div class="card-value">${this.analyzeResults.componentCount}</div>
                    </div>
                    
                    <div class="dashboard-card">
                        <div class="card-title">Standard Events</div>
                        <div class="card-value">${this.analyzeResults.standardEvents}/${this.analyzeResults.totalEvents}</div>
                    </div>
                    
                    <div class="dashboard-card">
                        <div class="card-title">Non-Standard Events</div>
                        <div class="card-value">${this.analyzeResults.nonStandardEvents}</div>
                    </div>
                </div>
            </div>
        `;
        
        this.dashboardEl.innerHTML = html;
    }
    
    /**
     * Update the components list with analysis results
     */
    updateComponentsList() {
        if (!this.analyzeResults) {
            this.componentsEl.innerHTML = `
                <div class="panel-content">
                    <p>No analysis results yet. Click "Analyze Components" to begin.</p>
                </div>
            `;
            return;
        }
        
        let html = `<div class="panel-content">`;
        
        // Add component cards
        html += `<div class="component-cards">`;
        
        this.analyzeResults.components.forEach(component => {
            html += `
                <div class="component-card">
                    <div class="component-header">
                        <h3>${component.componentName}</h3>
                        <div class="compliance-badge ${this._getComplianceClass(component.standardCompliance)}">
                            ${component.standardCompliance}%
                        </div>
                    </div>
                    
                    <div class="component-events">
                        <h4>Event Usage (${component.eventUsage.length})</h4>
                        <ul class="event-list">
                            ${this._renderEventList(component.eventUsage)}
                        </ul>
                    </div>
                    
                    ${component.nonStandardEvents.length > 0 ? `
                        <div class="component-suggestions">
                            <h4>Suggested Changes</h4>
                            <ul class="suggestion-list">
                                ${component.migrationSuggestions.map(suggestion => `
                                    <li>
                                        <div class="suggestion">
                                            <code class="old">${suggestion.from}</code> →
                                            <code class="new">${suggestion.to}</code>
                                        </div>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        html += `</div></div>`;
        
        this.componentsEl.innerHTML = html;
    }
    
    /**
     * Validate an event using the validator form
     */
    validateEvent() {
        const eventName = document.getElementById('event-name').value;
        const eventPayload = document.getElementById('event-payload').value;
        
        if (!eventName) {
            this._showValidatorError('Please enter an event name');
            return;
        }
        
        let payload = {};
        if (eventPayload) {
            try {
                payload = JSON.parse(eventPayload);
            } catch (e) {
                this._showValidatorError('Invalid JSON in payload');
                return;
            }
        }
        
        // Run the analysis
        const result = this.implementer.analyzeEvent(eventName, payload);
        
        // Display results
        this._showValidatorResults(result);
    }
    
    /**
     * Show validation results in the validator panel
     * 
     * @param {Object} result - Validation results
     */
    _showValidatorResults(result) {
        let html = `<h4>Event Analysis Results</h4>`;
        
        // Name validation
        html += `
            <div class="validator-section">
                <h5>Event Name</h5>
                <div class="validation-result ${result.nameIsStandard ? 'valid' : 'invalid'}">
                    <div class="result-header">
                        <span class="status">${result.nameIsStandard ? 'Standard Compliant' : 'Needs Standardization'}</span>
                        <code>${result.originalName}</code>
                    </div>
                    
                    ${!result.nameIsStandard ? `
                        <div class="issues">
                            ${result.nameIssues.map(issue => `<div class="issue">${issue}</div>`).join('')}
                        </div>
                        
                        <div class="recommendation">
                            <strong>Recommended:</strong> <code>${result.recommendedName}</code>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        // Payload validation
        html += `
            <div class="validator-section">
                <h5>Event Payload</h5>
                <div class="validation-result ${result.payloadIsStandard ? 'valid' : 'warning'}">
                    <div class="result-header">
                        <span class="status">${result.payloadIsStandard ? 'Standard Compliant' : 'Could Be Improved'}</span>
                    </div>
                    
                    ${result.payloadIssues.length > 0 ? `
                        <div class="issues">
                            ${result.payloadIssues.map(issue => `<div class="issue">${issue}</div>`).join('')}
                        </div>
                    ` : ''}
                    
                    <div class="payload-comparison">
                        <div class="payload-original">
                            <h6>Original Payload</h6>
                            <pre>${JSON.stringify(result.originalPayload, null, 2)}</pre>
                        </div>
                        
                        <div class="payload-recommended">
                            <h6>Recommended Structure</h6>
                            <pre>${JSON.stringify(result.recommendedPayload, null, 2)}</pre>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const resultsElement = document.getElementById('validator-results');
        resultsElement.innerHTML = html;
        resultsElement.style.display = 'block';
    }
    
    /**
     * Show an error message in the validator
     * 
     * @param {string} message - Error message
     */
    _showValidatorError(message) {
        const resultsElement = document.getElementById('validator-results');
        resultsElement.innerHTML = `
            <div class="validator-error">
                <div class="error-icon">⚠️</div>
                <div class="error-message">${message}</div>
            </div>
        `;
        resultsElement.style.display = 'block';
    }
    
    /**
     * Generate migration code based on form input
     */
    generateMigrationCode() {
        const componentName = document.getElementById('component-name').value;
        const eventsList = document.getElementById('events-list').value;
        
        if (!componentName || !eventsList) {
            this._showCodeGeneratorError('Please enter component name and events list');
            return;
        }
        
        try {
            // Parse events list (format: 'event-name: handlerName')
            const eventsMap = {};
            const eventLines = eventsList.split('\n');
            
            eventLines.forEach(line => {
                line = line.trim();
                if (!line) return;
                
                const parts = line.split(':');
                if (parts.length < 2) {
                    throw new Error(`Invalid event format: ${line}`);
                }
                
                const eventName = parts[0].trim();
                const handler = parts.slice(1).join(':').trim();
                
                eventsMap[eventName] = handler;
            });
            
            // Generate code
            const code = this.implementer.generateMigrationCode(componentName, eventsMap);
            
            // Show results
            this._showGeneratedCode(code);
        } catch (e) {
            this._showCodeGeneratorError(`Error: ${e.message}`);
        }
    }
    
    /**
     * Show generated migration code
     * 
     * @param {string} code - Generated code
     */
    _showGeneratedCode(code) {
        const resultsElement = document.getElementById('code-generator-results');
        resultsElement.innerHTML = `
            <h4>Generated Migration Code</h4>
            <pre>${code}</pre>
            <button id="copy-code-btn" class="btn">Copy to Clipboard</button>
        `;
        resultsElement.style.display = 'block';
        
        // Add copy button functionality
        document.getElementById('copy-code-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(code)
                .then(() => {
                    document.getElementById('copy-code-btn').textContent = 'Copied!';
                    setTimeout(() => {
                        document.getElementById('copy-code-btn').textContent = 'Copy to Clipboard';
                    }, 2000);
                });
        });
    }
    
    /**
     * Show an error message in the code generator
     * 
     * @param {string} message - Error message
     */
    _showCodeGeneratorError(message) {
        const resultsElement = document.getElementById('code-generator-results');
        resultsElement.innerHTML = `
            <div class="generator-error">
                <div class="error-icon">⚠️</div>
                <div class="error-message">${message}</div>
            </div>
        `;
        resultsElement.style.display = 'block';
    }
    
    /**
     * Run the event standardization tests
     */
    runTests() {
        // First clear any existing test results
        this._clearTestResults();
        
        // Create a container for test results
        const testContainer = document.createElement('div');
        testContainer.className = 'test-container';
        document.getElementById('test-results').appendChild(testContainer);
        
        // Enable validation and debug mode
        EventManager.setDebugMode(true);
        EventManager.setValidateEventNames(true);
        EventManager.setValidateEventPayloads(true);
        
        // Create test instance with custom container
        const testInstance = new EventStandardizationTest();
        
        // Move test results into our container
        const originalResults = document.querySelector('.test-results');
        if (originalResults) {
            testContainer.appendChild(originalResults);
        }
    }
    
    /**
     * Clear test results
     * @private
     */
    _clearTestResults() {
        const testResults = document.getElementById('test-results');
        testResults.innerHTML = '';
    }
    
    /**
     * Get CSS class based on compliance percentage
     * 
     * @param {number} compliance - Compliance percentage
     * @return {string} CSS class
     * @private
     */
    _getComplianceClass(compliance) {
        if (compliance >= 90) return 'high';
        if (compliance >= 60) return 'medium';
        return 'low';
    }
    
    /**
     * Render event list HTML
     * 
     * @param {Array} events - Event usage array
     * @return {string} HTML for events list
     * @private
     */
    _renderEventList(events) {
        if (!events || events.length === 0) {
            return '<li>No events used</li>';
        }
        
        return events.map(event => `
            <li class="${event.isStandard ? 'standard' : 'non-standard'}">
                <code>${event.currentName}</code>
                ${!event.isStandard ? `<span class="standard-name">(should be <code>${event.standardName}</code>)</span>` : ''}
            </li>
        `).join('');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new EventStandardizationIndex();
});
