/**
 * Ammunition display component for the RIFT UI HUD.
 * Displays current weapon ammunition with visual feedback for low ammo and reloading.
 * 
 * @author Cline
 */

import UIComponent from '../UIComponent.js';
import { EventManager } from '../../../core/EventManager.js';
import { DOMFactory } from '../../../utils/DOMFactory.js';

class AmmoDisplay extends UIComponent {
    /**
     * Create a new ammo display component
     * @param {Object} options - Component options
     * @param {HTMLElement} [options.container] - Parent container
     * @param {Boolean} [options.showIcon=true] - Whether to show the ammo icon
     * @param {Boolean} [options.showValue=true] - Whether to show numeric ammo values
     * @param {Boolean} [options.showVisualizer=true] - Whether to show bullet visualizer
     */
    constructor(options = {}) {
        super({
            id: options.id || 'ammo-display',
            className: 'rift-ammo',
            container: options.container,
            autoInit: false, // Prevent auto-init to control initialization order
            ...options
        });
        
        // Configuration
        this.showIcon = options.showIcon !== false;
        this.showValue = options.showValue !== false;
        this.showVisualizer = options.showVisualizer !== false;
        
        // State
        this.state = {
            currentAmmo: 30,     // Current magazine ammo
            totalAmmo: 90,       // Total reserve ammo
            maxMagSize: 30,      // Maximum magazine size
            isReloading: false,  // Whether weapon is reloading
            isLowAmmo: false,    // Whether ammo is low
            weaponType: 'rifle'  // Current weapon type
        };
        
        // DOM elements
        this.elements = {
            icon: null,
            currentAmmo: null,
            separator: null,
            totalAmmo: null,
            visualizer: null,
            bullets: []
        };
        
        // Event subscriptions using standardized event names
        this.registerEvents({
            'ammo:changed': this._onAmmoChanged,
            'ammo:reserve-changed': this._onTotalAmmoChanged, // Standardized from ammo:total-changed
            'weapon:reloading': this._onReloadStart, // Standardized from weapon:reload:start
            'weapon:reloaded': this._onReloadComplete, // Standardized from weapon:reload:complete
            'weapon:switched': this._onWeaponSwitched
        });
        
        // Now initialize manually after all properties are set
        this.init();
    }
    
