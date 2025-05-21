/**
 * Enhanced Hit Indicator Component
 * 
 * Provides improved hit marker feedback with:
 * - Different visuals for body shots, critical hits, headshots, and kills
 * - Dynamic animation sequences for hit confirmation
 * - Visual scaling based on damage amount
 * - Special kill confirmation indicators
 * - Multi-kill recognition for successive kills
 * 
 * @extends UIComponent
 */

import { UIComponent } from '../UIComponent.js';
import { DOMFactory } from '../../../utils/DOMFactory.js';
import { UIConfig } from '../../../core/UIConfig.js';
import { EventManager } from '../../../core/EventManager.js';

export class EnhancedHitIndicator extends UIComponent {
    constructor(options = {}) {
        super(options);
        
        // Hit marker references
        this.hitMarkers = new Map();
        
        // Configuration from UIConfig
        const config = UIConfig.enhancedCombat.hitIndicator;
        this.hitTypes = config.types;
        this.multiKillConfig = config.multiKill;
        this.animationConfig = config.animation;
        
        // Multi-kill tracking
        this.killCounter = {
            count: 0,
            resetTimer: null,
            lastKillTime: 0
        };
        
        // Unique ID counter for hit markers
        this.markerIdCounter = 0;
    }

    init() {
        // Create container for all hit indicators
        this.container = DOMFactory.createContainer('enhanced-hit-indicators', {
            className: 'rift-enhanced-hit-indicators',
            parent: this.parentElement
        });
        
        // Register event handlers using standardized event names
        this.registerEvents({
            'hit:registered': this._onHitRegistered.bind(this),
            'hit:critical': this._onCriticalHit.bind(this),
            'hit:headshot': this._onHeadshotHit.bind(this),
            'enemy:killed': this._onEnemyKilled.bind(this)
        });
    }

    /**
     * Handle regular hit registration
     * @param {Object} event - The hit event data
     */
    _onHitRegistered(event) {
        const { damage = 10, enemyType = 'standard' } = event;
        this._showHitMarker('normal', damage, enemyType);
    }
    
    /**
     * Handle critical hit registration
     * @param {Object} event - The critical hit event data
     */
    _onCriticalHit(event) {
        const { damage = 20, enemyType = 'standard' } = event;
        this._showHitMarker('critical', damage, enemyType);
    }
    
    /**
     * Handle headshot hit registration
     * @param {Object} event - The headshot event data
     */
    _onHeadshotHit(event) {
        const { damage = 30, enemyType = 'standard' } = event;
        this._showHitMarker('headshot', damage, enemyType);
    }
    
    /**
     * Handle enemy kill event
     * @param {Object} event - The kill event data
     */
    _onEnemyKilled(event) {
        const { enemyType = 'standard' } = event;
        this._showHitMarker('kill', null, enemyType);
        this._processMultiKill();
    }
    
    /**
     * Show hit marker of specified type
     * @param {string} type - Hit marker type ('normal', 'critical', 'headshot', 'kill')
     * @param {number} damage - Damage amount (used for scaling)
     * @param {string} enemyType - Type of enemy that was hit
     */
    _showHitMarker(type, damage, enemyType) {
        // Get configuration for this hit type
        const typeConfig = this.hitTypes[type] || this.hitTypes.normal;
        
        // Create unique ID for this hit marker
        const markerId = `hit_${++this.markerIdCounter}`;
        
        // Calculate intensity based on damage (if applicable)
        let intensity = 1.0;
        if (damage !== null) {
            // Scale intensity based on damage amount (0.8 to 1.2 range)
            intensity = Math.min(1.2, Math.max(0.8, damage / 20));
        }
        
        // Create hit marker element
        const element = DOMFactory.createElement('div', {
            className: `rift-enhanced-hit-marker ${typeConfig.className}`,
            parent: this.container,
            attributes: {
                'data-hit-type': type,
                'data-enemy-type': enemyType
            },
            style: {
                '--hit-intensity': intensity.toFixed(2),
                '--hit-scale': (typeConfig.baseScale * intensity).toFixed(2)
            }
        });
        
        // Create hit marker segments
        ['top', 'right', 'bottom', 'left', 'center'].forEach(segment => {
            DOMFactory.createElement('div', {
                className: `rift-enhanced-hit-marker__segment rift-enhanced-hit-marker__segment--${segment}`,
                parent: element
            });
        });
        
        // Store hit marker data
        this.hitMarkers.set(markerId, {
            element,
            type,
            timestamp: performance.now(),
            timeoutId: null
        });
        
        // Add visible class to trigger animation
        element.classList.add('rift-enhanced-hit-marker--visible');
        
        // Set timeout to remove hit marker after duration
        const duration = (typeConfig.duration || 0.3) * 1000; // Convert to ms
        const timeoutId = setTimeout(() => {
            this._removeHitMarker(markerId);
        }, duration);
        
        // Update timeout ID
        this.hitMarkers.get(markerId).timeoutId = timeoutId;
    }
    
