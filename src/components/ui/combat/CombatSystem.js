/**
 * CombatSystem Component
 *
 * Coordinates all combat feedback-related UI components:
 * - Hit indicators
 * - Damage indicators
 * - Damage numbers
 * - Screen effects
 * - Footstep indicators
 * 
 * Acts as a central manager for combat visual feedback, similar to how
 * HUDSystem manages HUD components.
 *
 * @extends UIComponent
 */

import UIComponent from '../UIComponent.js';
import { UIConfig } from '../../../core/UIConfig.js';
import { HitIndicator } from './HitIndicator.js';
import { DamageIndicator } from './DamageIndicator.js';
import { EnhancedDamageIndicator } from './EnhancedDamageIndicator.js';
import { EnhancedHitIndicator } from './EnhancedHitIndicator.js';
import { DynamicCrosshairSystem } from './DynamicCrosshairSystem.js';
import { DamageNumbers } from './DamageNumbers.js';
import { ScreenEffects } from './ScreenEffects.js';
import { AdvancedScreenEffects } from './AdvancedScreenEffects.js';
import FootstepIndicator from './FootstepIndicator.js';
import EnhancedFootstepIndicator from './EnhancedFootstepIndicator.js';

class CombatSystem extends UIComponent {
    /**
     * Create a new CombatSystem component
     * 
     * @param {Object} world - The game world object
     * @param {Object} options - Component configuration options
     */
    constructor(world, options = {}) {
        super({
            id: options.id || 'combat-system',
            className: 'rift-combat-system',
            container: options.container || document.body,
            autoInit: false,
            ...options
        });        this.world = world;
        this.config = UIConfig;

        // Component references
        this.hitIndicator = null;
        this.enhancedHitIndicator = null;
        this.damageIndicator = null;
        this.enhancedDamageIndicator = null;
        this.dynamicCrosshair = null;
        this.damageNumbers = null;
        
        // Screen effects for damage, healing, etc.
        this.screenEffects = null;
        this.advancedScreenEffects = null;
        
        // Footstep indicator for situational awareness
        this.footstepIndicator = null;
        this.enhancedFootstepIndicator = null;
    }

    /**
     * Initialize the combat system component and all subcomponents
     */
    init() {
        if (this.isInitialized) return this;
        
        // Call parent init first to properly set up the component
        super.init();
        
        this.isInitialized = true;
        
        // Initialize components
        this._initComponents();
        
        // Register event handlers
        this.registerEvents({
            'game:paused': () => this._onGamePaused(),
            'game:resumed': () => this._onGameResumed()
        });
        
        return this;
    }

    /**
     * Update the combat system and all subcomponents
     * 
     * @param {number} delta - Time since last update in ms
     */
    update(delta) {
        if (!this.isActive || !this.isVisible || !this.world) return;

        // Update components
        if (this.hitIndicator) this.hitIndicator.update(delta);
        if (this.enhancedHitIndicator) this.enhancedHitIndicator.update(delta);
        if (this.damageIndicator) this.damageIndicator.update(delta);
        if (this.enhancedDamageIndicator) this.enhancedDamageIndicator.update(delta);
        if (this.dynamicCrosshair) this.dynamicCrosshair.update(delta);
        if (this.damageNumbers) this.damageNumbers.update(delta);
        
        // Update screen effects
        if (this.advancedScreenEffects) {
            this.advancedScreenEffects.update(delta);
        } else if (this.screenEffects) {
            this.screenEffects.update(delta);
        }
        
        // Update footstep indicator
        if (this.enhancedFootstepIndicator) {
            this.enhancedFootstepIndicator.update(delta);
        } else if (this.footstepIndicator) {
            this.footstepIndicator.update(delta);
        }
        
        return this;
    }

    /**
     * Update the size of combat system components
     * 
     * @param {number} width - New width in pixels
     * @param {number} height - New height in pixels
     */
    setSize(width, height) {
        // Pass size updates to any components that need it
        // Most combat components are centered so they might not need resize logic
        
        return this;
    }

