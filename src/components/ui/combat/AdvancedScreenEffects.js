/**
 * AdvancedScreenEffects Component
 *
 * An enhanced version of the standard ScreenEffects component that provides:
 * - Directional screen shake that reflects the impact direction
 * - Variable effect intensity based on damage type and amount
 * - Multi-layer effects (vignette, flash, color shift, distortion)
 * - Hardware-accelerated animations for performance
 * - Special effects for critical states and powerups
 *
 * @extends UIComponent
 */

import UIComponent from '../UIComponent.js';
import { EventManager } from '../../../core/EventManager.js';
import { DOMFactory } from '../../../utils/DOMFactory.js';
import { UIConfig } from '../../../core/UIConfig.js';

export class AdvancedScreenEffects extends UIComponent {
    /**
     * Create a new AdvancedScreenEffects component
     * 
     * @param {Object} options - Component configuration options
     * @param {HTMLElement} options.container - Container element
     */
    constructor(options = {}) {
        super({
            autoInit: false, // We call init explicitly
            id: options.id || 'advanced-screen-effects',
            className: 'rift-advanced-screen-effects', // Direct string assignment
            container: options.container || document.body,
            ...options // Pass through other options like template, events
        });

        // Config, state, and bindings from original constructor
        this.config = (UIConfig.enhancedCombat && UIConfig.enhancedCombat.screenEffects) || {};
        this.activeEffects = new Map();
        this.shakeDuration = 0;
        this.shakeIntensity = 0;
        this.shakeDirection = { x: 0, y: 0 };
        this.vignetteIntensity = 0;
        this.lastFrameTime = 0;
        this.perlinSeed = Math.random() * 1000;
        
        this.layers = {}; // Initialize layers object

        // Bind methods
        this._onPlayerDamaged = this._onPlayerDamaged.bind(this);
        this._onPlayerHealed = this._onPlayerHealed.bind(this);
        this._onPlayerCritical = this._onPlayerCritical.bind(this);
        this._onExplosionNearby = this._onExplosionNearby.bind(this);
        this._onPowerupActivated = this._onPowerupActivated.bind(this);
        this._onEnvironmentEffect = this._onEnvironmentEffect.bind(this);
        this._onHealthChanged = this._onHealthChanged.bind(this);
    }

    /**
     * Initialize the advanced screen effects component
     */
    init() {
        if (this.isInitialized) {
            return this;
        }

        // Call the parent UIComponent's init method first.
        // This will handle creating this.element, appending to container,
        // setting visibility, calling render, and emitting init event.
        super.init(); 

        // After super.init(), this.element should be created and available.
        if (!this.element) {
            console.error(`❌ AdvancedScreenEffects (${this.id}): Element was not created by super.init(). Aborting further initialization.`);
            // super.init() sets isInitialized = true. If element creation failed,
            // the component is in a broken state. UIComponent.init should ideally handle this.
            return this;
        }
        
        // Create layers for different effect types (these are children of this.element)
        this._createEffectLayers();
        
        // Register event listeners specific to AdvancedScreenEffects
        // (UIComponent constructor handles options.events, this is for additional ones)
        this._registerEventListeners();
        
        // Set component to active. super.init() handles isVisible.
        this.isActive = true; 
        
        console.log(`✅ AdvancedScreenEffects (${this.id}): Initialized successfully via super.init().`);
        return this;
    }
    
    /**
     * Create effect layers for different visual effects
     * @private
     */
    _createEffectLayers() {
        if (!this.element) {
            console.error(`❌ AdvancedScreenEffects (${this.id}): Cannot create effect layers, root element is missing.`);
            return;
        }
        // Create individual effect layers
        this.layers = {
            vignette: this._createLayer('vignette'),
            flash: this._createLayer('flash'),
            color: this._createLayer('color'),
            distortion: this._createLayer('distortion'),
            overlay: this._createLayer('overlay')
        };
    }
    
    /**
     * Create an effect layer element
     * @private
     * @param {string} type - Type of layer
     * @returns {HTMLElement | null} The created layer element or null on error
     */
    _createLayer(type) {
        if (!this.element) {
            console.error(`❌ AdvancedScreenEffects (${this.id}): Cannot create layer '${type}', root element (this.element) is missing.`);
            return null; 
        }
        return DOMFactory.createElement('div', {
            className: `rift-advanced-screen-effects__layer rift-advanced-screen-effects__layer--${type}`,
            parent: this.element // this.element should be valid here
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
            'player:critical': this._onPlayerCritical,
            'explosion:nearby': this._onExplosionNearby,
            'powerup:activated': this._onPowerupActivated,
            'environment:effect': this._onEnvironmentEffect,
            'health:changed': this._onHealthChanged,
            'game:paused': () => this._onGamePaused()
        });
    }
    
