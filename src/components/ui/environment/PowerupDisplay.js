/**
 * PowerupDisplay.js
 * 
 * Displays active buffs and status effects in the UI.
 * Manages timers, animations, and informative display for each active powerup.
 */

import UIComponent from '../UIComponent.js';
import { EventManager } from '../../../core/EventManager.js';

export class PowerupDisplay extends UIComponent {
    /**
     * Creates a new PowerupDisplay instance.
     * @param {Object} options - Configuration options
     * @param {World} options.world - World instance
     */
    constructor(options = {}) {
        super({
            autoInit: false,
            id: 'powerup-display',
            className: 'rift-powerups',
            template: '<div class="rift-powerups__container"></div>',
            container: options.container || document.body,
            ...options
        });

        this.world = options.world;
        this.config = this.world?.config?.ui?.powerup || this.config.powerup;
        this.activePowerups = new Map(); // Stores active powerup data
        this.container = null;
        
        // Bind methods
        this._onPowerupAdded = this._onPowerupAdded.bind(this);
        this._onPowerupRemoved = this._onPowerupRemoved.bind(this);
        this._onPowerupUpdated = this._onPowerupUpdated.bind(this);
        this._onGamePaused = this._onGamePaused.bind(this);
    }
    
    /**
     * Initialize the powerup display
     */
    init() {
        if (this.isInitialized) return this;
        
        // Create main element
        super.init();
        
        // Store the container reference
        this.container = this.element.querySelector('.rift-powerups__container');
        
        // Register events
        this.registerEvents({
            'powerup:added': this._onPowerupAdded,
            'powerup:removed': this._onPowerupRemoved,
            'powerup:updated': this._onPowerupUpdated,
            'game:paused': this._onGamePaused,
            'game:resumed': this._onGameResumed
        });
        
        this.isInitialized = true;
        return this;
    }
    
    /**
     * Update powerup timers and animations
     * @param {number} delta - Time elapsed since last update in seconds
     */
    update(delta) {
        if (!this.isInitialized || !this.isVisible) return;
        
        // Skip updates when game is paused
        if (this.world && this.world.isGamePaused) return;
        
        // Update each active powerup
        this.activePowerups.forEach((powerup, id) => {
            if (!powerup.active || !powerup.element) return;
            
            // Update remaining time
            if (powerup.duration > 0) {
                powerup.timeRemaining -= delta;
                
                // Check if expired
                if (powerup.timeRemaining <= 0) {
                    this.removePowerup(id);
                    return;
                }
                
                // Update timer display
                const timerBar = powerup.element.querySelector('.rift-powerup__timer-bar');
                const timerText = powerup.element.querySelector('.rift-powerup__timer-text');
                
                if (timerBar) {
                    const percent = (powerup.timeRemaining / powerup.duration) * 100;
                    timerBar.style.width = `${percent}%`;
                }
                
                if (timerText) {
                    const secondsRemaining = Math.ceil(powerup.timeRemaining);
                    timerText.textContent = secondsRemaining + 's';
                }
                
                // Add expiring class when nearing end
                if (powerup.timeRemaining <= this.config.expiringThreshold && 
                    !powerup.element.classList.contains('rift-powerup--expiring')) {
                    powerup.element.classList.add('rift-powerup--expiring');
                }
            }
        });
    }
    