    /**
     * Clean up resources when disposing the component
     */
    dispose() {
        // Dispose children first
        if (this.hitIndicator) this.hitIndicator.dispose();
        if (this.enhancedHitIndicator) this.enhancedHitIndicator.dispose();
        if (this.damageIndicator) this.damageIndicator.dispose();
        if (this.enhancedDamageIndicator) this.enhancedDamageIndicator.dispose();
        if (this.dynamicCrosshair) this.dynamicCrosshair.dispose();
        if (this.damageNumbers) this.damageNumbers.dispose();
        
        // Dispose screen effects
        if (this.screenEffects) this.screenEffects.dispose();
        if (this.advancedScreenEffects) this.advancedScreenEffects.dispose();
        
        // Dispose footstep indicator
        if (this.enhancedFootstepIndicator) this.enhancedFootstepIndicator.dispose();
        if (this.footstepIndicator) this.footstepIndicator.dispose();
        
        // Call parent dispose method to handle unsubscribing events and DOM removal
        super.dispose();
        
        return this;
    }

    /**
     * Initialize combat feedback components
     * @private
     */
    _initComponents() {
        // Use enhancedHitIndicator by default for better performance with element pooling
        // Only fall back to legacy HitIndicator if explicitly disabled in config
        const useEnhancedHit = this.config.enhancedCombat?.hitIndicator !== false;
        
        if (useEnhancedHit) {
            // Initialize enhanced hit indicator with element pooling
            this.enhancedHitIndicator = new EnhancedHitIndicator({
                container: this.element,
                hitDuration: this.config.hitDuration || 500,
                directionDuration: this.config.directionDuration || 800,
                killDuration: this.config.killDuration || 1000,
                maxHitMarkers: this.config.enhancedCombat?.hitIndicator?.maxHitMarkers || 10,
                maxDirectionIndicators: this.config.enhancedCombat?.hitIndicator?.maxDirectionIndicators || 8
            });
            this.enhancedHitIndicator.init();
            this.addChild(this.enhancedHitIndicator);
        } else {
            // Initialize legacy hit indicator (only if enhanced version is explicitly disabled)
            console.warn('Using legacy HitIndicator. Consider enabling EnhancedHitIndicator for better performance.');
            this.hitIndicator = new HitIndicator({
                container: this.element,
                hitDuration: this.config.hitDuration || 500,
                directionDuration: this.config.directionDuration || 800,
                killDuration: this.config.killDuration || 1000
            });
            this.hitIndicator.init();
            this.addChild(this.hitIndicator);
        }
        
        // Use enhancedDamageIndicator by default for better performance with element pooling
        // Only fall back to legacy DamageIndicator if explicitly disabled in config
        const useEnhancedDamage = this.config.enhancedCombat?.damageIndicator !== false;
        
        if (useEnhancedDamage) {
            // Initialize enhanced damage indicator with element pooling
            this.enhancedDamageIndicator = new EnhancedDamageIndicator({
                container: this.element
                // Config is loaded from UIConfig in the component itself
            });
            this.enhancedDamageIndicator.init();
            this.addChild(this.enhancedDamageIndicator);
        } else {
            // Initialize legacy damage indicator (only if enhanced version is explicitly disabled)
            console.warn('Using legacy DamageIndicator. Consider enabling EnhancedDamageIndicator for better performance.');
            const damageConfig = this.config.damageIndicator || {};
            this.damageIndicator = new DamageIndicator({
                container: this.element,
                maxIndicators: damageConfig.maxIndicators || 8,
                baseDuration: damageConfig.baseDuration ? damageConfig.baseDuration * 1000 : 1200,
                minOpacity: damageConfig.minOpacity || 0.3,
                maxOpacity: damageConfig.maxOpacity || 0.9,
                indicatorWidth: damageConfig.indicatorWidth || 120
            });
            this.damageIndicator.init();
            this.addChild(this.damageIndicator);
        }
          // Check if enhanced crosshair system is enabled in UIConfig
        const useEnhancedCrosshair = this.config.enhancedCombat && this.config.enhancedCombat.crosshair;
        
        if (useEnhancedCrosshair) {
            console.log('[CombatSystem] Initializing enhanced crosshair system');
            // Initialize dynamic crosshair system
            this.dynamicCrosshair = new DynamicCrosshairSystem({
                container: this.element
                // Config is loaded from this.config.enhancedCombat.crosshair in the component itself
            });
            this.dynamicCrosshair.init();
            this.addChild(this.dynamicCrosshair);
            console.log('[CombatSystem] Enhanced crosshair system initialized:', this.dynamicCrosshair.isInitialized);
        } else {
            console.log('[CombatSystem] Enhanced crosshair not enabled in config');
        }
        
        // Initialize damage numbers
        const numbersConfig = this.config.damageNumbers || {};
        this.damageNumbers = new DamageNumbers({
            container: this.element,
            maxNumbers: numbersConfig.maxNumbers || 30,
            duration: numbersConfig.duration || 1500,
            stackThreshold: numbersConfig.stackThreshold || 300,
            riseDistance: numbersConfig.riseDistance || 30,
            stackLimit: numbersConfig.stackLimit || 5
        });
        this.damageNumbers.init();
        this.addChild(this.damageNumbers);
        
        // Check if enhanced screen effects are enabled in UIConfig
        const useAdvancedScreenEffects = this.config.enhancedCombat && this.config.enhancedCombat.screenEffects;
        
        if (useAdvancedScreenEffects) {
            // Initialize advanced screen effects
            this.advancedScreenEffects = new AdvancedScreenEffects({
                container: this.element
                // Config is loaded from this.config.enhancedCombat.screenEffects in the component itself
            });
            this.advancedScreenEffects.init();
            this.addChild(this.advancedScreenEffects);
        } else {
            // Initialize legacy screen effects
            const effectsConfig = this.config.screenEffects || {};
            this.screenEffects = new ScreenEffects({
                container: this.element,
                damageFlashDuration: effectsConfig.damageFlashDuration,
                healFlashDuration: effectsConfig.healFlashDuration,
                screenShakeDecay: effectsConfig.screenShakeDecay,
                screenShakeMultiplier: effectsConfig.screenShakeMultiplier
            });
            this.screenEffects.init();
            this.addChild(this.screenEffects);
        }
        
        // Use enhancedFootstepIndicator by default for better performance with element pooling
        // Only fall back to legacy FootstepIndicator if explicitly disabled in config
        const useEnhancedFootstep = this.config.enhancedCombat?.footstepIndicator !== false;
        
        if (useEnhancedFootstep) {
            // Initialize enhanced footstep indicator with element pooling
            const footstepConfig = this.config.footstepIndicator || {};
            this.enhancedFootstepIndicator = new EnhancedFootstepIndicator({
                container: this.element,
                maxIndicators: footstepConfig.maxIndicators || 8,
                baseDuration: footstepConfig.baseDuration ? footstepConfig.baseDuration * 1000 : 800,
                minOpacity: footstepConfig.minOpacity || 0.2,
                maxOpacity: footstepConfig.maxOpacity || 0.7,
                indicatorWidth: footstepConfig.indicatorWidth || 40,
                maxDistance: footstepConfig.maxDistance || 20,
                minDistance: footstepConfig.minDistance || 2
            });
            this.enhancedFootstepIndicator.init();
            this.addChild(this.enhancedFootstepIndicator);
        } else {
            // Initialize legacy footstep indicator (only if enhanced version is explicitly disabled)
            console.warn('Using legacy FootstepIndicator. Consider enabling EnhancedFootstepIndicator for better performance.');
            const footstepConfig = this.config.footstepIndicator || {};
            this.footstepIndicator = new FootstepIndicator({
                container: this.element,
                maxIndicators: footstepConfig.maxIndicators || 8,
                baseDuration: footstepConfig.baseDuration ? footstepConfig.baseDuration * 1000 : 800,
                minOpacity: footstepConfig.minOpacity || 0.2,
                maxOpacity: footstepConfig.maxOpacity || 0.7,
                indicatorWidth: footstepConfig.indicatorWidth || 40,
                maxDistance: footstepConfig.maxDistance || 20,
                minDistance: footstepConfig.minDistance || 2
            });
            this.footstepIndicator.init();
            this.addChild(this.footstepIndicator);
        }
    }