    /**
     * Update screen effects animations
     * @param {number} delta - Time since last update in ms
     */
    update(delta) {
        if (!this.isActive || !this.isVisible) return;
        
        const now = performance.now();
        
        if (this.shakeDuration > 0) {
            this._updateScreenShake(delta);
        }
        
        if (this.vignetteIntensity > 0) {
            this._updateVignette(delta);
        }
        
        // Update other active effects
        for (const [effectId, effect] of this.activeEffects.entries()) {
            if (effect.update && typeof effect.update === 'function') {
                const completed = effect.update(delta);
                
                if (completed) {
                    this.activeEffects.delete(effectId);
                    
                    // Run completion callback if provided
                    if (effect.onComplete) {
                        effect.onComplete();
                    }
                }
            }
        }
        
        // Process animations
        this._updateAnimations(delta);
        
        return this;
    }

    /**
     * Handle player damaged event
     * @private
     * @param {Object} event - Event data
     */
    _onPlayerDamaged(event) {
        const { damage, direction, damageType = 'default' } = event;
        
        // Calculate effect intensity based on damage amount
        const intensity = Math.min(1, damage / 100); // Normalize to 0-1 range
        
        // Show damage flash
        this._showDamageFlash(intensity, damageType);
        
        // Apply screen shake based on damage and direction
        this._applyScreenShake(intensity * 0.5, direction, damageType);
        
        // Update vignette effect based on player health
        if (event.currentHealth && event.maxHealth) {
            const healthPercent = event.currentHealth / event.maxHealth * 100;
            this._updateHealthVignette(healthPercent);
        }
    }
    
    /**
     * Handle player healed event
     * @private
     * @param {Object} event - Event data
     */
    _onPlayerHealed(event) {
        const { amount } = event;
        
        // Calculate intensity based on heal amount (relative to player max health)
        let intensity = 0.3; // Default base intensity
        
        // Adjust intensity if heal amount and max health are provided
        if (amount && event.maxHealth) {
            intensity = Math.min(0.8, Math.max(0.3, amount / event.maxHealth));
        }
        
        this._showHealEffect(intensity);
    }
    
    /**
     * Handle player critical event (low health, stunned, etc.)
     * @private
     * @param {Object} event - Event data
     */
    _onPlayerCritical(event) {
        const { type, intensity = 1.0 } = event;
        
        switch (type) {
            case 'health':
                // Already handled by health:changed event and vignette
                break;
            case 'stun':
                this._showStunEffect(intensity);
                break;
            case 'blind':
                this._showBlindEffect(intensity);
                break;
            default:
                this._showCriticalEffect(intensity);
        }
    }
    
    /**
     * Handle explosion nearby event
     * @private
     * @param {Object} event - Event data
     */
    _onExplosionNearby(event) {
        const { distance, direction, intensity = 1.0 } = event;
        
        // Calculate effect intensity based on distance (closer = more intense)
        const maxDistance = 50; // Maximum distance for effect in world units
        const effectIntensity = Math.max(0, 1 - (distance / maxDistance)) * intensity;
        
        if (effectIntensity > 0) {
            // Apply explosion effects
            this._showExplosionFlash(effectIntensity);
            this._applyScreenShake(effectIntensity * 1.5, direction, 'explosive');
        }
    }
    
    /**
     * Handle powerup activated event
     * @private
     * @param {Object} event - Event data
     */
    _onPowerupActivated(event) {
        const { type, duration } = event;
        
        // Apply power-up specific visual effect
        this._showPowerupEffect(type, duration);
    }
    
    /**
     * Handle environment effect event
     * @private
     * @param {Object} event - Event data
     */
    _onEnvironmentEffect(event) {
        const { type, intensity = 1.0, duration } = event;
        
        switch (type) {
            case 'radiation':
                this._showRadiationEffect(intensity, duration);
                break;
            case 'fire':
                this._showFireEffect(intensity, duration);
                break;
            case 'electrical':
                this._showElectricalEffect(intensity, duration);
                break;
            case 'poison':
                this._showPoisonEffect(intensity, duration);
                break;
            case 'water':
                this._showWaterEffect(intensity, duration);
                break;
            default:
                // Generic environment effect
                this._showEnvironmentEffect(type, intensity, duration);
        }
    }
    
