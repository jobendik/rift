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
import HitIndicator from './HitIndicator.js';
import DamageIndicator from './DamageIndicator.js';
import { EnhancedDamageIndicator } from './EnhancedDamageIndicator.js';
import { EnhancedHitIndicator } from './EnhancedHitIndicator.js';
import { DynamicCrosshairSystem } from './DynamicCrosshairSystem.js';
import DamageNumbers from './DamageNumbers.js';
import ScreenEffects from './ScreenEffects.js';
import FootstepIndicator from './FootstepIndicator.js';

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
            ...options
        });

        this.world = world;
        this.config = this.config.combat || {};

        // Component references
        this.hitIndicator = null;
        this.enhancedHitIndicator = null;
        this.damageIndicator = null;
        this.enhancedDamageIndicator = null;
        this.dynamicCrosshair = null;
        this.damageNumbers = null;
        
        // Screen effects for damage, healing, etc.
        this.screenEffects = null;
        
        // Footstep indicator for situational awareness
        this.footstepIndicator = null;
    }

    /**
     * Initialize the combat system component and all subcomponents
     */
    init() {
        // Create main container if it doesn't exist
        if (!this.element) {
            this._createRootElement();
        }
        
        // Initialize components
        this._initComponents();
        
        // Register event handlers
        this.registerEvents({
            'game:paused': () => this._onGamePaused(),
            'game:resumed': () => this._onGameResumed()
        });
        
        this.isInitialized = true;
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
        if (this.screenEffects) this.screenEffects.update(delta);
        
        // Update footstep indicator
        if (this.footstepIndicator) this.footstepIndicator.update(delta);
        
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
        
        // Dispose footstep indicator
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
        // Check if enhanced hit indicator is enabled in UIConfig
        const useEnhancedHit = UIConfig.enhancedCombat && UIConfig.enhancedCombat.hitIndicator;
        
        if (useEnhancedHit) {
            // Initialize enhanced hit indicator
            this.enhancedHitIndicator = new EnhancedHitIndicator({
                container: this.element
                // Config is loaded from UIConfig.enhancedCombat.hitIndicator in the component itself
            });
            this.enhancedHitIndicator.init();
            this.addChild(this.enhancedHitIndicator);
        } else {
            // Initialize legacy hit indicator
            this.hitIndicator = new HitIndicator({
                container: this.element,
                hitDuration: this.config.hitDuration || 500,
                directionDuration: this.config.directionDuration || 800,
                killDuration: this.config.killDuration || 1000
            });
            this.hitIndicator.init();
            this.addChild(this.hitIndicator);
        }
        
        // Check if enhanced combat feedback is enabled in UIConfig
        const useEnhancedDamage = UIConfig.enhancedCombat && UIConfig.enhancedCombat.damageIndicator;
        
        if (useEnhancedDamage) {
            // Initialize enhanced damage indicator
            this.enhancedDamageIndicator = new EnhancedDamageIndicator({
                container: this.element
                // Config is loaded from UIConfig.enhancedCombat.damageIndicator in the component itself
            });
            this.enhancedDamageIndicator.init();
            this.addChild(this.enhancedDamageIndicator);
        } else {
            // Initialize legacy damage indicator
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
        const useEnhancedCrosshair = UIConfig.enhancedCombat && UIConfig.enhancedCombat.crosshair;
        
        if (useEnhancedCrosshair) {
            // Initialize dynamic crosshair system
            this.dynamicCrosshair = new DynamicCrosshairSystem({
                container: this.element
                // Config is loaded from UIConfig.enhancedCombat.crosshair in the component itself
            });
            this.dynamicCrosshair.init();
            this.addChild(this.dynamicCrosshair);
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
        
        // Initialize screen effects
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
        
        // Initialize footstep indicator
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
        if (this.screenEffects) this.screenEffects.clearAllEffects();
        
        // Clear footstep indicators
        if (this.footstepIndicator) this.footstepIndicator.clearAllIndicators();
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
            
            console.log(`Enhanced damage indicator test: ${damageAmount} ${damageType} damage from ${damageAngle}°`);
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
            
            console.log(`Damage indicator test: ${damageAmount} damage from ${damageAngle}°`);
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
     */
    testScreenEffects(effectType = 'damage', intensity = 'medium') {
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
        if (!this.footstepIndicator) return;
        
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
            isEnemy: isEnemy,
            count: count
        };
        
        // Show the footstep indicator
        this.footstepIndicator.showFootstepFrom(footstepData);
        
        console.log(`Footstep indicator test: ${isEnemy ? 'Enemy' : 'Friendly'} footstep from ${footstepAngle}° at distance ${distance}, count: ${count}`);
    }
}

export default CombatSystem;