    /**
     * Add a new powerup to display
     * @param {Object} powerupData - Powerup configuration
     * @param {string} powerupData.id - Unique identifier for the powerup
     * @param {string} powerupData.type - Powerup type ('damage', 'speed', 'armor', 'health', 'ammo', 'invisible')
     * @param {string} powerupData.name - Display name for the powerup
     * @param {number} powerupData.duration - Duration in seconds (0 for infinite)
     * @param {Object} powerupData.effects - Effects of the powerup (type-specific)
     * @returns {Object} Created powerup data
     */
    addPowerup(powerupData) {
        if (!this.isInitialized) {
            this.init();
        }
        
        // Generate ID if not provided
        const id = powerupData.id || `powerup-${Date.now()}`;
        
        // Check if already exists
        if (this.activePowerups.has(id)) {
            return this.updatePowerup(id, powerupData);
        }
        
        // Set defaults
        const defaultDuration = 10; // 10 seconds default
        
        // Create powerup data
        const powerup = {
            id,
            type: powerupData.type || 'generic',
            name: powerupData.name || this._getDefaultName(powerupData.type),
            duration: powerupData.duration !== undefined ? powerupData.duration : defaultDuration,
            timeRemaining: powerupData.duration !== undefined ? powerupData.duration : defaultDuration,
            effects: powerupData.effects || {},
            active: true,
            element: null,
            added: Date.now()
        };
        
        // Create DOM elements for the powerup
        this._createPowerupElement(powerup);
        
        // Store the powerup
        this.activePowerups.set(id, powerup);
        
        // Emit event
        EventManager.emit('powerup:activated', {
            id: powerup.id,
            type: powerup.type,
            duration: powerup.duration,
            effects: powerup.effects,
            timestamp: performance.now()
        });
        
        return powerup;
    }
    
    /**
     * Update an existing powerup
     * @param {string} id - Powerup ID
     * @param {Object} updates - Properties to update
     * @returns {Object|null} Updated powerup data or null if not found
     */
    updatePowerup(id, updates) {
        if (!this.activePowerups.has(id)) return null;
        
        const powerup = this.activePowerups.get(id);
        const oldTimeRemaining = powerup.timeRemaining;
        
        // Apply updates
        Object.assign(powerup, updates);
        
        // If duration was updated but timeRemaining wasn't explicitly set,
        // update timeRemaining proportionally
        if (updates.duration !== undefined && updates.timeRemaining === undefined) {
            if (oldTimeRemaining === 0) {
                powerup.timeRemaining = updates.duration;
            } else {
                const ratio = oldTimeRemaining / powerup.duration;
                powerup.timeRemaining = updates.duration * ratio;
            }
        }
        
        // Update DOM element
        this._updatePowerupElement(powerup);
        
        return powerup;
    }
    
    /**
     * Remove a powerup
     * @param {string} id - Powerup ID
     * @returns {boolean} True if powerup was removed
     */
    removePowerup(id) {
        if (!this.activePowerups.has(id)) return false;
        
        const powerup = this.activePowerups.get(id);
        
        // Start remove animation if element exists
        if (powerup.element) {
            powerup.element.classList.add('rift-powerup--exiting');
            
            // Remove from DOM after animation
            setTimeout(() => {
                if (powerup.element && powerup.element.parentNode) {
                    powerup.element.parentNode.removeChild(powerup.element);
                }
            }, 300); // Match animation duration
        }
        
        // Remove from collection
        this.activePowerups.delete(id);
        
        // Emit event
        EventManager.emit('powerup:deactivated', {
            id: powerup.id,
            type: powerup.type,
            timestamp: performance.now()
        });
        
        return true;
    }
    
    /**
     * Clear all powerups
     */
    clearPowerups() {
        // Remove all powerup elements with animation
        this.activePowerups.forEach((powerup, id) => {
            this.removePowerup(id);
        });
    }
    
    /**
     * Get a powerup by ID
     * @param {string} id - Powerup ID
     * @returns {Object|undefined} Powerup data or undefined if not found
     */
    getPowerup(id) {
        return this.activePowerups.get(id);
    }
    
    /**
     * Get all active powerups
     * @returns {Array} Array of all powerup objects
     */
    getAllPowerups() {
        return Array.from(this.activePowerups.values());
    }
    
    /**
     * Get powerups of a specific type
     * @param {string} type - Powerup type
     * @returns {Array} Array of matching powerup objects
     */
    getPowerupsByType(type) {
        return Array.from(this.activePowerups.values()).filter(powerup => powerup.type === type);
    }
    