    /**
     * Handle health changed event
     * @private
     * @param {Object} event - Event data
     */
    _onHealthChanged(event) {
        // Update vignette based on health percentage
        const healthPercent = (event.current / event.max) * 100;
        this._updateHealthVignette(healthPercent);
    }
    
    /**
     * Handle game paused event
     * @private
     */
    _onGamePaused() {
        // Clear all active effects
        this.clearAllEffects();
    }
    
    /**
     * Show damage flash effect
     * @private
     * @param {number} intensity - Effect intensity (0-1)
     * @param {string} damageType - Type of damage ('bullet', 'explosive', 'fire', 'energy', etc.)
     */
    _showDamageFlash(intensity, damageType = 'default') {
        const flashLayer = this.layers.flash;
        const damageFlashConfig = this.config.damageFlash || {};
        
        // Get flash duration (about 300ms base with intensity affecting it)
        const baseDuration = (damageFlashConfig.baseDuration || 0.3) * 1000;
        const duration = baseDuration + (intensity * 200); // 300-500ms based on intensity
        
        // Set appropriate color based on damage type
        let flashColor = damageFlashConfig?.types?.[damageType] || 
            damageFlashConfig?.types?.default || 
            'rgba(255, 0, 0, 0.3)';
        
        // Set CSS properties
        flashLayer.style.setProperty('--flash-color', flashColor);
        flashLayer.style.setProperty('--flash-intensity', (intensity * (damageFlashConfig.intensityFactor || 0.7)).toFixed(2));
        
        // Apply flash class and remove after animation completes
        flashLayer.classList.add('rift-advanced-screen-effects__flash--active');
        
        // Clear any existing timeout
        if (this.flashTimeout) {
            clearTimeout(this.flashTimeout);
        }
        
        // Set timeout to remove flash
        this.flashTimeout = setTimeout(() => {
            flashLayer.classList.remove('rift-advanced-screen-effects__flash--active');
        }, duration);
    }
    
    /**
     * Show healing effect
     * @private
     * @param {number} intensity - Effect intensity (0-1)
     */
    _showHealEffect(intensity) {
        const colorLayer = this.layers.color;
        
        // Set CSS properties
        colorLayer.style.setProperty('--color-effect', 'var(--rift-success)');
        colorLayer.style.setProperty('--color-intensity', intensity.toFixed(2));
        
        // Apply and animate effect
        colorLayer.classList.add('rift-advanced-screen-effects__color--heal-active');
        
        // Clear any existing timeout
        if (this.healTimeout) {
            clearTimeout(this.healTimeout);
        }
        
        // Duration based on intensity (longer for more impactful heals)
        const duration = 1000 + (intensity * 1000); // 1-2s
        
        // Set timeout to remove effect
        this.healTimeout = setTimeout(() => {
            colorLayer.classList.remove('rift-advanced-screen-effects__color--heal-active');
        }, duration);
    }
    
    /**
     * Apply directional screen shake
     * @private
     * @param {number} intensity - Shake intensity (0-1)
     * @param {Object} direction - Direction vector {x, y} or {x, z}
     * @param {string} damageType - Type of damage affecting shake ('bullet', 'explosive', etc.)
     */
    _applyScreenShake(intensity, direction, damageType = 'default') {
        const shakeConfig = this.config.screenShake || {};
        
        // Calculate shake duration based on config and intensity
        const baseDuration = Math.min(
            shakeConfig.maxDuration || 0.8,
            intensity * 0.5 + 0.3
        );
        
        // Enhance intensity for explosive damage
        let adjustedIntensity = intensity;
        if (damageType === 'explosive') {
            adjustedIntensity *= 1.3;
        }
        
        // Set shake parameters
        this.shakeDuration = baseDuration;
        this.shakeIntensity = adjustedIntensity * 30; // 0-30px
        
        // Normalize direction if provided
        if (direction) {
            // Handle direction in different formats
            let dirX = 0, dirY = 0;
            
            if (direction.x !== undefined) {
                dirX = direction.x;
                // Use y if available, otherwise use z (for 3D world coordinates)
                dirY = direction.y !== undefined ? direction.y : (direction.z || 0);
            } else if (typeof direction === 'number') {
                // If direction is an angle in degrees, convert to vector
                const radians = (direction * Math.PI) / 180;
                dirX = Math.cos(radians);
                dirY = Math.sin(radians);
            }
            
            // Normalize the direction vector
            const magnitude = Math.sqrt(dirX * dirX + dirY * dirY);
            
            if (magnitude > 0) {
                this.shakeDirection = {
                    x: dirX / magnitude,
                    y: dirY / magnitude
                };
            } else {
                this.shakeDirection = { x: 0, y: 0 };
            }
        } else {
            // Default to random direction
            const angle = Math.random() * Math.PI * 2;
            this.shakeDirection = {
                x: Math.cos(angle),
                y: Math.sin(angle)
            };
        }
    }
    