    /**
     * Process potential multi-kill
     */
    _processMultiKill() {
        const now = performance.now();
        const timeSinceLastKill = now - this.killCounter.lastKillTime;
        
        // Check if this kill is within the multi-kill time window
        if (timeSinceLastKill < this.multiKillConfig.timeWindow * 1000) {
            // Increment kill counter
            this.killCounter.count++;
            
            // Clear existing reset timer
            if (this.killCounter.resetTimer) {
                clearTimeout(this.killCounter.resetTimer);
            }
            
            // Show multi-kill feedback if applicable
            if (this.killCounter.count >= this.multiKillConfig.thresholds.double) {
                this._showMultiKillFeedback(this.killCounter.count);
            }
        } else {
            // Reset counter for new kill streak
            this.killCounter.count = 1;
        }
        
        // Update last kill time
        this.killCounter.lastKillTime = now;
        
        // Set timer to reset counter after delay
        this.killCounter.resetTimer = setTimeout(() => {
            this.killCounter.count = 0;
        }, this.multiKillConfig.resetDelay * 1000);
    }
    
    /**
     * Show multi-kill feedback
     * @param {number} killCount - Number of kills in streak
     */
    _showMultiKillFeedback(killCount) {
        // Determine multi-kill type
        let multiKillType = 'double';
        if (killCount >= this.multiKillConfig.thresholds.chain) {
            multiKillType = 'chain';
        } else if (killCount >= this.multiKillConfig.thresholds.quad) {
            multiKillType = 'quad';
        } else if (killCount >= this.multiKillConfig.thresholds.triple) {
            multiKillType = 'triple';
        }
        
        // Create multi-kill indicator
        const multiKillElement = DOMFactory.createElement('div', {
            className: `rift-enhanced-multi-kill rift-enhanced-multi-kill--${multiKillType}`,
            parent: this.container,
            attributes: {
                'data-count': killCount
            },
            style: {
                '--multi-kill-scale': this.multiKillConfig.scale.toFixed(2)
            }
        });
        
        // Add kill count text
        DOMFactory.createElement('div', {
            className: 'rift-enhanced-multi-kill__text',
            parent: multiKillElement,
            text: this._getMultiKillText(multiKillType, killCount)
        });
        
        // Add visible class to trigger animation
        setTimeout(() => {
            multiKillElement.classList.add('rift-enhanced-multi-kill--visible');
        }, 0);
        
        // Remove after animation duration
        setTimeout(() => {
            if (multiKillElement.parentNode) {
                multiKillElement.classList.add('rift-enhanced-multi-kill--fadeout');
                setTimeout(() => {
                    if (multiKillElement.parentNode) {
                        multiKillElement.parentNode.removeChild(multiKillElement);
                    }
                }, 500); // Fade out duration
            }
        }, 1500); // Display duration
    }
    
