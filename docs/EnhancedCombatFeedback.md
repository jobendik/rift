# Enhanced Combat Feedback System

## Overview

The Enhanced Combat Feedback System will build upon the existing combat feedback systems to provide more impactful, clear, and satisfying feedback during gameplay. This document outlines the design and implementation of the enhanced feedback features that will be implemented in Phase 4 of the RIFT FPS UI/CSS Redesign project.

## Goals

1. **Increase Combat Satisfaction**: Make combat feel more impactful and rewarding
2. **Improve Situational Awareness**: Provide clearer directional information about damage sources
3. **Enhance Visual Clarity**: Distinguish between different types of hits and damage
4. **Maintain Performance**: Ensure all enhancements work within performance budgets
5. **Support Accessibility**: Design effects that can be adjusted for different accessibility needs

## Components to Enhance

### 1. Enhanced Directional Damage Indicator

#### Current Implementation
The current `DamageIndicator` system shows the direction of incoming damage with fixed indicators at the screen edges.

#### Enhancements
- **Intensity Scaling**: Damage indicators scale in intensity based on damage amount
- **Stacking Indicators**: Multiple damage sources show simultaneously with proper visual distinction
- **Enhanced Directionality**: More precise angular representation of damage source
- **Type-Specific Indicators**: Different visuals for different damage types (e.g., bullet, explosive, melee)
- **Distance Representation**: Visual cues for damage source distance
- **Fade System**: Multi-stage fade based on recency and severity

#### Technical Approach
```javascript
class EnhancedDamageIndicator extends UIComponent {
    constructor(options = {}) {
        super(options);
        this.indicators = new Map(); // Track active indicators by source ID
        this.maxIndicators = 8;      // Maximum simultaneous indicators
        this.minAngleDifference = 15; // Minimum degrees between indicators
        this.damageTypes = {
            'bullet': { className: 'rift-damage-indicator--bullet', duration: 1000 },
            'explosive': { className: 'rift-damage-indicator--explosive', duration: 1500 },
            'melee': { className: 'rift-damage-indicator--melee', duration: 800 }
        };
    }
    
    init() {
        this.container = DOMFactory.createContainer('damage-indicators', {
            className: 'rift-damage-indicators',
            parent: this.parentElement
        });
        
        this.registerEvents({
            'player:damaged': this._onPlayerDamaged
        });
    }
    
    _onPlayerDamaged(event) {
        const { source, damage, direction, damageType = 'bullet', sourceId } = event;
        
        // Calculate positioning and intensity
        const angle = this._calculateAngle(direction);
        const intensity = this._calculateIntensity(damage);
        const distance = this._calculateDistance(source.position);
        
        // Create or update indicator
        this._addOrUpdateIndicator(sourceId, angle, intensity, damageType, distance);
    }
    
    _addOrUpdateIndicator(sourceId, angle, intensity, type, distance) {
        // Implementation for creating/updating indicators
    }
    
    // Animation, angle calculation, and cleanup methods
}
```

#### CSS Enhancements
```css
.rift-damage-indicator {
    --indicator-intensity: 1;
    --indicator-distance: 1;
    opacity: calc(var(--indicator-intensity) * var(--indicator-base-opacity));
    transform: scale(calc(var(--indicator-intensity) * 0.8 + 0.2));
}

.rift-damage-indicator--bullet {
    --indicator-color: var(--rift-damage-bullet);
    --indicator-base-opacity: 0.85;
    /* Bullet-specific styles */
}

.rift-damage-indicator--explosive {
    --indicator-color: var(--rift-damage-explosive);
    --indicator-base-opacity: 0.95;
    /* Explosive-specific styles */
}

.rift-damage-indicator--melee {
    --indicator-color: var(--rift-damage-melee);
    --indicator-base-opacity: 0.9;
    /* Melee-specific styles */
}

/* Distance representation */
.rift-damage-indicator[data-distance="close"] {
    --indicator-distance: 1.2;
}

.rift-damage-indicator[data-distance="medium"] {
    --indicator-distance: 1.0;
}

.rift-damage-indicator[data-distance="far"] {
    --indicator-distance: 0.8;
}
```

### 2. Enhanced Hit Indicators

#### Current Implementation
The current `HitIndicator` system shows a simple crosshair hit marker when the player damages an enemy.

