﻿/**
 * FootstepIndicator Component
 *
 * Displays visual feedback for nearby movement, showing the direction
 * of footsteps with distance-based intensity scaling and friend/foe differentiation.
 * This component enhances situational awareness by providing:
 * - Directional indicators for footstep sources
 * - Distance-based intensity scaling (fades with distance)
 * - Friend/foe differentiation (different colors)
 * - Subtle visual presentation that doesn't distract from gameplay
 * - Multiple concurrent indicators for different footstep sources
 *
 * @extends UIComponent
 */

import { EventManager } from '../../../core/EventManager.js';
import UIComponent from '../UIComponent.js';
import { DOMFactory } from '../../../utils/DOMFactory.js';
import { EventStandardizationImplementer } from '../../../core/EventStandardizationImplementer.js';

class FootstepIndicator extends UIComponent {
    /**
     * Create a new FootstepIndicator component
     * 
     * @param {Object} options - Component configuration options
     * @param {HTMLElement} options.container - Container element for the footstep indicator
     * @param {number} [options.maxIndicators=8] - Maximum number of simultaneous footstep indicators
     * @param {number} [options.baseDuration=800] - Base duration of indicator display in ms
     * @param {number} [options.minOpacity=0.2] - Minimum opacity for distant footsteps
     * @param {number} [options.maxOpacity=0.7] - Maximum opacity for close footsteps
     * @param {number} [options.maxDistance=20] - Maximum distance in units to show footsteps
     * @param {number} [options.minDistance=2] - Distance at which footsteps reach max intensity
     * @param {number} [options.indicatorWidth=40] - Width of indicator in degrees (visual angle)
     */
    constructor(options = {}) {
        super({
            autoInit: false,
            id: options.id || 'footstep-indicator',
            className: 'rift-footstep-indicator',
            container: options.container || document.body,
            ...options
        });
        
        // Enable event validation for standardization
        EventManager.setValidateEventNames(true);
        EventManager.setValidateEventPayloads(true);

        // Configuration options with defaults
        this.maxIndicators = options.maxIndicators || 8;
        this.baseDuration = options.baseDuration || 800;
        this.minOpacity = options.minOpacity || 0.2;
        this.maxOpacity = options.maxOpacity || 0.7;
        this.maxDistance = options.maxDistance || 20;
        this.minDistance = options.minDistance || 2;
        this.indicatorWidth = options.indicatorWidth || 40; // degrees
        
        // State
        this.activeIndicators = [];
        this.indicatorPool = [];
        this.indicatorContainer = null;
        this.isActive = false;
    }

