/**
 * Stamina system component for the RIFT UI HUD.
 * Displays player stamina with visual feedback for sprinting, regeneration, and depletion states.
 * 
 * @author Cline
 */

import UIComponent from '../UIComponent.js';
import { EventManager } from '../../../core/EventManager.js';
import { DOMFactory } from '../../../utils/DOMFactory.js';

class StaminaSystem extends UIComponent {
    /**
     * Create a new stamina system component
     * @param {Object} options - Component options
     * @param {HTMLElement} [options.container] - Parent container
     * @param {Boolean} [options.showIcon=true] - Whether to show the stamina icon
     * @param {Boolean} [options.showBar=true] - Whether to show the stamina bar
     * @param {Boolean} [options.showValue=true] - Whether to show the stamina value
     * @param {Boolean} [options.showEffects=true] - Whether to show stamina-related screen effects
     * @param {Boolean} [options.showSprintIndicator=true] - Whether to show the sprint indicator
     */
    constructor(options = {}) {
        super({
            autoInit: false,
            id: options.id || 'stamina-system',
            className: 'rift-stamina',
            container: options.container,
            ...options
        });
        
        // Configuration
        this.showIcon = options.showIcon !== false;
        this.showBar = options.showBar !== false;
        this.showValue = options.showValue !== false;
        this.showEffects = options.showEffects !== false;
        this.showSprintIndicator = options.showSprintIndicator !== false;
        
        // State
        this.state = {
            currentStamina: 100,
            maxStamina: 100,
            isSprinting: false,
            isDepleted: false,
            isLow: false,
            isRegenerating: false,
            inCooldown: false,
            cooldownTime: 0,
            staminaPercentage: 100
        };
        
        // DOM elements
        this.elements = {
            icon: null,
            value: null,
            barContainer: null,
            bar: null,
            cooldown: null,
            sprintIndicator: null,
            drainEffect: null
        };
        
        // Event subscriptions
        this.registerEvents({
            'stamina:changed': this._onStaminaChanged,
            'stamina:max-changed': this._onMaxStaminaChanged,
            'player:sprint-started': this._onSprintStart,
            'player:sprint-ended': this._onSprintEnd,
            'stamina:depleted': this._onStaminaDepleted,
            'stamina:cooldown-started': this._onCooldownStart,
            'stamina:cooldown-ended': this._onCooldownEnd
        });
        
        // Create configuration if it doesn't exist
        if (!this.config.stamina) {
            this.config.stamina = {
                lowStaminaThreshold: 30, // percentage
                depletedThreshold: 5, // percentage
                regenerationRate: 10, // units per second
                cooldownDuration: 1.0, // seconds after depletion
                drainEffectDuration: 0.3, // seconds
                showNumericValue: true // whether to show the number
            };
        }
    }
    
    /**
     * Initialize the component
     */
    init() {
        if (this.isInitialized) return this;
        
        // Call parent init to create root element
        super.init();
        
        // Create stamina icon
        if (this.showIcon) {
            this.elements.icon = this.createElement('div', {
                className: 'rift-stamina__icon'
            });
            
            // You could replace this with an actual icon image if available
            this.elements.icon.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M13.5,5.5C14.59,5.5 15.5,4.58 15.5,3.5C15.5,2.38 14.59,1.5 13.5,1.5C12.39,1.5 11.5,2.38 11.5,3.5C11.5,4.58 12.39,5.5 13.5,5.5M9.89,19.38L10.89,15L13,17V23H15V15.5L12.89,13.5L13.5,10.5C14.79,12 16.79,13 19,13V11C17.09,11 15.5,10 14.69,8.58L13.69,7C13.29,6.38 12.69,6 12,6C11.69,6 11.5,6.08 11.19,6.08L6,8.28V13H8V9.58L9.79,8.88L8.19,17L3.29,16L2.89,18L9.89,19.38Z" /></svg>';
        }
        
        // Create stamina bar
        if (this.showBar) {
            this.elements.barContainer = this.createElement('div', {
                className: 'rift-stamina__bar-container'
            });
            
            this.elements.bar = this.createElement('div', {
                className: 'rift-stamina__bar',
                styles: {
                    width: `${this.getStaminaPercentage()}%`
                },
                parent: this.elements.barContainer
            });
            
            // Cooldown indicator
            this.elements.cooldown = this.createElement('div', {
                className: 'rift-stamina__cooldown',
                parent: this.elements.barContainer
            });
            
            // Sprint indicator
            if (this.showSprintIndicator) {
                this.elements.sprintIndicator = this.createElement('div', {
                    className: 'rift-stamina__sprint-indicator',
                    text: 'Sprint',
                    parent: this.elements.barContainer
                });
            }
        }
        
        // Create stamina value
        if (this.showValue && this.config.stamina.showNumericValue) {
            this.elements.value = this.createElement('div', {
                className: 'rift-stamina__value',
                text: `${Math.round(this.state.currentStamina)}`
            });
        }
        
        // Create screen effects if enabled
        if (this.showEffects) {
            this._createScreenEffects();
        }
        
        return this;
    }
    
