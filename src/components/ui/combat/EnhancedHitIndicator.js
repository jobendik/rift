/**
 * EnhancedHitIndicator Component
 *
 * An optimized version of HitIndicator that uses the ElementPool utility
 * for more efficient DOM element reuse. Displays visual feedback when the player hits an enemy.
 * Shows different indicators for:
 * - Regular hits
 * - Critical hits
 * - Headshots
 * - Directional damage indicators
 * - Kill confirmations
 *
 * @extends UIComponent
 */

import { EventManager } from '../../../core/EventManager.js';
import UIComponent from '../UIComponent.js';
import { DOMFactory } from '../../../utils/DOMFactory.js';
import { ElementPool } from '../../../utils/ElementPool.js';
import { UIConfig } from '../../../core/UIConfig.js';

class EnhancedHitIndicator extends UIComponent {
    /**
     * Create a new EnhancedHitIndicator component
     * 
     * @param {Object} options - Component configuration options
     * @param {HTMLElement} options.container - Container element for the hit indicator
     * @param {number} [options.hitDuration=500] - Duration of hit marker display in ms
     * @param {number} [options.directionDuration=800] - Duration of directional indicator display in ms
     * @param {number} [options.killDuration=1000] - Duration of kill confirmation display in ms
     * @param {number} [options.maxHitMarkers=10] - Maximum number of simultaneous hit markers
     * @param {number} [options.maxDirectionIndicators=8] - Maximum number of simultaneous directional indicators
     */
    constructor(options = {}) {
        super({
            id: options.id || 'enhanced-hit-indicator',
            className: 'rift-hit-indicator',
            container: options.container || document.body,
            autoInit: false, // Prevent auto-init to control initialization order
            ...options
        });

        // Configuration options with defaults
        this.hitDuration = options.hitDuration || UIConfig.hitIndicator?.hitDuration || 500;
        this.directionDuration = options.directionDuration || UIConfig.hitIndicator?.directionDuration || 800;
        this.killDuration = options.killDuration || UIConfig.hitIndicator?.killDuration || 1000;
        this.maxHitMarkers = options.maxHitMarkers || UIConfig.hitIndicator?.maxHitMarkers || 10;
        this.maxDirectionIndicators = options.maxDirectionIndicators || UIConfig.hitIndicator?.maxDirectionIndicators || 8;

        // Internal state
        this.activeHitMarkers = [];
        this.activeDirectionIndicators = [];
        this.activeKillConfirmations = [];
        this.lastKillTime = 0;

        // Element pools (will be initialized in init)
        this.hitMarkerPool = null;
        this.directionPool = null;
        this.killConfirmationPool = null;
        
        // Now initialize manually after all properties are set
        this.init();
    }

    /**
     * Initialize the hit indicator component
     */
    init() {
        if (this.isInitialized) return this;
        
        // Call parent init first to properly set up the component
        super.init();
        
        // Create hit indicator container
        this.directionContainer = DOMFactory.createElement('div', {
            className: 'rift-hit-indicator__direction-container',
            parent: this.element
        });
        
        // Initialize element pools
        this._initElementPools();
        
        // Register event listeners
        this._registerEventListeners();
        
        this.isInitialized = true;
        this.isActive = true;
        
        return this;
    }

    /**
     * Initialize the element pools for hit indicators
     * @private
     */
    _initElementPools() {
        // Hit marker pool
        this.hitMarkerPool = new ElementPool({
            elementType: 'div',
            container: this.element,
            className: 'rift-hit-indicator__marker',
            initialSize: this.maxHitMarkers,
            maxSize: this.maxHitMarkers * 2,
            useBlocks: true,
            blockSize: 5,
            createFn: () => {
                const element = document.createElement('div');
                element.className = 'rift-hit-indicator__marker';
                element.style.display = 'none'; // Initially hidden
                return element;
            },
            resetFn: (element) => {
                // Reset to base class
                element.className = 'rift-hit-indicator__marker';
                element.style.display = 'none';
                // Clear any inline styles except display
                const displayValue = element.style.display;
                element.style = '';
                element.style.display = displayValue;
            }
        });
        
        // Direction indicator pool
        this.directionPool = new ElementPool({
            elementType: 'div',
            container: this.directionContainer,
            className: 'rift-hit-indicator__direction',
            initialSize: this.maxDirectionIndicators,
            maxSize: this.maxDirectionIndicators * 1.5,
            useBlocks: true,
            blockSize: 4,
            createFn: () => {
                const element = document.createElement('div');
                element.className = 'rift-hit-indicator__direction';
                element.style.display = 'none'; // Initially hidden
                return element;
            },
            resetFn: (element) => {
                // Reset to base class
                element.className = 'rift-hit-indicator__direction';
                element.style.display = 'none';
                // Clear any inline styles except display
                const displayValue = element.style.display;
                element.style = '';
                element.style.display = displayValue;
            }
        });
        
        // Kill confirmation pool
        this.killConfirmationPool = new ElementPool({
            elementType: 'div',
            container: this.element,
            className: 'rift-hit-indicator__kill',
            initialSize: 2, // We don't need many of these
            maxSize: 5,
            createFn: () => {
                const element = document.createElement('div');
                element.className = 'rift-hit-indicator__kill';
                element.style.display = 'none'; // Initially hidden
                return element;
            },
            resetFn: (element) => {
                // Reset to base class
                element.className = 'rift-hit-indicator__kill';
                element.style.display = 'none';
                // Clear any inline styles except display
                const displayValue = element.style.display;
                element.style = '';
                element.style.display = displayValue;
            }
        });
    }

