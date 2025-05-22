/**
 * Weapon Wheel Component
 * A radial menu that allows players to quickly select weapons
 * 
 * @author Cline
 */

import UIComponent from '../UIComponent.js';
import { DOMFactory } from '../../../utils/DOMFactory.js';
import { EventManager } from '../../../core/EventManager.js';
import { UIConfig } from '../../../core/UIConfig.js';
import { WEAPON_TYPES_BLASTER, WEAPON_TYPES_SHOTGUN, WEAPON_TYPES_ASSAULT_RIFLE } from '../../../core/Constants.js';

class WeaponWheel extends UIComponent {
    /**
     * Creates a new weapon wheel component
     * @param {Object} world - Reference to the game world
     */
    constructor(world) {
        super(world, 'weapon-wheel');
        
        // Load configuration
        this.config = UIConfig.weaponWheel || {};
        
        // Component state
        this.isVisible = false;
        this.activeSegment = -1;
        this.lastMousePosition = { x: 0, y: 0 };
        this.weapons = [];
        this.currentWeaponIndex = 0;
        this.segmentCount = 8; // Default to 8 segments
        this.segmentAngle = (2 * Math.PI) / this.segmentCount;
        
        // Reference to the player's weapon system (will be set when player is available)
        this.weaponSystem = null;
        
        // Bind methods for event handlers
        this._handleKeyDown = this._handleKeyDown.bind(this);
        this._handleKeyUp = this._handleKeyUp.bind(this);
        this._handleMouseMove = this._handleMouseMove.bind(this);
        this._handleClick = this._handleClick.bind(this);
        this._handleWeaponChange = this._handleWeaponChange.bind(this);
        this._handleWeaponPickup = this._handleWeaponPickup.bind(this);
        this._handleWeaponDrop = this._handleWeaponDrop.bind(this);
    }
    
    /**
     * Initialize the component
     */
    init() {
        // Create root element
        this.rootElement = DOMFactory.createElement('div', {
            className: 'rift-weapon-wheel',
            attributes: { id: 'rift-weapon-wheel' },
            appendToBody: true
        });
        
        // Create component structure
        this._createStructure();
        
        // Register event handlers
        this._registerEvents();
        
        // Wait for player to be available
        this._waitForPlayer();
        
        console.log('WeaponWheel initialized');
    }
    
    /**
     * Wait for player to be available and get weapon system
     * @private
     */
    _waitForPlayer() {
        // Check if player exists
        if (this.world.player && this.world.player.weaponSystem) {
            this.weaponSystem = this.world.player.weaponSystem;
            this._loadWeapons();
        } else {
            // Try again in a moment
            setTimeout(() => this._waitForPlayer(), 100);
        }
    }
    
    /**
     * Create the weapon wheel HTML structure
     * @private
     */
    _createStructure() {
        // Create backdrop
        this.backdropElement = DOMFactory.createElement('div', {
            className: 'rift-weapon-wheel__backdrop',
            parent: this.rootElement
        });
        
        // Create container with size from config
        this.containerElement = DOMFactory.createElement('div', {
            className: 'rift-weapon-wheel__container',
            styles: this.config.size ? { 
                width: `${this.config.size}px`, 
                height: `${this.config.size}px`
            } : null,
            parent: this.rootElement
        });
        
        // Create hub (center) with size from config
        this.hubElement = DOMFactory.createElement('div', {
            className: 'rift-weapon-wheel__hub',
            styles: this.config.hubSize ? { 
                width: `${this.config.hubSize}px`, 
                height: `${this.config.hubSize}px` 
            } : null,
            parent: this.containerElement
        });
        
        // Create segments container
        this.segmentsContainer = DOMFactory.createElement('div', {
            className: 'rift-weapon-wheel__segments',
            parent: this.containerElement
        });
        
        // Create weapon info panel
        this.infoElement = DOMFactory.createElement('div', {
            className: 'rift-weapon-wheel__info',
            parent: this.rootElement
        });
        
        // Create weapon name
        this.weaponNameElement = DOMFactory.createElement('div', {
            className: 'rift-weapon-wheel__weapon-name',
            text: 'Select Weapon',
            parent: this.infoElement
        });
        
        // Create weapon stats container if stats are enabled in config
        if (this.config.showStats !== false) {
            this.statsElement = DOMFactory.createElement('div', {
                className: 'rift-weapon-wheel__stats',
                parent: this.infoElement
            });
            
            // Create individual stat elements for damage, range, and rate of fire
            this.damageElement = this._createStatElement('DMG', '0', this.statsElement);
            this.rangeElement = this._createStatElement('RNG', '0', this.statsElement);
            this.fireRateElement = this._createStatElement('ROF', '0', this.statsElement);
        }
        
        // Create ammo display if ammo is enabled in config
        if (this.config.showAmmo !== false) {
            this.ammoElement = DOMFactory.createElement('div', {
                className: 'rift-weapon-wheel__ammo',
                text: '0 / 0',
                parent: this.infoElement
            });
        }
        
        // Create key hint
        this.keyHintElement = DOMFactory.createElement('div', {
            className: 'rift-weapon-wheel__key-hint',
            text: 'Press [TAB] to close | Click to select weapon',
            parent: this.rootElement
        });
    }
    
