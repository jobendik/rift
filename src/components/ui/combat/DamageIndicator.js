/**
 * DamageIndicator Component
 *
 * Displays visual feedback when the player takes damage, showing the direction
 * the damage is coming from. Unlike the directional indicators in HitIndicator,
 * this component provides a more detailed and prominent visualization that:
 * - Shows exact damage direction (not just cardinal directions)
 * - Visualizes damage intensity based on damage amount
 * - Provides persistent indicators that fade out over time
 * - Can show multiple damage sources simultaneously
 * - Uses visual effects to enhance player awareness
 *
 * @extends UIComponent
 */

import { EventManager } from '../../../core/EventManager.js';
import UIComponent from '../UIComponent.js';
import { DOMFactory } from '../../../utils/DOMFactory.js';

class DamageIndicator extends UIComponent {
    /**
     * Create a new DamageIndicator component
     * 
     * @param {Object} options - Component configuration options
     * @param {HTMLElement} options.container - Container element for the damage indicator
     * @param {number} [options.maxIndicators=8] - Maximum number of simultaneous damage indicators
     * @param {number} [options.baseDuration=1200] - Base duration of indicator display in ms
     * @param {number} [options.minOpacity=0.3] - Minimum opacity for low damage
     * @param {number} [options.maxOpacity=0.9] - Maximum opacity for high damage
     * @param {number} [options.indicatorWidth=120] - Width of indicator in degrees (visual angle)
     */
    constructor(options = {}) {
        super({
            id: options.id || 'damage-indicator',
            className: 'rift-damage-indicator',
            container: options.container || document.body,
            autoInit: false, // Prevent auto-init to control initialization order
            ...options
        });

        // Configuration options with defaults
        this.maxIndicators = options.maxIndicators || 8;
        this.baseDuration = options.baseDuration || 1200;
        this.minOpacity = options.minOpacity || 0.3;
        this.maxOpacity = options.maxOpacity || 0.9;
        this.indicatorWidth = options.indicatorWidth || 120; // degrees
        
        // State
        this.activeIndicators = [];
        this.indicatorPool = [];
        this.indicatorContainer = null;
        this.isActive = false;
        
        // Now initialize manually after all properties are set
        this.init();
    }

    /**
     * Initialize the damage indicator component
     */
    init() {
        if (this.isInitialized) return this;
        
        // Call parent init first to create root element
        super.init();
        
        // Set initialized flag early to prevent infinite recursion
        this.isInitialized = true;
        
        this._createElements();
        this._initIndicatorPool();
        this._registerEventListeners();
        this.isActive = true;
        return this;
    }

    /**
     * Update animation states
     * 
     * @param {number} delta - Time since last update in ms
     */
    update(delta) {
        if (!this.isActive || !this.isVisible) return;

        const now = performance.now();
        const indicatorsToRemove = [];

        // Update each active indicator
        this.activeIndicators.forEach((indicator, index) => {
            // Calculate progress based on elapsed time
            const elapsed = now - indicator.startTime;
            const progress = Math.min(elapsed / indicator.duration, 1);
            
            if (progress >= 1) {
                // Mark indicator for removal when animation completes
                indicatorsToRemove.push(index);
                indicator.element.classList.remove('rift-damage-indicator__indicator--active');
            } else {
                // Update indicator opacity based on progress
                const newOpacity = indicator.startOpacity * (1 - progress);
                indicator.element.style.opacity = newOpacity;
                
                // Apply pulse animation by modulating opacity
                if (indicator.intensity > 0.7) {
                    // Only high-damage indicators pulse
                    const pulseAmount = Math.sin(progress * Math.PI * 8) * 0.15;
                    indicator.element.style.opacity = newOpacity + pulseAmount;
                }
            }
        });

        // Remove completed indicators (in reverse order to avoid index shifting)
        for (let i = indicatorsToRemove.length - 1; i >= 0; i--) {
            const index = indicatorsToRemove[i];
            const indicator = this.activeIndicators[index];
            this._releaseIndicator(indicator);
            this.activeIndicators.splice(index, 1);
        }

        // Process standard animations
        this._updateAnimations(delta);
        
        return this;
    }