    /**
     * Handle game paused event
     * @private
     */
    _onGamePaused() {
        // Pause any ongoing animations or visual feedback
        if (this.hitIndicator) this.hitIndicator.clearAllIndicators();
        if (this.enhancedHitIndicator && typeof this.enhancedHitIndicator.clearAllIndicators === 'function') {
            this.enhancedHitIndicator.clearAllIndicators();
        }
        if (this.damageIndicator) this.damageIndicator.clearAllIndicators();
        if (this.enhancedDamageIndicator && typeof this.enhancedDamageIndicator.clearAllIndicators === 'function') {
            this.enhancedDamageIndicator.clearAllIndicators();
        }
        if (this.dynamicCrosshair) {
            // Reset crosshair to default state
            this.dynamicCrosshair._setCrosshairState('default');
            this.dynamicCrosshair.spreadFactor = 1.0;
            this.dynamicCrosshair._applyCrosshairSpread();
        }
        if (this.damageNumbers) this.damageNumbers.clearAllNumbers();
        
        // Clear screen effects
        if (this.advancedScreenEffects) {
            this.advancedScreenEffects.clearAllEffects();
        } else if (this.screenEffects) {
            this.screenEffects.clearAllEffects();
        }
        
        // Clear footstep indicators
        if (this.enhancedFootstepIndicator) {
            this.enhancedFootstepIndicator.clearAllIndicators();
        } else if (this.footstepIndicator) {
            this.footstepIndicator.clearAllIndicators();
        }
    }