    /**
     * Create a stat element for weapon information
     * @private
     * @param {string} label - Stat label
     * @param {string} value - Initial value
     * @param {HTMLElement} parent - Parent element
     * @returns {HTMLElement} The stat container
     */
    _createStatElement(label, value, parent) {
        const statContainer = DOMFactory.createElement('div', {
            className: 'rift-weapon-wheel__stat',
            parent: parent
        });
        
        DOMFactory.createElement('div', {
            className: 'rift-weapon-wheel__stat-label',
            text: label,
            parent: statContainer
        });
        
        const valueElement = DOMFactory.createElement('div', {
            className: 'rift-weapon-wheel__stat-value',
            text: value,
            parent: statContainer
        });
        
        return valueElement;
    }
    
    /**
     * Register event listeners
     * @private
     */
    _registerEvents() {
        // Register DOM event listeners
        document.addEventListener('keydown', this._handleKeyDown);
        document.addEventListener('keyup', this._handleKeyUp);
        document.addEventListener('mousemove', this._handleMouseMove);
        this.rootElement.addEventListener('click', this._handleClick);
        
        // Register game event listeners
        if (EventManager) {
            EventManager.on('weapon:changed', this._handleWeaponChange);
            EventManager.on('weapon:pickup', this._handleWeaponPickup);
            EventManager.on('weapon:drop', this._handleWeaponDrop);
            EventManager.on('pause:changed', (data) => {
                // Auto-hide weapon wheel when game is paused
                if (data.paused && this.isVisible) {
                    this.hide();
                }
            });
        }
    }
    
    /**
     * Load available weapons from the weapon system
     * @private
     */
    _loadWeapons() {
        // Clear any existing segments
        this.segmentsContainer.innerHTML = '';
        
        if (!this.weaponSystem) {
            console.log('WeaponWheel: Weapon system not yet available');
            return;
        }
        
        // Build weapon data from the weapon system
        this.weapons = [];
        
        // Helper to get weapon info
        const getWeaponInfo = (type, name, damage, range, fireRate) => {
            const weapon = this.weaponSystem.getWeapon(type);
            if (weapon) {
                return {
                    type: type,
                    name: name,
                    isAvailable: true,
                    damage: damage,
                    range: range,
                    fireRate: fireRate,
                    currentAmmo: weapon.roundsLeft,
                    maxAmmo: weapon.maxRounds,
                    totalRounds: weapon.getRemainingRounds()
                };
            }
            return null;
        };
        
        // Check each weapon type
        const blasterInfo = getWeaponInfo(WEAPON_TYPES_BLASTER, 'Blaster', 20, 50, 10);
        if (blasterInfo) this.weapons.push(blasterInfo);
        
        const shotgunInfo = getWeaponInfo(WEAPON_TYPES_SHOTGUN, 'Shotgun', 60, 15, 2);
        if (shotgunInfo) this.weapons.push(shotgunInfo);
        
        const assaultRifleInfo = getWeaponInfo(WEAPON_TYPES_ASSAULT_RIFLE, 'Assault Rifle', 25, 75, 15);
        if (assaultRifleInfo) this.weapons.push(assaultRifleInfo);
        
        // Determine current weapon index
        if (this.weaponSystem.currentWeapon) {
            const currentType = this.weaponSystem.currentWeapon.type;
            this.currentWeaponIndex = this.weapons.findIndex(w => w.type === currentType);
            if (this.currentWeaponIndex === -1) this.currentWeaponIndex = 0;
        }
        
        // Calculate segment angle based on number of weapons (min 2, max 8)
        const numWeapons = Math.max(2, Math.min(8, this.weapons.length));
        this.segmentCount = numWeapons;
        this.segmentAngle = (2 * Math.PI) / this.segmentCount;
        
        // Create segments for each weapon
        this.weapons.forEach((weapon, index) => {
            this._createWeaponSegment(weapon, index);
        });
        
        // Update the hub text with the number of weapons
        this.hubElement.textContent = `${this.weapons.length}`;
        
        // Update info display for current weapon
        this._updateInfoDisplay(this.currentWeaponIndex);
    }
    