    /**
     * Update animation states
     * 
     * @param {number} delta - Time since last update in ms
     */
    update(delta) {
        if (!this.isActive || !this.isVisible) return;

        // Get current time for expiry checks
        const now = performance.now();
        const markersToRemove = [];
        const directionsToRemove = [];
        const killsToRemove = [];
        
        // Check hit markers for expiry
        this.activeHitMarkers.forEach((marker, index) => {
            if (now >= marker.expiryTime) {
                markersToRemove.push(index);
                marker.element.style.display = 'none';
            }
        });
        
        // Check direction indicators for expiry
        this.activeDirectionIndicators.forEach((indicator, index) => {
            if (now >= indicator.expiryTime) {
                directionsToRemove.push(index);
                indicator.element.style.display = 'none';
            }
        });
        
        // Check kill confirmations for expiry
        this.activeKillConfirmations.forEach((kill, index) => {
            if (now >= kill.expiryTime) {
                killsToRemove.push(index);
                kill.element.style.display = 'none';
            }
        });
        
        // Remove expired elements (in reverse order to avoid index shifting)
        for (let i = markersToRemove.length - 1; i >= 0; i--) {
            const index = markersToRemove[i];
            const marker = this.activeHitMarkers[index];
            if (marker.release) {
                marker.release();
            }
            this.activeHitMarkers.splice(index, 1);
        }
        
        for (let i = directionsToRemove.length - 1; i >= 0; i--) {
            const index = directionsToRemove[i];
            const indicator = this.activeDirectionIndicators[index];
            if (indicator.release) {
                indicator.release();
            }
            this.activeDirectionIndicators.splice(index, 1);
        }
        
        for (let i = killsToRemove.length - 1; i >= 0; i--) {
            const index = killsToRemove[i];
            const kill = this.activeKillConfirmations[index];
            if (kill.release) {
                kill.release();
            }
            this.activeKillConfirmations.splice(index, 1);
        }
        
        // Process standard animations
        this._updateAnimations(delta);
        
        return this;
    }

    /**
     * Display a hit marker for the specified hit type
     * 
     * @param {Object} options - Hit marker options
     * @param {boolean} [options.isCritical=false] - Whether the hit was a critical hit
     * @param {boolean} [options.isHeadshot=false] - Whether the hit was a headshot
     * @param {Function} [options.callback] - Optional callback when hit marker finishes
     */
    showHitMarker(options = {}) {
        if (!this.isActive || !this.isVisible) return this;

        // Get an element from the hit marker pool
        const { element, release } = this.hitMarkerPool.acquire();
        if (!element) return this; // No available elements
        
        // Make the element visible
        element.style.display = 'block';
        
        // Determine hit marker type based on options
        let markerClass = 'rift-hit-indicator__marker--hit';
        if (options.isHeadshot) {
            markerClass = 'rift-hit-indicator__marker--headshot';
        } else if (options.isCritical) {
            markerClass = 'rift-hit-indicator__marker--critical';
        }
        
        // Set element class and apply active state
        element.className = `rift-hit-indicator__marker ${markerClass}`;
        element.classList.add('rift-hit-indicator__marker--active');
        
        // Calculate expiry time
        const now = performance.now();
        const expiryTime = now + this.hitDuration;
        
        // Store reference to active marker
        const marker = {
            element,
            release,
            expiryTime,
            callback: options.callback
        };
        
        this.activeHitMarkers.push(marker);
        
        // Schedule cleanup
        setTimeout(() => {
            element.classList.remove('rift-hit-indicator__marker--active');
            
            // Execute callback if provided
            if (typeof options.callback === 'function') {
                options.callback();
            }
        }, this.hitDuration);
        
        return this;
    }

