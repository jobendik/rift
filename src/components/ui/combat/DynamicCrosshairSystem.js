/**
 * Dynamic Crosshair System Component for the RIFT FPS UI.
 * 
 * Enhanced crosshair system with:
 * - Dynamic spread visualization based on weapon accuracy
 * - Contextual color changes based on target type
 * - Contextual shape changes based on interaction context
 * - Weapon state integration (reloading, overheating)
 * - Subtle indication for potential critical hits
 * - Layered crosshair elements
 * 
 * Part of the Enhanced Combat Feedback System.
 * 
 * @author Cline
 * @version 1.0
 * @extends UIComponent
 */

import UIComponent from '../UIComponent.js';
import { EventManager } from '../../../core/EventManager.js';
import { DOMFactory } from '../../../utils/DOMFactory.js';
import { UIConfig } from '../../../core/UIConfig.js';

export class DynamicCrosshairSystem extends UIComponent {
    /**
     * Create a new Dynamic Crosshair System component
     * @param {Object} options - Component options
     */
    constructor(options = {}) {
        super({
            id: options.id || 'dynamic-crosshair-system',
            className: 'rift-dynamic-crosshair',
            container: options.container,
            autoInit: false, // Prevent auto-initialization
            ...options        });
        
        // Configuration
        this.config = UIConfig.enhancedCombat?.crosshair || {};
        
        // State tracking
        this.spreadFactor = 1.0;
        this.baseSpread = this.config.spread?.baseSpread || 2;
        this.maxSpread = this.config.spread?.maxSpread || 30;
        this.currentState = 'default';
        this.currentTarget = null;
        this.weaponState = 'ready';
        this.lastShotTime = 0;
        this.isMoving = false;
        this.isJumping = false;
        this.recoveryTimer = null;
        this.isOverEnemy = false;
        this.isOverCritical = false;
        this.critZoneType = null;
        
        // Layers container
        this.layers = {};
        
        // Event subscriptions
        this.registerEvents({
            'weapon:fired': this._onWeaponFired,
            'weapon:reload': this._onWeaponReload,
            'weapon:ready': this._onWeaponReady,
            'weapon:switch': this._onWeaponSwitch,
            'weapon:state': this._onWeaponState,
            'weapon:ammo': this._onWeaponAmmo,
            'target:change': this._onTargetChange,
            'player:movement': this._onPlayerMovement,
            'player:stance': this._onPlayerStance,
            'input:mousemove': this._onMouseMove
        });
        
        // Initialize manually after all properties are set
        this.init();
    }
      /**
     * Initialize the component
     */    init() {
        if (this.isInitialized) return this;
          // console.log('[DynamicCrosshairSystem] Starting initialization...');
        // console.log('[DynamicCrosshairSystem] Config:', this.config);
        // console.log('[DynamicCrosshairSystem] Container:', this.container);
        
        // Call parent init
        super.init();
        
        // Add default weapon type class
        this.element.classList.add('rift-dynamic-crosshair--rifle');
        
        // Create crosshair layers
        this._createCrosshairLayers();
        
        // Set default state
        this._setCrosshairState('default');
        
        this.isInitialized = true;
        console.log('[DynamicCrosshairSystem] Initialization complete. Element:', this.element);
        console.log('[DynamicCrosshairSystem] Element classes:', this.element.className);
        console.log('[DynamicCrosshairSystem] Element parent:', this.element.parentElement);
        console.log('[DynamicCrosshairSystem] Element position styles:', window.getComputedStyle(this.element).position);
        console.log('[DynamicCrosshairSystem] Element visibility:', window.getComputedStyle(this.element).visibility);
        console.log('[DynamicCrosshairSystem] Element opacity:', window.getComputedStyle(this.element).opacity);
        return this;
    }
    
    /**
     * Update the component state
     * @param {Number} delta - Time elapsed since last frame in seconds
     */
    update(delta) {
        if (!this.isInitialized || !this.isActive) return this;
        
        // Gradually reduce spread over time if not recently fired
        this._updateSpread(delta);
        
        // Update crosshair state
        this._updateCrosshairState();
        
        return this;
    }
    