#### Enhancements
- **Hit Type Differentiation**: Distinct visual feedback for body shots, critical hits, headshots, and kills
- **Hit Confirmation Animation**: More dynamic animation sequence for hit registration
- **Damage Feedback**: Visual scaling based on damage amount
- **Kill Confirmation**: Special kill indicator with more pronounced visual feedback
- **Multi-Kill Recognition**: Enhanced feedback for rapid successive kills
- **Enemy Type Indicators**: Different hit markers for different enemy types

#### Technical Approach
```javascript
class EnhancedHitIndicator extends UIComponent {
    constructor(options = {}) {
        super(options);
        this.hitMarkers = new Map();
        this.hitTypes = {
            'normal': { className: 'rift-hit-marker--normal', duration: 300 },
            'critical': { className: 'rift-hit-marker--critical', duration: 400 },
            'headshot': { className: 'rift-hit-marker--headshot', duration: 500 },
            'kill': { className: 'rift-hit-marker--kill', duration: 700 },
        };
        this.killCounter = {
            count: 0,
            resetTimer: null,
            lastKillTime: 0
        };
    }
    
    init() {
        this.container = DOMFactory.createContainer('hit-indicators', {
            className: 'rift-hit-indicators',
            parent: this.parentElement
        });
        
        this.registerEvents({
            'hit:registered': this._onHitRegistered,
            'hit:critical': this._onCriticalHit,
            'hit:headshot': this._onHeadshotHit,
            'enemy:killed': this._onEnemyKilled
        });
    }
    
    _onHitRegistered(event) {
        const { damage, enemyType } = event;
        this._showHitMarker('normal', damage, enemyType);
    }
    
    _onCriticalHit(event) {
        const { damage, enemyType } = event;
        this._showHitMarker('critical', damage, enemyType);
    }
    
    _onHeadshotHit(event) {
        const { damage, enemyType } = event;
        this._showHitMarker('headshot', damage, enemyType);
    }
    
    _onEnemyKilled(event) {
        const { enemyType } = event;
        this._showHitMarker('kill', null, enemyType);
        this._processMultiKill();
    }
    
    _showHitMarker(type, damage, enemyType) {
        // Implementation for displaying hit markers
    }
    
    _processMultiKill() {
        const now = performance.now();
        const timeSinceLastKill = now - this.killCounter.lastKillTime;
        
        if (timeSinceLastKill < 1500) { // 1.5 seconds between kills for multi-kill
            this.killCounter.count++;
            
            // Clear existing timer
            if (this.killCounter.resetTimer) {
                clearTimeout(this.killCounter.resetTimer);
            }
            
            // Show multi-kill feedback if applicable
            if (this.killCounter.count >= 2) {
                this._showMultiKillFeedback(this.killCounter.count);
            }
        } else {
            this.killCounter.count = 1;
        }
        
        // Update last kill time
        this.killCounter.lastKillTime = now;
        
        // Set timer to reset counter
        this.killCounter.resetTimer = setTimeout(() => {
            this.killCounter.count = 0;
        }, 2000);
    }
    
    _showMultiKillFeedback(count) {
        // Implementation for multi-kill feedback
    }
}
```

#### CSS Enhancements
```css
.rift-hit-marker {
    --hit-intensity: 1;
    --hit-scale: 1;
    opacity: calc(var(--hit-intensity) * var(--hit-base-opacity));
    transform: scale(calc(var(--hit-scale) * var(--hit-base-scale)));
    transition: transform 0.1s var(--rift-easing-snap), opacity 0.3s var(--rift-easing-out);
}

.rift-hit-marker--normal {
    --hit-color: var(--rift-hit-normal);
    --hit-base-opacity: 0.9;
    --hit-base-scale: 0.9;
}

.rift-hit-marker--critical {
    --hit-color: var(--rift-hit-critical);
    --hit-base-opacity: 0.95;
    --hit-base-scale: 1.1;
}

.rift-hit-marker--headshot {
    --hit-color: var(--rift-hit-headshot);
    --hit-base-opacity: 1;
    --hit-base-scale: 1.15;
}

.rift-hit-marker--kill {
    --hit-color: var(--rift-hit-kill);
    --hit-base-opacity: 1;
    --hit-base-scale: 1.3;
    animation: rift-hit-kill 0.6s var(--rift-easing-elastic);
}

/* Multi-kill indicator */
.rift-multi-kill {
    --multi-kill-scale: 1;
    transform: scale(var(--multi-kill-scale));
    animation: rift-multi-kill 0.8s var(--rift-easing-elastic);
}

@keyframes rift-hit-kill {
    0% { transform: scale(0.8); }
    50% { transform: scale(1.5); }
    100% { transform: scale(1); }
}

@keyframes rift-multi-kill {
    0% { transform: scale(0.8); opacity: 0; }
    20% { transform: scale(1.3); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
}
```

