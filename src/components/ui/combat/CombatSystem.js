/**
 * CombatSystem Component
 *
 * Coordinates all combat feedback-related UI components:
 * - Hit indicators
 * - Damage indicators
 * - Damage numbers
 * - Screen effects
 * 
 * Acts as a central manager for combat visual feedback, similar to how
 * HUDSystem manages HUD components.
 *
 * @extends UIComponent
 */

import UIComponent from '../UIComponent.js';
import HitIndicator from './HitIndicator.js';
import DamageIndicator from './DamageIndicator.js';

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
        this.damageIndicator = null;
        
        // Future components
        // this.damageNumbers = null;
        // this.screenEffects = null;
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
        if (this.damageIndicator) this.damageIndicator.update(delta);
        
        // Update future components
        // if (this.damageNumbers) this.damageNumbers.update(delta);
        // if (this.screenEffects) this.screenEffects.update(delta);
        
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
        if (this.damageIndicator) this.damageIndicator.dispose();
        
        // Dispose future components
        // if (this.damageNumbers) this.damageNumbers.dispose();
        // if (this.screenEffects) this.screenEffects.dispose();
        
        // Call parent dispose method to handle unsubscribing events and DOM removal
        super.dispose();
        
        return this;
    }

    /**
     * Initialize combat feedback components
     * @private
     */
    _initComponents() {
        // Create Hit Indicator
        this.hitIndicator = new HitIndicator({
            container: this.element,
            hitDuration: this.config.hitDuration || 500,
            directionDuration: this.config.directionDuration || 800,
            killDuration: this.config.killDuration || 1000
        });
        this.hitIndicator.init();
        this.addChild(this.hitIndicator);
        
        // Initialize damage indicator
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
        
        // this.damageNumbers = new DamageNumbers({ container: this.element });
        // this.damageNumbers.init();
        // this.addChild(this.damageNumbers);
        
        // this.screenEffects = new ScreenEffects({ container: this.element });
        // this.screenEffects.init();
        // this.addChild(this.screenEffects);
    }

    /**
     * Handle game paused event
     * @private
     */
    _onGamePaused() {
        // Pause any ongoing animations or visual feedback
        if (this.hitIndicator) this.hitIndicator.clearAllIndicators();
        if (this.damageIndicator) this.damageIndicator.clearAllIndicators();
        
        // Handle future components
        // if (this.screenEffects) this.screenEffects.clearAll();
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
     * Test method for showing damage indicator
     * For development/debugging only
     * @public
     */
    testDamageIndicator(intensity = 'medium', angle = null) {
        if (!this.damageIndicator) return;
        
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

export default CombatSystem;