    /**
     * Update screen shake effect
     * @private
     * @param {number} delta - Time since last update in ms
     */
    _updateScreenShake(delta) {
        if (this.shakeDuration <= 0) return;
        
        this.shakeDuration -= delta / 1000; // Convert to seconds
        
        // Calculate current intensity with decay
        const progress = Math.max(0, this.shakeDuration) / 0.8; // Normalize to 0-1
        const currentIntensity = this.shakeIntensity * progress * progress; // Quadratic falloff
        
        if (currentIntensity > 0.5) {
            // Get config
            const shakeConfig = this.config.screenShake || {};
            const directionFactor = shakeConfig.directionFactor || 0.4;
            const noiseFactorX = shakeConfig.noiseFactorX || 0.6;
            const noiseFactorY = shakeConfig.noiseFactorY || 0.6;
            
            // Calculate shake offset based on direction and perlin noise
            const time = performance.now() * (shakeConfig.perlinSpeed || 0.01);
            const noiseX = this._perlinNoise(time, 0) * 2 - 1;
            const noiseY = this._perlinNoise(0, time) * 2 - 1;
            
            const offsetX = (noiseX * noiseFactorX + this.shakeDirection.x * directionFactor) * currentIntensity;
            const offsetY = (noiseY * noiseFactorY + this.shakeDirection.y * directionFactor) * currentIntensity;
            
            // Apply transform to container
            this.element.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
        } else {
            this.element.style.transform = '';
        }
    }
    
    /**
     * Update vignette effect for low health visualization
     * @private
     * @param {number} healthPercent - Current health percentage (0-100)
     */
    _updateHealthVignette(healthPercent) {
        // Get vignette config
        const vignetteConfig = this.config.vignette || {};
        const healthThreshold = vignetteConfig.healthThreshold || 0.5;
        const pulseThreshold = vignetteConfig.pulseThreshold || 0.25;
        
        // Update vignette intensity based on health
        if (healthPercent / 100 < healthThreshold) {
            const normalizedHealth = (healthPercent / 100) / healthThreshold; // 0-1 range where 0 = 0% health, 1 = threshold health
            this.vignetteIntensity = (1 - normalizedHealth) * (vignetteConfig.maxIntensity || 0.95);
            
            // Update vignette visuals
            const vignetteLayer = this.layers.vignette;
            vignetteLayer.style.setProperty('--vignette-intensity', this.vignetteIntensity.toFixed(2));
            vignetteLayer.classList.add('rift-advanced-screen-effects__vignette--active');
            
            // Add pulsing effect if health is very low
            if ((healthPercent / 100) < pulseThreshold && vignetteConfig.pulseEnabled !== false) {
                vignetteLayer.classList.add('rift-advanced-screen-effects__vignette--pulse');
                
                // Set pulse rate based on health
                const minHealth = 0.05; // 5% health
                const healthFactor = Math.max(0, ((healthPercent / 100) - minHealth) / (pulseThreshold - minHealth));
                const pulseRate = vignetteConfig.pulseRate || 1.5; // pulses per second
                const adjustedPulseRate = pulseRate / (healthFactor * 0.5 + 0.5); // Increase pulse rate as health decreases
                
                vignetteLayer.style.setProperty('--pulse-duration', `${1 / adjustedPulseRate}s`);
            } else {
                this.layers.vignette.classList.remove('rift-advanced-screen-effects__vignette--pulse');
            }
        } else {
            this.vignetteIntensity = 0;
            this.layers.vignette.classList.remove('rift-advanced-screen-effects__vignette--active', 'rift-advanced-screen-effects__vignette--pulse');
        }
    }

