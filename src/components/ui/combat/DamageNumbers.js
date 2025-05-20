/**
 * DamageNumbers Component
 *
 * Displays floating damage numbers when the player hits enemies.
 * Features:
 * - Different styling for normal, critical, and headshot damage
 * - Stacking for rapid damage events
 * - Rising animation with fade out
 * - Size variation based on damage amount
 *
 * @extends UIComponent
 */

import EventManager from '../../../core/EventManager.js';
import UIComponent from '../UIComponent.js';
import DOMFactory from '../../../utils/DOMFactory.js';

class DamageNumbers extends UIComponent {
    /**
     * Create a new DamageNumbers component
     * 
     * @param {Object} options - Component configuration options
     * @param {HTMLElement} options.container - Container element for the damage numbers
     * @param {number} [options.maxNumbers=30] - Maximum number of simultaneous damage numbers
     * @param {number} [options.duration=1500] - Duration of damage number display in ms
     * @param {number} [options.stackThreshold=300] - Time threshold in ms for stacking damage
     * @param {number} [options.riseDistance=30] - Distance in px damage numbers rise
     * @param {number} [options.stackLimit=5] - Maximum hits to show in a stack before showing total
     * @param {boolean} [options.showCriticals=true] - Whether to use special styling for criticals
     * @param {boolean} [options.showHeadshots=true] - Whether to use special styling for headshots
     * @param {boolean} [options.showKills=true] - Whether to show special kill confirmations
     */
    constructor(options = {}) {
        super({
            id: options.id || 'damage-numbers',
            className: 'rift-damage-numbers',
            container: options.container || document.body,
            ...options
        });

        // Configuration options with defaults
        this.maxNumbers = options.maxNumbers || 30;
        this.duration = options.duration || 1500;
        this.stackThreshold = options.stackThreshold || 300;
        this.riseDistance = options.riseDistance || 30;
        this.stackLimit = options.stackLimit || 5;
        this.showCriticals = options.showCriticals !== false;
        this.showHeadshots = options.showHeadshots !== false;
        this.showKills = options.showKills !== false;
        
        // State
        this.activeNumbers = [];
        this.numberPool = [];
        this.stackedDamage = new Map(); // Maps target IDs to stacked damage info
        this.isActive = false;
        
        // Bind methods
        this._onHitLanded = this._onHitLanded.bind(this);
        this._onEnemyKilled = this._onEnemyKilled.bind(this);
    }

    /**
     * Initialize the damage numbers component
     */
    init() {
        // Create number pool for reuse
        this._initNumberPool();
        
        // Register event listeners
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
        const numbersToRemove = [];
        
        // Update each active damage number
        this.activeNumbers.forEach((number, index) => {
            // Calculate progress based on elapsed time
            const elapsed = now - number.startTime;
            
            // Remove expired numbers
            if (elapsed >= number.duration) {
                numbersToRemove.push(index);
                number.element.classList.remove('rift-damage-number--active');
            }
        });
        
        // Remove completed numbers (in reverse order to avoid index shifting)
        for (let i = numbersToRemove.length - 1; i >= 0; i--) {
            const index = numbersToRemove[i];
            const number = this.activeNumbers[index];
            this._releaseNumber(number);
            this.activeNumbers.splice(index, 1);
        }
        
        // Clean up old stacked damage entries
        for (const [targetId, stackInfo] of this.stackedDamage.entries()) {
            if (now - stackInfo.lastTime > this.stackThreshold) {
                this.stackedDamage.delete(targetId);
            }
        }
        
        // Process standard animations
        this._updateAnimations(delta);
        
        return this;
    }