    /**
     * Display a directional damage indicator
     * 
     * @param {Object} options - Damage direction options
     * @param {string} options.direction - Direction ('top', 'right', 'bottom', 'left') or angle in degrees
     * @param {number} [options.intensity=1] - Damage intensity (0-1)
     * @param {Function} [options.callback] - Optional callback when indicator finishes
     */
    showDamageDirection(options = {}) {
        if (!this.isActive || !this.isVisible || !options.direction) return this;

        // Get an element from the direction pool
        const { element, release } = this.directionPool.acquire();
        if (!element) return this; // No available elements
        
        // Make the element visible
        element.style.display = 'block';
        
        // Determine which direction to show
        let direction = options.direction;
        
        // Handle numeric angles
        if (!isNaN(direction)) {
            const angle = parseFloat(direction);
            // Convert angle to closest cardinal direction
            if ((angle >= 315 && angle <= 360) || (angle >= 0 && angle < 45)) {
                direction = 'right';
            } else if (angle >= 45 && angle < 135) {
                direction = 'bottom';
            } else if (angle >= 135 && angle < 225) {
                direction = 'left';
            } else {
                direction = 'top';
            }
        }
        
        // Apply direction-specific class and active state
        element.className = `rift-hit-indicator__direction rift-hit-indicator__direction--${direction}`;
        element.classList.add('rift-hit-indicator__direction--active');
        
        // Apply intensity via opacity
        const intensity = Math.min(Math.max(options.intensity || 1, 0.3), 1);
        element.style.opacity = intensity;
        
        // Calculate expiry time
        const now = performance.now();
        const expiryTime = now + this.directionDuration;
        
        // Store reference to active indicator
        const indicator = {
            element,
            release,
            expiryTime,
            direction,
            callback: options.callback
        };
        
        this.activeDirectionIndicators.push(indicator);
        
        // Schedule cleanup
        setTimeout(() => {
            element.classList.remove('rift-hit-indicator__direction--active');
            
            // Execute callback if provided
            if (typeof options.callback === 'function') {
                options.callback();
            }
        }, this.directionDuration);
        
        return this;
    }

    /**
     * Display a kill confirmation animation
     * 
     * @param {Object} options - Kill confirmation options
     * @param {boolean} [options.isHeadshot=false] - Whether it was a headshot kill
     * @param {Function} [options.callback] - Optional callback when confirmation finishes
     */
    showKillConfirmation(options = {}) {
        if (!this.isActive || !this.isVisible) return this;

        // Prevent kill confirmation spam by enforcing a minimum interval
        const now = performance.now();
        if (now - this.lastKillTime < 500) return this;
        this.lastKillTime = now;
        
        // Get an element from the kill confirmation pool
        const { element, release } = this.killConfirmationPool.acquire();
        if (!element) return this; // No available elements
        
        // Make the element visible
        element.style.display = 'block';
        
        // Apply headshot styling if needed
        let killClass = 'rift-hit-indicator__kill';
        if (options.isHeadshot) {
            killClass += ' rift-hit-indicator__kill--headshot';
        }
        
        // Set element class and apply active state
        element.className = killClass;
        element.classList.add('rift-hit-indicator__kill--active');
        
        // Calculate expiry time
        const expiryTime = now + this.killDuration;
        
        // Store reference to active kill confirmation
        const kill = {
            element,
            release,
            expiryTime,
            callback: options.callback
        };
        
        this.activeKillConfirmations.push(kill);
        
        // Schedule cleanup
        setTimeout(() => {
            element.classList.remove('rift-hit-indicator__kill--active');
            
            // Execute callback if provided
            if (typeof options.callback === 'function') {
                options.callback();
            }
        }, this.killDuration);
        
        return this;
    }

    /**
     * Clear all active hit markers and direction indicators
     */
    clearAllIndicators() {
        // Clear hit markers
        this.activeHitMarkers.forEach(marker => {
            marker.element.style.display = 'none';
            if (marker.release) {
                marker.release();
            }
        });
        this.activeHitMarkers = [];
        
        // Clear direction indicators
        this.activeDirectionIndicators.forEach(indicator => {
            indicator.element.style.display = 'none';
            if (indicator.release) {
                indicator.release();
            }
        });
        this.activeDirectionIndicators = [];
        
        // Clear kill confirmations
        this.activeKillConfirmations.forEach(kill => {
            kill.element.style.display = 'none';
            if (kill.release) {
                kill.release();
            }
        });
        this.activeKillConfirmations = [];
        
        return this;
    }