    /**
     * Update the component state
     * @param {Number} delta - Time elapsed since last frame in seconds
     */
    update(delta) {
        if (!this.isInitialized || !this.isActive) return this;
        
        // Call parent update
        super.update(delta);
        
        // Update stamina regeneration if not sprinting and not in cooldown
        if (!this.state.isSprinting && !this.state.inCooldown && this.state.currentStamina < this.state.maxStamina) {
            this.updateStamina(
                Math.min(
                    this.state.maxStamina, 
                    this.state.currentStamina + (this.config.stamina.regenerationRate * delta)
                ),
                false
            );
        }
        
        return this;
    }
    
    /**
     * Render the stamina display
     */
    render() {
        if (!this.isInitialized) return this;
        
        // Update stamina value text
        if (this.elements.value) {
            this.elements.value.textContent = `${Math.round(this.state.currentStamina)}`;
        }
        
        // Update stamina bar width
        if (this.elements.bar) {
            this.elements.bar.style.width = `${this.getStaminaPercentage()}%`;
        }
        
        // Update CSS classes based on state
        this._updateStaminaBarClass();
        
        return this;
    }
    
    /**
     * Update the player's current stamina
     * @param {Number} value - New stamina value
     * @param {Boolean} [animate=true] - Whether to animate the change
     */
    updateStamina(value, animate = true) {
        const previousStamina = this.state.currentStamina;
        const newStamina = Math.max(0, Math.min(this.state.maxStamina, value));
        const staminaPercentage = this.getStaminaPercentage(newStamina);
        
        // Update state
        this.setState({
            currentStamina: newStamina,
            staminaPercentage: staminaPercentage,
            isRegenerating: newStamina > previousStamina && !this.state.isSprinting,
            isLow: staminaPercentage <= this.config.stamina.lowStaminaThreshold,
            isDepleted: staminaPercentage <= this.config.stamina.depletedThreshold
        });
        
        // Show visual effects if enabled and if animation is requested
        if (animate && this.showEffects && previousStamina > newStamina && this.state.isSprinting) {
            this.showStaminaDrainEffect();
        }
        
        // Check for depletion
        if (previousStamina > this.config.stamina.depletedThreshold && 
            staminaPercentage <= this.config.stamina.depletedThreshold) {
            this._onStaminaDepleted();
        }
        
        return this;
    }
    
    /**
     * Update the player's maximum stamina
     * @param {Number} value - New maximum stamina value
     */
    updateMaxStamina(value) {
        const newMaxStamina = Math.max(1, value);
        const staminaPercentage = this.getStaminaPercentage(this.state.currentStamina, newMaxStamina);
        
        // Update state
        this.setState({
            maxStamina: newMaxStamina,
            staminaPercentage: staminaPercentage,
            isLow: staminaPercentage <= this.config.stamina.lowStaminaThreshold,
            isDepleted: staminaPercentage <= this.config.stamina.depletedThreshold
        });
        
        return this;
    }
    
    /**
     * Start sprint mode
     */
    startSprint() {
        if (this.state.isDepleted || this.state.inCooldown) return this;
        
        this.setState({
            isSprinting: true,
            isRegenerating: false
        });
        
        // Show sprint indicator
        if (this.elements.sprintIndicator) {
            this.elements.sprintIndicator.classList.add('rift-stamina__sprint-indicator--active');
        }
        
        return this;
    }
    
    /**
     * End sprint mode
     */
    endSprint() {
        this.setState({
            isSprinting: false
        });
        
        // Hide sprint indicator
        if (this.elements.sprintIndicator) {
            this.elements.sprintIndicator.classList.remove('rift-stamina__sprint-indicator--active');
        }
        
        return this;
    }
    
    /**
     * Start cooldown period after stamina depletion
     */
    startCooldown() {
        if (this.state.inCooldown) return this;
        
        this.setState({
            inCooldown: true,
            isSprinting: false
        });
        
        // Show cooldown animation
        if (this.elements.cooldown) {
            this.elements.cooldown.style.animation = 'none';
            // Force reflow
            void this.elements.cooldown.offsetWidth;
            this.elements.cooldown.classList.add('rift-stamina__cooldown--active');
            
            // Set animation duration from config
            this.elements.cooldown.style.animationDuration = `${this.config.stamina.cooldownDuration}s`;
            
            // Hide sprint indicator
            if (this.elements.sprintIndicator) {
                this.elements.sprintIndicator.classList.remove('rift-stamina__sprint-indicator--active');
            }
        }
        
        // Schedule end of cooldown
        setTimeout(() => {
            this.endCooldown();
        }, this.config.stamina.cooldownDuration * 1000);
        
        return this;
    }
    
    /**
     * End cooldown period
     */
    endCooldown() {
        this.setState({
            inCooldown: false
        });
        
        // Hide cooldown animation
        if (this.elements.cooldown) {
            this.elements.cooldown.classList.remove('rift-stamina__cooldown--active');
        }
        
        return this;
    }
    