    /**
     * Show critical effect (low health, stun, etc.)
     * @private
     * @param {number} intensity - Effect intensity (0-1)
     */
    _showCriticalEffect(intensity) {
        const overlayLayer = this.layers.overlay;
        
        // Set CSS properties
        overlayLayer.style.setProperty('--overlay-color', 'rgba(255, 0, 0, 0.3)');
        overlayLayer.style.setProperty('--overlay-intensity', intensity.toFixed(2));
        
        // Apply and animate effect
        overlayLayer.classList.add('rift-advanced-screen-effects__overlay--critical');
        
        // Auto-remove after 2 seconds
        setTimeout(() => {
            overlayLayer.classList.remove('rift-advanced-screen-effects__overlay--critical');
        }, 2000);
    }

    /**
     * Show stun effect
     * @private
     * @param {number} intensity - Effect intensity (0-1)
     */
    _showStunEffect(intensity) {
        const overlayLayer = this.layers.overlay;
        const colorLayer = this.layers.color;
        
        // Set CSS properties
        overlayLayer.style.setProperty('--overlay-intensity', intensity.toFixed(2));
        colorLayer.style.setProperty('--color-intensity', (intensity * 0.6).toFixed(2));
        
        // Apply and animate effect
        overlayLayer.classList.add('rift-advanced-screen-effects__overlay--stun');
        colorLayer.classList.add('rift-advanced-screen-effects__color--stun');
        
        // Apply a strong directional shake
        this._applyScreenShake(intensity, { x: 0, y: 1 }, 'stun');
        
        // Auto-remove after duration
        const duration = intensity * 3000 + 1000; // 1-4 seconds based on intensity
        
        setTimeout(() => {
            overlayLayer.classList.remove('rift-advanced-screen-effects__overlay--stun');
            colorLayer.classList.remove('rift-advanced-screen-effects__color--stun');
        }, duration);
    }

    /**
     * Show blind effect
     * @private
     * @param {number} intensity - Effect intensity (0-1)
     */
    _showBlindEffect(intensity) {
        const overlayLayer = this.layers.overlay;
        
        // Set CSS properties
        overlayLayer.style.setProperty('--overlay-intensity', intensity.toFixed(2));
        
        // Apply and animate effect
        overlayLayer.classList.add('rift-advanced-screen-effects__overlay--blind');
        
        // Auto-remove after duration
        const duration = intensity * 2000 + 1000; // 1-3 seconds based on intensity
        
        setTimeout(() => {
            // Fade out the effect
            overlayLayer.classList.add('rift-advanced-screen-effects__overlay--blind-fading');
            
            setTimeout(() => {
                overlayLayer.classList.remove(
                    'rift-advanced-screen-effects__overlay--blind',
                    'rift-advanced-screen-effects__overlay--blind-fading'
                );
            }, 1000);
        }, duration);
    }

    /**
     * Show explosion flash effect
     * @private
     * @param {number} intensity - Effect intensity (0-1)
     */
    _showExplosionFlash(intensity) {
        const flashLayer = this.layers.flash;
        
        // Set CSS properties
        flashLayer.style.setProperty('--flash-color', 'rgba(255, 160, 0, 0.4)');
        flashLayer.style.setProperty('--flash-intensity', intensity.toFixed(2));
        
        // Apply explosion flash class
        flashLayer.classList.add('rift-advanced-screen-effects__flash--explosion');
        
        // Clear any existing timeout
        if (this.explosionTimeout) {
            clearTimeout(this.explosionTimeout);
        }
        
        // Set timeout to remove flash
        this.explosionTimeout = setTimeout(() => {
            flashLayer.classList.remove('rift-advanced-screen-effects__flash--explosion');
        }, 800);
    }

