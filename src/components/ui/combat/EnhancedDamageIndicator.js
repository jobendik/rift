/**
 * EnhancedDamageIndicator Component
 *
 * An optimized version of DamageIndicator that uses the ElementPool utility
 * for more efficient DOM element reuse. Displays visual feedback when the player 
 * takes damage, showing the direction the damage is coming from with:
 * - Exact damage direction (not just cardinal directions)
 * - Damage intensity visualization based on damage amount
 * - Persistent indicators that fade out over time
 * - Multiple simultaneous damage source visualization
 * - Enhanced visual effects for better player awareness
 *
 * @extends UIComponent
 */

import { EventManager } from '../../../core/EventManager.js';
import UIComponent from '../UIComponent.js';
import { DOMFactory } from '../../../utils/DOMFactory.js';
import { ElementPool } from '../../../utils/ElementPool.js';
import { UIConfig } from '../../../core/UIConfig.js';

class EnhancedDamageIndicator extends UIComponent {
    /**
     * Create a new EnhancedDamageIndicator component
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
            id: options.id || 'enhanced-damage-indicator',
            className: 'rift-damage-indicator',
            container: options.container || document.body,
            autoInit: false, // Prevent auto-init to control initialization order
            ...options
        });

        // Configuration options with defaults
        this.maxIndicators = options.maxIndicators || UIConfig.damageIndicator?.maxIndicators || 8;
        this.baseDuration = options.baseDuration || UIConfig.damageIndicator?.baseDuration || 1200;
        this.minOpacity = options.minOpacity || UIConfig.damageIndicator?.minOpacity || 0.3;
        this.maxOpacity = options.maxOpacity || UIConfig.damageIndicator?.maxOpacity || 0.9;
        this.indicatorWidth = options.indicatorWidth || UIConfig.damageIndicator?.indicatorWidth || 120;

        // State
        this.activeIndicators = [];
        this.indicatorPool = null;
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
        this._initElementPools();
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
            } else {
                // Update indicator opacity based on progress
                const newOpacity = indicator.startOpacity * (1 - progress);
                indicator.element.style.opacity = newOpacity;
                
                // Apply pulse animation by modulating opacity for high-damage indicators
                if (indicator.intensity > 0.7) {
                    const pulseAmount = Math.sin(progress * Math.PI * 8) * 0.15;
                    indicator.element.style.opacity = newOpacity + pulseAmount;
                }
            }
        });

        // Remove completed indicators (in reverse order to avoid index shifting)
        for (let i = indicatorsToRemove.length - 1; i >= 0; i--) {
            const index = indicatorsToRemove[i];
            const indicator = this.activeIndicators[index];
            
            // Execute callback if provided
            if (typeof indicator.callback === 'function') {
                indicator.callback();
            }
            
            // Release the element back to the pool
            if (indicator.release) {
                indicator.release();
            }
            
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
        const { element, release } = this.indicatorPool.acquire();
        if (!element) return this; // No available indicators
        
        // Make the element visible
        element.style.display = 'block';
        
        // Set indicator angle
        const normalizedAngle = ((options.angle % 360) + 360) % 360; // Normalize to 0-359
        element.style.transform = `rotate(${normalizedAngle}deg)`;
        
        // Calculate opacity based on damage intensity
        const opacity = this.minOpacity + (this.maxOpacity - this.minOpacity) * intensity;
        element.style.opacity = opacity;
        
        // Apply intensity class
        element.className = 'rift-damage-indicator__indicator';
        
        if (intensity < 0.4) {
            element.classList.add('rift-damage-indicator__indicator--low');
        } else if (intensity < 0.7) {
            element.classList.add('rift-damage-indicator__indicator--medium');
        } else {
            element.classList.add('rift-damage-indicator__indicator--high');
        }
        
        // Activate the indicator
        element.classList.add('rift-damage-indicator__indicator--active');
        
        // Track indicator
        this.activeIndicators.push({
            element,
            release,
            startTime: performance.now(),
            duration,
            startOpacity: opacity,
            intensity,
            callback: options.callback
        });
        
        // Apply max indicators limit
        if (this.activeIndicators.length > this.maxIndicators) {
            // Remove the oldest indicator
            const oldestIndicator = this.activeIndicators.shift();
            if (oldestIndicator.release) {
                oldestIndicator.release();
            }
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
            if (indicator.release) {
                indicator.release();
            }
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
        if (this.indicatorPool) {
            this.indicatorPool.dispose();
            this.indicatorPool = null;
        }
        
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
     * Initialize the element pools for damage indicators
     * @private
     */
    _initElementPools() {
        // Create the indicator pool
        this.indicatorPool = new ElementPool({
            elementType: 'div',
            container: this.indicatorContainer,
            className: 'rift-damage-indicator__indicator',
            initialSize: this.maxIndicators,
            maxSize: this.maxIndicators * 2,
            useBlocks: true,
            blockSize: 4,
            createFn: () => {
                // Create a composite indicator with inner layers for richer visuals
                const indicator = document.createElement('div');
                indicator.className = 'rift-damage-indicator__indicator';
                indicator.style.display = 'none'; // Initially hidden
                
                // Create inner elements for multi-layer effect
                const outer = document.createElement('div');
                outer.className = 'rift-damage-indicator__outer';
                
                const inner = document.createElement('div');
                inner.className = 'rift-damage-indicator__inner';
                
                const pulse = document.createElement('div');
                pulse.className = 'rift-damage-indicator__pulse';
                
                indicator.appendChild(outer);
                indicator.appendChild(inner);
                indicator.appendChild(pulse);
                
                return indicator;
            },
            resetFn: (element) => {
                // Reset to base class and hide
                element.className = 'rift-damage-indicator__indicator';
                element.style.display = 'none';
                
                // Preserve inner elements but reset their classes
                if (element.children.length >= 3) {
                    element.children[0].className = 'rift-damage-indicator__outer';
                    element.children[1].className = 'rift-damage-indicator__inner';
                    element.children[2].className = 'rift-damage-indicator__pulse';
                }
                
                // Clear inline styles except display
                const displayValue = element.style.display;
                element.style = '';
                element.style.display = displayValue;
            }
        });
    }

