/**
 * ScreenEffects Component
 *
 * Provides full-screen visual effects for player feedback including:
 * - Damage flash effects
 * - Healing glow effects
 * - Screen shake for significant impacts
 * - Vignette effects for low health
 *
 * @extends UIComponent
 */

import UIComponent from '../UIComponent.js';
import { EventManager } from '../../../core/EventManager.js';
import { DOMFactory } from '../../../utils/DOMFactory.js';

class ScreenEffects extends UIComponent {
    /**
     * Create a new ScreenEffects component
     * 
     * @param {Object} options - Component configuration options
     * @param {HTMLElement} options.container - Container element
     * @param {number} [options.damageFlashDuration] - Duration of damage flash in ms (overrides config)
     * @param {number} [options.healFlashDuration] - Duration of heal flash in ms (overrides config)
     * @param {number} [options.screenShakeDecay] - Screen shake decay multiplier (overrides config)
     * @param {number} [options.screenShakeMultiplier] - Screen shake intensity multiplier (overrides config)
     */
    constructor(options = {}) {
        super({
            id: options.id || 'screen-effects',
            className: 'rift-screen-effects',
            container: options.container || document.body,
            autoInit: false,
            ...options
        });

        // Get config with defaults
        const effectsConfig = this.config.screenEffects || {};
        
        // Configuration
        this.damageFlashDuration = options.damageFlashDuration || 
            (effectsConfig.damageFlashDuration * 1000) || 500;
        this.healFlashDuration = options.healFlashDuration || 
            (effectsConfig.healFlashDuration * 1000) || 2000;
        this.screenShakeDecay = options.screenShakeDecay || 
            effectsConfig.screenShakeDecay || 4.0;
        this.screenShakeMultiplier = options.screenShakeMultiplier || 
            effectsConfig.screenShakeMultiplier || 5.0;
        this.screenShakeDamageThreshold = options.screenShakeDamageThreshold || 
            effectsConfig.screenShakeDamageThreshold || 20;
        this.screenShakeMaxIntensity = options.screenShakeMaxIntensity || 
            effectsConfig.screenShakeMaxIntensity || 2.5;
        this.screenShakeDamageScalar = options.screenShakeDamageScalar || 
            effectsConfig.screenShakeDamageScalar || 40;
        
        // State
        this.effects = {
            damage: {
                active: false,
                element: null,
                startTime: 0,
                duration: this.damageFlashDuration,
                intensity: 0
            },
            heal: {
                active: false,
                element: null,
                startTime: 0,
                duration: this.healFlashDuration,
                intensity: 0
            },
            shake: {
                active: false,
                startTime: 0,
                intensity: 0,
                offsetX: 0,
                offsetY: 0
            },
            vignette: {
                active: false,
                element: null,
                intensity: 0,
                targetIntensity: 0
            }
        };
        
        // Element references
        this.overlayContainer = null;
        
        // Bind methods
        this._onPlayerDamaged = this._onPlayerDamaged.bind(this);
        this._onPlayerHealed = this._onPlayerHealed.bind(this);
        this._onHealthChanged = this._onHealthChanged.bind(this);
    }

    /**
     * Initialize the screen effects component
     */
    init() {
        if (this.isInitialized) return this;
        
        // Call parent init first
        super.init();
        
        // Set initialized flag early to prevent infinite recursion
        this.isInitialized = true;
        
        // Create overlay container
        this.overlayContainer = DOMFactory.createElement('div', {
            className: 'rift-screen-effects__container',
            parent: this.element
        });
        
        // Create effect elements
        this._createEffectElements();
        
        // Register event listeners
        this._registerEventListeners();
        
        this.isActive = true;
        return this;
    }
    