    /**
     * Handle game resumed event
     * @private
     */
    _onGameResumed() {
        // Any resume-specific logic
    }

    /**
     * Test method for showing hit indicator
     * For development/debugging only
     * @public
     */
    testHitIndicator(type = 'normal') {
        // Check if we're using enhanced or regular hit indicators
        if (this.enhancedHitIndicator) {
            this.testEnhancedHitIndicator(type);
            return;
        }
        
        if (!this.hitIndicator) return;
        
        switch (type) {
            case 'critical':
                this.hitIndicator.showHitMarker({ isCritical: true });
                break;
            case 'headshot':
                this.hitIndicator.showHitMarker({ isHeadshot: true });
                break;
            case 'kill':
                this.hitIndicator.showKillConfirmation();
                break;
            case 'direction':
                const directions = ['top', 'right', 'bottom', 'left'];
                const randomDirection = directions[Math.floor(Math.random() * directions.length)];
                this.hitIndicator.showDamageDirection({ 
                    direction: randomDirection,
                    intensity: Math.random() * 0.5 + 0.5
                });
                break;
            default:
                this.hitIndicator.showHitMarker({});
                break;
        }
    }

    /**
     * Test method for showing dynamic crosshair features
     * For development/debugging only
     * @public
     * 
     * @param {string} feature - Feature to test ('spread', 'state', 'hit', 'critical', 'multikill')
     * @param {string} value - Value for the specific feature
     */
    testDynamicCrosshair(feature = 'spread', value = null) {
        if (!this.dynamicCrosshair) return;
        
        this.dynamicCrosshair.testCrosshair(feature, value);
    }