### 3. Dynamic Crosshair System

#### Current Implementation
The current `CrosshairSystem` has basic weapon-specific crosshairs with limited dynamic behavior.

#### Enhancements
- **Dynamic Spread Visualization**: Crosshair spread accurately reflects weapon accuracy in real-time
- **Contextual Crosshair Color**: Color changes based on target type (friendly, enemy, neutral)
- **Contextual Crosshair Shape**: Shape changes based on context (e.g., over interactive object)
- **Weapon State Integration**: Visual feedback for weapon state (reloading, overheating)
- **Hitbox Feedback**: Subtle indication of potential critical/headshot when aiming at vulnerable areas
- **Layered Crosshair Elements**: Composite crosshair with independent animated elements

#### Technical Approach
```javascript
class DynamicCrosshairSystem extends UIComponent {
    constructor(options = {}) {
        super(options);
        this.spreadFactor = 1.0;
        this.baseSpread = 0;
        this.maxSpread = 100;
        this.currentState = 'default';
        this.currentTarget = null;
        this.weaponState = 'ready';
        this.lastShotTime = 0;
        this.layers = {};
    }
    
    init() {
        this.container = DOMFactory.createContainer('crosshair', {
            className: 'rift-crosshair',
            parent: this.parentElement
        });
        
        this._createCrosshairLayers();
        
        this.registerEvents({
            'weapon:fired': this._onWeaponFired,
            'weapon:reload': this._onWeaponReload,
            'weapon:ready': this._onWeaponReady,
            'weapon:switch': this._onWeaponSwitch,
            'target:change': this._onTargetChange,
            'player:movement': this._onPlayerMovement,
            'player:stance': this._onPlayerStance,
            'input:mousemove': this._onMouseMove
        });
    }
    
    _createCrosshairLayers() {
        const layerTypes = ['base', 'spread', 'center', 'hitmarker', 'context'];
        
        layerTypes.forEach(type => {
            this.layers[type] = DOMFactory.createElement('div', {
                className: `rift-crosshair__layer rift-crosshair__layer--${type}`,
                parent: this.container
            });
            
            // Create specific crosshair elements for each layer
            if (type === 'spread') {
                // Create spread indicators
                ['top', 'right', 'bottom', 'left'].forEach(direction => {
                    DOMFactory.createElement('div', {
                        className: `rift-crosshair__spread rift-crosshair__spread--${direction}`,
                        parent: this.layers[type]
                    });
                });
            } else if (type === 'center') {
                DOMFactory.createElement('div', {
                    className: 'rift-crosshair__center',
                    parent: this.layers[type]
                });
            }
        });
    }
    
    update(delta) {
        this._updateSpread(delta);
        this._updateCrosshairState();
    }
    
    _updateSpread(delta) {
        // Gradually reduce spread over time
        const spreadRecoveryRate = 0.2; // Per second
        this.spreadFactor = Math.max(1.0, this.spreadFactor - (spreadRecoveryRate * delta));
        this._applyCrosshairSpread();
    }
    
    _onWeaponFired(event) {
        const { weapon } = event;
        const now = performance.now();
        const timeSinceLastShot = now - this.lastShotTime;
        
        // Increase spread based on weapon and fire rate
        const spreadIncrease = this._calculateSpreadIncrease(weapon, timeSinceLastShot);
        this.spreadFactor += spreadIncrease;
        
        // Cap spread factor
        this.spreadFactor = Math.min(5.0, this.spreadFactor);
        
        // Update last shot time
        this.lastShotTime = now;
        
        // Apply spread immediately
        this._applyCrosshairSpread();
    }
    
    _onTargetChange(event) {
        const { target } = event;
        this.currentTarget = target;
        
        // Update crosshair based on target type
        if (target) {
            if (target.type === 'enemy') {
                this._setCrosshairState('enemy', target);
            } else if (target.type === 'friendly') {
                this._setCrosshairState('friendly', target);
            } else if (target.type === 'interactive') {
                this._setCrosshairState('interactive', target);
            } else {
                this._setCrosshairState('default');
            }
            
            // Check for potential critical hit zones
            if (target.critZone && target.critZone.isTargeted) {
                this._showCriticalHitPotential(target.critZone.type);
            }
        } else {
            this._setCrosshairState('default');
        }
    }
    
    _applyCrosshairSpread() {
        const spreadElements = this.container.querySelectorAll('.rift-crosshair__spread');
        const currentSpread = this.baseSpread + (this.maxSpread - this.baseSpread) * (this.spreadFactor - 1) / 4;
        
        // Update CSS variables for spread
        this.container.style.setProperty('--crosshair-spread', `${currentSpread}px`);
    }
    
    _setCrosshairState(state, target = null) {
        // Update classList to reflect state
        this.container.classList.remove(
            'rift-crosshair--default',
            'rift-crosshair--enemy',
            'rift-crosshair--friendly',
            'rift-crosshair--interactive'
        );
        
        this.container.classList.add(`rift-crosshair--${state}`);
        this.currentState = state;
        
        // Update context hint if applicable
        if (state === 'interactive' && target && target.action) {
            this._showContextHint(target.action);
        } else {
            this._hideContextHint();
        }
    }
    
    _showCriticalHitPotential(zoneType) {
        this.container.classList.add('rift-crosshair--critical-potential');
        this.container.setAttribute('data-crit-zone', zoneType);
    }
    
    _showContextHint(action) {
        // Implementation for showing context hints
    }
}
```