    /**
     * Create a segment for a weapon
     * @private
     * @param {Object} weapon - Weapon data object
     * @param {number} index - Segment index
     */
    _createWeaponSegment(weapon, index) {
        // Calculate segment position and angle
        const angle = this.segmentAngle * index - Math.PI / 2; // Start from top
        
        // Create segment container
        const segment = DOMFactory.createElement('div', {
            className: 'rift-weapon-wheel__segment',
            attributes: { 'data-index': index },
            styles: {
                transform: `rotate(${angle}rad)`
            },
            parent: this.segmentsContainer
        });
        
        // Add selected class if this is the current weapon
        if (index === this.currentWeaponIndex) {
            segment.classList.add('rift-weapon-wheel__segment--selected');
        }
        
        // Add unavailable class if weapon is not available
        if (!weapon.isAvailable) {
            segment.classList.add('rift-weapon-wheel__segment--unavailable');
        }
        
        // Create highlight shape
        const highlight = DOMFactory.createElement('div', {
            className: 'rift-weapon-wheel__segment-highlight',
            parent: segment
        });
        
        // Create weapon icon
        const icon = DOMFactory.createElement('div', {
            className: 'rift-weapon-wheel__icon',
            styles: {
                transform: `translate(-50%, -130px) rotate(${-angle}rad)` // Counter-rotate to keep icon upright
            },
            parent: segment
        });
        
        // Add weapon icon image or fallback text
        if (weapon.iconUrl) {
            DOMFactory.createElement('img', {
                attributes: { 
                    src: weapon.iconUrl,
                    alt: weapon.name
                },
                parent: icon
            });
        } else {
            icon.textContent = weapon.name.charAt(0);
        }
        
        // Create weapon label
        const label = DOMFactory.createElement('div', {
            className: 'rift-weapon-wheel__label',
            text: weapon.name,
            styles: {
                transform: `rotate(${-angle}rad)` // Counter-rotate to keep text upright
            },
            parent: segment
        });
        
        // Add event listeners
        segment.addEventListener('mouseover', () => {
            this._onSegmentHover(index);
        });
    }
    
    /**
     * Handle segment hover interaction
     * @private
     * @param {number} index - Segment index
     */
    _onSegmentHover(index) {
        // Update active segment
        this.activeSegment = index;
        
        // Update info display
        this._updateInfoDisplay(index);
    }
    
    /**
     * Update weapon info display
     * @private
     * @param {number} index - Weapon index
     */
    _updateInfoDisplay(index) {
        if (index < 0 || index >= this.weapons.length) return;
        
        const weapon = this.weapons[index];
        
        // Update weapon name
        this.weaponNameElement.textContent = weapon.name;
        
        // Update weapon stats if they exist
        if (this.statsElement) {
            // Update weapon stats
            if (this.damageElement) this.damageElement.textContent = weapon.damage || '0';
            if (this.rangeElement) this.rangeElement.textContent = weapon.range || '0';
            if (this.fireRateElement) this.fireRateElement.textContent = weapon.fireRate || '0';
        }
        
        // Update ammo display if it exists
        if (this.ammoElement) {
            const currentAmmo = weapon.currentAmmo !== undefined ? weapon.currentAmmo : '-';
            const totalRounds = weapon.totalRounds !== undefined ? weapon.totalRounds : '-';
            this.ammoElement.textContent = `${currentAmmo} / ${totalRounds}`;
            
            // Update low ammo state (using the threshold from UIConfig)
            const ammoThreshold = UIConfig?.ammo?.lowAmmoThresholdPercent || 0.2;
            const isLowAmmo = weapon.maxAmmo && 
                             (weapon.currentAmmo / weapon.maxAmmo) <= ammoThreshold;
                             
            if (isLowAmmo) {
                this.ammoElement.classList.add('rift-weapon-wheel__ammo--low');
            } else {
                this.ammoElement.classList.remove('rift-weapon-wheel__ammo--low');
            }
        }
    }
    