    /**
     * Test method for showing enhanced hit indicator
     * For development/debugging only
     * @public
     * 
     * @param {string} type - Type of hit marker ('normal', 'critical', 'headshot', 'kill', 'multi', 'sequence')
     * @param {number} damage - Optional damage amount to simulate
     * @param {string} multiKillType - Optional multi-kill type ('double', 'triple', 'quad', 'chain')
     */
    testEnhancedHitIndicator(type = 'normal', damage = null, multiKillType = null) {
        if (!this.enhancedHitIndicator) return;
        
        // Calculate a damage amount if not provided
        const damageAmount = damage !== null ? damage : Math.floor(Math.random() * 40) + 5;
        
        switch (type) {
            case 'normal':
                this.enhancedHitIndicator.testHitMarker('normal', damageAmount);
                break;
            case 'critical':
                this.enhancedHitIndicator.testHitMarker('critical', damageAmount * 1.5);
                break;
            case 'headshot':
                this.enhancedHitIndicator.testHitMarker('headshot', damageAmount * 2);
                break;
            case 'kill':
                this.enhancedHitIndicator.testHitMarker('kill', damageAmount);
                break;
            case 'multi':
                const multiTypes = ['double', 'triple', 'quad', 'chain'];
                const selectedType = multiKillType || multiTypes[Math.floor(Math.random() * multiTypes.length)];
                
                // Get kill count from type
                let multiKillCount = 2; // Default for double
                if (selectedType === 'triple') multiKillCount = 3;
                if (selectedType === 'quad') multiKillCount = 4;
                if (selectedType === 'chain') multiKillCount = 5 + Math.floor(Math.random() * 3); // 5-7 kills
                
                this.enhancedHitIndicator.testMultiKill(multiKillCount);
                break;
            case 'sequence':
                // Test a sequence of kills for multi-kill
                const sequenceKillCount = multiKillType ? parseInt(multiKillType) : 4;
                const interval = 500; // 500ms between kills
                
                this.enhancedHitIndicator.testKillSequence(sequenceKillCount, interval);
                break;
        }
        
        console.log(`Enhanced hit indicator test: ${type} hit with ${damageAmount} damage`);
    }
    
    /**
     * Test method for showing damage indicator
     * For development/debugging only
     * @public
     */
    testDamageIndicator(intensity = 'medium', angle = null, damageType = 'bullet') {
        // Check if we're using enhanced or regular damage indicators
        if (this.enhancedDamageIndicator) {
            // Generate a random angle if not provided (0-360 degrees)
            const damageAngle = angle !== null ? angle : Math.floor(Math.random() * 360);
            
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
            
            // Convert angle to direction vector (x,z for world coordinate system)
            const radians = (damageAngle * Math.PI) / 180;
            const direction = {
                x: Math.cos(radians),
                z: Math.sin(radians)
            };
            
            // Create a mock damage event
            const damageEvent = {
                source: {
                    position: {
                        x: direction.x * 10, // 10 units away in the direction
                        y: 0,
                        z: direction.z * 10
                    }
                },
                damage: damageAmount,
                direction: direction,
                damageType: damageType,
                sourceId: `test_${Date.now()}`
            };
            
            // Trigger the player damage event
            this.enhancedDamageIndicator._onPlayerDamaged(damageEvent);
            
            console.log(`Enhanced damage indicator test: ${damageAmount} ${damageType} damage from ${damageAngle}Â°`);
        } else if (this.damageIndicator) {
            // Use legacy damage indicator
            
            // Generate a random angle if not provided (0-360 degrees)
            const damageAngle = angle !== null ? angle : Math.floor(Math.random() * 360);
            
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
            
            // Show the damage indicator
            this.damageIndicator.showDamageFrom({
                angle: damageAngle,
                damage: damageAmount
            });
            
            console.log(`Damage indicator test: ${damageAmount} damage from ${damageAngle}Â°`);
        }
    }
    
