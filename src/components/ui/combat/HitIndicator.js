/**
 * HitIndicator Component
 *
 * Displays visual feedback when the player hits an enemy.
 * Shows different indicators for:
 * - Regular hits
 * - Critical hits
 * - Headshots
 * - Directional damage indicators
 * - Kill confirmations
 *
 * @extends UIComponent
 */

import EventManager from '../../../core/EventManager.js';
import UIComponent from '../UIComponent.js';
import DOMFactory from '../../../utils/DOMFactory.js';

class HitIndicator extends UIComponent {
    /**
     * Create a new HitIndicator component
     * 
     * @param {Object} options - Component configuration options
     * @param {HTMLElement} options.container - Container element for the hit indicator
     * @param {number} [options.hitDuration=500] - Duration of hit marker display in ms
     * @param {number} [options.directionDuration=800] - Duration of directional indicator display in ms
     * @param {number} [options.killDuration=1000] - Duration of kill confirmation display in ms
     */
    constructor(options = {}) {
        super({
            id: options.id || 'hit-indicator',
            className: 'rift-hit-indicator',
            container: options.container || document.body,
            ...options
        });

        // Configuration options with defaults
        this.hitDuration = options.hitDuration || 500;
        this.directionDuration = options.directionDuration || 800;
        this.killDuration = options.killDuration || 1000;

        // Internal state
        this.activeHitMarkers = new Set();
        this.activeDirectionIndicators = new Set();
        this.lastKillTime = 0;

        // DOM references (will be created in init)
        this.hitMarker = null;
        this.critHitMarker = null;
        this.headshotHitMarker = null;
        this.killConfirmation = null;
        this.directionContainer = null;
        this.directionIndicators = {
            top: null,
            right: null,
            bottom: null,
            left: null
        };
    }

    /**
     * Initialize the hit indicator component
     */
    init() {
        this._createHitElements();
        this._registerEventListeners();
        this.isInitialized = true;
        return this;
    }

    /**
     * Update animation states
     * 
     * @param {number} delta - Time since last update in ms
     */
    update(delta) {
        if (!this.isActive || !this.isVisible) return;

        // Process animations
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

        // Determine which marker to show based on hit type
        let marker;
        if (options.isHeadshot) {
            marker = this.headshotHitMarker;
        } else if (options.isCritical) {
            marker = this.critHitMarker;
        } else {
            marker = this.hitMarker;
        }

        // Add active class to trigger animation
        marker.classList.add('rift-hit-indicator__marker--active');
        
        // Track active marker for potential cleanup
        const markerId = Date.now() + Math.random();
        this.activeHitMarkers.add(markerId);

        // Set timeout to remove active class after animation completes
        setTimeout(() => {
            marker.classList.remove('rift-hit-indicator__marker--active');
            this.activeHitMarkers.delete(markerId);
            
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

        // Determine which direction indicator to show
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

        // Get the appropriate direction indicator
        const indicator = this.directionIndicators[direction];
        if (!indicator) return this;

        // Apply intensity via opacity
        const intensity = Math.min(Math.max(options.intensity || 1, 0.3), 1);
        indicator.style.opacity = intensity;

        // Add active class to trigger animation
        indicator.classList.add('rift-hit-indicator__direction--active');

        // Track active indicator for potential cleanup
        const indicatorId = Date.now() + Math.random();
        this.activeDirectionIndicators.add(indicatorId);

        // Set timeout to remove active class after animation completes
        setTimeout(() => {
            indicator.classList.remove('rift-hit-indicator__direction--active');
            this.activeDirectionIndicators.delete(indicatorId);
            
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
        const now = Date.now();
        if (now - this.lastKillTime < 500) return this;
        this.lastKillTime = now;

        // Apply headshot styling if needed
        if (options.isHeadshot) {
            this.killConfirmation.classList.add('rift-hit-indicator__kill--headshot');
        } else {
            this.killConfirmation.classList.remove('rift-hit-indicator__kill--headshot');
        }

        // Add active class to trigger animation
        this.killConfirmation.classList.add('rift-hit-indicator__kill--active');

        // Set timeout to remove active class after animation completes
        setTimeout(() => {
            this.killConfirmation.classList.remove('rift-hit-indicator__kill--active');
            
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
        this.activeHitMarkers.clear();
        this.hitMarker.classList.remove('rift-hit-indicator__marker--active');
        this.critHitMarker.classList.remove('rift-hit-indicator__marker--active');
        this.headshotHitMarker.classList.remove('rift-hit-indicator__marker--active');
        
        // Clear direction indicators
        this.activeDirectionIndicators.clear();
        Object.values(this.directionIndicators).forEach(indicator => {
            indicator.classList.remove('rift-hit-indicator__direction--active');
        });
        
        // Clear kill confirmation
        this.killConfirmation.classList.remove('rift-hit-indicator__kill--active');
        
        return this;
    }

    /**
     * Clean up resources when disposing the component
     */
    dispose() {
        // Clear all active indicators first
        this.clearAllIndicators();

        // Call parent dispose method to handle unsubscribing events and DOM removal
        super.dispose();
        
        return this;
    }

    /**
     * Create hit indicator DOM elements
     * @private
     */
    _createHitElements() {
        // Create the main container if it doesn't exist
        if (!this.element) {
            this._createRootElement();
        }

        // Create hit markers
        this.hitMarker = DOMFactory.createElement('div', {
            className: 'rift-hit-indicator__marker rift-hit-indicator__marker--hit',
            parent: this.element
        });

        this.critHitMarker = DOMFactory.createElement('div', {
            className: 'rift-hit-indicator__marker rift-hit-indicator__marker--critical',
            parent: this.element
        });

        this.headshotHitMarker = DOMFactory.createElement('div', {
            className: 'rift-hit-indicator__marker rift-hit-indicator__marker--headshot',
            parent: this.element
        });

        // Create kill confirmation element
        this.killConfirmation = DOMFactory.createElement('div', {
            className: 'rift-hit-indicator__kill',
            parent: this.element
        });

        // Create direction container and indicators
        this.directionContainer = DOMFactory.createElement('div', {
            className: 'rift-hit-indicator__direction-container',
            parent: this.element
        });

        // Create the four cardinal direction indicators
        ['top', 'right', 'bottom', 'left'].forEach(direction => {
            this.directionIndicators[direction] = DOMFactory.createElement('div', {
                className: `rift-hit-indicator__direction rift-hit-indicator__direction--${direction}`,
                parent: this.directionContainer
            });
        });
    }

    /**
     * Register event listeners for hit indicator
     * @private
     */
    _registerEventListeners() {
        // Register events using the UIComponent event registration system
        this.registerEvents({
            // Handle hit events
            'hit:landed': this._onHitLanded.bind(this),
            
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
            intensity: Math.min(event.damage / 20, 1) // Scale based on damage amount
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
}

export default HitIndicator;