    /**
     * Update screen effects animations
     * 
     * @param {number} delta - Time since last update in ms
     */
    update(delta) {
        if (!this.isActive || !this.isVisible) return;
        
        const now = performance.now();
        
        // Update damage flash effect
        if (this.effects.damage.active) {
            const elapsed = now - this.effects.damage.startTime;
            
            if (elapsed >= this.effects.damage.duration) {
                this._deactivateEffect('damage');
            } else {
                // Calculate fade out
                const progress = elapsed / this.effects.damage.duration;
                const opacity = this.effects.damage.intensity * (1 - progress);
                this.effects.damage.element.style.opacity = opacity.toFixed(2);
            }
        }
        
        // Update healing effect
        if (this.effects.heal.active) {
            const elapsed = now - this.effects.heal.startTime;
            
            if (elapsed >= this.effects.heal.duration) {
                this._deactivateEffect('heal');
            } else {
                // Calculate fade out with a slight delay for a lingering effect
                const progress = elapsed / this.effects.heal.duration;
                let opacity;
                
                if (progress < 0.2) {
                    // Fade in
                    opacity = this.effects.heal.intensity * (progress / 0.2);
                } else {
                    // Fade out
                    opacity = this.effects.heal.intensity * (1 - ((progress - 0.2) / 0.8));
                }
                
                this.effects.heal.element.style.opacity = opacity.toFixed(2);
            }
        }
        
        // Update screen shake effect
        if (this.effects.shake.active) {
            // Apply decay to intensity
            this.effects.shake.intensity -= (this.effects.shake.intensity * this.screenShakeDecay * delta / 1000);
            
            if (this.effects.shake.intensity <= 0.05) {
                this._deactivateEffect('shake');
                // Reset position
                this.element.style.transform = 'translate3d(0px, 0px, 0px)';
            } else {
                // Calculate random shake offset
                const intensity = this.effects.shake.intensity;
                const offsetX = (Math.random() * 2 - 1) * intensity;
                const offsetY = (Math.random() * 2 - 1) * intensity;
                
                // Apply transform with hardware acceleration
                this.element.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0px)`;
            }
        }
        
        // Update vignette effect
        if (this.effects.vignette.active) {
            const currentIntensity = this.effects.vignette.intensity;
            const targetIntensity = this.effects.vignette.targetIntensity;
            
            // Smoothly interpolate to target (lerp)
            if (Math.abs(currentIntensity - targetIntensity) > 0.01) {
                const newIntensity = currentIntensity + (targetIntensity - currentIntensity) * 0.1;
                this.effects.vignette.intensity = newIntensity;
                
                // Update visual
                this.effects.vignette.element.style.opacity = newIntensity.toFixed(2);
            }
        }
        
        // Process animations
        this._updateAnimations(delta);
        
        return this;
    }
    
    /**
     * Show damage flash effect
     * 
     * @param {Object} options - Effect options
     * @param {number} [options.intensity=1.0] - Effect intensity (0.0-1.0)
     * @param {number} [options.duration] - Custom duration in ms
     */
    showDamageFlash(options = {}) {
        if (!this.isActive || !this.isVisible) return this;
        
        const intensity = Math.min(Math.max(options.intensity || 1.0, 0), 1);
        const duration = options.duration || this.damageFlashDuration;
        
        // Set effect state
        this.effects.damage.active = true;
        this.effects.damage.startTime = performance.now();
        this.effects.damage.duration = duration;
        this.effects.damage.intensity = intensity;
        
        // Apply visual effect
        this.effects.damage.element.style.opacity = intensity.toFixed(2);
        this.effects.damage.element.classList.add('rift-screen-effects__damage--active');
        
        return this;
    }
    
    /**
     * Show healing effect
     * 
     * @param {Object} options - Effect options
     * @param {number} [options.intensity=0.7] - Effect intensity (0.0-1.0)
     * @param {number} [options.duration] - Custom duration in ms
     */
    showHealEffect(options = {}) {
        if (!this.isActive || !this.isVisible) return this;
        
        const intensity = Math.min(Math.max(options.intensity || 0.7, 0), 1);
        const duration = options.duration || this.healFlashDuration;
        
        // Set effect state
        this.effects.heal.active = true;
        this.effects.heal.startTime = performance.now();
        this.effects.heal.duration = duration;
        this.effects.heal.intensity = intensity;
        
        // Start with zero opacity for fade-in
        this.effects.heal.element.style.opacity = '0';
        this.effects.heal.element.classList.add('rift-screen-effects__heal--active');
        
        return this;
    }
    
    /**
     * Apply screen shake effect
     * 
     * @param {Object} options - Effect options
     * @param {number} [options.intensity=1.0] - Shake intensity (0.0-5.0)
     * @param {number} [options.duration] - Duration override (normally controlled by decay)
     */
    applyScreenShake(options = {}) {
        if (!this.isActive || !this.isVisible) return this;
        
        // Calculate intensity, capped at maximum
        const rawIntensity = Math.min(
            Math.max(options.intensity || 1.0, 0), 
            this.screenShakeMaxIntensity
        );
        
        // Apply multiplier
        const intensity = rawIntensity * this.screenShakeMultiplier;
        
        // Update state
        this.effects.shake.active = true;
        this.effects.shake.startTime = performance.now();
        
        // Apply new shake intensity (allow stacking of shakes for multiple impacts)
        this.effects.shake.intensity = Math.max(this.effects.shake.intensity, intensity);
        
        return this;
    }
    
    /**
     * Set vignette effect intensity for low health visualization
     * 
     * @param {number} healthPercent - Current health percentage (0-100)
     */
    setVignetteIntensity(healthPercent) {
        if (!this.isActive || !this.isVisible) return this;
        
        // Calculate intensity based on health
        let intensity = 0;
        
        if (healthPercent <= 20) {
            // Critical health: strong vignette (20% health = 0.8 intensity)
            intensity = 0.8 * (1 - (healthPercent / 20));
        } else if (healthPercent <= 50) {
            // Low health: moderate vignette
            intensity = 0.4 * (1 - ((healthPercent - 20) / 30));
        }
        
        // Update state
        this.effects.vignette.active = intensity > 0;
        this.effects.vignette.targetIntensity = intensity;
        
        // Show/hide vignette element
        if (intensity > 0) {
            this.effects.vignette.element.classList.add('rift-screen-effects__vignette--active');
        } else {
            this.effects.vignette.element.classList.remove('rift-screen-effects__vignette--active');
        }
        
        return this;
    }
    
    /**
     * Apply damage screen effects (combines damage flash and screen shake)
     * 
     * @param {Object} options - Effect options
     * @param {number} [options.damage=10] - Damage amount
     * @param {number} [options.direction] - Direction of damage (for directional shake)
     * @param {boolean} [options.isCritical=false] - Whether this is critical damage
     */
    showDamageEffects(options = {}) {
        if (!this.isActive || !this.isVisible) return this;
        
        const damage = options.damage || 10;
        const isCritical = options.isCritical || false;
        
        // Apply damage flash
        const flashIntensity = Math.min(damage / 50, 1) * (isCritical ? 1.5 : 1);
        this.showDamageFlash({ intensity: flashIntensity });
        
        // Apply screen shake if damage exceeds threshold
        if (damage >= this.screenShakeDamageThreshold) {
            const shakeIntensity = Math.min(damage / this.screenShakeDamageScalar, 1) * 
                (isCritical ? 1.5 : 1);
            this.applyScreenShake({ intensity: shakeIntensity });
        }
        
        return this;
    }
    
    /**
     * Clear all active effects
     */
    clearAllEffects() {
        this._deactivateEffect('damage');
        this._deactivateEffect('heal');
        this._deactivateEffect('shake');
        
        // Don't clear vignette - it should stay if health is low
        
        // Reset transform
        this.element.style.transform = 'translate3d(0px, 0px, 0px)';
        
        return this;
    }
    
    /**
     * Clean up resources when disposing the component
     */
    dispose() {
        // Clear all effects
        this.clearAllEffects();
        
        // Call parent dispose method to handle events and DOM
        super.dispose();
        
        return this;
    }
    
    /**
     * Create the effect elements
     * @private
     */
    _createEffectElements() {
        // Create damage flash overlay
        this.effects.damage.element = DOMFactory.createElement('div', {
            className: 'rift-screen-effects__damage',
            parent: this.overlayContainer
        });
        
        // Create healing overlay
        this.effects.heal.element = DOMFactory.createElement('div', {
            className: 'rift-screen-effects__heal',
            parent: this.overlayContainer
        });
        
        // Create vignette overlay
        this.effects.vignette.element = DOMFactory.createElement('div', {
            className: 'rift-screen-effects__vignette',
            parent: this.overlayContainer
        });
    }
    
    /**
     * Register event listeners
     * @private
     */
    _registerEventListeners() {
        this.registerEvents({
            'player:damaged': this._onPlayerDamaged,
            'player:healed': this._onPlayerHealed,
            'health:changed': this._onHealthChanged,
            'game:paused': () => this.clearAllEffects()
        });
    }
    
    /**
     * Deactivate a specific effect
     * @private
     * @param {string} effectName - Name of the effect to deactivate
     */
    _deactivateEffect(effectName) {
        const effect = this.effects[effectName];
        if (!effect) return;
        
        effect.active = false;
        
        // Hide element with specific logic for each effect type
        switch (effectName) {
            case 'damage':
                if (effect.element) {
                    effect.element.style.opacity = '0';
                    effect.element.classList.remove('rift-screen-effects__damage--active');
                }
                break;
                
            case 'heal':
                if (effect.element) {
                    effect.element.style.opacity = '0';
                    effect.element.classList.remove('rift-screen-effects__heal--active');
                }
                break;
                
            case 'shake':
                // Reset transform
                this.element.style.transform = 'translate3d(0px, 0px, 0px)';
                break;
        }
    }
    
    /**
     * Handle player damaged event
     * @private
     * @param {Object} event - Event data
     */
    _onPlayerDamaged(event) {
        // Apply damage effects
        this.showDamageEffects({
            damage: event.damage,
            direction: event.direction,
            isCritical: event.isCritical
        });
    }
    
    /**
     * Handle player healed event
     * @private
     * @param {Object} event - Event data
     */
    _onPlayerHealed(event) {
        // Show heal effect
        const healAmount = event.amount || 10;
        const intensity = Math.min(healAmount / 50, 1);
        
        this.showHealEffect({
            intensity: Math.max(intensity, 0.3) // Minimum intensity for visibility
        });
    }
    
    /**
     * Handle health changed event
     * @private
     * @param {Object} event - Event data
     */
    _onHealthChanged(event) {
        // Update vignette based on health percentage
        const healthPercent = (event.current / event.max) * 100;
        this.setVignetteIntensity(healthPercent);
    }
    
    /**
     * Test method to show damage effects
     * For development/debugging only
     * @public
     * @param {string} intensity - Damage intensity ('low', 'medium', 'high', 'critical')
     */
    testDamageEffects(intensity = 'medium') {
        // Map intensity string to damage values
        let damageAmount;
        let isCritical = false;
        
        switch (intensity) {
            case 'low':
                damageAmount = Math.floor(Math.random() * 9) + 1; // 1-9
                break;
            case 'medium':
                damageAmount = Math.floor(Math.random() * 15) + 10; // 10-24
                break;
            case 'high':
                damageAmount = Math.floor(Math.random() * 25) + 25; // 25-49
                break;
            case 'critical':
                damageAmount = Math.floor(Math.random() * 50) + 50; // 50-99
                isCritical = true;
                break;
            default:
                damageAmount = Math.floor(Math.random() * 30) + 10; // 10-39
        }
        
        this.showDamageEffects({
            damage: damageAmount,
            isCritical
        });
        
        console.log(`Test damage effects: ${damageAmount} damage (${isCritical ? 'critical' : 'normal'})`);
    }
    
    /**
     * Test method to show heal effect
     * For development/debugging only
     * @public
     * @param {string} intensity - Heal intensity ('low', 'medium', 'high')
     */
    testHealEffect(intensity = 'medium') {
        let healIntensity;
        
        switch (intensity) {
            case 'low':
                healIntensity = 0.3;
                break;
            case 'medium':
                healIntensity = 0.6;
                break;
            case 'high':
                healIntensity = 0.9;
                break;
            default:
                healIntensity = 0.6;
        }
        
        this.showHealEffect({ intensity: healIntensity });
        console.log(`Test heal effect: ${intensity} intensity (${healIntensity.toFixed(1)})`);
    }
    
    /**
     * Test method to show screen shake
     * For development/debugging only
     * @public
     * @param {string} intensity - Shake intensity ('low', 'medium', 'high')
     */
    testScreenShake(intensity = 'medium') {
        let shakeIntensity;
        
        switch (intensity) {
            case 'low':
                shakeIntensity = 0.5;
                break;
            case 'medium':
                shakeIntensity = 1.5;
                break;
            case 'high':
                shakeIntensity = 3.0;
                break;
            default:
                shakeIntensity = 1.5;
        }
        
        this.applyScreenShake({ intensity: shakeIntensity });
        console.log(`Test screen shake: ${intensity} intensity (${shakeIntensity.toFixed(1)})`);
    }
    
    /**
     * Test method to show vignette at different health levels
     * For development/debugging only
     * @public
     * @param {number} healthPercent - Health percentage to simulate (0-100)
     */
    testVignette(healthPercent = 20) {
        // Ensure valid range
        const percent = Math.max(0, Math.min(100, healthPercent));
        this.setVignetteIntensity(percent);
        console.log(`Test vignette: ${percent}% health`);
    }
}





export { ScreenEffects };