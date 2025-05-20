/**
 * HUD system for managing all HUD components in the RIFT UI.
 * Acts as a container and coordinator for all heads-up display elements.
 * 
 * @author Cline
 */

import UIComponent from '../UIComponent.js';
import EventManager from '../../../core/EventManager.js';
import { DOMFactory } from '../../../utils/DOMFactory.js';
import HealthDisplay from './HealthDisplay.js';
import AmmoDisplay from './AmmoDisplay.js';
import CrosshairSystem from './CrosshairSystem.js';
import MinimapSystem from './MinimapSystem.js';
import StaminaSystem from './StaminaSystem.js';
import CompassDisplay from './CompassDisplay.js';

export class HUDSystem extends UIComponent {
    /**
     * Create a new HUD system
     * @param {Object} world - Reference to the game world
     * @param {Object} options - Component options
     */
    constructor(world, options = {}) {
        super({
            id: options.id || 'rift-hud-system',
            className: 'rift-hud',
            container: options.container || document.body,
            ...options
        });
        
        this.world = world;
        
        // Store HUD components
        this.components = {
            health: null,
            ammo: null,
            crosshair: null,
            compass: null,
            minimap: null,
            stamina: null
        };
        
        // Container elements for different screen regions
        this.containers = {
            topLeft: null,
            topCenter: null,
            topRight: null,
            centerLeft: null,
            center: null,
            centerRight: null,
            bottomLeft: null,
            bottomCenter: null,
            bottomRight: null
        };
        
        // Register events
        this.registerEvents({
            'ui:resize': this._onResize
        });
    }
    
    /**
     * Initialize the HUD system
     */
    init() {
        if (this.isInitialized) return this;
        
        // Call parent init to create root element
        super.init();
        
        // Create container regions
        this._createContainers();
        
        // Initialize components
        this._initComponents();
        
        console.log('[HUDSystem] Initialization complete');
        
        return this;
    }
    
    /**
     * Update all HUD components
     * @param {Number} delta - Time elapsed since last frame in seconds
     */
    update(delta) {
        if (!this.isInitialized || !this.isActive) return this;
        
        // Call parent update
        super.update(delta);
        
        // Update world data in components if needed
        this._updateComponentData();
        
        return this;
    }
    
    /**
     * Create container regions for HUD elements
     * @private
     */
    _createContainers() {
        // Create all container regions
        this.containers = {
            topLeft: this.createElement('div', {
                className: 'rift-hud__top-left'
            }),
            topCenter: this.createElement('div', {
                className: 'rift-hud__top-center'
            }),
            topRight: this.createElement('div', {
                className: 'rift-hud__top-right'
            }),
            centerLeft: this.createElement('div', {
                className: 'rift-hud__center-left'
            }),
            center: this.createElement('div', {
                className: 'rift-hud__center'
            }),
            centerRight: this.createElement('div', {
                className: 'rift-hud__center-right'
            }),
            bottomLeft: this.createElement('div', {
                className: 'rift-hud__bottom-left'
            }),
            bottomCenter: this.createElement('div', {
                className: 'rift-hud__bottom-center'
            }),
            bottomRight: this.createElement('div', {
                className: 'rift-hud__bottom-right'
            })
        };
    }
    
    /**
     * Initialize all HUD components
     * @private
     */
    _initComponents() {
        // Health display (bottom left)
        this.components.health = new HealthDisplay({
            container: this.containers.bottomLeft,
            showEffects: true
        });
        this.addChild(this.components.health);
        
        // Stamina system (bottom left, below health)
        this.components.stamina = new StaminaSystem({
            container: this.containers.bottomLeft,
            showEffects: true,
            showSprintIndicator: true
        });
        this.addChild(this.components.stamina);
        
        // Ammo display (bottom right)
        this.components.ammo = new AmmoDisplay({
            container: this.containers.bottomRight,
            showVisualizer: true
        });
        this.addChild(this.components.ammo);
        
        // Crosshair (center)
        this.components.crosshair = new CrosshairSystem({
            container: this.containers.center,
            showDot: true,
            dynamic: true,
            weaponType: 'rifle'
        });
        this.addChild(this.components.crosshair);
        
        // Minimap (top right)
        this.components.minimap = new MinimapSystem(this.world, {
            container: this.containers.topRight,
            size: 180,
            interactive: true,
            rotateWithPlayer: false
        });
        this.addChild(this.components.minimap);
        
        // Compass (top center)
        this.components.compass = new CompassDisplay({
            container: this.containers.topCenter,
            showDegrees: true,
            showCardinalMarkers: true
        });
        this.addChild(this.components.compass);
    }
    