    /**
     * Show a damage number at the specified position
     * 
     * @param {Object} options - Damage number options
     * @param {number} options.damage - Amount of damage dealt
     * @param {Object} options.position - Screen position {x, y} in pixels
     * @param {boolean} [options.isCritical=false] - Whether the hit was a critical hit
     * @param {boolean} [options.isHeadshot=false] - Whether the hit was a headshot
     * @param {string} [options.targetId] - Target identifier for damage stacking
     * @param {boolean} [options.isKill=false] - Whether this damage resulted in a kill
     * @param {number} [options.duration] - Custom duration override in ms
     */
    showDamageNumber(options = {}) {
        if (!this.isActive || !this.isVisible) return this;
        
        // Must have damage amount and position
        if (typeof options.damage !== 'number' || !options.position) return this;
        
        const { damage, position, isCritical, isHeadshot, targetId, isKill, duration } = options;
        
        // Handle damage stacking if targetId is provided
        if (targetId && !isKill) {
            const now = performance.now();
            
            // Check if we should stack this damage
            if (this.stackedDamage.has(targetId)) {
                const stackInfo = this.stackedDamage.get(targetId);
                const timeSinceLastHit = now - stackInfo.lastTime;
                
                // If within stacking threshold, add to existing stack
                if (timeSinceLastHit <= this.stackThreshold) {
                    stackInfo.hits.push({
                        damage,
                        isCritical: isCritical || false,
                        isHeadshot: isHeadshot || false
                    });
                    stackInfo.lastTime = now;
                    stackInfo.totalDamage += damage;
                    
                    // Update the existing damage number if it's still active
                    if (stackInfo.numberRef && this.activeNumbers.includes(stackInfo.numberRef)) {
                        this._updateStackedNumber(stackInfo);
                        return this;
                    }
                } else {
                    // Too much time has passed, start a new stack
                    this.stackedDamage.delete(targetId);
                }
            }
            
            // Create a new stack entry
            if (!this.stackedDamage.has(targetId)) {
                this.stackedDamage.set(targetId, {
                    hits: [{
                        damage,
                        isCritical: isCritical || false,
                        isHeadshot: isHeadshot || false
                    }],
                    position,
                    lastTime: now,
                    totalDamage: damage,
                    numberRef: null
                });
            }
            
            // Now display the stacked damage
            const stackInfo = this.stackedDamage.get(targetId);
            this._showStackedNumber(stackInfo);
            return this;
        }
        
        // Non-stacked damage or kill confirmation
        const number = this._getNumber();
        if (!number) return this; // No available numbers
        
        // Determine the type of damage number
        let damageClass = 'rift-damage-number--normal';
        let damageText = String(Math.round(damage));
        
        if (isKill && this.showKills) {
            damageClass = 'rift-damage-number--kill';
            damageText = '☠️ ' + damageText;
        } else if (isHeadshot && this.showHeadshots) {
            damageClass = 'rift-damage-number--headshot';
            damageText = '🎯 ' + damageText;
        } else if (isCritical && this.showCriticals) {
            damageClass = 'rift-damage-number--critical';
            damageText = '✧ ' + damageText;
        }
        
        // Add large class for high damage
        if (damage >= 50) {
            damageClass += ' rift-damage-number--large';
        }
        
        // Add slight position variation
        const posX = position.x + (Math.random() * 20 - 10);
        const posY = position.y + (Math.random() * 10 - 5);
        
        // Configure the UI for the damage number
        number.element.style.left = `${posX}px`;
        number.element.style.top = `${posY}px`;
        number.element.textContent = damageText;
        number.element.className = `rift-damage-number ${damageClass}`;
        number.element.style.setProperty('--rift-damage-number-rise', `${this.riseDistance}px`);
        number.element.style.setProperty('--rift-damage-number-duration', `${duration || this.duration}ms`);
        
        // Set number state
        number.startTime = performance.now();
        number.duration = duration || this.duration;
        number.damage = damage;
        number.targetId = targetId;
        
        // Activate the number
        number.element.classList.add('rift-damage-number--active');
        this.activeNumbers.push(number);
        
        // Save reference for stacked damage
        if (targetId) {
            const stackInfo = this.stackedDamage.get(targetId);
            if (stackInfo) {
                stackInfo.numberRef = number;
            }
        }
        
        // Apply max numbers limit
        if (this.activeNumbers.length > this.maxNumbers) {
            // Remove the oldest number
            const oldestNumber = this.activeNumbers.shift();
            this._releaseNumber(oldestNumber);
        }
        
        return this;
    }