    /**
     * Initialize the footstep indicator component
     */
    init() {
        this._createElements();
        this._initIndicatorPool();
        this._registerEventListeners();
        this.isInitialized = true;
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
                indicator.element.classList.remove('rift-footstep-indicator__indicator--active');
            } else {
                // Update indicator opacity based on progress and pulse effect
                const baseOpacity = indicator.startOpacity * (1 - progress * 0.5);
                const pulsePhase = (progress * Math.PI * 3) % Math.PI;
                const pulseAmount = Math.sin(pulsePhase) * 0.2;
                
                // Apply pulsing effect that mimics footstep rhythm
                indicator.element.style.opacity = baseOpacity + (baseOpacity * pulseAmount);
                
                // If this is a series of footsteps, update the size based on pulse
                if (indicator.isContinuous) {
                    const sizeScale = 1 + (pulseAmount * 0.1);
                    indicator.element.style.transform = 
                        `rotate(${indicator.angle}deg) scale(${sizeScale})`;
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
     * Show a footstep indicator from a specific direction
     * 
     * @param {Object} options - Footstep indicator options
     * @param {number} options.angle - Direction angle in degrees (0 = front, 90 = right, 180 = back, 270 = left)
     * @param {number} [options.distance=10] - Distance of footstep from player (affects indicator intensity)
     * @param {boolean} [options.isFriendly=false] - Whether the footstep is from a friendly entity
     * @param {boolean} [options.isContinuous=false] - Whether this is part of a continuous series of footsteps
     * @param {number} [options.duration] - Custom duration in ms (overrides base duration)
     * @param {Function} [options.callback] - Optional callback when indicator finishes
     */
    showFootstepsFrom(options = {}) {
        if (!this.isActive || !this.isVisible || typeof options.angle !== 'number') return this;

        // Calculate intensity based on distance (closer = more intense)
        const distance = options.distance !== undefined ? options.distance : 10;
        
        // Nothing to show if beyond max distance
        if (distance > this.maxDistance) return this;
        
        // Calculate intensity based on distance (inversely proportional)
        // Closer footsteps have higher intensity
        let intensity = 1;
        if (distance > this.minDistance) {
            intensity = 1 - ((distance - this.minDistance) / (this.maxDistance - this.minDistance));
            intensity = Math.max(Math.min(intensity, 1), 0); // Clamp between 0 and 1
        }
        
        // Duration is slightly longer for distant footsteps to create depth perception
        const distanceFactor = 0.8 + (distance / this.maxDistance) * 0.4; // 0.8 to 1.2
        const baseDuration = options.isContinuous ? this.baseDuration * 1.5 : this.baseDuration;
        const duration = options.duration || Math.max(baseDuration * distanceFactor, 500);
        
        // Get an indicator from the pool
        const indicator = this._getIndicator();
        if (!indicator) return this; // No available indicators
        
        // Set indicator angle
        const normalizedAngle = ((options.angle % 360) + 360) % 360; // Normalize to 0-359
        indicator.element.style.transform = `rotate(${normalizedAngle}deg)`;
        
        // Calculate opacity based on distance intensity
        const opacity = this.minOpacity + (this.maxOpacity - this.minOpacity) * intensity;
        indicator.element.style.opacity = opacity;
        
        // Set indicator state
        indicator.angle = normalizedAngle;
        indicator.startTime = performance.now();
        indicator.duration = duration;
        indicator.startOpacity = opacity;
        indicator.intensity = intensity;
        indicator.callback = options.callback;
        indicator.isContinuous = options.isContinuous || false;
        
        // Apply friend/foe styling
        indicator.element.classList.remove('rift-footstep-indicator__indicator--friendly');
        indicator.element.classList.remove('rift-footstep-indicator__indicator--enemy');
        
        if (options.isFriendly) {
            indicator.element.classList.add('rift-footstep-indicator__indicator--friendly');
        } else {
            indicator.element.classList.add('rift-footstep-indicator__indicator--enemy');
        }
        
        // Apply intensity-based class
        indicator.element.classList.remove('rift-footstep-indicator__indicator--distant');
        indicator.element.classList.remove('rift-footstep-indicator__indicator--medium');
        indicator.element.classList.remove('rift-footstep-indicator__indicator--close');
        
        if (intensity < 0.3) {
            indicator.element.classList.add('rift-footstep-indicator__indicator--distant');
        } else if (intensity < 0.7) {
            indicator.element.classList.add('rift-footstep-indicator__indicator--medium');
        } else {
            indicator.element.classList.add('rift-footstep-indicator__indicator--close');
        }
        
        // Apply continuous class if needed
        if (options.isContinuous) {
            indicator.element.classList.add('rift-footstep-indicator__indicator--continuous');
        } else {
            indicator.element.classList.remove('rift-footstep-indicator__indicator--continuous');
        }
        
        // Activate the indicator
        indicator.element.classList.add('rift-footstep-indicator__indicator--active');
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
     * Show footstep indicators from a world position
     * 
     * @param {Object} options - Position-based footstep options 
     * @param {Object} options.position - World position {x, y, z}
     * @param {Object} options.playerPosition - Player position {x, y, z}
     * @param {number} options.playerRotation - Player rotation in radians
     * @param {boolean} [options.isFriendly=false] - Whether the footstep is from a friendly entity
     * @param {boolean} [options.isContinuous=false] - Whether this is part of a series of footsteps
     */
    showFootstepsFromPosition(options = {}) {
        if (!options.position || !options.playerPosition) return this;
        
        // Calculate angle between player and footstep source
        const dx = options.position.x - options.playerPosition.x;
        const dz = options.position.z - options.playerPosition.z;
        
        // Calculate distance
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        // Calculate angle in degrees (0 = north, 90 = east, etc.)
        let angle = Math.atan2(dx, dz) * (180 / Math.PI);
        
        // Adjust for player rotation
        if (typeof options.playerRotation === 'number') {
            const playerAngle = options.playerRotation * (180 / Math.PI);
            angle = (angle - playerAngle + 360) % 360;
        }
        
        // Show footstep indicator with calculated angle and distance
        this.showFootstepsFrom({
            angle,
            distance,
            isFriendly: options.isFriendly || false,
            isContinuous: options.isContinuous || false
        });
        
        return this;
    }

    /**
     * Show a continuous series of footsteps from a direction
     * 
     * @param {Object} options - Footstep indicator options
     * @param {number} options.angle - Direction angle in degrees
     * @param {number} [options.distance=10] - Distance from player
     * @param {boolean} [options.isFriendly=false] - Whether from a friendly entity
     * @param {number} [options.steps=3] - Number of steps in the sequence
     * @param {number} [options.interval=200] - Time between steps in ms
     */
    showFootstepSequence(options = {}) {
        if (!this.isActive || !this.isVisible || typeof options.angle !== 'number') return this;
        
        const steps = options.steps || 3;
        const interval = options.interval || 200;
        
        // Show each step with a delay
        for (let i = 0; i < steps; i++) {
            setTimeout(() => {
                // Last step is not continuous
                const isContinuous = i < steps - 1;
                
                this.showFootstepsFrom({
                    angle: options.angle,
                    distance: options.distance || 10,
                    isFriendly: options.isFriendly || false,
                    isContinuous: isContinuous
                });
            }, i * interval);
        }
        
        return this;
    }

    /**
     * Clear all active footstep indicators
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
        // Create the root element if it doesn't exist
        if (!this.element) {
            this._createRootElement();
        }

        // Create the indicator container
        this.indicatorContainer = DOMFactory.createElement('div', {
            className: 'rift-footstep-indicator__container',
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
                className: 'rift-footstep-indicator__indicator',
                parent: this.indicatorContainer
            });
            
            // Add to the pool
            this.indicatorPool.push({
                element,
                active: false,
                angle: 0,
                startTime: 0,
                duration: 0,
                startOpacity: 0,
                intensity: 0,
                isContinuous: false,
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
        indicator.element.classList.remove('rift-footstep-indicator__indicator--active');
        indicator.element.classList.remove('rift-footstep-indicator__indicator--friendly');
        indicator.element.classList.remove('rift-footstep-indicator__indicator--enemy');
        indicator.element.classList.remove('rift-footstep-indicator__indicator--distant');
        indicator.element.classList.remove('rift-footstep-indicator__indicator--medium');
        indicator.element.classList.remove('rift-footstep-indicator__indicator--close');
        indicator.element.classList.remove('rift-footstep-indicator__indicator--continuous');
        
        indicator.element.style.opacity = 0;
        indicator.element.style.transform = 'rotate(0deg)';
        
        // Mark as inactive
        indicator.active = false;
        
        // Execute callback if provided
        if (typeof indicator.callback === 'function') {
            indicator.callback();
            indicator.callback = null;
        }
    }

    /**
     * Register event listeners for footstep events
     * @private
     */
    _registerEventListeners() {
        // Register for footstep events using standardized event names
        this.registerEvents({
            'movement:footstep-detected': this._onFootstepDetected.bind(this), // Updated to standardized event name
            'game:paused': () => this.clearAllIndicators(),
            'game:resumed': () => this.clearAllIndicators()
        });
    }

    /**
     * Handle movement footstep event
     * @param {Object} event - Standardized movement event
     * @param {Object} event.source - Source entity information
     * @param {string} event.source.id - Entity ID generating the footstep
     * @param {string} event.source.type - Type of entity ("player", "enemy", "npc")
     * @param {Object} event.position - Position where footstep was detected
     * @param {Object} event.playerPosition - Current player position
     * @param {number} event.playerRotation - Current player rotation in radians
     * @param {boolean} event.isFriendly - Whether footstep is from a friendly entity
     * @param {boolean} event.isContinuous - Whether this is part of continuous movement
     * @param {number} event.distance - Distance from player (if position not provided)
     * @param {number} event.direction - Direction angle (if position not provided)
     * @param {number} event.timestamp - Time when the event occurred
     * @private
     */
    _onFootstepDetected(event) {
        // Check if we have position data
        if (event.position && event.playerPosition) {
            this.showFootstepsFromPosition({
                position: event.position,
                playerPosition: event.playerPosition,
                playerRotation: event.playerRotation,
                isFriendly: event.isFriendly || false,
                isContinuous: event.isContinuous || false
            });
        } 
        // Fallback to direction angle if provided
        else if (typeof event.direction === 'number') {
            this.showFootstepsFrom({
                angle: event.direction,
                distance: event.distance || 10,
                isFriendly: event.isFriendly || false,
                isContinuous: event.isContinuous || false
            });
        }
    }

    /**
     * Test method to show a footstep indicator at a random angle
     * For development/debugging only
     * @param {string} [type='enemy'] - Type of footstep ('enemy' or 'friendly')
     * @param {string} [distance='medium'] - Distance ('close', 'medium', or 'distant')
     */
    testFootstepIndicator(type = 'enemy', distance = 'medium') {
        const randomAngle = Math.random() * 360;
        let distanceValue;
        
        switch (distance) {
            case 'close':
                distanceValue = this.minDistance + Math.random() * 2;
                break;
            case 'medium':
                distanceValue = this.minDistance + 3 + Math.random() * 5;
                break;
            case 'distant':
                distanceValue = this.minDistance + 8 + Math.random() * (this.maxDistance - this.minDistance - 8);
                break;
            default:
                distanceValue = 10;
        }
        
        const isFriendly = type === 'friendly';
        
        this.showFootstepsFrom({
            angle: randomAngle,
            distance: distanceValue,
            isFriendly: isFriendly
        });
    }
    
    /**
     * Test method to show a footstep sequence
     * For development/debugging only
     * @param {string} [type='enemy'] - Type of footstep ('enemy' or 'friendly')
     * @param {string} [distance='medium'] - Distance ('close', 'medium', or 'distant')
     */
    testFootstepSequence(type = 'enemy', distance = 'medium') {
        const randomAngle = Math.random() * 360;
        let distanceValue;
        
        switch (distance) {
            case 'close':
                distanceValue = this.minDistance + Math.random() * 2;
                break;
            case 'medium':
                distanceValue = this.minDistance + 3 + Math.random() * 5;
                break;
            case 'distant':
                distanceValue = this.minDistance + 8 + Math.random() * (this.maxDistance - this.minDistance - 8);
                break;
            default:
                distanceValue = 10;
        }
        
        const isFriendly = type === 'friendly';
        
        this.showFootstepSequence({
            angle: randomAngle,
            distance: distanceValue,
            isFriendly: isFriendly,
            steps: 4,
            interval: 200
        });
    }
    
    /**
     * Emit a standardized footstep event for testing
     * This helps verify that our standardized event system is working properly
     * 
     * @param {Object} options - Test options
     * @param {string} [options.entityId='enemy-1'] - ID of the entity
     * @param {string} [options.entityType='enemy'] - Type of entity ('player', 'enemy', 'npc')
     * @param {boolean} [options.isFriendly=false] - Whether footstep is from a friendly entity
     * @param {Object} [options.position] - Position of the entity, defaults to random position
     * @param {Object} [options.playerPosition] - Position of player, defaults to origin
     * @param {number} [options.playerRotation=0] - Player rotation in radians
     */
    emitStandardizedFootstepEvent(options = {}) {
        // Default player position is origin
        const playerPosition = options.playerPosition || { x: 0, y: 0, z: 0 };
        
        // Generate random position if not provided
        const position = options.position || {
            x: (Math.random() - 0.5) * 20,
            y: 0,
            z: (Math.random() - 0.5) * 20
        };
        
        // Calculate distance
        const dx = position.x - playerPosition.x;
        const dz = position.z - playerPosition.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        // Create standardized event using EventManager helper method
        const eventData = {
            source: {
                id: options.entityId || 'enemy-1',
                type: options.entityType || 'enemy',
                position: position
            },
            position: position,
            playerPosition: playerPosition,
            playerRotation: options.playerRotation || 0,
            isFriendly: options.isFriendly || false,
            isContinuous: options.isContinuous || false,
            distance: distance,
            direction: Math.atan2(dx, dz) * (180 / Math.PI)
        };
        
        // Emit the standardized event
        EventManager.emit('movement:footstep-detected', eventData);
        
        console.log('[FootstepIndicator] Emitted standardized movement:footstep-detected event:', eventData);
        
        return this;
    }
}

export default FootstepIndicator;