    /**
     * Get text for multi-kill notification
     * @param {string} type - Multi-kill type
     * @param {number} count - Kill count
     * @returns {string} Multi-kill text
     */
    _getMultiKillText(type, count) {
        switch (type) {
            case 'double':
                return 'Double Kill!';
            case 'triple':
                return 'Triple Kill!';
            case 'quad':
                return 'Quad Kill!';
            case 'chain':
                if (count === 5) return 'Quintuple Kill!';
                if (count === 6) return 'Sextuple Kill!';
                return `${count} Kill Streak!`;
            default:
                return 'Multi Kill!';
        }
    }
    
    /**
     * Remove a hit marker
     * @param {string} markerId - ID of hit marker to remove
     */
    _removeHitMarker(markerId) {
        const marker = this.hitMarkers.get(markerId);
        if (!marker) return;
        
        // Clear any existing timeout
        if (marker.timeoutId) {
            clearTimeout(marker.timeoutId);
        }
        
        // Add fade-out class
        marker.element.classList.add('rift-enhanced-hit-marker--fadeout');
        
        // Remove after animation completes
        setTimeout(() => {
            if (marker.element && marker.element.parentNode) {
                marker.element.parentNode.removeChild(marker.element);
            }
            this.hitMarkers.delete(markerId);
        }, 300); // Fade out duration
    }
    
    /**
     * Clear all hit markers
     * Aliased as clearAllIndicators for compatibility with CombatSystem
     */
    clearAllIndicators() {
        // Clear all timeouts
        for (const [markerId, marker] of this.hitMarkers.entries()) {
            if (marker.timeoutId) {
                clearTimeout(marker.timeoutId);
            }
        }
        
        // Remove all hit marker elements
        this.container.innerHTML = '';
        
        // Clear hit markers map
        this.hitMarkers.clear();
    }

    /**
     * Component update method
     * @param {number} delta - Time since last update in seconds
     */
    update(delta) {
        // No regular updates needed for this component
    }
    
    /**
     * Test method for showing hit marker
     * For development/debugging only
     * @public
     * 
     * @param {string} type - Type of hit marker to show
     * @param {number} damage - Damage amount
     */
    testHitMarker(type = 'normal', damage = null) {
        // Set default damage if not provided
        if (damage === null) {
            switch(type) {
                case 'normal': damage = 10; break;
                case 'critical': damage = 20; break;
                case 'headshot': damage = 35; break;
                case 'kill': damage = 50; break;
                default: damage = 10;
            }
        }
        
        // Show hit marker
        this._showHitMarker(type, damage, 'standard');
    }
    
    /**
     * Test method for showing multi-kill
     * For development/debugging only
     * @public
     * 
     * @param {number} count - Kill count to show
     */
    testMultiKill(count = 2) {
        // Set kill counter
        this.killCounter.count = count;
        this.killCounter.lastKillTime = performance.now();
        
        // Show multi-kill feedback
        this._showMultiKillFeedback(count);
    }
    
    /**
     * Test method for showing kill sequence
     * For development/debugging only
     * @public
     * 
     * @param {number} count - Number of kills to simulate
     * @param {number} interval - Milliseconds between kills
     */
    testKillSequence(count = 4, interval = 500) {
        // Reset kill counter
        this.killCounter.count = 0;
        
        // Show kills with interval
        let currentCount = 0;
        
        const showNextKill = () => {
            // Show kill hit marker
            this._showHitMarker('kill', null, 'standard');
            this._processMultiKill();
            
            // Increment count
            currentCount++;
            
            // Continue if not done
            if (currentCount < count) {
                setTimeout(showNextKill, interval);
            }
        };
        
        // Start sequence
        showNextKill();
    }
    
    /**
     * Clean up component resources
     */
    dispose() {
        // Clear kill counter timer
        if (this.killCounter.resetTimer) {
            clearTimeout(this.killCounter.resetTimer);
        }
        
        // Clear all hit markers
        this.clearAllIndicators();
        
        // Call parent dispose method
        super.dispose();
    }
}

export default EnhancedHitIndicator;