    /**
     * Show damage number from 3D world position
     * 
     * @param {Object} options - Damage options with world position
     * @param {number} options.damage - Amount of damage dealt
     * @param {Object} options.worldPosition - 3D position {x, y, z}
     * @param {Object} options.camera - Three.js camera for projection
     * @param {boolean} [options.isCritical] - Whether the hit was critical
     * @param {boolean} [options.isHeadshot] - Whether the hit was a headshot
     * @param {string} [options.targetId] - Target identifier for stacking
     * @param {boolean} [options.isKill] - Whether this was a kill
     */
    showDamageAt3DPosition(options = {}) {
        if (!this.isActive || !this.isVisible) return this;
        
        // Need damage, world position, and camera
        if (typeof options.damage !== 'number' || !options.worldPosition || !options.camera) {
            return this;
        }
        
        // Project 3D position to 2D screen space
        const pos = options.worldPosition.clone();
        pos.project(options.camera);
        
        // Convert to screen coordinates
        const screenX = (pos.x + 1) * window.innerWidth / 2;
        const screenY = (-pos.y + 1) * window.innerHeight / 2;
        
        // Only show if in front of camera
        if (pos.z > 1) return this;
        
        // Show damage number at screen position
        this.showDamageNumber({
            ...options,
            position: { x: screenX, y: screenY }
        });
        
        return this;
    }

    /**
     * Clear all active damage numbers
     */
    clearAllNumbers() {
        // Release all active numbers back to the pool
        this.activeNumbers.forEach(number => {
            this._releaseNumber(number);
        });
        this.activeNumbers = [];
        
        // Clear stacked damage
        this.stackedDamage.clear();
        
        return this;
    }

    /**
     * Clean up resources when disposing the component
     */
    dispose() {
        // Clear all active numbers
        this.clearAllNumbers();
        
        // Dispose the number pool
        this.numberPool.forEach(number => {
            if (number.element && number.element.parentNode) {
                number.element.parentNode.removeChild(number.element);
            }
        });
        this.numberPool = [];
        
        // Call parent dispose method
        super.dispose();
        
        return this;
    }

    /**
     * Initialize the pool of reusable damage number elements
     * @private
     */
    _initNumberPool() {
        // Create a pool of damage number elements to avoid DOM thrashing
        for (let i = 0; i < this.maxNumbers; i++) {
            const element = DOMFactory.createElement('div', {
                className: 'rift-damage-number',
                parent: this.element
            });
            
            this.numberPool.push({
                element,
                active: false,
                startTime: 0,
                duration: 0,
                damage: 0,
                targetId: null
            });
        }
    }

    /**
     * Get an available damage number from the pool
     * @private
     * @returns {Object|null} Available number or null if none available
     */
    _getNumber() {
        // Find the first inactive number
        const availableNumber = this.numberPool.find(number => !number.active);
        
        if (availableNumber) {
            availableNumber.active = true;
            return availableNumber;
        }
        
        return null; // No available numbers
    }

    /**
     * Release a damage number back to the pool
     * @private
     * @param {Object} number - Damage number to release
     */
    _releaseNumber(number) {
        if (!number) return;
        
        // Reset the element
        number.element.classList.remove('rift-damage-number--active');
        number.element.textContent = '';
        number.element.style.opacity = '0';
        
        // Reset the state
        number.active = false;
        number.targetId = null;
        
        // If this was part of a stacked damage display, remove the reference
        if (number.targetId && this.stackedDamage.has(number.targetId)) {
            const stackInfo = this.stackedDamage.get(number.targetId);
            if (stackInfo.numberRef === number) {
                stackInfo.numberRef = null;
            }
        }
    }

