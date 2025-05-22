/**
 * Health display component for the RIFT UI HUD.
 * Displays player health with visual feedback for damage, healing, and critical states.
 * 
 * @author Cline
 */

import UIComponent from '../UIComponent.js';
import EventManager from '../../../core/EventManager.js';
import { DOMFactory } from '../../../utils/DOMFactory.js';

export class HealthDisplay extends UIComponent {
    /**
     * Create a new health display component
     * @param {Object} options - Component options
     * @param {HTMLElement} [options.container] - Parent container
     * @param {Boolean} [options.showIcon=true] - Whether to show the health icon
     * @param {Boolean} [options.showBar=true] - Whether to show the health bar
     * @param {Boolean} [options.showValue=true] - Whether to show the health value
     * @param {Boolean} [options.showEffects=true] - Whether to show full-screen effects
     */
    constructor(options = {}) {
        super({
            id: options.id || 'health-display',
            className: 'rift-health',
            container: options.container,
            autoInit: false, // Prevent auto-init to control initialization order
            ...options
        });
        
        // Configuration
        this.showIcon = options.showIcon !== false;
        this.showBar = options.showBar !== false;
        this.showValue = options.showValue !== false;
        this.showEffects = options.showEffects !== false;
        
        // State
        this.state = {
            currentHealth: 100,
            maxHealth: 100,
            isCritical: false,
            isLow: false,
            isHealing: false
        };
        
        // DOM elements
        this.elements = {
            icon: null,
            value: null,
            barContainer: null,
            bar: null,
            criticalOverlay: null,
            damageFlash: null,
            healingGlow: null
        };
        
        // Event subscriptions using standardized event names
        this.registerEvents({
            'health:changed': this._onHealthChanged,
            'health:max-changed': this._onMaxHealthChanged, // Corrected to standard naming convention
            'player:damaged': this._onPlayerDamaged,
            'player:healed': this._onPlayerHealed
        });
        
        // Now initialize manually
        this.init();
    }
    
    /**
     * Initialize the component
     */
    init() {
        if (this.isInitialized) return this;
        
        // Call parent init to create root element, but it won't auto-render
        super.init();
        
        // Create our DOM elements after the root element exists
        this._createElements();
        
        // Create screen effects if enabled
        if (this.showEffects) {
            this._createScreenEffects();
        }
        
        // Now render with all elements in place
        this.render();
        
        return this;
    }
    
    /**
     * Create all DOM elements for the health display
     * @private
     */
    _createElements() {
        // Create health icon
        if (this.showIcon) {
            this.elements.icon = this.createElement('img', {
                className: 'rift-health__icon',
                attributes: {
                    src: '/assets/hud/health-icon.png',
                    alt: 'Health'
                }
            });
        }
        
        // Create health value
        if (this.showValue) {
            this.elements.value = this.createElement('div', {
                className: 'rift-health__value',
                text: `${this.state.currentHealth}`
            });
        }
        
        // Create health bar
        if (this.showBar) {
            this.elements.barContainer = this.createElement('div', {
                className: 'rift-health__bar-container'
            });
            
            this.elements.bar = this.createElement('div', {
                className: 'rift-health__bar',
                styles: {
                    width: `${this.getHealthPercentage()}%`
                },
                parent: this.elements.barContainer
            });
        }
    }
    
    /**
     * Update the component state
     * @param {Number} delta - Time elapsed since last frame in seconds
     */
    update(delta) {
        if (!this.isInitialized || !this.isActive) return this;
        
        // Call parent update
        super.update(delta);
        
        return this;
    }
    
    /**
     * Render the health display
     */
    render() {
        if (!this.isInitialized) return this;
        
        // Update health value text
        if (this.elements.value) {
            this.elements.value.textContent = `${Math.round(this.state.currentHealth)}`;
        }
        
        // Update health bar width
        if (this.elements.bar) {
            this.elements.bar.style.width = `${this.getHealthPercentage()}%`;
        }
        
        // Update CSS classes based on state
        this._updateHealthBarClass();
        
        return this;
    }
    