    /**
     * Update components with latest world data
     * @private
     */
    _updateComponentData() {
        // Only update if world exists
        if (!this.world) return;
        
        
        // Update health if player exists
        if (this.world.player && this.components.health) {
            const playerHealth = this.world.player.health || 0;
            const maxHealth = this.world.player.maxHealth || 100;
            
            // Only update if different from current value to avoid unnecessary renders
            if (this.components.health.state.currentHealth !== playerHealth ||
                this.components.health.state.maxHealth !== maxHealth) {
                this.components.health.updateHealth(playerHealth);
                this.components.health.updateMaxHealth(maxHealth);
            }
        }
        
        // Update stamina if player exists
        if (this.world.player && this.components.stamina) {
            const playerStamina = this.world.player.stamina || 100;
            const maxStamina = this.world.player.maxStamina || 100;
            const isSprinting = this.world.player.isSprinting || false;
            
            // Only update if different from current value to avoid unnecessary renders
            if (this.components.stamina.state.currentStamina !== playerStamina ||
                this.components.stamina.state.maxStamina !== maxStamina) {
                this.components.stamina.updateStamina(playerStamina);
                this.components.stamina.updateMaxStamina(maxStamina);
            }
            
            // Update sprinting state if changed
            if (this.components.stamina.state.isSprinting !== isSprinting) {
                if (isSprinting) {
                    this.components.stamina.startSprint();
                } else {
                    this.components.stamina.endSprint();
                }
            }
        }
        
        // Update ammo if player has an active weapon
        if (this.world.player && this.world.player.activeWeapon && this.components.ammo) {
            const weapon = this.world.player.activeWeapon;
            const currentAmmo = weapon.currentAmmo || 0;
            const totalAmmo = weapon.totalAmmo || 0;
            const magSize = weapon.magazineSize || 1;
            const weaponType = weapon.type || 'rifle';
            
            // Only update if values have changed
            if (this.components.ammo.state.currentAmmo !== currentAmmo ||
                this.components.ammo.state.totalAmmo !== totalAmmo ||
                this.components.ammo.state.maxMagSize !== magSize ||
                this.components.ammo.state.weaponType !== weaponType) {
                
                this.components.ammo.updateAmmo(currentAmmo, false);
                this.components.ammo.updateTotalAmmo(totalAmmo);
                this.components.ammo.updateMagSize(magSize);
                this.components.ammo.updateWeaponType(weaponType);
            }
            
            // Update crosshair spread
            if (this.components.crosshair && typeof weapon.getSpread === 'function') {
                const spread = weapon.getSpread ? weapon.getSpread() : 0;
                this.components.crosshair.updateSpread(spread);
                
                // Update weapon type if changed
                if (this.components.crosshair.state.currentWeaponType !== weaponType) {
                    this.components.crosshair.updateWeaponType(weaponType);
                }
            }

            // The minimap updates itself through its own timer, not needed here
            
            // Update compass with player rotation if available
            if (this.components.compass && this.world.player) {
                // Convert rotation from radians to degrees
                const playerRotation = this.world.player.rotation?.y || 0;
                const degrees = (playerRotation * 180 / Math.PI) % 360;
                
                // Update compass rotation
                this.components.compass.updateRotation(degrees);
            }
        }
    }
    
    /**
     * Handle window resize events
     * @param {Object} event - Resize event data
     * @private
     */
    _onResize(event) {
        // Adjust HUD layout based on screen size if needed
        // For example, reposition elements for different screen sizes
    }
    
    /**
     * Set the size of the HUD based on screen dimensions
     * @param {Number} width - Screen width
     * @param {Number} height - Screen height
     */
    setSize(width, height) {
        // Adjust layout based on dimensions
        // This is called by UIManager's _onWindowResize method
        
        // Emit resize event for children
        if (EventManager) {
            EventManager.emit('hud:resized', { width, height });
        }
        
        return this;
    }
}

export default HUDSystem;