    /**
     * Create the crosshair layers
     * @private
     */
    _createCrosshairLayers() {
        // Create layers in order from bottom to top
        const layerTypes = ['base', 'spread', 'center', 'hitmarker', 'context'];
        
        layerTypes.forEach(type => {
            this.layers[type] = DOMFactory.createElement('div', {
                className: `rift-dynamic-crosshair__layer rift-dynamic-crosshair__layer--${type}`,
                parent: this.element
            });
            
            // Create specific crosshair elements for each layer
            if (type === 'spread') {
                // Create spread indicators
                ['top', 'right', 'bottom', 'left'].forEach(direction => {
                    DOMFactory.createElement('div', {
                        className: `rift-dynamic-crosshair__spread rift-dynamic-crosshair__spread--${direction}`,
                        parent: this.layers[type]
                    });
                });
            } else if (type === 'center') {
                // Create center dot
                DOMFactory.createElement('div', {
                    className: 'rift-dynamic-crosshair__center',
                    parent: this.layers[type]
                });
            } else if (type === 'context') {
                // Create context hint element
                DOMFactory.createElement('div', {
                    className: 'rift-dynamic-crosshair__context-hint',
                    parent: this.layers[type],
                    text: ''
                });
            } else if (type === 'hitmarker') {
                // Create hit marker lines
                // Horizontal left
                DOMFactory.createElement('div', {
                    className: 'rift-dynamic-crosshair__hit-marker-line rift-dynamic-crosshair__hit-marker-line--horizontal-left',
                    parent: this.layers[type]
                });
                
                // Horizontal right
                DOMFactory.createElement('div', {
                    className: 'rift-dynamic-crosshair__hit-marker-line rift-dynamic-crosshair__hit-marker-line--horizontal-right',
                    parent: this.layers[type]
                });
                
                // Vertical top
                DOMFactory.createElement('div', {
                    className: 'rift-dynamic-crosshair__hit-marker-line rift-dynamic-crosshair__hit-marker-line--vertical-top',
                    parent: this.layers[type]
                });
                
                // Vertical bottom
                DOMFactory.createElement('div', {
                    className: 'rift-dynamic-crosshair__hit-marker-line rift-dynamic-crosshair__hit-marker-line--vertical-bottom',
                    parent: this.layers[type]
                });
            }
        });
    }    /**
     * Update crosshair spread
     * @private
     * @param {Number} delta - Time elapsed since last frame in seconds
     */
    _updateSpread(delta) {
        // Only recover if recovery timer has expired (or doesn't exist)
        if (this.recoveryTimer) {
            return; // Don't recover during delay period
        }
        
        // Get recovery rate from config
        const spreadRecoveryRate = this.config.spread?.recoveryRate || 0.2; // Per second
        
        const oldSpreadFactor = this.spreadFactor;
        
        // Gradually reduce spread over time
        this.spreadFactor = Math.max(1.0, this.spreadFactor - (spreadRecoveryRate * delta));
        
        // Only apply and log if there was an actual change
        if (oldSpreadFactor !== this.spreadFactor) {
            console.log(`[DynamicCrosshairSystem] Spread recovery - ${oldSpreadFactor} -> ${this.spreadFactor} (delta: ${delta}, rate: ${spreadRecoveryRate})`);
            
            // Apply updated spread to crosshair
            this._applyCrosshairSpread();
        }
    }
      /**
     * Apply current spread factor to crosshair
     * @private
     */
    _applyCrosshairSpread() {
        // Calculate current spread amount
        // spreadFactor ranges from 1.0 (min) to 5.0 (max), so we normalize it to 0-1 range
        const normalizedSpread = (this.spreadFactor - 1.0) / (5.0 - 1.0); // 0 to 1
        const currentSpread = this.baseSpread + 
            (this.maxSpread - this.baseSpread) * normalizedSpread;
        
        // Update CSS variable for spread
        this.element.style.setProperty('--crosshair-spread', `${currentSpread}px`);
        
        console.log(`[DynamicCrosshairSystem] Spread update - Factor: ${this.spreadFactor}, Normalized: ${normalizedSpread}, Current: ${currentSpread}px`);
    }
    