    /**
     * Update the player's current health
     * @param {Number} value - New health value
     * @param {Boolean} [animate=true] - Whether to animate the change
     */
    updateHealth(value, animate = true) {
        const previousHealth = this.state.currentHealth;
        const newHealth = Math.max(0, Math.min(this.state.maxHealth, value));
        
        // Update state
        this.setState({
            currentHealth: newHealth,
            isHealing: newHealth > previousHealth,
            isLow: newHealth <= (this.config.health?.lowHealthThreshold || 50) * this.state.maxHealth / 100,
            isCritical: newHealth <= (this.config.health?.criticalHealthThreshold || 20) * this.state.maxHealth / 100
        });
        
        // Show visual effects if enabled and if animation is requested
        if (animate && this.showEffects) {
            if (newHealth < previousHealth) {
                this.showDamageEffect();
            } else if (newHealth > previousHealth) {
                this.showHealEffect();
            }
        }
        
        // Toggle critical overlay
        this._updateCriticalOverlay();
        
        return this;
    }
    
    /**
     * Update the player's maximum health
     * @param {Number} value - New maximum health value
     */
    updateMaxHealth(value) {
        const newMaxHealth = Math.max(1, value);
        
        // Update state
        this.setState({
            maxHealth: newMaxHealth,
            isLow: this.state.currentHealth <= (this.config.health?.lowHealthThreshold || 50) * newMaxHealth / 100,
            isCritical: this.state.currentHealth <= (this.config.health?.criticalHealthThreshold || 20) * newMaxHealth / 100
        });
        
        // Update critical overlay
        this._updateCriticalOverlay();
        
        return this;
    }
    
    /**
     * Show the low health warning state
     */
    showLowHealthWarning() {
        if (this.elements.bar) {
            this.elements.bar.classList.add('rift-health__bar--low');
            this.elements.bar.classList.remove('rift-health__bar--critical', 'rift-health__bar--healing');
        }
        
        return this;
    }
    
    /**
     * Show the critical health warning state
     */
    showCriticalHealthWarning() {
        if (this.elements.bar) {
            this.elements.bar.classList.add('rift-health__bar--critical');
            this.elements.bar.classList.remove('rift-health__bar--low', 'rift-health__bar--healing');
        }
        
        // Show critical overlay
        this._updateCriticalOverlay();
        
        return this;
    }
    
    /**
     * Show a healing effect animation
     * @param {Number} [amount=0] - Amount of healing (for future use)
     */
    showHealEffect(amount = 0) {
        if (this.elements.bar) {
            this.elements.bar.classList.add('rift-health__bar--healing');
            
            // Remove the healing class after animation duration
            setTimeout(() => {
                if (this.elements.bar) {
                    this.elements.bar.classList.remove('rift-health__bar--healing');
                    this._updateHealthBarClass(); // Reapply appropriate class
                }
            }, (this.config.health?.healEffectDuration || 2.0) * 1000);
        }
        
        // Show healing glow effect
        if (this.elements.healingGlow) {
            this.elements.healingGlow.classList.remove('rift-health__healing-glow--active');
            // Force reflow
            void this.elements.healingGlow.offsetWidth;
            this.elements.healingGlow.classList.add('rift-health__healing-glow--active');
        }
        
        return this;
    }
    
    /**
     * Show a damage effect animation
     */
    showDamageEffect() {
        if (this.elements.damageFlash) {
            this.elements.damageFlash.classList.remove('rift-health__damage-flash--active');
            // Force reflow
            void this.elements.damageFlash.offsetWidth;
            this.elements.damageFlash.classList.add('rift-health__damage-flash--active');
        }
        
        return this;
    }
    
    /**
     * Get current health percentage (0-100)
     * @return {Number} Health percentage
     */
    getHealthPercentage() {
        if (this.state.maxHealth <= 0) return 0;
        return (this.state.currentHealth / this.state.maxHealth) * 100;
    }
    
    /**
     * Create screen effects elements
     * @private
     */
    _createScreenEffects() {
        // Critical health overlay
        this.elements.criticalOverlay = DOMFactory.createElement('div', {
            className: 'rift-health__critical-overlay',
            appendToBody: true
        });
        
        // Damage flash effect
        this.elements.damageFlash = DOMFactory.createElement('div', {
            className: 'rift-health__damage-flash',
            appendToBody: true
        });
        
        // Healing glow effect
        this.elements.healingGlow = DOMFactory.createElement('div', {
            className: 'rift-health__healing-glow',
            appendToBody: true
        });
    }
    