    /**
     * Show a damage indicator from a specific direction
     * 
     * @param {Object} options - Damage indicator options
     * @param {number} options.angle - Direction angle in degrees (0 = front, 90 = right, 180 = back, 270 = left)
     * @param {number} [options.damage=10] - Amount of damage taken (affects indicator intensity)
     * @param {number} [options.duration] - Custom duration in ms (overrides base duration)
     * @param {Function} [options.callback] - Optional callback when indicator finishes
     */
    showDamageFrom(options = {}) {
        if (!this.isActive || !this.isVisible || typeof options.angle !== 'number') return this;

        // Calculate intensity based on damage (normalize between 0 and 1)
        const damage = options.damage || 10;
        const intensity = Math.min(Math.max(damage / 40, 0.2), 1); // Cap at 40 damage for max intensity
        const duration = options.duration || Math.max(this.baseDuration * (0.7 + intensity * 0.5), 800);
        
        // Get an indicator from the pool
        const indicator = this._getIndicator();
        if (!indicator) return this; // No available indicators
        
        // Set indicator angle
        const normalizedAngle = ((options.angle % 360) + 360) % 360; // Normalize to 0-359
        indicator.element.style.transform = `rotate(${normalizedAngle}deg)`;
        
        // Calculate opacity based on damage intensity
        const opacity = this.minOpacity + (this.maxOpacity - this.minOpacity) * intensity;
        indicator.element.style.opacity = opacity;
        
        // Set indicator state
        indicator.startTime = performance.now();
        indicator.duration = duration;
        indicator.startOpacity = opacity;
        indicator.intensity = intensity;
        indicator.callback = options.callback;
        
        // Apply color based on damage intensity
        indicator.element.classList.remove('rift-damage-indicator__indicator--low');
        indicator.element.classList.remove('rift-damage-indicator__indicator--medium');
        indicator.element.classList.remove('rift-damage-indicator__indicator--high');
        
        if (intensity < 0.4) {
            indicator.element.classList.add('rift-damage-indicator__indicator--low');
        } else if (intensity < 0.7) {
            indicator.element.classList.add('rift-damage-indicator__indicator--medium');
        } else {
            indicator.element.classList.add('rift-damage-indicator__indicator--high');
        }
        
        // Activate the indicator
        indicator.element.classList.add('rift-damage-indicator__indicator--active');
        this.activeIndicators.push(indicator);
        
        // Apply max indicators limit
        if (this.activeIndicators.length > this.maxIndicators) {
            // Remove the oldest indicator
            const oldestIndicator = this.activeIndicators.shift();
            this._releaseIndicator(oldestIndicator);
        }
        
        return this;
    }

    /**
     * Show multiple damage indicators simultaneously
     * Useful for explosions or multi-hit attacks
     * 
     * @param {Array} sources - Array of damage sources, each with angle and damage properties
     * @param {number} [spreadFactor=1] - Factor to adjust indicator spacing (1 = normal)
     */
    showMultipleDamage(sources, spreadFactor = 1) {
        if (!Array.isArray(sources) || sources.length === 0) return this;
        
        // Apply a slight delay between indicators for visual clarity
        sources.forEach((source, index) => {
            setTimeout(() => {
                this.showDamageFrom(source);
            }, index * 50); // 50ms delay between indicators
        });
        
        return this;
    }

    /**
     * Show a damage indicator from a world position
     * 
     * @param {Object} options - Position-based damage options 
     * @param {Object} options.position - World position {x, y, z}
     * @param {Object} options.playerPosition - Player position {x, y, z}
     * @param {number} options.playerRotation - Player rotation in radians
     * @param {number} [options.damage=10] - Amount of damage
     */
    showDamageFromPosition(options = {}) {
        if (!options.position || !options.playerPosition) return this;
        
        // Calculate angle between player and damage source
        const dx = options.position.x - options.playerPosition.x;
        const dz = options.position.z - options.playerPosition.z;
        
        // Calculate angle in degrees (0 = north, 90 = east, etc.)
        let angle = Math.atan2(dx, dz) * (180 / Math.PI);
        
        // Adjust for player rotation
        if (typeof options.playerRotation === 'number') {
            const playerAngle = options.playerRotation * (180 / Math.PI);
            angle = (angle - playerAngle + 360) % 360;
        }
        
        // Show damage indicator with calculated angle
        this.showDamageFrom({
            angle,
            damage: options.damage || 10
        });
        
        return this;
    }

