/**
 * HUD system for managing all HUD components in the RIFT UI.
 * Acts as a container and coordinator for all heads-up display elements.
 * 
 * @author Cline
 */

import UIComponent from '../UIComponent.js';
import { EventManager } from '../../../core/EventManager.js';
import { UIConfig } from '../../../core/UIConfig.js';
import { DOMFactory } from '../../../utils/DOMFactory.js';
import { HealthDisplay } from './HealthDisplay.js';
import { AmmoDisplay } from './AmmoDisplay.js';
import { CrosshairSystem } from './CrosshairSystem.js';
import { MinimapSystem } from './MinimapSystem.js';
import { StaminaSystem } from './StaminaSystem.js';
import { CompassDisplay } from './CompassDisplay.js';
import { WeaponWheel } from './WeaponWheel.js';
import { NotificationSystem } from '../notifications/NotificationSystem.js';

class HUDSystem extends UIComponent {
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
            autoInit: false, // Prevent auto-init to control initialization order
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
            stamina: null,
            weaponWheel: null,
            notifications: null
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
        
        // Now initialize manually
        this.init();
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
        try {
            // Health display (bottom left)
            this.components.health = new HealthDisplay({
                container: this.containers.bottomLeft,
                showEffects: true
            });
            this.addChild(this.components.health);
              // Stamina display (bottom left, next to health)
            this.components.stamina = new StaminaSystem({
                container: this.containers.bottomLeft
            });
            this.addChild(this.components.stamina);
            
            // Ammo display (bottom right)
            this.components.ammo = new AmmoDisplay({
                container: this.containers.bottomRight,
                showIcon: true,
                showValue: true
            });
            this.addChild(this.components.ammo);              // Crosshair system (center) - only if enhanced crosshair is not enabled
            const useEnhancedCrosshair = UIConfig.enhancedCombat && UIConfig.enhancedCombat.crosshair;
            if (!useEnhancedCrosshair) {
                this.components.crosshair = new CrosshairSystem({
                    container: this.containers.center,
                    dynamic: true,
                    showDot: true
                });
                this.addChild(this.components.crosshair);
            } else {
                console.log('[HUDSystem] Enhanced crosshair enabled - skipping basic crosshair initialization');
            }
            
            // Minimap system (bottom left)
            this.components.minimap = new MinimapSystem(this.world, {
                container: this.containers.bottomLeft,
                size: 180,
                interactive: true
            });
            this.addChild(this.components.minimap);
              // Compass display (top center)
            this.components.compass = new CompassDisplay({
                container: this.containers.topCenter
            });
            this.addChild(this.components.compass);
            
            // Notification system (manages kill feed, notifications, etc.) - uses container's root
            this.components.notifications = new NotificationSystem(this.world, {
                container: this.element // Use HUD system's root element as container
            });
            this.addChild(this.components.notifications);
            
            // Weapon wheel (center, initially hidden)
            this.components.weaponWheel = new WeaponWheel({
                container: this.containers.center,
                world: this.world
            });
            this.addChild(this.components.weaponWheel);
            
            console.log('[HUDSystem] All components initialized');
            
        } catch (error) {
            console.error('[HUDSystem] Error initializing components:', error);
            
            // Create minimal fallback components to prevent further errors
            Object.keys(this.components).forEach(key => {
                if (!this.components[key]) {
                    this.components[key] = {
                        init: () => {},
                        update: () => {},
                        dispose: () => {},
                        state: {}
                    };
                }
            });
        }
    }
    
    /**
     * Update components with latest world data
     * @private
     */
    _updateComponentData() {
        // Only update if world exists
        if (!this.world) return;
        
        try {
            // Update health if player exists
            if (this.world.player && this.components.health && typeof this.components.health.updateHealth === 'function') {
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
            if (this.world.player && this.components.stamina && typeof this.components.stamina.updateStamina === 'function') {
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
            if (this.world.player && this.world.player.weaponSystem && this.world.player.weaponSystem.currentWeapon && this.components.ammo) {
                const weapon = this.world.player.weaponSystem.currentWeapon;
                const currentAmmo = weapon.roundsLeft || 0;
                const totalAmmo = weapon.totalRounds || 0;
                const magSize = weapon.roundsPerClip || 1;
                const weaponType = weapon.type || 'rifle';
                
                // Only update if values have changed and methods exist
                if (typeof this.components.ammo.updateAmmo === 'function' &&
                    (this.components.ammo.state.currentAmmo !== currentAmmo ||
                     this.components.ammo.state.totalAmmo !== totalAmmo ||
                     this.components.ammo.state.maxMagSize !== magSize ||
                     this.components.ammo.state.weaponType !== weaponType)) {
                    
                    this.components.ammo.updateAmmo(currentAmmo, false);
                    this.components.ammo.updateTotalAmmo(totalAmmo);
                    this.components.ammo.updateMagSize(magSize);
                    this.components.ammo.updateWeaponType(weaponType);
                }
                  // Update crosshair spread (only if basic crosshair is active)
                if (this.components.crosshair && typeof this.components.crosshair.updateSpread === 'function') {
                    const spread = weapon.getSpread ? weapon.getSpread() : 0;
                    this.components.crosshair.updateSpread(spread);
                    
                    // Update weapon type if changed
                    if (this.components.crosshair.state.currentWeaponType !== weaponType) {
                        this.components.crosshair.updateWeaponType(weaponType);
                    }
                }
            }

            // Update compass with player rotation if available
            if (this.components.compass && typeof this.components.compass.updateRotation === 'function' && this.world.player) {
                // Convert rotation from radians to degrees
                const playerRotation = this.world.player.rotation?.y || 0;
                const degrees = (playerRotation * 180 / Math.PI) % 360;
                
                // Update compass rotation
                this.components.compass.updateRotation(degrees);
            }
            
        } catch (error) {
            console.error('[HUDSystem] Error updating component data:', error);
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
    
    /**
     * Dispose of all HUD components and clean up resources
     */
    dispose() {
        // Dispose all components
        Object.values(this.components).forEach(component => {
            if (component && typeof component.dispose === 'function') {
                component.dispose();
            }
        });
        
        // Clear component references
        this.components = {};
        this.containers = {};
        
        // Call parent dispose
        super.dispose();
        
        return this;
    }
}




export { HUDSystem };