    /**
     * Create DOM element for a powerup
     * @param {Object} powerup - Powerup data
     * @private
     */
    _createPowerupElement(powerup) {
        // Create main element
        const element = document.createElement('div');
        element.className = `rift-powerup rift-powerup--${powerup.type} rift-powerup--entering`;
        element.id = `rift-powerup-${powerup.id}`;
        
        // Create icon
        const icon = document.createElement('div');
        icon.className = 'rift-powerup__icon';
        icon.innerHTML = this._getIconForType(powerup.type);
        element.appendChild(icon);
        
        // Create info container
        const info = document.createElement('div');
        info.className = 'rift-powerup__info';
        element.appendChild(info);
        
        // Create name
        const name = document.createElement('div');
        name.className = 'rift-powerup__name';
        name.textContent = powerup.name;
        info.appendChild(name);
        
        // Create timer if not infinite
        if (powerup.duration > 0) {
            const timer = document.createElement('div');
            timer.className = 'rift-powerup__timer';
            
            const timerBar = document.createElement('div');
            timerBar.className = 'rift-powerup__timer-bar';
            timerBar.style.width = '100%';
            timer.appendChild(timerBar);
            
            const timerText = document.createElement('div');
            timerText.className = 'rift-powerup__timer-text';
            timerText.textContent = Math.ceil(powerup.timeRemaining) + 's';
            timer.appendChild(timerText);
            
            info.appendChild(timer);
        }
        
        // Add to container
        this.container.appendChild(element);
        
        // Store element reference
        powerup.element = element;
        
        // Remove entering class after animation
        setTimeout(() => {
            if (element.classList.contains('rift-powerup--entering')) {
                element.classList.remove('rift-powerup--entering');
            }
        }, 300); // Match animation duration
    }
    
    /**
     * Update DOM element for a powerup
     * @param {Object} powerup - Powerup data
     * @private
     */
    _updatePowerupElement(powerup) {
        if (!powerup.element) return;
        
        // Update type class
        const typeClasses = Array.from(powerup.element.classList)
            .filter(cls => cls.startsWith('rift-powerup--') && 
                  !['rift-powerup--entering', 'rift-powerup--exiting', 
                    'rift-powerup--expiring'].includes(cls));
        
        typeClasses.forEach(cls => powerup.element.classList.remove(cls));
        powerup.element.classList.add(`rift-powerup--${powerup.type}`);
        
        // Update name
        const nameElement = powerup.element.querySelector('.rift-powerup__name');
        if (nameElement) {
            nameElement.textContent = powerup.name;
        }
        
        // Update icon
        const iconElement = powerup.element.querySelector('.rift-powerup__icon');
        if (iconElement) {
            iconElement.innerHTML = this._getIconForType(powerup.type);
        }
        
        // Update timer if not infinite
        if (powerup.duration > 0) {
            let timerElement = powerup.element.querySelector('.rift-powerup__timer');
            
            // Create timer element if it doesn't exist
            if (!timerElement) {
                const infoElement = powerup.element.querySelector('.rift-powerup__info');
                
                if (infoElement) {
                    timerElement = document.createElement('div');
                    timerElement.className = 'rift-powerup__timer';
                    
                    const timerBar = document.createElement('div');
                    timerBar.className = 'rift-powerup__timer-bar';
                    timerElement.appendChild(timerBar);
                    
                    const timerText = document.createElement('div');
                    timerText.className = 'rift-powerup__timer-text';
                    timerElement.appendChild(timerText);
                    
                    infoElement.appendChild(timerElement);
                }
            }
            
            // Update timer display
            if (timerElement) {
                const timerBar = timerElement.querySelector('.rift-powerup__timer-bar');
                const timerText = timerElement.querySelector('.rift-powerup__timer-text');
                
                if (timerBar) {
                    const percent = (powerup.timeRemaining / powerup.duration) * 100;
                    timerBar.style.width = `${percent}%`;
                }
                
                if (timerText) {
                    timerText.textContent = Math.ceil(powerup.timeRemaining) + 's';
                }
            }
            
            // Update expiring class
            if (powerup.timeRemaining <= this.config.expiringThreshold) {
                powerup.element.classList.add('rift-powerup--expiring');
            } else {
                powerup.element.classList.remove('rift-powerup--expiring');
            }
        } else {
            // Remove timer for infinite powerups
            const timerElement = powerup.element.querySelector('.rift-powerup__timer');
            if (timerElement && timerElement.parentNode) {
                timerElement.parentNode.removeChild(timerElement);
            }
        }
    }
    