    /**
     * Update crosshair state
     * @private
     */
    _updateCrosshairState() {
        // Update weapon state specific animations
        if (this.weaponState === 'reloading') {
            // Ensure reloading animation is active
            if (!this.element.classList.contains('rift-dynamic-crosshair--reloading')) {
                this.element.classList.add('rift-dynamic-crosshair--reloading');
            }
        } else {
            // Remove reloading animation if not reloading
            this.element.classList.remove('rift-dynamic-crosshair--reloading');
        }
        
        // Update empty state for weapon
        if (this.weaponState === 'empty') {
            if (!this.element.classList.contains('rift-dynamic-crosshair--empty')) {
                this.element.classList.add('rift-dynamic-crosshair--empty');
            }
        } else {
            this.element.classList.remove('rift-dynamic-crosshair--empty');
        }
        
        // Update critical potential state
        if (this.isOverCritical) {
            if (!this.element.classList.contains('rift-dynamic-crosshair--critical-potential')) {
                this.element.classList.add('rift-dynamic-crosshair--critical-potential');
                
                if (this.critZoneType) {
                    this.element.setAttribute('data-crit-zone', this.critZoneType);
                } else {
                    this.element.setAttribute('data-crit-zone', 'headshot');
                }
            }
        } else {
            this.element.classList.remove('rift-dynamic-crosshair--critical-potential');
            this.element.removeAttribute('data-crit-zone');
        }
    }
    
    /**
     * Set the crosshair state
     * @private
     * @param {String} state - State to set ('default', 'enemy', 'friendly', 'interactive')
     * @param {Object} target - Optional target object
     */
    _setCrosshairState(state, target = null) {
        // Remove all state classes
        this.element.classList.remove(
            'rift-dynamic-crosshair--default',
            'rift-dynamic-crosshair--enemy',
            'rift-dynamic-crosshair--friendly',
            'rift-dynamic-crosshair--interactive'
        );
        
        // Add current state class
        this.element.classList.add(`rift-dynamic-crosshair--${state}`);
        this.currentState = state;
        
        // Update context hint if applicable
        if (state === 'interactive' && target && target.action) {
            this._showContextHint(target.action);
        } else {
            this._hideContextHint();
        }
        
        // Update crosshair color based on state
        const stateColor = this.config.states?.[state] || this.config.states?.default || 'rgba(255, 255, 255, 0.8)';
        this.element.style.setProperty('--crosshair-color', stateColor);
    }
    
    /**
     * Show context hint for interactive objects
     * @private
     * @param {String} action - Action hint to show
     */
    _showContextHint(action) {
        const contextHint = this.element.querySelector('.rift-dynamic-crosshair__context-hint');
        if (contextHint) {
            contextHint.textContent = action;
            contextHint.style.display = 'block';
        }
    }
    
    /**
     * Hide context hint
     * @private
     */
    _hideContextHint() {
        const contextHint = this.element.querySelector('.rift-dynamic-crosshair__context-hint');
        if (contextHint) {
            contextHint.style.display = 'none';
        }
    }
    
    /**
     * Show critical hit potential indicator
     * @private
     * @param {String} zoneType - Type of critical zone ('headshot', 'weakpoint', etc.)
     */
    _showCriticalHitPotential(zoneType) {
        this.isOverCritical = true;
        this.critZoneType = zoneType;
        this.element.classList.add('rift-dynamic-crosshair--critical-potential');
        this.element.setAttribute('data-crit-zone', zoneType);
    }
    
    /**
     * Hide critical hit potential indicator
     * @private
     */
    _hideCriticalHitPotential() {
        this.isOverCritical = false;
        this.critZoneType = null;
        this.element.classList.remove('rift-dynamic-crosshair--critical-potential');
        this.element.removeAttribute('data-crit-zone');
    }
    
    /**
     * Show hit marker animation
     * @public
     * @param {String} type - Hit type ('normal', 'critical', 'headshot', 'kill')
     * @param {Number} damage - Optional damage amount
     */
    showHitMarker(type = 'normal', damage = 0) {
        // Get hit marker layer
        const hitMarkerLayer = this.layers.hitmarker;
        if (!hitMarkerLayer) return;
        
        // Remove all hit marker types
        hitMarkerLayer.classList.remove(
            'rift-dynamic-crosshair__hit-marker--active',
            'rift-dynamic-crosshair__hit-marker--normal',
            'rift-dynamic-crosshair__hit-marker--critical',
            'rift-dynamic-crosshair__hit-marker--headshot',
            'rift-dynamic-crosshair__hit-marker--kill'
        );
        
        // Calculate intensity based on damage (if provided)
        let intensity = 1;
        if (damage > 0) {
            // Scale intensity between 0.8 and 1.5 based on damage (0-100)
            intensity = 0.8 + Math.min(0.7, damage / 100);
            hitMarkerLayer.style.setProperty('--hit-intensity', intensity);
        }
        
        // Add appropriate hit marker class
        hitMarkerLayer.classList.add('rift-dynamic-crosshair__hit-marker--active');
        hitMarkerLayer.classList.add(`rift-dynamic-crosshair__hit-marker--${type}`);
        
        // Force reflow to restart animation
        void hitMarkerLayer.offsetWidth;
        
        // Determine duration based on hit type
        let duration = 300; // Default duration in ms
        switch(type) {
            case 'critical': duration = 400; break;
            case 'headshot': duration = 500; break;
            case 'kill': duration = 700; break;
        }
        
        // Remove classes after animation completes
        setTimeout(() => {
            hitMarkerLayer.classList.remove('rift-dynamic-crosshair__hit-marker--active');
        }, duration);
    }
    