    /**
     * Calculate and update the active segment based on mouse position
     * @private
     * @param {number} mouseX - Mouse X position
     * @param {number} mouseY - Mouse Y position 
     */
    _updateActiveSegment(mouseX, mouseY) {
        // Get wheel center position
        const wheelRect = this.containerElement.getBoundingClientRect();
        const centerX = wheelRect.left + wheelRect.width / 2;
        const centerY = wheelRect.top + wheelRect.height / 2;
        
        // Calculate angle from center to mouse
        const deltaX = mouseX - centerX;
        const deltaY = mouseY - centerY;
        
        // Calculate distance from center
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Only activate a segment if mouse is outside the hub area
        const hubRadius = this.config.hubSize / 2 || 40; // Use config or fallback
        if (distance < hubRadius) {
            this.activeSegment = -1;
            return;
        }
        
        // Calculate angle (in radians, 0 = right, going counter-clockwise)
        let angle = Math.atan2(deltaY, deltaX);
        
        // Convert to 0-2π range (atan2 returns -π to π)
        if (angle < 0) {
            angle += 2 * Math.PI;
        }
        
        // Rotate by 90 degrees to make 0 = top
        angle = (angle + Math.PI / 2) % (2 * Math.PI);
        
        // Calculate segment index
        const segmentIndex = Math.floor(angle / this.segmentAngle);
        
        // Update active segment if it's different
        if (segmentIndex !== this.activeSegment && 
            segmentIndex >= 0 && 
            segmentIndex < this.segmentCount) {
            
            this.activeSegment = segmentIndex;
            this._updateSegmentSelection(segmentIndex);
            this._updateInfoDisplay(segmentIndex);
        }
    }
    
    /**
     * Update the visual selection of segments
     * @private
     * @param {number} selectedIndex - Index of selected segment
     */
    _updateSegmentSelection(selectedIndex) {
        // Remove selected class from all segments
        const segments = this.segmentsContainer.querySelectorAll('.rift-weapon-wheel__segment');
        segments.forEach(segment => {
            segment.classList.remove('rift-weapon-wheel__segment--selected');
        });
        
        // Add selected class to active segment
        if (selectedIndex >= 0 && selectedIndex < segments.length) {
            segments[selectedIndex].classList.add('rift-weapon-wheel__segment--selected');
        }
    }
    
    /**
     * Handle key down event to show the weapon wheel
     * @private
     * @param {KeyboardEvent} event - Keyboard event
     */
    _handleKeyDown(event) {
        // Show weapon wheel on Tab key
        if (event.key === 'Tab' && !this.isVisible) {
            event.preventDefault();
            this.show();
        }
    }
    
    /**
     * Handle key up event to hide the weapon wheel
     * @private
     * @param {KeyboardEvent} event - Keyboard event
     */
    _handleKeyUp(event) {
        // Hide weapon wheel on Tab key release
        if (event.key === 'Tab' && this.isVisible) {
            event.preventDefault();
            this.hide();
            
            // Select weapon if one is active
            if (this.activeSegment >= 0 && this.activeSegment < this.weapons.length) {
                this._selectWeapon(this.activeSegment);
            }
        }
    }
    
    /**
     * Handle mouse movement to determine active segment
     * @private
     * @param {MouseEvent} event - Mouse event
     */
    _handleMouseMove(event) {
        if (!this.isVisible) return;
        
        // Store mouse position
        this.lastMousePosition = { x: event.clientX, y: event.clientY };
        
        // Update active segment based on mouse position
        this._updateActiveSegment(event.clientX, event.clientY);
    }
    
    /**
     * Handle click event to select a weapon
     * @private
     * @param {MouseEvent} event - Mouse event
     */
    _handleClick(event) {
        if (!this.isVisible) return;
        
        // Prevent default to avoid any background clicks
        event.preventDefault();
        
        // Select weapon if one is active
        if (this.activeSegment >= 0 && this.activeSegment < this.weapons.length) {
            this._selectWeapon(this.activeSegment);
            this.hide();
        }
    }
    