    /**
     * Initialize the component
     */
    init() {
        if (this.isInitialized) return this;
        
        // Call parent init first to properly set up the component
        super.init();
        
        // Create ammo icon
        if (this.showIcon) {
            this.elements.icon = this.createElement('img', {
                className: 'rift-ammo__icon',
                attributes: {
                    src: '/assets/hud/ammo-icon.png',
                    alt: 'Ammo'
                }
            });
        }
        
        // Create ammo container
        const ammoValueContainer = this.createElement('div', {
            className: 'rift-ammo__value-container'
        });
        
        // Create current ammo value
        if (this.showValue) {
            this.elements.currentAmmo = this.createElement('span', {
                className: 'rift-ammo__current',
                text: `${this.state.currentAmmo}`,
                parent: ammoValueContainer
            });
            
            this.elements.separator = this.createElement('span', {
                className: 'rift-ammo__separator',
                text: '/',
                parent: ammoValueContainer
            });
            
            this.elements.totalAmmo = this.createElement('span', {
                className: 'rift-ammo__total',
                text: `${this.state.totalAmmo}`,
                parent: ammoValueContainer
            });
        }
        
        // Create bullet visualizer
        if (this.showVisualizer) {
            this._createBulletVisualizer();
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
        
        return this;
    }
    
    /**
     * Render the ammo display
     */
    render() {
        if (!this.isInitialized) return this;
        
        // Update ammo value text
        if (this.elements.currentAmmo) {
            this.elements.currentAmmo.textContent = `${Math.round(this.state.currentAmmo)}`;
        }
        
        if (this.elements.totalAmmo) {
            this.elements.totalAmmo.textContent = `${Math.round(this.state.totalAmmo)}`;
        }
        
        // Update CSS classes based on state
        this._updateAmmoDisplayClass();
        
        // Update bullet visualizer
        this._updateBulletVisualizer();
        
        return this;
    }
    
    /**
     * Update the current ammo count
     * @param {Number} amount - New current ammo amount
     * @param {Boolean} [animate=true] - Whether to animate the change
     */
    updateAmmo(amount, animate = true) {
        const previousAmmo = this.state.currentAmmo;
        const newAmmo = Math.max(0, amount);
        
        // Update state
        this.setState({
            currentAmmo: newAmmo,
            isLowAmmo: newAmmo <= this.state.maxMagSize * this.config.ammo.lowAmmoThresholdPercent && newAmmo > 0
        });
        
        // Only animate if requested and ammo decreased
        if (animate && newAmmo < previousAmmo) {
            this._animateAmmoChange();
        }
        
        return this;
    }
    
    /**
     * Update the total reserve ammo
     * @param {Number} amount - New total ammo amount
     */
    updateTotalAmmo(amount) {
        this.setState({
            totalAmmo: Math.max(0, amount)
        });
        
        return this;
    }
    
    /**
     * Update current weapon's magazine size
     * @param {Number} size - Magazine size
     */
    updateMagSize(size) {
        const newSize = Math.max(1, size);
        
        this.setState({
            maxMagSize: newSize,
            isLowAmmo: this.state.currentAmmo <= newSize * this.config.ammo.lowAmmoThresholdPercent && this.state.currentAmmo > 0
        });
        
        // Recreate bullet visualizer if showing
        if (this.showVisualizer) {
            this._createBulletVisualizer();
        }
        
        return this;
    }
    
    /**
     * Show low ammo warning state
     */
    showLowAmmoWarning() {
        if (this.element) {
            this.element.classList.add('rift-ammo--low');
        }
        
        if (this.elements.currentAmmo) {
            this.elements.currentAmmo.classList.add('rift-ammo__current--low');
        }
        
        return this;
    }
    
    /**
     * Show the reload animation
     */
    showReloadAnimation() {
        this.setState({
            isReloading: true
        });
        
        if (this.element) {
            this.element.classList.add('rift-ammo--reloading');
        }
        
        // Remove the reloading class after animation duration
        setTimeout(() => {
            if (this.element) {
                this.element.classList.remove('rift-ammo--reloading');
                this.setState({
                    isReloading: false
                });
            }
        }, 1500); // Typical reload animation duration
        
        return this;
    }
    
    /**
     * Update the weapon type
     * @param {String} weaponType - Weapon type (e.g., 'rifle', 'pistol', 'shotgun')
     */
    updateWeaponType(weaponType) {
        this.setState({
            weaponType
        });
        
        if (this.element) {
            // Remove existing weapon type classes
            const weaponClasses = Array.from(this.element.classList)
                .filter(cls => cls.startsWith('rift-ammo--weapon-'));
            
            weaponClasses.forEach(cls => {
                this.element.classList.remove(cls);
            });
            
            // Add new weapon type class
            this.element.classList.add(`rift-ammo--weapon-${weaponType}`);
        }
        
        return this;
    }
    
    /**
     * Create bullet visualizer elements
     * @private
     */
    _createBulletVisualizer() {
        // Remove existing visualizer if any
        if (this.elements.visualizer) {
            this.elements.visualizer.remove();
            this.elements.bullets = [];
        }
        
        this.elements.visualizer = this.createElement('div', {
            className: 'rift-ammo__visualizer'
        });
        
        // Limit visualized bullets based on config
        const bulletCount = Math.min(
            this.state.maxMagSize,
            this.config.ammo.ammoVisualizerMaxBullets
        );
        
        // Create bullet elements
        for (let i = 0; i < bulletCount; i++) {
            const bullet = this.createElement('div', {
                className: 'rift-ammo__bullet',
                parent: this.elements.visualizer
            });
            
            this.elements.bullets.push(bullet);
        }
        
        // Update bullet visualizer
        this._updateBulletVisualizer();
    }
    
    /**
     * Update bullet visualizer based on current ammo
     * @private
     */
    _updateBulletVisualizer() {
        if (!this.elements.visualizer || !this.elements.bullets.length) return;
        
        const bulletCount = this.elements.bullets.length;
        const ammoRatio = Math.min(1, this.state.currentAmmo / this.state.maxMagSize);
        const activeBullets = Math.ceil(bulletCount * ammoRatio);
        
        // Update each bullet element
        this.elements.bullets.forEach((bullet, index) => {
            if (index < activeBullets) {
                bullet.classList.add('rift-ammo__bullet--active');
                bullet.classList.remove('rift-ammo__bullet--empty');
            } else {
                bullet.classList.remove('rift-ammo__bullet--active');
                
                // Only show empty bullets if configured
                if (this.config.ammo.ammoVisualizerShowEmpty) {
                    bullet.classList.add('rift-ammo__bullet--empty');
                } else {
                    bullet.classList.remove('rift-ammo__bullet--empty');
                }
            }
            
            // Add low ammo class if appropriate
            if (this.state.isLowAmmo && index < activeBullets) {
                bullet.classList.add('rift-ammo__bullet--low');
            } else {
                bullet.classList.remove('rift-ammo__bullet--low');
            }
        });
    }
    
    /**
     * Update the ammo display class based on current state
     * @private
     */
    _updateAmmoDisplayClass() {
        if (!this.element) return;
        
        // Remove state classes
        this.element.classList.remove(
            'rift-ammo--low',
            'rift-ammo--empty',
            'rift-ammo--reloading'
        );
        
        // Add appropriate class based on state
        if (this.state.isReloading) {
            this.element.classList.add('rift-ammo--reloading');
        } else if (this.state.currentAmmo === 0) {
            this.element.classList.add('rift-ammo--empty');
        } else if (this.state.isLowAmmo) {
            this.element.classList.add('rift-ammo--low');
        }
        
        // Update text classes as well
        if (this.elements.currentAmmo) {
            this.elements.currentAmmo.classList.remove(
                'rift-ammo__current--low',
                'rift-ammo__current--empty'
            );
            
            if (this.state.currentAmmo === 0) {
                this.elements.currentAmmo.classList.add('rift-ammo__current--empty');
            } else if (this.state.isLowAmmo) {
                this.elements.currentAmmo.classList.add('rift-ammo__current--low');
            }
        }
    }
    
    /**
     * Animate ammo change (e.g., when firing)
     * @private
     */
    _animateAmmoChange() {
        if (!this.elements.currentAmmo) return;
        
        // Add and then remove animation class
        this.elements.currentAmmo.classList.remove('rift-ammo__current--changed');
        void this.elements.currentAmmo.offsetWidth; // Force reflow
        this.elements.currentAmmo.classList.add('rift-ammo__current--changed');
    }
    
    /**
     * Handle ammo changed event
     * @param {Object} event - Standardized state change event
     * @param {Number} event.value - Current ammo value
     * @param {Number} event.previous - Previous ammo value
     * @param {Number} [event.delta] - Amount changed
     * @param {Number} [event.max] - Maximum magazine size
     * @private
     */
    _onAmmoChanged(event) {
        if (typeof event.value === 'number') {
            this.updateAmmo(event.value);
        }
    }
    
    /**
     * Handle reserve ammo changed event
     * @param {Object} event - Standardized state change event
     * @param {Number} event.value - Current reserve ammo value
     * @param {Number} event.previous - Previous reserve ammo value
     * @param {Number} [event.delta] - Amount changed
     * @private
     */
    _onTotalAmmoChanged(event) {
        if (typeof event.value === 'number') {
            this.updateTotalAmmo(event.value);
        }
    }
    
    /**
     * Handle weapon reloading event
     * @param {Object} event - Standardized weapon event
     * @param {String} [event.weaponType] - Type of weapon being reloaded
     * @param {Number} [event.duration] - Reload duration in milliseconds
     * @private
     */
    _onReloadStart(event) {
        this.showReloadAnimation();
    }
    
    /**
     * Handle weapon reloaded event
     * @param {Object} event - Standardized weapon event
     * @param {Number} [event.currentAmmo] - New magazine ammo count
     * @param {Number} [event.totalAmmo] - New reserve ammo count
     * @private
     */
    _onReloadComplete(event) {
        if (typeof event.currentAmmo === 'number') {
            this.updateAmmo(event.currentAmmo, false);
        }
        
        if (typeof event.totalAmmo === 'number') {
            this.updateTotalAmmo(event.totalAmmo);
        }
        
        this.setState({
            isReloading: false
        });
    }
    
    /**
     * Handle weapon switched event
     * @param {Object} event - Standardized weapon event
     * @param {String} [event.weaponType] - Type of weapon switched to
     * @param {Number} [event.magSize] - Magazine size of new weapon
     * @param {Number} [event.currentAmmo] - Current magazine ammo of new weapon
     * @param {Number} [event.totalAmmo] - Current reserve ammo of new weapon
     * @private
     */
    _onWeaponSwitched(event) {
        if (event.weaponType) {
            this.updateWeaponType(event.weaponType);
        }
        
        if (typeof event.magSize === 'number') {
            this.updateMagSize(event.magSize);
        }
        
        if (typeof event.currentAmmo === 'number') {
            this.updateAmmo(event.currentAmmo, false);
        }
        
        if (typeof event.totalAmmo === 'number') {
            this.updateTotalAmmo(event.totalAmmo);
        }
    }
}

export { AmmoDisplay };