    /**
     * Show a stamina drain effect animation
     */
    showStaminaDrainEffect() {
        if (this.elements.drainEffect) {
            this.elements.drainEffect.classList.remove('rift-stamina__drain-effect--active');
            // Force reflow
            void this.elements.drainEffect.offsetWidth;
            this.elements.drainEffect.classList.add('rift-stamina__drain-effect--active');
        }
        
        return this;
    }
    
    /**
     * Get current stamina percentage (0-100)
     * @param {Number} [stamina] - Stamina value to use, defaults to current
     * @param {Number} [maxStamina] - Max stamina to use, defaults to current max
     * @return {Number} Stamina percentage
     */
    getStaminaPercentage(stamina = this.state.currentStamina, maxStamina = this.state.maxStamina) {
        if (maxStamina <= 0) return 0;
        return (stamina / maxStamina) * 100;
    }
    
    /**
     * Create screen effects elements
     * @private
     */
    _createScreenEffects() {
        // Stamina drain effect overlay
        this.elements.drainEffect = DOMFactory.createElement('div', {
            className: 'rift-stamina__drain-effect',
            appendToBody: true
        });
    }
    
    /**
     * Update the stamina bar class based on current state
     * @private
     */
    _updateStaminaBarClass() {
        if (!this.elements.bar) return;
        
        // Remove all state classes
        this.elements.bar.classList.remove(
            'rift-stamina__bar--low',
            'rift-stamina__bar--depleted',
            'rift-stamina__bar--regenerating'
        );
        
        // Update value classes if it exists
        if (this.elements.value) {
            this.elements.value.classList.remove(
                'rift-stamina__value--low',
                'rift-stamina__value--depleted'
            );
        }
        
        // Add appropriate classes based on state
        if (this.state.isDepleted) {
            this.elements.bar.classList.add('rift-stamina__bar--depleted');
            if (this.elements.value) {
                this.elements.value.classList.add('rift-stamina__value--depleted');
            }
        } else if (this.state.isLow) {
            this.elements.bar.classList.add('rift-stamina__bar--low');
            if (this.elements.value) {
                this.elements.value.classList.add('rift-stamina__value--low');
            }
        } else if (this.state.isRegenerating) {
            this.elements.bar.classList.add('rift-stamina__bar--regenerating');
        }
    }
    
    /**
     * Handle stamina changed event
     * @param {Object} event - Standardized state change event
     * @param {number} event.value - Current stamina value
     * @param {number} event.previous - Previous stamina value
     * @param {string} event.source - Source of the change
     * @private
     */
    _onStaminaChanged(event) {
        if (typeof event.value === 'number') {
            this.updateStamina(event.value);
        }
    }
    
    /**
     * Handle max stamina changed event
     * @param {Object} event - Standardized state change event
     * @param {number} event.value - Current max stamina value
     * @param {number} event.previous - Previous max stamina value
     * @param {string} event.source - Source of the change
     * @private
     */
    _onMaxStaminaChanged(event) {
        if (typeof event.value === 'number') {
            this.updateMaxStamina(event.value);
        }
    }
    
    /**
     * Handle sprint started event
     * @param {Object} event - Standardized state change event
     * @param {boolean} event.value - Sprint state (true for started)
     * @param {Object} event.source - Source of the change
     * @private
     */
    _onSprintStart(event) {
        this.startSprint();
    }
    
    /**
     * Handle sprint ended event
     * @param {Object} event - Standardized state change event
     * @param {boolean} event.value - Sprint state (false for ended)
     * @param {Object} event.source - Source of the change
     * @private
     */
    _onSprintEnd(event) {
        this.endSprint();
    }
    
    /**
     * Handle stamina depleted event
     * @param {Object} [event] - Standardized state change event
     * @private
     */
    _onStaminaDepleted(event) {
        this.startCooldown();
        
        // End sprint
        this.endSprint();
        
        // Emit event if not already triggered externally
        if (!event) {
            EventManager.emit('stamina:depleted', {
                value: this.state.currentStamina,
                previous: this.config.stamina.depletedThreshold + 1, // Just above threshold
                max: this.state.maxStamina,
                source: 'system',
                timestamp: performance.now()
            });
        }
    }
    
    /**
     * Handle cooldown started event
     * @param {Object} event - Standardized state change event
     * @param {number} event.duration - Duration of cooldown in seconds
     * @param {string} event.source - Source of the cooldown
     * @private
     */
    _onCooldownStart(event) {
        if (event.duration) {
            this.config.stamina.cooldownDuration = event.duration;
        }
        this.startCooldown();
    }
    
    /**
     * Handle cooldown ended event
     * @param {Object} event - Standardized state change event
     * @param {string} event.source - Source of the cooldown end
     * @private
     */
    _onCooldownEnd(event) {
        this.endCooldown();
    }
    
    /**
     * Clean up resources when component is disposed
     */
    dispose() {
        // Remove global screen effect elements
        if (this.elements.drainEffect && this.elements.drainEffect.parentNode) {
            this.elements.drainEffect.parentNode.removeChild(this.elements.drainEffect);
        }
        
        // Call parent dispose for event cleanup and DOM removal
        super.dispose();
    }
}

export { StaminaSystem };