    /**
     * Clean up resources when disposing the component
     */
    dispose() {
        // Clear all active indicators first
        this.clearAllIndicators();
        
        // Dispose element pools
        if (this.hitMarkerPool) {
            this.hitMarkerPool.dispose();
            this.hitMarkerPool = null;
        }
        
        if (this.directionPool) {
            this.directionPool.dispose();
            this.directionPool = null;
        }
        
        if (this.killConfirmationPool) {
            this.killConfirmationPool.dispose();
            this.killConfirmationPool = null;
        }
        
        // Call parent dispose method to handle event unsubscribing and DOM removal
        super.dispose();
        
        return this;
    }

    /**
     * Register event listeners for hit indicator
     * @private
     */
    _registerEventListeners() {
        // Register using standardized event names
        this.registerEvents({
            // Handle hit events
            'hit:registered': this._onHitLanded.bind(this),
            
            // Handle damage events (for directional indicators)
            'player:damaged': this._onPlayerDamaged.bind(this),
            
            // Handle kill events
            'enemy:killed': this._onEnemyKilled.bind(this),
            
            // Handle game state changes
            'game:paused': () => this.clearAllIndicators(),
            'game:resumed': () => this.clearAllIndicators()
        });
    }

    /**
     * Handle hit events
     * @private
     * @param {Object} event - Hit event data
     */
    _onHitLanded(event) {
        this.showHitMarker({
            isCritical: event.isCritical,
            isHeadshot: event.isHeadshot
        });
    }

    /**
     * Handle player damage events
     * @private
     * @param {Object} event - Damage event data
     */
    _onPlayerDamaged(event) {
        if (!event.direction) return;
        
        this.showDamageDirection({
            direction: event.direction,
            intensity: Math.min(event.damage / 20, 1) // Scale intensity based on damage amount
        });
    }

    /**
     * Handle enemy killed events
     * @private
     * @param {Object} event - Kill event data
     */
    _onEnemyKilled(event) {
        this.showKillConfirmation({
            isHeadshot: event.isHeadshot
        });
    }

    /**
     * Test method to display a hit marker
     * For development/debugging only
     * 
     * @param {string} type - Type of hit ('normal', 'critical', 'headshot')
     */
    testHitMarker(type = 'normal') {
        this.showHitMarker({
            isCritical: type === 'critical',
            isHeadshot: type === 'headshot'
        });
        
        console.log(`Test hit marker: ${type}`);
    }

    /**
     * Test method to display a directional indicator
     * For development/debugging only
     * 
     * @param {string} direction - Direction to show ('top', 'right', 'bottom', 'left')
     * @param {number} intensity - Damage intensity (0-1)
     */
    testDirectionIndicator(direction = 'top', intensity = 1) {
        this.showDamageDirection({
            direction,
            intensity
        });
        
        console.log(`Test direction indicator: ${direction} (intensity: ${intensity})`);
    }

    /**
     * Test method to display a kill confirmation
     * For development/debugging only
     * 
     * @param {boolean} isHeadshot - Whether to show headshot kill confirmation
     */
    testKillConfirmation(isHeadshot = false) {
        this.showKillConfirmation({
            isHeadshot
        });
        
        console.log(`Test kill confirmation: ${isHeadshot ? 'headshot' : 'normal'}`);
    }

    /**
     * Test method to display a multi-kill notification
     * For development/debugging only
     * 
     * @param {number} killCount - Number of kills in the multi-kill (2 = double, 3 = triple, etc.)
     */
    testMultiKill(killCount = 2) {
        // Show a series of hit markers in quick succession
        for (let i = 0; i < killCount; i++) {
            setTimeout(() => {
                this.showHitMarker({
                    isCritical: Math.random() > 0.7,
                    isHeadshot: Math.random() > 0.7
                });
                
                // Show kill confirmation for final kill
                if (i === killCount - 1) {
                    this.showKillConfirmation({
                        isHeadshot: Math.random() > 0.5
                    });
                }
            }, i * 150); // 150ms between markers
        }
        
        console.log(`Test multi-kill: ${killCount} kills`);
    }

    /**
     * Test method to display a sequence of kills over time
     * For development/debugging only
     * 
     * @param {number} killCount - Number of kills in sequence
     * @param {number} interval - Time between kills in ms
     */
    testKillSequence(killCount = 4, interval = 500) {
        for (let i = 0; i < killCount; i++) {
            setTimeout(() => {
                // Show hit marker
                this.showHitMarker({
                    isCritical: Math.random() > 0.5,
                    isHeadshot: Math.random() > 0.7
                });
                
                // Show kill confirmation
                this.showKillConfirmation({
                    isHeadshot: Math.random() > 0.7
                });
            }, i * interval);
        }
        
        console.log(`Test kill sequence: ${killCount} kills with ${interval}ms interval`);
    }
}

export { EnhancedHitIndicator };