    /**
     * Update the health bar class based on current state
     * @private
     */
    _updateHealthBarClass() {
        if (!this.elements.bar) return;
        
        // Remove all state classes
        this.elements.bar.classList.remove(
            'rift-health__bar--low',
            'rift-health__bar--critical',
            'rift-health__bar--healing'
        );
        
        // Add appropriate class based on state
        if (this.state.isHealing) {
            this.elements.bar.classList.add('rift-health__bar--healing');
        } else if (this.state.isCritical) {
            this.elements.bar.classList.add('rift-health__bar--critical');
        } else if (this.state.isLow) {
            this.elements.bar.classList.add('rift-health__bar--low');
        }
    }
    
    /**
     * Update critical overlay visibility based on health state
     * @private
     */
    _updateCriticalOverlay() {
        if (!this.elements.criticalOverlay) return;
        
        if (this.state.isCritical) {
            this.elements.criticalOverlay.classList.add('rift-health__critical-overlay--active');
        } else {
            this.elements.criticalOverlay.classList.remove('rift-health__critical-overlay--active');
        }
    }
    
    /**
     * Handle health changed event
     * @param {Object} event - Standardized state change event data
     * @private
     */
    _onHealthChanged(event) {
        // Verify we have a proper state change event
        if (typeof event.value === 'number') {
            this.updateHealth(event.value);
            
            // If we have information about what caused the change, use it
            if (event.source === 'damage') {
                this.showDamageEffect();
            } else if (event.source === 'heal') {
                this.showHealEffect(event.delta ? Math.abs(event.delta) : 0);
            }
        }
    }
    
    /**
     * Handle max health changed event
     * @param {Object} event - Standardized state change event data
     * @private
     */
    _onMaxHealthChanged(event) {
        if (typeof event.value === 'number') {
            this.updateMaxHealth(event.value);
        }
    }
    
    /**
     * Handle player damaged event
     * @param {Object} event - Standardized combat event data
     * @private
     */
    _onPlayerDamaged(event) {
        // Show damage effect
        this.showDamageEffect();
        
        // Update health if current health info is provided
        if (typeof event.currentHealth === 'number') {
            this.updateHealth(event.currentHealth, false);
        } else if (typeof event.damage === 'number' && typeof this.state.currentHealth === 'number') {
            // Calculate new health based on damage amount if currentHealth not provided
            const newHealth = Math.max(0, this.state.currentHealth - event.damage);
            this.updateHealth(newHealth, false);
        }
    }
    
    /**
     * Handle player healed event
     * @param {Object} event - Standardized combat event data
     * @private
     */
    _onPlayerHealed(event) {
        // Show heal effect with amount if provided
        const healAmount = typeof event.amount === 'number' ? event.amount : 0;
        this.showHealEffect(healAmount);
        
        // Update health if current health info is provided
        if (typeof event.currentHealth === 'number') {
            this.updateHealth(event.currentHealth, false);
        } else if (typeof event.amount === 'number' && typeof this.state.currentHealth === 'number') {
            // Calculate new health based on heal amount if currentHealth not provided
            const newHealth = Math.min(this.state.maxHealth, this.state.currentHealth + event.amount);
            this.updateHealth(newHealth, false);
        }
    }
    
    /**
     * Clean up resources when component is disposed
     */
    dispose() {
        // Remove global screen effect elements
        if (this.elements.criticalOverlay && this.elements.criticalOverlay.parentNode) {
            this.elements.criticalOverlay.parentNode.removeChild(this.elements.criticalOverlay);
        }
        
        if (this.elements.damageFlash && this.elements.damageFlash.parentNode) {
            this.elements.damageFlash.parentNode.removeChild(this.elements.damageFlash);
        }
        
        if (this.elements.healingGlow && this.elements.healingGlow.parentNode) {
            this.elements.healingGlow.parentNode.removeChild(this.elements.healingGlow);
        }
        
        // Call parent dispose for event cleanup and DOM removal
        super.dispose();
    }
}

export default HealthDisplay;