    /**
     * Show powerup effect
     * @private
     * @param {string} type - Type of powerup ('damage', 'speed', 'armor', etc.)
     * @param {number} duration - Duration of the powerup in seconds
     */
    _showPowerupEffect(type, duration) {
        const colorLayer = this.layers.color;
        
        let effectClass = '';
        let effectColor = '';
        
        // Set effect properties based on powerup type
        switch (type) {
            case 'damage':
                effectClass = 'rift-advanced-screen-effects__color--powerup-damage';
                effectColor = 'rgba(255, 50, 50, 0.2)';
                break;
            case 'speed':
                effectClass = 'rift-advanced-screen-effects__color--powerup-speed';
                effectColor = 'rgba(50, 200, 255, 0.2)';
                break;
            case 'armor':
                effectClass = 'rift-advanced-screen-effects__color--powerup-armor';
                effectColor = 'rgba(50, 255, 50, 0.2)';
                break;
            case 'invisible':
                effectClass = 'rift-advanced-screen-effects__color--powerup-invisible';
                effectColor = 'rgba(200, 200, 255, 0.25)';
                break;
            default:
                effectClass = 'rift-advanced-screen-effects__color--powerup';
                effectColor = 'rgba(255, 200, 0, 0.15)';
        }
        
        // Set CSS properties
        colorLayer.style.setProperty('--color-effect', effectColor);
        colorLayer.style.setProperty('--effect-duration', `${duration}s`);
        
        // Apply effect class
        colorLayer.classList.add(effectClass);
        
        // Remove effect after duration plus fade-out time
        setTimeout(() => {
            colorLayer.classList.remove(effectClass);
        }, duration * 1000 + 1000);
    }

    /**
     * Show environmental effects
     * @private
     * @param {string} type - Type of environment effect
     * @param {number} intensity - Effect intensity (0-1)
     * @param {number} duration - Duration of effect in seconds
     */
    _showEnvironmentEffect(type, intensity, duration) {
        const colorLayer = this.layers.color;
        const overlayLayer = this.layers.overlay;
        
        let effectColor = 'rgba(255, 255, 255, 0.2)';
        let effectClass = '';
        
        // Apply effect based on type
        switch (type) {
            case 'radiation':
                this._showRadiationEffect(intensity, duration);
                return;
            case 'fire':
                this._showFireEffect(intensity, duration);
                return;
            case 'electrical':
                this._showElectricalEffect(intensity, duration);
                return;
            case 'poison':
                this._showPoisonEffect(intensity, duration);
                return;
            case 'water':
                this._showWaterEffect(intensity, duration);
                return;
            default:
                effectColor = 'rgba(255, 255, 255, 0.15)';
                effectClass = 'rift-advanced-screen-effects__color--environment';
        }
        
        // Set CSS properties
        colorLayer.style.setProperty('--color-effect', effectColor);
        colorLayer.style.setProperty('--color-intensity', intensity.toFixed(2));
        
        // Apply effect class
        colorLayer.classList.add(effectClass);
        
        // Remove effect after duration
        if (duration) {
            setTimeout(() => {
                colorLayer.classList.remove(effectClass);
            }, duration * 1000);
        }
    }

    /**
     * Show radiation effect
     * @private
     * @param {number} intensity - Effect intensity (0-1)
     * @param {number} duration - Duration of effect in seconds
     */
    _showRadiationEffect(intensity, duration) {
        const colorLayer = this.layers.color;
        
        // Set CSS properties
        colorLayer.style.setProperty('--color-effect', 'rgba(83, 236, 51, 0.15)');
        colorLayer.style.setProperty('--color-intensity', intensity.toFixed(2));
        
        // Apply effect class
        colorLayer.classList.add('rift-advanced-screen-effects__color--radiation');
        
        // Remove effect after duration
        if (duration) {
            setTimeout(() => {
                colorLayer.classList.remove('rift-advanced-screen-effects__color--radiation');
            }, duration * 1000);
        }
    }

    /**
     * Show fire effect
     * @private
     * @param {number} intensity - Effect intensity (0-1)
     * @param {number} duration - Duration of effect in seconds
     */
    _showFireEffect(intensity, duration) {
        const colorLayer = this.layers.color;
        
        // Set CSS properties
        colorLayer.style.setProperty('--color-effect', 'rgba(255, 100, 20, 0.25)');
        colorLayer.style.setProperty('--color-intensity', intensity.toFixed(2));
        
        // Apply effect class
        colorLayer.classList.add('rift-advanced-screen-effects__color--fire');
        
        // Apply a subtle shake with increasing intensity
        this._applyScreenShake(intensity * 0.3, { x: 0, y: 1 }, 'fire');
        
        // Remove effect after duration
        if (duration) {
            setTimeout(() => {
                colorLayer.classList.remove('rift-advanced-screen-effects__color--fire');
            }, duration * 1000);
        }
    }