    /**
     * Test method for showing damage numbers
     * For development/debugging only
     * @public
     * 
     * @param {string} type - Type of damage number ('normal', 'critical', 'headshot', 'kill', 'stacked')
     * @param {number} damage - Amount of damage
     */
    testDamageNumbers(type = 'normal', damage = null) {
        if (!this.damageNumbers) return;
        
        // Calculate a damage amount if not provided
        const damageAmount = damage !== null ? damage : Math.floor(Math.random() * 40) + 5;
        
        if (type === 'stacked') {
            // Show stacked damage (multiple hits)
            const hitCount = Math.floor(Math.random() * 5) + 2; // 2-6 hits
            this.damageNumbers.testStackedDamage(hitCount, damageAmount);
        } else {
            // Show single damage number
            this.damageNumbers.testDamageNumber(type, damageAmount);
        }
    }
    
    /**
     * Test method for screen effects
     * For development/debugging only
     * @public
     * 
     * @param {string} effectType - Type of screen effect ('damage', 'heal', 'shake', 'vignette', 'all')
     * @param {string} intensity - Effect intensity ('low', 'medium', 'high', 'critical')
     * @param {string} damageType - Type of damage ('default', 'bullet', 'explosive', 'fire', 'energy')
     */
    testScreenEffects(effectType = 'damage', intensity = 'medium', damageType = 'default') {
        // Check if we're using advanced or regular screen effects
        if (this.advancedScreenEffects) {
            this.testAdvancedScreenEffects(effectType, intensity, damageType);
            return;
        }
        
        if (!this.screenEffects) return;
        
        switch (effectType) {
            case 'damage':
                this.screenEffects.testDamageEffects(intensity);
                break;
            case 'heal':
                this.screenEffects.testHealEffect(intensity);
                break;
            case 'shake':
                this.screenEffects.testScreenShake(intensity);
                break;
            case 'vignette':
                // For vignette, interpret intensity as health percentage
                let healthPercent;
                switch (intensity) {
                    case 'low': healthPercent = 45; break;
                    case 'medium': healthPercent = 25; break;
                    case 'high': healthPercent = 12; break;
                    case 'critical': healthPercent = 5; break;
                    default: healthPercent = 25;
                }
                this.screenEffects.testVignette(healthPercent);
                break;
            case 'all':
                // Show all effects in sequence with slight delays
                this.screenEffects.testDamageEffects(intensity);
                
                setTimeout(() => {
                    this.screenEffects.testScreenShake(intensity);
                }, 300);
                
                setTimeout(() => {
                    // Map intensity to health percentage for vignette
                    let healthPercent;
                    switch (intensity) {
                        case 'low': healthPercent = 45; break;
                        case 'medium': healthPercent = 25; break;
                        case 'high': healthPercent = 12; break;
                        case 'critical': healthPercent = 5; break;
                        default: healthPercent = 25;
                    }
                    this.screenEffects.testVignette(healthPercent);
                }, 600);
                
                setTimeout(() => {
                    this.screenEffects.testHealEffect(intensity);
                }, 1500);
                break;
        }
        
        console.log(`Screen effects test: ${effectType} at ${intensity} intensity`);
    }
    
    /**
     * Test method for advanced screen effects
     * For development/debugging only
     * @public
     * 
     * @param {string} effectType - Type of screen effect ('damage', 'heal', 'stun', 'blind', 'explosion', 'radiation', 'fire', 'electrical', 'poison', 'water', 'powerup')
     * @param {string} intensity - Effect intensity ('low', 'medium', 'high', 'critical')
     * @param {string} damageType - Type of damage ('default', 'bullet', 'explosive', 'fire', 'energy')
     */
    testAdvancedScreenEffects(effectType = 'damage', intensity = 'medium', damageType = 'default') {
        if (!this.advancedScreenEffects) return;
        
        if (effectType === 'damage') {
            // Test damage effects with specific damage type
            this.advancedScreenEffects.testDamageEffects(intensity, damageType);
            
        } else if (effectType === 'powerup') {
            // Test powerup effects
            const powerupTypes = ['damage', 'speed', 'armor', 'invisible'];
            const type = damageType && powerupTypes.includes(damageType) ? damageType : 'damage';
            const duration = 5; // 5 seconds
            
            this.advancedScreenEffects.testPowerupEffect(type, duration);
            
        } else if (effectType === 'all') {
            // Show a sequence of different effects for demonstration
            const delays = [0, 2000, 4000, 6000, 8000, 10000, 12000];
            const effects = ['damage', 'heal', 'stun', 'explosion', 'fire', 'electrical', 'water'];
            
            effects.forEach((effect, index) => {
                setTimeout(() => {
                    this.advancedScreenEffects.testEffect(effect, intensity);
                }, delays[index]);
            });
            
        } else {
            // Test other effect types
            this.advancedScreenEffects.testEffect(effectType, intensity);
        }
        
        console.log(`Advanced screen effects test: ${effectType} at ${intensity} intensity with ${damageType} type`);
    }
    
