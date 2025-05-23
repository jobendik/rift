/**
 * Crosshair system component for the RIFT UI HUD.
 * Displays dynamic crosshair with spread, hit markers, and contextual states.
 * 
 * @author Cline
 */

import UIComponent from '../UIComponent.js';
import { EventManager } from '../../../core/EventManager.js';
import { DOMFactory } from '../../../utils/DOMFactory.js';

class CrosshairSystem extends UIComponent {
    /**
     * Create a new crosshair system component
     * @param {Object} options - Component options
     * @param {HTMLElement} [options.container] - Parent container
     * @param {Boolean} [options.showDot=true] - Whether to show center dot
     * @param {Boolean} [options.dynamic=true] - Whether to show dynamic spread
     * @param {String} [options.type='default'] - Crosshair type (default, dynamic)
     * @param {String} [options.weaponType='rifle'] - Current weapon type
     */
    constructor(options = {}) {
        super({
            autoInit: false,
            id: options.id || 'crosshair-system',
            className: `rift-crosshair ${options.dynamic !== false ? 'rift-crosshair--dynamic' : ''}`,
            container: options.container,
            ...options
        });
        
        // Configuration
        this.showDot = options.showDot !== false;
        this.isDynamic = options.dynamic !== false;
        this.crosshairType = options.type || 'default';
        this.weaponType = options.weaponType || 'rifle';
        
        // State
        this.state = {
            spread: 0, // 0-100 percent
            isOverEnemy: false,
            isOverCritical: false,
            currentWeaponType: this.weaponType,
            baseSize: 24,
            baseSpread: this.config.crosshair.baseSpread,
            hitActive: false,
            hitCritical: false,
            hitHeadshot: false
        };
        
        // DOM elements
        this.elements = {
            lines: {},
            dot: null,
            hitMarker: null
        };
        
        // Event subscriptions using standardized event names
        this.registerEvents({
            'weapon:spread-changed': this._onWeaponSpreadChanged,
            'weapon:fired': this._onWeaponFired,
            'weapon:changed': this._onWeaponChanged,
            'enemy:targeted': this._onEnemyTargeted,
            'enemy:critical-targeted': this._onCriticalTargeted,
            'hit:registered': this._onHitRegistered
        });
    }
    