    /**
     * Show a stacked damage number
     * @private
     * @param {Object} stackInfo - Stacked damage information
     */
    _showStackedNumber(stackInfo) {
        if (!stackInfo) return;
        
        const number = this._getNumber();
        if (!number) return;
        
        // Set position with slight variation for visual interest
        const posX = stackInfo.position.x + (Math.random() * 20 - 10);
        const posY = stackInfo.position.y + (Math.random() * 10 - 5);
        number.element.style.left = `${posX}px`;
        number.element.style.top = `${posY}px`;
        
        // Determine styling based on hit types
        let highestPriorityClass = 'rift-damage-number--normal';
        const hasHeadshot = stackInfo.hits.some(hit => hit.isHeadshot);
        const hasCritical = stackInfo.hits.some(hit => hit.isCritical);
        
        if (hasHeadshot && this.showHeadshots) {
            highestPriorityClass = 'rift-damage-number--headshot';
        } else if (hasCritical && this.showCriticals) {
            highestPriorityClass = 'rift-damage-number--critical';
        }
        
        // Add large class for high total damage
        if (stackInfo.totalDamage >= 50) {
            highestPriorityClass += ' rift-damage-number--large';
        }
        
        // Clear previous content
        while (number.element.firstChild) {
            number.element.removeChild(number.element.firstChild);
        }
        
        // Create stacked display if we're above the limit
        if (stackInfo.hits.length > 1) {
            const stackContainer = DOMFactory.createElement('div', {
                className: 'rift-damage-number__stacked',
                parent: number.element
            });
            
            // If we have many hits, just show the most recent with a total
            if (stackInfo.hits.length > this.stackLimit) {
                const latestHit = stackInfo.hits[stackInfo.hits.length - 1];
                const hitText = String(Math.round(latestHit.damage));
                
                // Create the latest hit text
                const hitSpan = DOMFactory.createElement('div', {
                    text: hitText,
                    parent: stackContainer
                });
                
                // Create the total
                const totalSpan = DOMFactory.createElement('div', {
                    className: 'rift-damage-number__total',
                    text: `${stackInfo.hits.length}x (${Math.round(stackInfo.totalDamage)})`,
                    parent: stackContainer
                });
            } else {
                // Add individual hits
                for (const hit of stackInfo.hits) {
                    DOMFactory.createElement('div', {
                        text: String(Math.round(hit.damage)),
                        parent: stackContainer
                    });
                }
                
                // Add total if more than one hit
                if (stackInfo.hits.length > 1) {
                    DOMFactory.createElement('div', {
                        className: 'rift-damage-number__total',
                        text: String(Math.round(stackInfo.totalDamage)),
                        parent: stackContainer
                    });
                }
            }
        } else {
            // Simple single hit display
            number.element.textContent = String(Math.round(stackInfo.totalDamage));
        }
        
        // Set CSS classes
        number.element.className = `rift-damage-number ${highestPriorityClass}`;
        number.element.style.setProperty('--rift-damage-number-rise', `${this.riseDistance}px`);
        number.element.style.setProperty('--rift-damage-number-duration', `${this.duration}ms`);
        
        // Set number state
        number.startTime = performance.now();
        number.duration = this.duration;
        number.damage = stackInfo.totalDamage;
        number.targetId = stackInfo.targetId;
        
        // Activate the number
        number.element.classList.add('rift-damage-number--active');
        this.activeNumbers.push(number);
        
        // Store reference to this number
        stackInfo.numberRef = number;
        
        // Apply max numbers limit
        if (this.activeNumbers.length > this.maxNumbers) {
            // Remove the oldest number
            const oldestNumber = this.activeNumbers.shift();
            this._releaseNumber(oldestNumber);
        }
    }

    /**
     * Update an existing stacked damage number
     * @private
     * @param {Object} stackInfo - Stacked damage information
     */
    _updateStackedNumber(stackInfo) {
        if (!stackInfo || !stackInfo.numberRef) return;
        
        const number = stackInfo.numberRef;
        
        // Determine styling based on hit types
        let highestPriorityClass = 'rift-damage-number--normal';
        const hasHeadshot = stackInfo.hits.some(hit => hit.isHeadshot);
        const hasCritical = stackInfo.hits.some(hit => hit.isCritical);
        
        if (hasHeadshot && this.showHeadshots) {
            highestPriorityClass = 'rift-damage-number--headshot';
        } else if (hasCritical && this.showCriticals) {
            highestPriorityClass = 'rift-damage-number--critical';
        }
        
        // Add large class for high total damage
        if (stackInfo.totalDamage >= 50) {
            highestPriorityClass += ' rift-damage-number--large';
        }
        
        // Clear previous content
        while (number.element.firstChild) {
            number.element.removeChild(number.element.firstChild);
        }
        
        // Create stacked display
        const stackContainer = DOMFactory.createElement('div', {
            className: 'rift-damage-number__stacked',
            parent: number.element
        });
        
        // If we have many hits, just show the most recent with a total
        if (stackInfo.hits.length > this.stackLimit) {
            const latestHit = stackInfo.hits[stackInfo.hits.length - 1];
            const hitText = String(Math.round(latestHit.damage));
            
            // Create the latest hit text
            const hitSpan = DOMFactory.createElement('div', {
                text: `+${hitText}`,
                parent: stackContainer
            });
            
            // Create the total
            const totalSpan = DOMFactory.createElement('div', {
                className: 'rift-damage-number__total',
                text: `${stackInfo.hits.length}x (${Math.round(stackInfo.totalDamage)})`,
                parent: stackContainer
            });
        } else {
            // Show all hits
            for (let i = 0; i < stackInfo.hits.length; i++) {
                const hit = stackInfo.hits[i];
                const prefix = i > 0 ? '+' : '';
                DOMFactory.createElement('div', {
                    text: `${prefix}${Math.round(hit.damage)}`,
                    parent: stackContainer
                });
            }
            
            // Add total if more than one hit
            if (stackInfo.hits.length > 1) {
                DOMFactory.createElement('div', {
                    className: 'rift-damage-number__total',
                    text: String(Math.round(stackInfo.totalDamage)),
                    parent: stackContainer
                });
            }
        }
        
        // Update CSS classes
        number.element.className = `rift-damage-number ${highestPriorityClass} rift-damage-number--active`;
        
        // Update damage value
        number.damage = stackInfo.totalDamage;
        
        // Reset animation for continuity (optional)
        // number.element.classList.remove('rift-damage-number--active');
        // setTimeout(() => number.element.classList.add('rift-damage-number--active'), 10);
    }

