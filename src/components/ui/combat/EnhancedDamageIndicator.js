/**
 * Enhanced Damage Indicator Component
 * 
 * Provides directional damage indication with enhanced features:
 * - Intensity scaling based on damage amount
 * - Type-specific indicators (bullet, explosive, melee, etc.)
 * - Distance representation with visual cues
 * - Stacking indicators for multiple simultaneous damage sources
 * - Enhanced directionality with more precise angular representation
 * - Multi-stage fade based on recency and severity
 * 
 * @extends UIComponent
 */

import UIComponent from '../UIComponent.js';
import { DOMFactory } from '../../../utils/DOMFactory.js';
import { UIConfig } from '../../../core/UIConfig.js';
import { EventManager } from '../../../core/EventManager.js';

class EnhancedDamageIndicator extends UIComponent {
    constructor(options = {}) {
        super(options);
        
        // Indicator tracking by source ID
        this.indicators = new Map(); // Track active indicators by source ID
        
        // Configuration from UIConfig
        const config = UIConfig.enhancedCombat.damageIndicator;
        this.damageTypes = config.types;
        this.distanceConfig = config.distance;
        this.maxIndicators = config.maxIndicators;
        this.minAngleDifference = config.minAngleDifference;
        this.baseOpacity = config.baseOpacity;
        this.stackSimilar = config.stackSimilar;
        this.stackWindow = config.stackWindow;
        
        // Animation settings
        this.animConfig = config.animation;
    }

    init() {
        // Create container for all damage indicators
        this.container = DOMFactory.createContainer('enhanced-damage-indicators', {
            className: 'rift-enhanced-damage-indicators',
            parent: this.parentElement
        });
        
        // Register event for player damage
        this.registerEvents({
            'player:damaged': this._onPlayerDamaged.bind(this)
        });
    }

    /**
     * Handle player damage event
     * @param {Object} event - The damage event data
     */
    _onPlayerDamaged(event) {
        const { source, damage, direction, damageType = 'bullet', sourceId = null } = event;
        
        // Skip if no direction provided
        if (!direction) return;
        
        // Calculate angle based on direction vector
        const angle = this._calculateAngle(direction);
        
        // Calculate intensity based on damage
        const intensity = this._calculateIntensity(damage);
        
        // Calculate distance category if source position available
        let distance = 'medium';
        if (source && source.position) {
            distance = this._calculateDistanceCategory(source.position);
        }
        
        // Add or update indicator
        this._addOrUpdateIndicator(sourceId || this._generateSourceId(), angle, intensity, damageType, distance);
    }

    /**
     * Generate a unique source ID if none provided
     * @returns {string} A unique ID
     */
    _generateSourceId() {
        return 'damage_' + performance.now().toString().replace('.', '');
    }
    
    /**
     * Calculate angle from direction vector
     * @param {Object} direction - Direction vector {x, y, z}
     * @returns {number} Angle in degrees (0-360)
     */
    _calculateAngle(direction) {
        // Flat direction on X-Z plane (assuming Y is up)
        const x = direction.x || 0;
        const z = direction.z || 0;
        
        // Calculate angle in radians and convert to degrees
        let angle = Math.atan2(z, x) * (180 / Math.PI);
        
        // Normalize to 0-360 degrees
        angle = (angle + 180) % 360;
        
        return angle;
    }
    
    /**
     * Calculate intensity based on damage amount
     * @param {number} damage - Amount of damage
     * @returns {number} Intensity value between 0.2 and 1
     */
    _calculateIntensity(damage) {
        // Clamp damage between 5 and 50 for intensity scaling
        const clampedDamage = Math.max(5, Math.min(50, damage));
        
        // Map damage to intensity range (0.2 - 1.0)
        return 0.2 + (clampedDamage - 5) / (50 - 5) * 0.8;
    }
    
    /**
     * Calculate distance category based on source position
     * @param {Object} sourcePosition - Position vector of damage source
     * @returns {string} Distance category ('close', 'medium', or 'far')
     */
    _calculateDistanceCategory(sourcePosition) {
        // Calculate distance (simplified - should use actual player position in real implementation)
        const playerPosition = { x: 0, y: 0, z: 0 }; // This would come from the actual player
        const dx = sourcePosition.x - playerPosition.x;
        const dy = sourcePosition.y - playerPosition.y;
        const dz = sourcePosition.z - playerPosition.z;
        
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        // Determine distance category based on config
        if (distance <= this.distanceConfig.close.maxDistance) {
            return 'close';
        } else if (distance <= this.distanceConfig.medium.maxDistance) {
            return 'medium';
        } else {
            return 'far';
        }
    }
    
    /**
     * Add a new indicator or update an existing one
     * @param {string} sourceId - Unique identifier for the damage source
     * @param {number} angle - Direction angle in degrees
     * @param {number} intensity - Damage intensity (0-1)
     * @param {string} damageType - Type of damage (bullet, explosive, etc.)
     * @param {string} distanceCategory - Distance category (close, medium, far)
     */
    _addOrUpdateIndicator(sourceId, angle, intensity, damageType, distanceCategory) {
        // Check if we should stack similar indicators
        if (this.stackSimilar) {
            // Check for indicators with similar angle and type
            for (const [existingId, indicator] of this.indicators.entries()) {
                // Only stack if it's recent enough
                if (performance.now() - indicator.timestamp < this.stackWindow) {
                    // Check if angle is similar (within minAngleDifference)
                    const angleDiff = Math.abs(((angle - indicator.angle + 180) % 360) - 180);
                    if (angleDiff < this.minAngleDifference && damageType === indicator.damageType) {
                        // Update existing indicator with increased intensity
                        this._updateIndicator(existingId, intensity);
                        return;
                    }
                }
            }
        }
        
        // If we reach here, we should create a new indicator
        // But first, check if we've reached the maximum number of indicators
        if (this.indicators.size >= this.maxIndicators) {
            // Remove the oldest indicator
            const oldestId = this._getOldestIndicatorId();
            if (oldestId) {
                this._removeIndicator(oldestId);
            }
        }
        
        // Create new indicator
        this._createIndicator(sourceId, angle, intensity, damageType, distanceCategory);
    }
    