    /**
     * Update crosshair for new weapon type
     * @public
     * @param {String} weaponType - Weapon type (pistol, rifle, shotgun, sniper)
     */
    updateWeaponType(weaponType) {
        // Validate weapon type
        const validTypes = ['pistol', 'rifle', 'shotgun', 'sniper'];
        const type = validTypes.includes(weaponType) ? weaponType : 'rifle';
        
        // Remove all weapon type classes
        validTypes.forEach(t => {
            this.element.classList.remove(`rift-dynamic-crosshair--${t}`);
        });
        
        // Add current weapon type class
        this.element.classList.add(`rift-dynamic-crosshair--${type}`);
        
        // Reset spread for new weapon
        this.spreadFactor = 1.0;
        this._applyCrosshairSpread();
    }
    
    /**
     * Show multi-kill feedback
     * @public
     * @param {Number} killCount - Number of kills in sequence
     */
    showMultiKillFeedback(killCount) {
        // Determine multi-kill type
        let multiKillType = '';
        const thresholds = this.config.multiKill?.thresholds || {
            double: 2, triple: 3, quad: 4, chain: 5
        };
        
        if (killCount >= thresholds.chain) {
            multiKillType = 'chain';
        } else if (killCount >= thresholds.quad) {
            multiKillType = 'quad';
        } else if (killCount >= thresholds.triple) {
            multiKillType = 'triple';
        } else if (killCount >= thresholds.double) {
            multiKillType = 'double';
        } else {
            return; // Not a multi-kill
        }
        
        // Create and show multi-kill indicator
        const multiKillIndicator = DOMFactory.createElement('div', {
            className: `rift-dynamic-crosshair__multi-kill rift-dynamic-crosshair__multi-kill--${multiKillType}`,
            parent: this.element,
            text: `${multiKillType} kill`
        });
        
        // Remove after animation
        setTimeout(() => {
            if (multiKillIndicator && multiKillIndicator.parentNode) {
                multiKillIndicator.parentNode.removeChild(multiKillIndicator);
            }
        }, 1500); // 1.5 seconds
    }
      /**
     * Handler for weapon fired event
     * @private
     * @param {Object} event - Event data
     */
    _onWeaponFired(event) {
        const now = performance.now();
        const timeSinceLastShot = now - this.lastShotTime;
        
        // Increase spread based on weapon
        let spreadIncrease = this.config.spread?.fireFactor || 1.0;
        
        // Adjust based on weapon type if provided
        if (event.weapon) {
            switch(event.weapon.type) {
                case 'pistol': spreadIncrease *= 0.8; break;
                case 'shotgun': spreadIncrease *= 1.5; break;
                case 'sniper': spreadIncrease *= 2.0; break;
            }
        }
        
        const oldSpreadFactor = this.spreadFactor;
        
        // Increase spread
        this.spreadFactor += spreadIncrease;
        
        // Cap spread factor (max is 5.0)
        this.spreadFactor = Math.min(5.0, this.spreadFactor);
        
        // Update last shot time
        this.lastShotTime = now;
        
        console.log(`[DynamicCrosshairSystem] Weapon fired - Spread: ${oldSpreadFactor} -> ${this.spreadFactor} (increase: ${spreadIncrease})`);
        
        // Apply spread immediately
        this._applyCrosshairSpread();
        
        // Clear any existing recovery timer
        if (this.recoveryTimer) {
            clearTimeout(this.recoveryTimer);
        }
        
        // Set recovery delay
        const recoverDelay = (this.config.spread?.recoverDelay || 0.1) * 1000; // Convert to ms
        this.recoveryTimer = setTimeout(() => {
            this.recoveryTimer = null;
            console.log(`[DynamicCrosshairSystem] Recovery timer expired, spread recovery enabled`);
        }, recoverDelay);
    }
    