    /**
     * Get default name for a powerup type
     * @param {string} type - Powerup type
     * @returns {string} Default name
     * @private
     */
    _getDefaultName(type) {
        switch (type) {
            case 'damage': return 'Damage Boost';
            case 'speed': return 'Speed Boost';
            case 'armor': return 'Armor Boost';
            case 'health': return 'Health Regen';
            case 'ammo': return 'Infinite Ammo';
            case 'invisible': return 'Invisibility';
            default: return 'Powerup';
        }
    }
    
    /**
     * Get icon for a powerup type
     * @param {string} type - Powerup type
     * @returns {string} HTML for icon
     * @private
     */
    _getIconForType(type) {
        const icons = this.config.icons || {
            damage: 'âš”ï¸',
            speed: 'ðŸƒ',
            armor: 'ðŸ›¡ï¸',
            health: 'â¤ï¸',
            ammo: 'ðŸ”¹',
            invisible: 'ðŸ‘»'
        };
        
        return icons[type] || icons.damage;
    }
    
    /**
     * Handle powerup added events
     * @param {Object} event - Event data
     * @private
     */
    _onPowerupAdded(event) {
        if (!event || !event.powerupData) return;
        
        this.addPowerup(event.powerupData);
    }
    
    /**
     * Handle powerup removed events
     * @param {Object} event - Event data
     * @private
     */
    _onPowerupRemoved(event) {
        if (!event || !event.id) return;
        
        this.removePowerup(event.id);
    }
    
    /**
     * Handle powerup updated events
     * @param {Object} event - Event data
     * @private
     */
    _onPowerupUpdated(event) {
        if (!event || !event.id || !event.updates) return;
        
        this.updatePowerup(event.id, event.updates);
    }
    
    /**
     * Handle game paused events
     * @param {Object} event - Event data
     * @private
     */
    _onGamePaused(event) {
        // Handle pause state - we skip updates in the update method
    }
    
    /**
     * Handle game resumed events
     * @param {Object} event - Event data 
     * @private
     */
    _onGameResumed(event) {
        // Immediately update all powerup displays when game resumes
        this.activePowerups.forEach((powerup) => {
            if (powerup.active && powerup.element) {
                this._updatePowerupElement(powerup);
            }
        });
    }
    
    /**
     * Test function to demonstrate powerups
     * @param {string} type - Powerup type to create
     * @param {number} duration - Duration in seconds
     * @returns {Object} Created powerup
     */
    testPowerup(type = 'damage', duration = 10) {
        const validTypes = ['damage', 'speed', 'armor', 'health', 'ammo', 'invisible'];
        const powerupType = validTypes.includes(type) ? type : 'damage';
        
        // Create effects data based on type
        let effects = {};
        
        switch (powerupType) {
            case 'damage':
                effects = { damageMultiplier: 1.5, criticalChance: 0.1 };
                break;
            case 'speed':
                effects = { speedMultiplier: 1.3, jumpMultiplier: 1.2 };
                break;
            case 'armor':
                effects = { damageReduction: 0.5, reflectDamage: 0.1 };
                break;
            case 'health':
                effects = { healthRegenRate: 5, maxHealthBoost: 25 };
                break;
            case 'ammo':
                effects = { infiniteAmmo: true, reloadSpeedMultiplier: 1.5 };
                break;
            case 'invisible':
                effects = { invisibility: 0.9, noiseReduction: 0.7 };
                break;
        }
        
        // Create test powerup
        const powerup = this.addPowerup({
            type: powerupType,
            name: this._getDefaultName(powerupType),
            duration: duration,
            effects: effects
        });
        
        console.log(`[PowerupDisplay] Adding test powerup of type '${powerupType}' with duration ${duration}s`);
        
        return powerup;
    }
    
    /**
     * Clean up resources when component is destroyed
     */
    dispose() {
        // Clear all powerups
        this.clearPowerups();
        
        // Call parent dispose
        super.dispose();
    }
}