    /**
     * Test method for footstep indicator
     * For development/debugging only
     * @public
     * 
     * @param {string} intensity - Effect intensity ('low', 'medium', 'high')
     * @param {number} angle - Direction angle in degrees (0-360), random if not provided
     * @param {boolean} isEnemy - Whether the footstep is from an enemy (true) or friendly (false)
     * @param {number} count - Number of footsteps in sequence (for continuous tracking)
     */
    testFootstepIndicator(intensity = 'medium', angle = null, isEnemy = true, count = 1) {
        // Check if we're using enhanced or regular footstep indicators
        if (this.enhancedFootstepIndicator) {
            // Generate a random angle if not provided (0-360 degrees)
            const footstepAngle = angle !== null ? angle : Math.floor(Math.random() * 360);
            
            // Map intensity string to distance values (close is more intense)
            let distance;
            switch (intensity) {
                case 'low':
                    distance = Math.floor(Math.random() * 5) + 15; // 15-19 units (far)
                    break;
                case 'medium':
                    distance = Math.floor(Math.random() * 5) + 8; // 8-12 units (medium)
                    break;
                case 'high':
                    distance = Math.floor(Math.random() * 3) + 2; // 2-4 units (close)
                    break;
                default:
                    distance = Math.floor(Math.random() * 10) + 5; // 5-14 units
            }
            
            // Check if we should show a sequence of footsteps
            if (count > 1) {
                this.enhancedFootstepIndicator.showFootstepSequence({
                    angle: footstepAngle,
                    distance: distance,
                    isFriendly: !isEnemy,
                    steps: count,
                    interval: 200
                });
            } else {
                // Show a single footstep
                this.enhancedFootstepIndicator.showFootstepsFrom({
                    angle: footstepAngle,
                    distance: distance,
                    isFriendly: !isEnemy
                });
            }
            
            console.log(`Enhanced footstep indicator test: ${isEnemy ? 'Enemy' : 'Friendly'} footstep from ${footstepAngle}° at distance ${distance}, count: ${count}`);
        } else if (this.footstepIndicator) {
            // Use legacy footstep indicator
            
            // Generate a random angle if not provided (0-360 degrees)
            const footstepAngle = angle !== null ? angle : Math.floor(Math.random() * 360);
            
            // Map intensity string to distance values (close is more intense)
            let distance;
            switch (intensity) {
                case 'low':
                    distance = Math.floor(Math.random() * 5) + 15; // 15-19 units (far)
                    break;
                case 'medium':
                    distance = Math.floor(Math.random() * 5) + 8; // 8-12 units (medium)
                    break;
                case 'high':
                    distance = Math.floor(Math.random() * 3) + 2; // 2-4 units (close)
                    break;
                default:
                    distance = Math.floor(Math.random() * 10) + 5; // 5-14 units
            }
            
            // Create footstep data
            const footstepData = {
                angle: footstepAngle,
                distance: distance,
                isFriendly: !isEnemy,
                count: count
            };
            
            // Show the footstep indicator
            this.footstepIndicator.showFootstepsFrom(footstepData);
            
            console.log(`Footstep indicator test: ${isEnemy ? 'Enemy' : 'Friendly'} footstep from ${footstepAngle}° at distance ${distance}, count: ${count}`);
        }
    }
}





export { CombatSystem };