    /**
     * Handler for weapon reload event
     * @private
     * @param {Object} event - Event data
     */
    _onWeaponReload(event) {
        this.weaponState = 'reloading';
        
        // Apply reloading class
        this.element.classList.add('rift-dynamic-crosshair--reloading');
        
        // Get reload duration from event or config
        const reloadDuration = event.duration ? 
            event.duration * 1000 : // Convert to ms
            (this.config.weaponStates?.reloading?.duration || 2.0) * 1000; // Default 2 seconds
        
        // Set timer to return to ready state
        setTimeout(() => {
            this.weaponState = 'ready';
            this.element.classList.remove('rift-dynamic-crosshair--reloading');
        }, reloadDuration);
    }
    
    /**
     * Handler for weapon ready event
     * @private
     * @param {Object} event - Event data
     */
    _onWeaponReady(event) {
        this.weaponState = 'ready';
        this.element.classList.remove('rift-dynamic-crosshair--reloading');
        this.element.classList.remove('rift-dynamic-crosshair--empty');
    }
    
    /**
     * Handler for weapon switch event
     * @private
     * @param {Object} event - Event data
     */
    _onWeaponSwitch(event) {
        // Update weapon type
        if (event.weaponType) {
            this.updateWeaponType(event.weaponType);
        }
        
        // Set weapon state to switching
        this.weaponState = 'switching';
        
        // Apply switching class
        this.element.classList.add('rift-dynamic-crosshair--switching');
        
        // Get switching duration from event or config
        const switchDuration = event.duration ?
            event.duration * 1000 : // Convert to ms
            (this.config.weaponStates?.switching?.duration || 0.3) * 1000; // Default 0.3 seconds
        
        // Set timer to return to ready state
        setTimeout(() => {
            this.weaponState = 'ready';
            this.element.classList.remove('rift-dynamic-crosshair--switching');
        }, switchDuration);
    }
    
    /**
     * Handler for weapon state event
     * @private
     * @param {Object} event - Event data
     */
    _onWeaponState(event) {
        if (event.state) {
            this.weaponState = event.state;
            
            // Update state classes
            const states = ['ready', 'reloading', 'switching', 'empty'];
            states.forEach(state => {
                this.element.classList.toggle(`rift-dynamic-crosshair--${state}`, state === event.state);
            });
        }
    }
    
    /**
     * Handler for weapon ammo event
     * @private
     * @param {Object} event - Event data
     */
    _onWeaponAmmo(event) {
        // Check for empty weapon
        if (event.currentAmmo !== undefined && event.currentAmmo <= 0) {
            this.weaponState = 'empty';
            this.element.classList.add('rift-dynamic-crosshair--empty');
        } else if (this.weaponState === 'empty' && event.currentAmmo > 0) {
            this.weaponState = 'ready';
            this.element.classList.remove('rift-dynamic-crosshair--empty');
        }
    }
    
    /**
     * Handler for target change event
     * @private
     * @param {Object} event - Event data
     */
    _onTargetChange(event) {
        const target = event.target;
        this.currentTarget = target;
        
        // Update crosshair based on target type
        if (target) {
            if (target.type === 'enemy') {
                this._setCrosshairState('enemy', target);
                this.isOverEnemy = true;
            } else if (target.type === 'friendly') {
                this._setCrosshairState('friendly', target);
                this.isOverEnemy = false;
            } else if (target.type === 'interactive') {
                this._setCrosshairState('interactive', target);
                this.isOverEnemy = false;
            } else {
                this._setCrosshairState('default');
                this.isOverEnemy = false;
            }
            
            // Check for potential critical hit zones
            if (target.critZone && target.critZone.isTargeted) {
                this._showCriticalHitPotential(target.critZone.type || 'headshot');
            } else {
                this._hideCriticalHitPotential();
            }
        } else {
            this._setCrosshairState('default');
            this.isOverEnemy = false;
            this._hideCriticalHitPotential();
        }
    }
    