    /**
     * Register event listeners for damage events
     * @private
     */
    _registerEventListeners() {
        // Register using standardized event names
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
     * Test method to show a damage indicator at a specific angle
     * For development/debugging only
     * 
     * @param {string} direction - Direction ('front', 'right', 'back', 'left') or angle in degrees
     * @param {number} [damage=10] - Damage amount to simulate
     */
    testDamageIndicator(direction = 'front', damage = 10) {
        let angle;
        
        // Convert direction string to angle
        switch (direction) {
            case 'front':
                angle = 0;
                break;
            case 'right':
                angle = 90;
                break;
            case 'back':
                angle = 180;
                break;
            case 'left':
                angle = 270;
                break;
            default:
                // If it's a number string, convert to number
                angle = !isNaN(direction) ? parseFloat(direction) : 0;
        }
        
        this.showDamageFrom({
            angle,
            damage
        });
        
        console.log(`Test damage indicator: ${direction} (${angle}°) with damage ${damage}`);
    }
    
    /**
     * Test method to display random damage indicators
     * For stress testing and development
     * 
     * @param {number} [count=5] - Number of indicators to show
     * @param {number} [maxDamage=30] - Maximum damage value
     */
    testRandomDamage(count = 5, maxDamage = 30) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const angle = Math.random() * 360;
                const damage = Math.random() * maxDamage;
                this.showDamageFrom({
                    angle,
                    damage
                });
            }, i * 100); // Stagger by 100ms
        }
        
        console.log(`Test random damage: ${count} indicators with max damage ${maxDamage}`);
    }
}

export { EnhancedDamageIndicator };