#### CSS Enhancements
```css
.rift-crosshair {
    --crosshair-color: var(--rift-crosshair-default);
    --crosshair-size: var(--rift-crosshair-size);
    --crosshair-thickness: var(--rift-crosshair-thickness);
    --crosshair-spread: 0px;
    --crosshair-opacity: 1;
    
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: var(--crosshair-size);
    height: var(--crosshair-size);
    transition: --crosshair-spread 0.1s var(--rift-easing-out);
    pointer-events: none;
}

/* State-specific styles */
.rift-crosshair--default {
    --crosshair-color: var(--rift-crosshair-default);
}

.rift-crosshair--enemy {
    --crosshair-color: var(--rift-crosshair-enemy);
}

.rift-crosshair--friendly {
    --crosshair-color: var(--rift-crosshair-friendly);
}

.rift-crosshair--interactive {
    --crosshair-color: var(--rift-crosshair-interactive);
}

/* Critical potential indicator */
.rift-crosshair--critical-potential {
    --crosshair-critical-glow: 0 0 8px var(--rift-hit-critical);
}

.rift-crosshair--critical-potential .rift-crosshair__center {
    box-shadow: var(--crosshair-critical-glow);
}

/* Spread indicators */
.rift-crosshair__spread {
    position: absolute;
    background-color: var(--crosshair-color);
    width: var(--crosshair-thickness);
    height: var(--crosshair-thickness);
    opacity: var(--crosshair-opacity);
    transition: transform 0.1s var(--rift-easing-out);
}

.rift-crosshair__spread--top {
    top: 0;
    left: 50%;
    transform: translate(-50%, calc(-1 * var(--crosshair-spread)));
}

.rift-crosshair__spread--right {
    top: 50%;
    right: 0;
    transform: translate(var(--crosshair-spread), -50%);
}

.rift-crosshair__spread--bottom {
    bottom: 0;
    left: 50%;
    transform: translate(-50%, var(--crosshair-spread));
}

.rift-crosshair__spread--left {
    top: 50%;
    left: 0;
    transform: translate(calc(-1 * var(--crosshair-spread)), -50%);
}

/* Center dot */
.rift-crosshair__center {
    position: absolute;
    top: 50%;
    left: 50%;
    width: calc(var(--crosshair-thickness) * 1.5);
    height: calc(var(--crosshair-thickness) * 1.5);
    background-color: var(--crosshair-color);
    transform: translate(-50%, -50%);
    border-radius: 50%;
}

/* Weapon state indicators */
.rift-crosshair--reloading .rift-crosshair__layer--base {
    animation: rift-crosshair-reload 2s linear;
}

@keyframes rift-crosshair-reload {
    0% { opacity: 0.5; transform: rotate(0deg); }
    100% { opacity: 1; transform: rotate(360deg); }
}
```