    /**
     * Clear all active damage indicators
     */
    clearAllIndicators() {
        // Release all active indicators back to the pool
        this.activeIndicators.forEach(indicator => {
            this._releaseIndicator(indicator);
        });
        this.activeIndicators = [];
        
        return this;
    }

    /**
     * Clean up resources when disposing the component
     */
    dispose() {
        // Clear all active indicators
        this.clearAllIndicators();
        
        // Dispose the indicator pool
        this.indicatorPool.forEach(indicator => {
            if (indicator.element && indicator.element.parentNode) {
                indicator.element.parentNode.removeChild(indicator.element);
            }
        });
        this.indicatorPool = [];
        
        // Call parent dispose method
        super.dispose();
        
        return this;
    }

    /**
     * Create the main container and elements
     * @private
     */
    _createElements() {
        // Create the indicator container
        this.indicatorContainer = DOMFactory.createElement('div', {
            className: 'rift-damage-indicator__container',
            parent: this.element
        });
    }

    /**
     * Initialize the pool of reusable indicator elements
     * This helps avoid DOM thrashing with frequent indicator creation/removal
     * @private
     */
    _initIndicatorPool() {
        // Create twice the maximum number to ensure we have plenty available
        const poolSize = this.maxIndicators * 2;
        
        for (let i = 0; i < poolSize; i++) {
            // Create the indicator element
            const element = DOMFactory.createElement('div', {
                className: 'rift-damage-indicator__indicator',
                parent: this.indicatorContainer
            });
            
            // Add to the pool
            this.indicatorPool.push({
                element,
                active: false,
                startTime: 0,
                duration: 0,
                startOpacity: 0,
                intensity: 0,
                callback: null
            });
        }
    }

    /**
     * Get an available indicator from the pool
     * @private
     * @returns {Object|null} Available indicator or null if none available
     */
    _getIndicator() {
        // Find the first inactive indicator
        const availableIndicator = this.indicatorPool.find(indicator => !indicator.active);
        
        if (availableIndicator) {
            availableIndicator.active = true;
            return availableIndicator;
        }
        
        return null; // No available indicators
    }

    /**
     * Release an indicator back to the pool
     * @private
     * @param {Object} indicator - Indicator to release
     */
    _releaseIndicator(indicator) {
        if (!indicator) return;
        
        // Hide and reset the indicator
        indicator.element.classList.remove('rift-damage-indicator__indicator--active');
        indicator.element.classList.remove('rift-damage-indicator__indicator--low');
        indicator.element.classList.remove('rift-damage-indicator__indicator--medium');
        indicator.element.classList.remove('rift-damage-indicator__indicator--high');
        indicator.element.style.opacity = 0;
        
        // Mark as inactive
        indicator.active = false;
        
        // Execute callback if provided
        if (typeof indicator.callback === 'function') {
            indicator.callback();
            indicator.callback = null;
        }
    }

    /**
     * Register event listeners for damage events
     * @private
     */
    _registerEventListeners() {
        // Register for player damage events
        this.registerEvents({
            'player:damaged': this._onPlayerDamaged.bind(this),
            'game:paused': () => this.clearAllIndicators(),
            'game:resumed': () => this.clearAllIndicators()
        });
    }

    /**
     * Handle player damage events
     * @private
     * @param {Object} event - Damage event data
     */
    _onPlayerDamaged(event) {
        // Check if we have position data
        if (event.position && event.playerPosition) {
            this.showDamageFromPosition({
                position: event.position,
                playerPosition: event.playerPosition,
                playerRotation: event.playerRotation,
                damage: event.damage
            });
        } 
        // Fallback to direction angle if provided
        else if (typeof event.direction === 'number') {
            this.showDamageFrom({
                angle: event.direction,
                damage: event.damage
            });
        }
    }

    /**
     * Test method to show a damage indicator at a random angle
     * For development/debugging only
     * @param {number} [damage=10] - Damage amount to simulate
     */
    testDamageIndicator(damage = 10) {
        const randomAngle = Math.random() * 360;
        this.showDamageFrom({
            angle: randomAngle,
            damage: damage
        });
    }
}



export { DamageIndicator };