    /**
     * Register event listeners for damage numbers
     * @private
     */
    _registerEventListeners() {
        // Register for hit events
        this.registerEvents({
            'hit:landed': this._onHitLanded,
            'enemy:killed': this._onEnemyKilled,
            'game:paused': () => this.clearAllNumbers(),
            'game:resumed': () => this.clearAllNumbers()
        });
    }

    /**
     * Handle hit landed events
     * @private
     * @param {Object} event - Hit event data
     */
    _onHitLanded(event) {
        if (!event.position) return;
        
        this.showDamageNumber({
            damage: event.damage || 10,
            position: {
                x: event.position.x,
                y: event.position.y
            },
            isCritical: event.isCritical,
            isHeadshot: event.isHeadshot,
            targetId: event.targetId
        });
    }

    /**
     * Handle enemy killed events
     * @private
     * @param {Object} event - Kill event data
     */
    _onEnemyKilled(event) {
        if (!event.position) return;
        
        this.showDamageNumber({
            damage: event.damage || 10,
            position: {
                x: event.position.x,
                y: event.position.y
            },
            isCritical: event.isCritical,
            isHeadshot: event.isHeadshot,
            isKill: true,
            duration: this.duration * 1.5 // Make kill confirmations last longer
        });
    }

    /**
     * Test method to display a damage number at a random position
     * For development/debugging only
     * 
     * @param {string} type - Type of damage ('normal', 'critical', 'headshot', 'kill')
     * @param {number} damage - Damage amount
     */
    testDamageNumber(type = 'normal', damage = 10) {
        const x = Math.random() * (window.innerWidth * 0.8) + (window.innerWidth * 0.1);
        const y = Math.random() * (window.innerHeight * 0.6) + (window.innerHeight * 0.2);
        
        const options = {
            damage,
            position: { x, y },
            isCritical: type === 'critical',
            isHeadshot: type === 'headshot',
            isKill: type === 'kill'
        };
        
        this.showDamageNumber(options);
        
        console.log(`Test damage number: ${damage} damage (${type}) at position ${x.toFixed(0)},${y.toFixed(0)}`);
    }

    /**
     * Test method to display stacked damage at a random position
     * For development/debugging only
     * 
     * @param {number} hitCount - Number of hits to stack
     * @param {number} baseDamage - Base damage amount
     */
    testStackedDamage(hitCount = 3, baseDamage = 10) {
        const targetId = 'test-target-' + Math.floor(Math.random() * 1000);
        const x = Math.random() * (window.innerWidth * 0.8) + (window.innerWidth * 0.1);
        const y = Math.random() * (window.innerHeight * 0.6) + (window.innerHeight * 0.2);
        const position = { x, y };
        
        // Create a sequence of hits
        const simulateHits = () => {
            for (let i = 0; i < hitCount; i++) {
                setTimeout(() => {
                    // Random damage variation
                    const damage = baseDamage + Math.floor(Math.random() * baseDamage * 0.5);
                    
                    // Random critical chance
                    const isCritical = Math.random() > 0.7;
                    
                    // Show the damage number
                    this.showDamageNumber({
                        damage,
                        position,
                        isCritical,
                        targetId
                    });
                    
                }, i * 100); // 100ms between hits
            }
        };
        
        simulateHits();
        
        console.log(`Test stacked damage: ${hitCount} hits with ~${baseDamage} base damage at position ${x.toFixed(0)},${y.toFixed(0)}`);
    }
}

export default DamageNumbers;