    /**
     * Initialize the component
     */
    init() {
        if (this.isInitialized) return this;
        
        // Call parent init to create root element
        super.init();
        
        // Add weapon type class
        this.element.classList.add(`rift-crosshair--${this.state.currentWeaponType}`);
        
        // Create crosshair elements based on type
        if (this.isDynamic) {
            this._createDynamicCrosshair();
        } else {
            this._createStaticCrosshair();
        }
        
        // Create center dot if enabled
        if (this.showDot) {
            this._createCenterDot();
        }
        
        // Create hit marker
        this._createHitMarker();
        
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
     * Render the crosshair
     */
    render() {
        if (!this.isInitialized) return this;
        
        // Update line positions based on spread
        if (this.isDynamic) {
            this._updateDynamicCrosshair();
        }
        
        return this;
    }
    
    /**
     * Update crosshair spread
     * @param {Number} value - Spread value (0-100 percent)
     */
    updateSpread(value) {
        // Clamp spread between 0-100
        const spread = Math.max(0, Math.min(100, value));
        
        this.setState({
            spread: spread
        });
        
        return this;
    }
    
    /**
     * Show hit marker animation
     * @param {Boolean} [isCritical=false] - Whether this was a critical hit
     * @param {Boolean} [isHeadshot=false] - Whether this was a headshot
     */
    showHitMarker(isCritical = false, isHeadshot = false) {
        if (!this.elements.hitMarker) return this;
        
        // Update hit marker state
        this.setState({
            hitActive: true,
            hitCritical: isCritical,
            hitHeadshot: isHeadshot
        });
        
        // Update hit marker classes
        this.elements.hitMarker.classList.remove('rift-crosshair__hit-marker--active');
        this.elements.hitMarker.classList.toggle('rift-crosshair__hit-marker--critical', isCritical);
        this.elements.hitMarker.classList.toggle('rift-crosshair__hit-marker--headshot', isHeadshot);
        
        // Force reflow to restart animation
        void this.elements.hitMarker.offsetWidth;
        
        // Add active class to start animation
        this.elements.hitMarker.classList.add('rift-crosshair__hit-marker--active');
        
        // Reset state after animation
        setTimeout(() => {
            this.setState({
                hitActive: false,
                hitCritical: false,
                hitHeadshot: false
            });
        }, this.config.crosshair.hitTime * 1000);
        
        return this;
    }
    
    /**
     * Update crosshair for new weapon type
     * @param {String} weaponType - Weapon type (pistol, rifle, shotgun, sniper)
     */
    updateWeaponType(weaponType) {
        // Validate weapon type
        const validTypes = ['pistol', 'rifle', 'shotgun', 'sniper'];
        const type = validTypes.includes(weaponType) ? weaponType : 'rifle';
        
        // Update state
        this.setState({
            currentWeaponType: type
        });
        
        // Update weapon type classes
        validTypes.forEach(t => {
            this.element.classList.toggle(`rift-crosshair--${t}`, t === type);
        });
        
        return this;
    }
    
    /**
     * Create static crosshair elements
     * @private
     */
    _createStaticCrosshair() {
        // Horizontal line
        this.elements.lines.horizontal = this.createElement('div', {
            className: 'rift-crosshair__line rift-crosshair__line--horizontal'
        });
        
        // Vertical line
        this.elements.lines.vertical = this.createElement('div', {
            className: 'rift-crosshair__line rift-crosshair__line--vertical'
        });
    }
    
    /**
     * Create dynamic crosshair elements
     * @private
     */
    _createDynamicCrosshair() {
        // Horizontal left line
        this.elements.lines.horizontalLeft = this.createElement('div', {
            className: 'rift-crosshair__line rift-crosshair__line--horizontal-left',
            styles: {
                width: `${this.state.baseSpread}px`
            }
        });
        
        // Horizontal right line
        this.elements.lines.horizontalRight = this.createElement('div', {
            className: 'rift-crosshair__line rift-crosshair__line--horizontal-right',
            styles: {
                width: `${this.state.baseSpread}px`
            }
        });
        
        // Vertical top line
        this.elements.lines.verticalTop = this.createElement('div', {
            className: 'rift-crosshair__line rift-crosshair__line--vertical-top',
            styles: {
                height: `${this.state.baseSpread}px`
            }
        });
        
        // Vertical bottom line
        this.elements.lines.verticalBottom = this.createElement('div', {
            className: 'rift-crosshair__line rift-crosshair__line--vertical-bottom',
            styles: {
                height: `${this.state.baseSpread}px`
            }
        });
    }
    
    /**
     * Create center dot element
     * @private
     */
    _createCenterDot() {
        this.elements.dot = this.createElement('div', {
            className: 'rift-crosshair__dot'
        });
    }
    
    /**
     * Create hit marker element
     * @private
     */
    _createHitMarker() {
        // Hit marker container
        this.elements.hitMarker = this.createElement('div', {
            className: 'rift-crosshair__hit-marker'
        });
        
        // Hit marker lines
        // Horizontal left
        this.createElement('div', {
            className: 'rift-crosshair__hit-marker-line rift-crosshair__hit-marker-line--horizontal rift-crosshair__hit-marker-line--horizontal-left',
            parent: this.elements.hitMarker
        });
        
        // Horizontal right
        this.createElement('div', {
            className: 'rift-crosshair__hit-marker-line rift-crosshair__hit-marker-line--horizontal rift-crosshair__hit-marker-line--horizontal-right',
            parent: this.elements.hitMarker
        });
        
        // Vertical top
        this.createElement('div', {
            className: 'rift-crosshair__hit-marker-line rift-crosshair__hit-marker-line--vertical rift-crosshair__hit-marker-line--vertical-top',
            parent: this.elements.hitMarker
        });
        
        // Vertical bottom
        this.createElement('div', {
            className: 'rift-crosshair__hit-marker-line rift-crosshair__hit-marker-line--vertical rift-crosshair__hit-marker-line--vertical-bottom',
            parent: this.elements.hitMarker
        });
    }
    
    /**
     * Update dynamic crosshair based on spread
     * @private
     */
    _updateDynamicCrosshair() {
        if (!this.isDynamic) return;
        
        // Calculate current gap based on base spread and current spread value
        const currentGap = this.state.baseSpread + 
            (this.state.spread / 100) * this.config.crosshair.fireSpreadMod;
        
        // Update line positions
        if (this.elements.lines.horizontalLeft) {
            this.elements.lines.horizontalLeft.style.width = `${currentGap}px`;
        }
        
        if (this.elements.lines.horizontalRight) {
            this.elements.lines.horizontalRight.style.width = `${currentGap}px`;
        }
        
        if (this.elements.lines.verticalTop) {
            this.elements.lines.verticalTop.style.height = `${currentGap}px`;
        }
        
        if (this.elements.lines.verticalBottom) {
            this.elements.lines.verticalBottom.style.height = `${currentGap}px`;
        }
    }
    
    /**
     * Handle weapon spread changed event
     * @param {Object} event - Standardized state change event
     * @param {Number} event.value - Current spread value
     * @param {Number} event.previous - Previous spread value
     * @param {Number} [event.delta] - Amount changed
     * @private
     */
    _onWeaponSpreadChanged(event) {
        if (typeof event.value === 'number') {
            this.updateSpread(event.value);
        }
    }
    
    /**
     * Handle weapon fired event
     * @param {Object} event - Standardized weapon event
     * @param {String} [event.weaponType] - Type of weapon fired
     * @param {Number} [event.accuracy] - Current weapon accuracy
     * @param {Boolean} [event.isAiming] - Whether player was aiming when firing
     * @private
     */
    _onWeaponFired(event) {
        // Temporarily increase spread
        const currentSpread = this.state.spread;
        const increasedSpread = Math.min(100, currentSpread + 30);
        
        // Update spread immediately
        this.updateSpread(increasedSpread);
        
        // Return to original spread after 100ms
        setTimeout(() => {
            this.updateSpread(currentSpread);
        }, 100);
    }
    
    /**
     * Handle weapon changed event
     * @param {Object} event - Standardized weapon event
     * @param {String} event.weaponType - Type of weapon changed to
     * @param {Number} [event.accuracy] - Base accuracy of new weapon
     * @param {Number} [event.spread] - Base spread of new weapon
     * @private
     */
    _onWeaponChanged(event) {
        if (event.weaponType) {
            this.updateWeaponType(event.weaponType);
        }
    }
    
    /**
     * Handle enemy targeted event
     * @param {Object} event - Standardized targeting event
     * @param {Boolean} event.isTargeted - Whether enemy is targeted
     * @param {Object} [event.target] - Target entity information
     * @param {String} [event.targetType] - Type of targeted entity
     * @private
     */
    _onEnemyTargeted(event) {
        // Toggle enemy targeting state
        this.element.classList.toggle('rift-crosshair--enemy', event.isTargeted);
        
        this.setState({
            isOverEnemy: event.isTargeted
        });
    }
    
    /**
     * Handle critical spot targeted event
     * @param {Object} event - Standardized targeting event
     * @param {Boolean} event.isCritical - Whether critical spot is targeted
     * @param {String} [event.criticalType] - Type of critical spot (headshot, weakpoint)
     * @param {Object} [event.target] - Target entity information
     * @private
     */
    _onCriticalTargeted(event) {
        // Toggle headshot targeting state
        this.element.classList.toggle('rift-crosshair--headshot', event.isCritical);
        
        this.setState({
            isOverCritical: event.isCritical
        });
    }
    
    /**
     * Handle hit registered event
     * @param {Object} event - Standardized combat event
     * @param {Object} event.source - Source entity (player)
     * @param {Object} event.target - Target entity (enemy)
     * @param {Boolean} [event.isCritical] - Whether this was a critical hit
     * @param {Boolean} [event.isHeadshot] - Whether this was a headshot
     * @param {Number} [event.damage] - Damage amount
     * @param {String} [event.weaponType] - Type of weapon used
     * @private
     */
    _onHitRegistered(event) {
        this.showHitMarker(
            event.isCritical || false,
            event.isHeadshot || false
        );
    }
}

export { CrosshairSystem };