    /**
     * Get the ID of the oldest indicator
     * @returns {string} ID of the oldest indicator
     */
    _getOldestIndicatorId() {
        let oldestId = null;
        let oldestTime = Infinity;
        
        for (const [id, indicator] of this.indicators.entries()) {
            if (indicator.timestamp < oldestTime) {
                oldestId = id;
                oldestTime = indicator.timestamp;
            }
        }
        
        return oldestId;
    }
    
    /**
     * Create a new damage indicator
     * @param {string} sourceId - Unique identifier for the damage source
     * @param {number} angle - Direction angle in degrees
     * @param {number} intensity - Damage intensity (0-1)
     * @param {string} damageType - Type of damage (bullet, explosive, etc.)
     * @param {string} distanceCategory - Distance category (close, medium, far)
     */
    _createIndicator(sourceId, angle, intensity, damageType, distanceCategory) {
        // Get configuration for this damage type
        const typeConfig = this.damageTypes[damageType] || this.damageTypes.bullet;
        const distConfig = this.distanceConfig[distanceCategory] || this.distanceConfig.medium;
        
        // Create indicator element with proper CSS classes
        // The CSS uses 'rift-damage-indicator--[type]' classes, so we ensure alignment
        const element = DOMFactory.createElement('div', {
            className: `rift-enhanced-damage-indicator rift-damage-indicator--${damageType}`,
            parent: this.container,
            attributes: {
                'data-distance': distanceCategory,
                'data-damage-type': damageType
            },
            style: {
                '--indicator-intensity': intensity.toFixed(2),
                '--indicator-distance': distConfig.scale.toFixed(2),
                transform: `rotate(${angle}deg)`
            }
        });
        
        // Store indicator data
        this.indicators.set(sourceId, {
            element,
            angle,
            intensity,
            damageType,
            distanceCategory,
            timestamp: performance.now(),
            timeoutId: null
        });
        
        // Add fade-in animation
        element.classList.add('rift-enhanced-damage-indicator--visible');
        
        // Set timeout to remove indicator after duration
        const duration = (typeConfig.duration || 1) * 1000; // Convert to ms
        const timeoutId = setTimeout(() => {
            this._removeIndicator(sourceId);
        }, duration);
        
        // Update timeout ID
        this.indicators.get(sourceId).timeoutId = timeoutId;
    }
    
    /**
     * Update an existing indicator
     * @param {string} sourceId - ID of indicator to update
     * @param {number} additionalIntensity - Additional intensity to add
     */
    _updateIndicator(sourceId, additionalIntensity) {
        const indicator = this.indicators.get(sourceId);
        if (!indicator) return;
        
        // Update timestamp
        indicator.timestamp = performance.now();
        
        // Increase intensity up to a maximum of 1.5
        const newIntensity = Math.min(1.5, indicator.intensity + additionalIntensity * 0.5);
        indicator.intensity = newIntensity;
        
        // Update visual intensity
        indicator.element.style.setProperty('--indicator-intensity', newIntensity.toFixed(2));
        
        // Reset and restart the removal timeout
        if (indicator.timeoutId) {
            clearTimeout(indicator.timeoutId);
        }
        
        // Get configuration for this damage type
        const typeConfig = this.damageTypes[indicator.damageType] || this.damageTypes.bullet;
        const duration = (typeConfig.duration || 1) * 1000; // Convert to ms
        
        // Set new timeout
        indicator.timeoutId = setTimeout(() => {
            this._removeIndicator(sourceId);
        }, duration);
    }
    
    /**
     * Remove an indicator
     * @param {string} sourceId - ID of indicator to remove
     */
    _removeIndicator(sourceId) {
        const indicator = this.indicators.get(sourceId);
        if (!indicator) return;
        
        // Clear any existing timeout
        if (indicator.timeoutId) {
            clearTimeout(indicator.timeoutId);
        }
        
        // Add fade-out class
        indicator.element.classList.add('rift-enhanced-damage-indicator--fadeout');
        
        // Remove after animation completes
        setTimeout(() => {
            if (indicator.element && indicator.element.parentNode) {
                indicator.element.parentNode.removeChild(indicator.element);
            }
            this.indicators.delete(sourceId);
        }, 300); // Fade out duration
    }

    /**
     * Component update method
     * @param {number} delta - Time since last update in seconds
     */
    update(delta) {
        // No regular updates needed for this component
    }
    
    /**
     * Clear all damage indicators
     * Used when pausing the game or resetting state
     */
    clearAllIndicators() {
        // Clear all timeouts
        for (const [sourceId, indicator] of this.indicators.entries()) {
            if (indicator.timeoutId) {
                clearTimeout(indicator.timeoutId);
            }
        }
        
        // Remove all indicator elements
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        // Clear indicators map
        this.indicators.clear();
    }

    /**
     * Clean up component resources
     */
    dispose() {
        // Clear all indicators
        this.clearAllIndicators();
        
        // Call parent dispose method
        super.dispose();
    }
}



export { EnhancedDamageIndicator };