### 4. Advanced Screen Effects System

#### Current Implementation
The current `ScreenEffects` system has basic damage flash, healing glow, and screen shake effects.

#### Enhancements
- **Impact Direction**: Screen shake effects reflect direction of impact
- **Variable Intensity**: Effect intensity scales based on damage amount and type
- **Multi-Layer Effects**: Combined vignette, color shift, blur, and distortion effects
- **Performance Optimized**: Hardware-accelerated animations with fallbacks
- **Damage Visualization**: Enhanced visual representation of damage received
- **Recovery Feedback**: More dynamic healing and recovery visualization
- **Special Effects**: Specialized effects for critical states and powerups

#### Technical Approach
```javascript
class AdvancedScreenEffects extends UIComponent {
    constructor(options = {}) {
        super(options);
        this.activeEffects = new Map();
        this.shakeDuration = 0;
        this.shakeIntensity = 0;
        this.shakeDirection = { x: 0, y: 0 };
        this.vignetteIntensity = 0;
        this.lastFrameTime = 0;
    }
    
    init() {
        // Create layers for different effect types
        this.container = DOMFactory.createContainer('screen-effects', {
            className: 'rift-screen-effects',
            parent: this.parentElement
        });
        
        // Create individual effect layers
        this.layers = {
            vignette: this._createLayer('vignette'),
            flash: this._createLayer('flash'),
            color: this._createLayer('color'),
            distortion: this._createLayer('distortion'),
            overlay: this._createLayer('overlay')
        };
        
        this.registerEvents({
            'player:damaged': this._onPlayerDamaged,
            'player:healed': this._onPlayerHealed,
            'player:critical': this._onPlayerCritical,
            'explosion:nearby': this._onExplosionNearby,
            'powerup:activated': this._onPowerupActivated,
            'environment:effect': this._onEnvironmentEffect
        });
    }
    
    _createLayer(type) {
        return DOMFactory.createElement('div', {
            className: `rift-screen-effects__layer rift-screen-effects__layer--${type}`,
            parent: this.container
        });
    }
    
    update(delta) {
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
    }
    
    _onPlayerDamaged(event) {
        const { damage, direction, damageType } = event;
        
        // Calculate effect intensity based on damage amount
        const intensity = Math.min(1, damage / 100); // Normalize to 0-1 range
        
        // Show damage flash
        this._showDamageFlash(intensity, damageType);
        
        // Apply screen shake based on damage and direction
        this._applyScreenShake(intensity * 0.5, direction, damageType);
        
        // Update vignette effect based on player health
        if (event.currentHealth && event.maxHealth) {
            const healthPercent = event.currentHealth / event.maxHealth;
            this._updateHealthVignette(healthPercent);
        }
    }
    
    _showDamageFlash(intensity, damageType) {
        const flashLayer = this.layers.flash;
        
        // Set appropriate color based on damage type
        let flashColor;
        switch(damageType) {
            case 'fire':
                flashColor = 'var(--rift-damage-fire)';
                break;
            case 'explosive':
                flashColor = 'var(--rift-damage-explosive)';
                break;
            default:
                flashColor = 'var(--rift-damage-default)';
        }
        
        // Set CSS properties
        flashLayer.style.setProperty('--flash-color', flashColor);
        flashLayer.style.setProperty('--flash-intensity', intensity);
        
        // Apply flash class and remove after animation completes
        flashLayer.classList.add('rift-screen-effects__flash--active');
        
        // Clear any existing timeout
        if (this.flashTimeout) {
            clearTimeout(this.flashTimeout);
        }
        
        // Set timeout to remove flash
        this.flashTimeout = setTimeout(() => {
            flashLayer.classList.remove('rift-screen-effects__flash--active');
        }, 300 + intensity * 200); // Longer flash for higher intensity
    }
    
    _applyScreenShake(intensity, direction, damageType) {
        // Set shake parameters
        this.shakeDuration = 0.3 + intensity * 0.5; // 0.3-0.8 seconds
        this.shakeIntensity = intensity * 30; // 0-30px
        
        // Normalize direction if provided
        if (direction && (direction.x !== undefined || direction.y !== undefined)) {
            const magnitude = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
            
            if (magnitude > 0) {
                this.shakeDirection = {
                    x: direction.x / magnitude,
                    y: direction.y / magnitude
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
        
        // Modify shake parameters based on damage type
        if (damageType === 'explosive') {
            this.shakeDuration *= 1.5;
            this.shakeIntensity *= 1.3;
        }
    }
    
    _updateScreenShake(delta) {
        if (this.shakeDuration <= 0) return;
        
        this.shakeDuration -= delta;
        
        // Calculate current intensity with decay
        const progress = Math.max(0, this.shakeDuration) / 0.8; // Normalize to 0-1
        const currentIntensity = this.shakeIntensity * progress * progress; // Quadratic falloff
        
        if (currentIntensity > 0.5) {
            // Calculate shake offset based on direction and perlin noise
            const time = performance.now() * 0.01;
            const noiseX = this._perlinNoise(time, 0) * 2 - 1;
            const noiseY = this._perlinNoise(0, time) * 2 - 1;
            
            const offsetX = (noiseX * 0.6 + this.shakeDirection.x * 0.4) * currentIntensity;
            const offsetY = (noiseY * 0.6 + this.shakeDirection.y * 0.4) * currentIntensity;
            
            // Apply transform to container
            this.container.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        } else {
            this.container.style.transform = '';
        }
    }
    
    _updateHealthVignette(healthPercent) {
        // Update vignette intensity based on health
        const threshold = 0.5; // Start showing vignette at 50% health
        
        if (healthPercent < threshold) {
            const normalizedHealth = healthPercent / threshold; // 0-1 range where 0 = 0% health, 1 = threshold health
            this.vignetteIntensity = 1 - normalizedHealth;
            
            // Update vignette visuals
            this.layers.vignette.style.setProperty('--vignette-intensity', this.vignetteIntensity);
            this.layers.vignette.classList.add('rift-screen-effects__vignette--active');
            
            // Add heartbeat effect if health is very low
            if (healthPercent < 0.25) {
                this.layers.vignette.classList.add('rift-screen-effects__vignette--pulse');
            } else {
                this.layers.vignette.classList.remove('rift-screen-effects__vignette--pulse');
            }
        } else {
            this.vignetteIntensity = 0;
            this.layers.vignette.classList.remove('rift-screen-effects__vignette--active', 'rift-screen-effects__vignette--pulse');
        }
    }
    
    // Math utility for screen shake
    _perlinNoise(x, y) {
        // Simple perlin noise implementation
        // In a real implementation, use a proper perlin noise function or library
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const xf = x - Math.floor(x);
        const yf = y - Math.floor(y);
        
        // Just for demo - not actual perlin noise
        return (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
    }
}
```