    /**
     * Handle weapon change event from the weapon system
     * @private
     * @param {Object} data - Event data
     */
    _handleWeaponChange(data) {
        // Reload weapons to get updated state
        this._loadWeapons();
    }
    
    /**
     * Handle weapon pickup event
     * @private
     * @param {Object} data - Event data
     */
    _handleWeaponPickup(data) {
        // Refresh weapons when a new one is picked up
        this._loadWeapons();
    }
    
    /**
     * Handle weapon drop event
     * @private
     * @param {Object} data - Event data
     */
    _handleWeaponDrop(data) {
        // Refresh weapons when one is dropped
        this._loadWeapons();
    }
    
    /**
     * Select a weapon and notify the weapon system
     * @private
     * @param {number} index - Weapon index
     */
    _selectWeapon(index) {
        // Verify weapon is available
        if (index < 0 || index >= this.weapons.length || 
            !this.weapons[index].isAvailable) {
            return;
        }
        
        // Get the weapon type
        const weaponType = this.weapons[index].type;
        
        // Update current weapon index
        this.currentWeaponIndex = index;
        
        // Update selection
        this._updateSegmentSelection(index);
        
        // Change weapon through the weapon system
        if (this.weaponSystem) {
            this.weaponSystem.changeWeapon(weaponType);
        }
        
        // Emit event
        if (EventManager) {
            EventManager.emit('weapon:selected', { 
                index: index,
                weapon: this.weapons[index],
                type: weaponType
            });
        }
    }
    
    /**
     * Show the weapon wheel
     */
    show() {
        if (this.isVisible) return;
        
        // Refresh weapons when showing
        this._loadWeapons();
        
        // Update visibility state
        this.isVisible = true;
        
        // Add active class to show the wheel
        this.rootElement.classList.add('rift-weapon-wheel--active');
        
        // Update active segment based on mouse position
        this._updateActiveSegment(this.lastMousePosition.x, this.lastMousePosition.y);
        
        // Emit event
        if (EventManager) {
            EventManager.emit('weapon:wheelshown', {});
        }
        
        // Request a pause from the game if configured to do so
        if (this.world?.setPaused && this.config.pauseGameWhenActive !== false) {
            this.world.setPaused(true, 'weapon-wheel');
        }
    }
    
    /**
     * Hide the weapon wheel
     */
    hide() {
        if (!this.isVisible) return;
        
        // Update visibility state
        this.isVisible = false;
        
        // Remove active class to hide the wheel
        this.rootElement.classList.remove('rift-weapon-wheel--active');
        
        // Reset active segment
        this.activeSegment = -1;
        
        // Emit event
        if (EventManager) {
            EventManager.emit('weapon:wheelhidden', {});
        }
        
        // Request to unpause the game
        if (this.world?.setPaused) {
            this.world.setPaused(false, 'weapon-wheel');
        }
    }
    
    /**
     * Toggle the weapon wheel visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    /**
     * Update the component
     * @param {number} delta - Time since last frame in seconds
     */
    update(delta) {
        // No regular updates needed for now
    }
    
    /**
     * Render updates to the component
     */
    render() {
        // No manual rendering required - DOM updates are handled directly
    }
    
    /**
     * Clean up the component
     */
    dispose() {
        // Remove event listeners
        document.removeEventListener('keydown', this._handleKeyDown);
        document.removeEventListener('keyup', this._handleKeyUp);
        document.removeEventListener('mousemove', this._handleMouseMove);
        this.rootElement.removeEventListener('click', this._handleClick);
        
        // Remove game event listeners
        if (EventManager) {
            EventManager.off('weapon:changed', this._handleWeaponChange);
            EventManager.off('weapon:pickup', this._handleWeaponPickup);
            EventManager.off('weapon:drop', this._handleWeaponDrop);
        }
        
        // Remove component from DOM
        if (this.rootElement && this.rootElement.parentNode) {
            this.rootElement.parentNode.removeChild(this.rootElement);
        }
        
        console.log('WeaponWheel disposed');
    }
    
    /**
     * Get available weapons for external access
     * @returns {Array} Array of available weapons
     */
    getAvailableWeapons() {
        return this.weapons.filter(w => w.isAvailable);
    }
    
    /**
     * Get current weapon index
     * @returns {number} Current weapon index
     */
    getCurrentWeaponIndex() {
        return this.currentWeaponIndex;
    }
}

export { WeaponWheel };