    /**
     * Show electrical effect
     * @private
     * @param {number} intensity - Effect intensity (0-1)
     * @param {number} duration - Duration of effect in seconds
     */
    _showElectricalEffect(intensity, duration) {
        const colorLayer = this.layers.color;
        
        // Set CSS properties
        colorLayer.style.setProperty('--color-effect', 'rgba(75, 180, 255, 0.25)');
        colorLayer.style.setProperty('--color-intensity', intensity.toFixed(2));
        
        // Apply effect class
        colorLayer.classList.add('rift-advanced-screen-effects__color--electrical');
        
        // Apply a strong, brief shake
        this._applyScreenShake(intensity * 0.6, { x: Math.random() - 0.5, y: Math.random() - 0.5 }, 'electrical');
        
        // Remove effect after duration
        if (duration) {
            setTimeout(() => {
                colorLayer.classList.remove('rift-advanced-screen-effects__color--electrical');
            }, duration * 1000);
        }
    }
    
    /**
     * Show poison effect
     * @private
     * @param {number} intensity - Effect intensity (0-1)
     * @param {number} duration - Duration of effect in seconds
     */
    _showPoisonEffect(intensity, duration) {
        const colorLayer = this.layers.color;
        
        // Set CSS properties
        colorLayer.style.setProperty('--color-effect', 'rgba(150, 75, 200, 0.2)');
        colorLayer.style.setProperty('--color-intensity', intensity.toFixed(2));
        
        // Apply effect class
        colorLayer.classList.add('rift-advanced-screen-effects__color--poison');
        
        // Remove effect after duration
        if (duration) {
            setTimeout(() => {
                colorLayer.classList.remove('rift-advanced-screen-effects__color--poison');
            }, duration * 1000);
        }
    }
    
    /**
     * Show water effect
     * @private
     * @param {number} intensity - Effect intensity (0-1)
     * @param {number} duration - Duration of effect in seconds
     */
    _showWaterEffect(intensity, duration) {
        const colorLayer = this.layers.color;
        const distortionLayer = this.layers.distortion;
        
        // Set CSS properties
        colorLayer.style.setProperty('--color-effect', 'rgba(0, 100, 255, 0.15)');
        colorLayer.style.setProperty('--color-intensity', intensity.toFixed(2));
        distortionLayer.style.setProperty('--distortion-intensity', intensity.toFixed(2));
        
        // Apply effect classes
        colorLayer.classList.add('rift-advanced-screen-effects__color--water');
        distortionLayer.classList.add('rift-advanced-screen-effects__distortion--water');
        
        // Remove effect after duration
        if (duration) {
            setTimeout(() => {
                colorLayer.classList.remove('rift-advanced-screen-effects__color--water');
                distortionLayer.classList.remove('rift-advanced-screen-effects__distortion--water');
            }, duration * 1000);
        }
    }
    
    /**
     * Update animations
     * @private
     * @param {number} delta - Time since last update in ms
     */
    _updateAnimations(delta) {
        // Implement animation updates here
        // This is a placeholder for any additional animation logic
    }
    
    /**
     * Generate perlin-like noise for screen shake
     * Simple implementation for demo purposes
     * @private
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {number} Noise value between 0 and 1
     */
    _perlinNoise(x, y) {
        // Simple perlin-like noise implementation
        // In a real implementation, use a proper perlin noise function or library
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const xf = x - Math.floor(x);
        const yf = y - Math.floor(y);
        
        // Just for demo - not actual perlin noise
        return (Math.sin(x * 12.9898 + y * 78.233 + this.perlinSeed) * 43758.5453) % 1;
    }
    
    /**
     * Clear all active effects
     */
    clearAllEffects() {
        // Reset transform
        this.element.style.transform = '';
        
        // Reset screen shake
        this.shakeDuration = 0;
        this.shakeIntensity = 0;
        
        // Clear timeouts
        if (this.flashTimeout) clearTimeout(this.flashTimeout);
        if (this.healTimeout) clearTimeout(this.healTimeout);
        if (this.explosionTimeout) clearTimeout(this.explosionTimeout);
        
        // Reset layers
        for (const layerName in this.layers) {
            if (this.layers[layerName]) {
                // Remove all effect classes
                this.layers[layerName].className = `rift-advanced-screen-effects__layer rift-advanced-screen-effects__layer--${layerName}`;
                
                // Reset any inline styles
                this.layers[layerName].style = '';
            }
        }
        
        // Clear active effects map
        this.activeEffects.clear();
        
        return this;
    }
    