#### CSS Enhancements
```css
.rift-screen-effects {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: var(--rift-z-index-screen-effects);
    transition: transform 0.1s linear;
}

.rift-screen-effects__layer {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    opacity: 0;
    transition: opacity 0.3s var(--rift-easing-out);
}

/* Damage flash */
.rift-screen-effects__layer--flash {
    --flash-color: var(--rift-damage-default);
    --flash-intensity: 0;
    background: var(--flash-color);
    opacity: 0;
    transition: opacity 0.1s ease-in, background-color 0.1s ease;
}

.rift-screen-effects__flash--active {
    opacity: calc(var(--flash-intensity) * 0.7);
    animation: rift-flash 0.3s ease-out;
}

/* Vignette */
.rift-screen-effects__layer--vignette {
    --vignette-intensity: 0;
    --vignette-color: var(--rift-damage-vignette);
    background: radial-gradient(
        circle at center,
        transparent 30%,
        rgba(var(--vignette-color-rgb), calc(var(--vignette-intensity) * 0.8)) 80%,
        rgba(var(--vignette-color-rgb), calc(var(--vignette-intensity) * 0.95)) 100%
    );
    opacity: 0;
    transition: opacity 0.5s ease;
}

.rift-screen-effects__vignette--active {
    opacity: 1;
}

.rift-screen-effects__vignette--pulse {
    animation: rift-vignette-pulse 1.5s ease-in-out infinite;
}

/* Animations */
@keyframes rift-flash {
    0% { opacity: calc(var(--flash-intensity) * 0.7); }
    100% { opacity: 0; }
}

@keyframes rift-vignette-pulse {
    0% { opacity: calc(0.7 * var(--vignette-intensity)); }
    50% { opacity: var(--vignette-intensity); }
    100% { opacity: calc(0.7 * var(--vignette-intensity)); }
}