    /**
     * Handler for player movement event
     * @private
     * @param {Object} event - Event data
     */
    _onPlayerMovement(event) {
        // Update movement state
        const wasMoving = this.isMoving;
        this.isMoving = event.isMoving;
        
        // Update jumping state
        const wasJumping = this.isJumping;
        this.isJumping = event.isJumping;
        
        // Update spread if state changed
        if (wasMoving !== this.isMoving || wasJumping !== this.isJumping) {
            // Calculate additional spread
            let additionalSpread = 0;
            
            if (this.isMoving) {
                additionalSpread += (this.config.spread?.movementFactor || 1.5) - 1;
            }
            
            if (this.isJumping) {
                additionalSpread += (this.config.spread?.jumpFactor || 2.0) - 1;
            }
            
            // Apply additional spread
            if (additionalSpread > 0) {
                this.spreadFactor += additionalSpread;
                // Cap spread factor (max is 5.0)
                this.spreadFactor = Math.min(5.0, this.spreadFactor);
                this._applyCrosshairSpread();
            }
        }
    }
    
    /**
     * Handler for player stance event
     * @private
     * @param {Object} event - Event data
     */
    _onPlayerStance(event) {
        // Apply stance-specific classes
        const stances = ['standing', 'crouching', 'prone'];
        stances.forEach(stance => {
            this.element.classList.toggle(`rift-dynamic-crosshair--${stance}`, stance === event.stance);
        });
        
        // Update spread based on stance
        let spreadModifier = 0;
        switch(event.stance) {
            case 'crouching': spreadModifier = -0.3; break; // Reduce spread when crouching
            case 'prone': spreadModifier = -0.5; break; // Reduce spread more when prone
        }
        
        if (spreadModifier !== 0) {
            // Apply spread modifier
            this.spreadFactor = Math.max(1.0, this.spreadFactor + spreadModifier);
            this._applyCrosshairSpread();
        }
    }
    
    /**
     * Handler for mouse movement event
     * @private
     * @param {Object} event - Event data
     */
    _onMouseMove(event) {
        // Add slight spread increase from fast mouse movement
        if (event.velocity && event.velocity > 50) { // Some arbitrary threshold
            const mouseMoveSpread = Math.min(0.2, event.velocity / 1000); // Cap at 0.2
            this.spreadFactor += mouseMoveSpread;
            this._applyCrosshairSpread();
        }
    }
    
    /**
     * Test method to demonstrate crosshair features
     * @public
     * @param {String} feature - Feature to test ('spread', 'state', 'hit', 'critical', 'multikill')
     * @param {String} value - Value for the specific feature
     */
    testCrosshair(feature, value) {
        switch(feature) {
            case 'spread':
                // Test spread visualization
                const spreadValue = parseFloat(value) || 2.0;
                this.spreadFactor = spreadValue;
                this._applyCrosshairSpread();
                console.log(`Testing crosshair spread: ${spreadValue}`);
                break;
                
            case 'state':
                // Test state changes
                const validStates = ['default', 'enemy', 'friendly', 'interactive'];
                if (validStates.includes(value)) {
                    this._setCrosshairState(value);
                    console.log(`Testing crosshair state: ${value}`);
                }
                break;
                
            case 'hit':
                // Test hit markers
                const validHitTypes = ['normal', 'critical', 'headshot', 'kill'];
                const hitType = validHitTypes.includes(value) ? value : 'normal';
                const damage = Math.floor(Math.random() * 40) + 10; // Random damage between 10-50
                this.showHitMarker(hitType, damage);
                console.log(`Testing hit marker: ${hitType} with ${damage} damage`);
                break;
                
            case 'critical':
                // Test critical hit potential
                const showCritical = value !== 'off';
                if (showCritical) {
                    this._showCriticalHitPotential(value || 'headshot');
                    console.log(`Testing critical hit potential: ${value || 'headshot'}`);
                } else {
                    this._hideCriticalHitPotential();
                    console.log('Testing critical hit potential: off');
                }
                break;
                
            case 'multikill':
                // Test multi-kill feedback
                const killCount = parseInt(value) || 2;
                this.showMultiKillFeedback(killCount);
                console.log(`Testing multi-kill feedback: ${killCount} kills`);
                break;
                
            case 'weapon':
                // Test weapon type
                const validWeapons = ['pistol', 'rifle', 'shotgun', 'sniper'];
                const weaponType = validWeapons.includes(value) ? value : 'rifle';
                this.updateWeaponType(weaponType);
                console.log(`Testing weapon type: ${weaponType}`);
                break;
                
            case 'reload':
                // Test reload animation
                this._onWeaponReload({
                    duration: parseFloat(value) || 2.0
                });
                console.log(`Testing reload animation: ${parseFloat(value) || 2.0}s`);
                break;
        }
    }
}