    /**
     * Test method to show damage effects
     * For development and debugging only
     * @public
     * @param {string} intensity - Effect intensity ('low', 'medium', 'high', 'critical')
     * @param {string} damageType - Type of damage ('default', 'bullet', 'explosive', 'fire', 'energy')
     */
    testDamageEffects(intensity = 'medium', damageType = 'default') {
        // Map intensity string to damage values
        let damageAmount;
        
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
                break;
            default:
                damageAmount = Math.floor(Math.random() * 30) + 10; // 10-39
        }
        
        // Create random direction
        const angle = Math.random() * Math.PI * 2;
        const direction = {
            x: Math.cos(angle),
            y: Math.sin(angle)
        };
        
        // Simulate damage event
        this._onPlayerDamaged({
            damage: damageAmount,
            direction: direction,
            damageType: damageType,
            currentHealth: 50,
            maxHealth: 100
        });
        
        console.log(`Test damage effects: ${damageAmount} ${damageType} damage`);
    }
    
    /**
     * Test method to show various effects
     * For development and debugging only
     * @public
     * @param {string} effectType - Type of effect to test ('vignette', 'stun', 'blind', 'explosion', 'radiation', 'fire', 'electrical', 'poison', 'water')
     * @param {string} intensity - Effect intensity ('low', 'medium', 'high')
     */
    testEffect(effectType = 'vignette', intensity = 'medium') {
        // Map intensity string to value
        let intensityValue;
        
        switch (intensity) {
            case 'low':
                intensityValue = 0.3;
                break;
            case 'medium':
                intensityValue = 0.6;
                break;
            case 'high':
                intensityValue = 0.9;
                break;
            default:
                intensityValue = 0.6;
        }
        
        // Apply requested effect
        switch (effectType) {
            case 'vignette':
                // For vignette, simulate health percentage
                const healthPercent = 100 - (intensityValue * 100);
                this._updateHealthVignette(healthPercent);
                console.log(`Test vignette: ${healthPercent.toFixed(0)}% health`);
                break;
                
            case 'stun':
                this._showStunEffect(intensityValue);
                console.log(`Test stun effect: ${intensity} intensity`);
                break;
                
            case 'blind':
                this._showBlindEffect(intensityValue);
                console.log(`Test blind effect: ${intensity} intensity`);
                break;
                
            case 'explosion':
                this._showExplosionFlash(intensityValue);
                this._applyScreenShake(intensityValue, null, 'explosive');
                console.log(`Test explosion effect: ${intensity} intensity`);
                break;
                
            case 'heal':
                this._showHealEffect(intensityValue);
                console.log(`Test heal effect: ${intensity} intensity`);
                break;
                
            case 'radiation':
                this._showRadiationEffect(intensityValue, 3);
                console.log(`Test radiation effect: ${intensity} intensity, 3s duration`);
                break;
                
            case 'fire':
                this._showFireEffect(intensityValue, 3);
                console.log(`Test fire effect: ${intensity} intensity, 3s duration`);
                break;
                
            case 'electrical':
                this._showElectricalEffect(intensityValue, 3);
                console.log(`Test electrical effect: ${intensity} intensity, 3s duration`);
                break;
                
            case 'poison':
                this._showPoisonEffect(intensityValue, 3);
                console.log(`Test poison effect: ${intensity} intensity, 3s duration`);
                break;
                
            case 'water':
                this._showWaterEffect(intensityValue, 3);
                console.log(`Test water effect: ${intensity} intensity, 3s duration`);
                break;
                
            default:
                console.log(`Unknown effect type: ${effectType}`);
        }
    }
    
    /**
     * Test method to show powerup effects
     * For development and debugging only
     * @public
     * @param {string} powerupType - Type of powerup ('damage', 'speed', 'armor', 'invisible')
     * @param {number} duration - Duration in seconds
     */
    testPowerupEffect(powerupType = 'damage', duration = 5) {
        this._showPowerupEffect(powerupType, duration);
        console.log(`Test powerup effect: ${powerupType}, ${duration}s duration`);
    }
}

