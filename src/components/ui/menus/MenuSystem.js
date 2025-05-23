/**
 * MenuSystem.js
 * Manages all menu-related UI components and screens
 * 
 * @author Cline
 */

import { EventManager } from '../../../core/EventManager.js';
import { UIConfig } from '../../../core/UIConfig.js';
import UIComponent from '../UIComponent.js';
import { ScreenManager } from './ScreenManager.js';
import WorldMapScreen from './WorldMapScreen.js';
import MissionBriefingScreen from './MissionBriefingScreen.js';
import RoundSummaryScreen from './RoundSummaryScreen.js';
import { WeaponWheel } from '../hud/WeaponWheel.js';

export class MenuSystem extends UIComponent {
    /**
     * Create a new menu system
     * @param {World} world - The game world instance
     */
    constructor(world) {
        super({
            id: 'menu-system',
            className: 'rift-menu-system',
            autoInit: false // Prevent auto-initialization
        });
        
        this.world = world;
        this.isInitialized = false;
        
        // Menu components
        this.screenManager = null;
        this.worldMapScreen = null;
        this.missionBriefingScreen = null;
        this.roundSummaryScreen = null;
        this.weaponWheel = null;
        
        // State tracking
        this.activeMenu = null;
        this.previousMenu = null;
        
        // Bind methods
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onToggleMenu = this._onToggleMenu.bind(this);
    }
    
    /**
     * Initialize the menu system
     * @returns {MenuSystem} This instance for chaining
     */
    init() {
        if (this.isInitialized) {
            console.warn('MenuSystem already initialized');
            return this;
        }
        
        // Call parent init first
        super.init();
        
        // Set initialized flag early to prevent infinite recursion
        this.isInitialized = true;
        
        console.log('Initializing Menu System...');
          // Initialize screen manager
        this.screenManager = new ScreenManager({
            world: this.world
        });
        
        // Initialize world map screen
        this.worldMapScreen = new WorldMapScreen({
            world: this.world,
            screenManager: this.screenManager
        });
        this.worldMapScreen.init();
        
        // Initialize mission briefing screen
        this.missionBriefingScreen = new MissionBriefingScreen({
            world: this.world,
            screenManager: this.screenManager
        });
        this.missionBriefingScreen.init();
        
        // Initialize round summary screen
        this.roundSummaryScreen = new RoundSummaryScreen({
            world: this.world,
            screenManager: this.screenManager
        });
        this.roundSummaryScreen.init();
        
        // Initialize weapon wheel
        this.weaponWheel = new WeaponWheel({
            world: this.world
        });
        this.weaponWheel.init();
        
        // Set up event listeners
        this._setupEventListeners();
        
        this.isInitialized = true;
        console.log('Menu System initialized.');
        return this;
    }
    
    /**
     * Set up event listeners for menu system
     * @private
     */
    _setupEventListeners() {
        // Add keyboard event listener for menu shortcuts
        window.addEventListener('keydown', this._onKeyDown);
        
        // Register event handlers
        EventManager.on('ui:toggleMenu', this._onToggleMenu);
        
        // Register events for our component to handle
        this.registerEvents({
            'ui:toggleWorldMap': (data) => this._toggleWorldMap(data),
            'ui:showWorldMap': (data) => this._showWorldMap(data),
            'ui:hideWorldMap': () => this._hideWorldMap(),
            'ui:toggleMissionBriefing': (data) => this._toggleMissionBriefing(data),
            'ui:showMissionBriefing': (data) => this._showMissionBriefing(data),
            'ui:hideMissionBriefing': () => this._hideMissionBriefing(),
            'ui:toggleRoundSummary': (data) => this._toggleRoundSummary(data),
            'ui:showRoundSummary': (data) => this._showRoundSummary(data),
            'ui:hideRoundSummary': () => this._hideRoundSummary(),
            'ui:toggleWeaponWheel': (data) => this._toggleWeaponWheel(data),
            'ui:showWeaponWheel': (data) => this._showWeaponWheel(data),
            'ui:hideWeaponWheel': () => this._hideWeaponWheel()
        });
    }
    
    /**
     * Update method called each frame
     * @param {number} delta - Time since last frame in seconds
     * @returns {MenuSystem} This instance for chaining
     */
    update(delta) {
        // Update screen manager
        if (this.screenManager) {
            this.screenManager.update(delta);
        }
        
        // Update world map if active
        if (this.worldMapScreen) {
            this.worldMapScreen.update(delta);
        }
        
        // Update mission briefing if active
        if (this.missionBriefingScreen) {
            this.missionBriefingScreen.update(delta);
        }
        
        // Update round summary if active
        if (this.roundSummaryScreen) {
            this.roundSummaryScreen.update(delta);
        }
        
        // Update weapon wheel if active
        if (this.weaponWheel && this.weaponWheel.isActive) {
            this.weaponWheel.update(delta);
        }
        
        return this;
    }
    
    /**
     * Handle keyboard shortcuts for menus
     * @private
     * @param {KeyboardEvent} event - Keyboard event
     */
    _onKeyDown(event) {
        // M key for world map
        if (event.key === 'm' || event.keyCode === 77) {
            if (!event.repeat && !this._isInputFieldFocused()) {
                this._toggleWorldMap();
                event.preventDefault();
            }
        }
        
        // Tab key for weapon wheel
        if (event.key === 'Tab' || event.keyCode === 9) {
            // Only handle Tab if we're not focused on an input
            if (!this._isInputFieldFocused()) {
                this._toggleWeaponWheel({ keyHeld: true });
                event.preventDefault();
            }
        }
    }
    
    /**
     * Check if an input field is currently focused
     * @private
     * @returns {boolean} True if an input field has focus
     */
    _isInputFieldFocused() {
        const activeElement = document.activeElement;
        return activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.contentEditable === 'true'
        );
    }
    
    /**
     * Handle toggle menu event
     * @private
     * @param {Object} data - Menu data
     */
    _onToggleMenu(data = {}) {
        const menuType = data.type || 'main';
        
        switch (menuType) {
            case 'world-map':
                this._toggleWorldMap(data);
                break;
                
            case 'mission-briefing':
                this._toggleMissionBriefing(data);
                break;
                
            case 'round-summary':
                this._toggleRoundSummary(data);
                break;
                
            case 'weapon-wheel':
                this._toggleWeaponWheel(data);
                break;
                
            case 'main':
            default:
                if (this.screenManager) {
                    this.screenManager.showScreen('main-menu', {
                        data: data
                    });
                }
                break;
        }
    }
    
    /**
     * Toggle world map visibility
     * @private
     * @param {Object} data - Optional data to pass to the map
     */
    _toggleWorldMap(data = {}) {
        if (!this.worldMapScreen) return;
        
        if (this.screenManager?.currentScreen === 'world-map') {
            this._hideWorldMap();
        } else {
            this._showWorldMap(data);
        }
    }
    
    /**
     * Show the world map
     * @private
     * @param {Object} data - Optional data to pass to the map
     */
    _showWorldMap(data = {}) {
        if (this.worldMapScreen) {
            this.worldMapScreen.show(data);
        }
    }
    
    /**
     * Hide the world map
     * @private
     */
    _hideWorldMap() {
        if (this.worldMapScreen) {
            this.worldMapScreen.hide();
        }
    }
    
    /**
     * Toggle mission briefing visibility
     * @private
     * @param {Object} data - Optional data
     */
    _toggleMissionBriefing(data = {}) {
        if (!this.missionBriefingScreen) return;
        
        if (this.screenManager?.currentScreen === 'mission-briefing') {
            this._hideMissionBriefing();
        } else {
            this._showMissionBriefing(data);
        }
    }
    
    /**
     * Show the mission briefing
     * @private
     * @param {Object} data - Optional data to pass to the mission briefing
     */
    _showMissionBriefing(data = {}) {
        if (this.missionBriefingScreen) {
            this.missionBriefingScreen.show(data.mission, data);
        }
    }
    
    /**
     * Hide the mission briefing
     * @private
     */
    _hideMissionBriefing() {
        if (this.missionBriefingScreen) {
            this.missionBriefingScreen.hide();
        }
    }
    
    /**
     * Toggle round summary visibility
     * @private
     * @param {Object} data - Optional data
     */
    _toggleRoundSummary(data = {}) {
        if (!this.roundSummaryScreen) return;
        
        if (this.screenManager?.currentScreen === 'round-summary') {
            this._hideRoundSummary();
        } else {
            this._showRoundSummary(data);
        }
    }
    
    /**
     * Show the round summary
     * @private
     * @param {Object} data - Optional data to pass to the round summary
     */
    _showRoundSummary(data = {}) {
        if (this.roundSummaryScreen) {
            this.roundSummaryScreen.show(data);
        }
    }
    
    /**
     * Hide the round summary
     * @private
     */
    _hideRoundSummary() {
        if (this.roundSummaryScreen) {
            this.roundSummaryScreen.hide();
        }
    }
    
    /**
     * Toggle weapon wheel visibility
     * @private
     * @param {Object} data - Optional data
     */
    _toggleWeaponWheel(data = {}) {
        if (!this.weaponWheel) return;
        
        if (this.weaponWheel.isActive) {
            this._hideWeaponWheel();
        } else {
            this._showWeaponWheel(data);
        }
    }
    
    /**
     * Show the weapon wheel
     * @private
     * @param {Object} data - Optional data
     */
    _showWeaponWheel(data = {}) {
        if (this.weaponWheel) {
            this.weaponWheel.show(data);
        }
    }
    
    /**
     * Hide the weapon wheel
     * @private
     */
    _hideWeaponWheel() {
        if (this.weaponWheel) {
            this.weaponWheel.hide();
        }
    }
    
    /**
     * Register a screen with the screen manager
     * @param {string} id - Screen identifier
     * @param {Object} options - Screen options
     * @returns {HTMLElement} The registered screen element
     */
    registerScreen(id, options) {
        if (this.screenManager) {
            return this.screenManager.registerScreen(id, options);
        }
        return null;
    }
    
    /**
     * Register a modal with the screen manager
     * @param {string} id - Modal identifier
     * @param {Object} options - Modal options
     * @returns {HTMLElement} The registered modal element
     */
    registerModal(id, options) {
        if (this.screenManager) {
            return this.screenManager.registerModal(id, options);
        }
        return null;
    }
    
    /**
     * Show a screen using the screen manager
     * @param {string} id - Screen identifier
     * @param {Object} options - Show options
     */
    showScreen(id, options) {
        if (this.screenManager) {
            this.screenManager.showScreen(id, options);
        }
    }
    
    /**
     * Hide the current screen
     * @param {Object} options - Hide options
     */
    hideScreen(options) {
        if (this.screenManager) {
            this.screenManager.hideScreen(options);
        }
    }
    
    /**
     * Show a modal dialog
     * @param {string} id - Modal identifier
     * @param {Object} options - Show options
     */
    showModal(id, options) {
        if (this.screenManager) {
            this.screenManager.showModal(id, options);
        }
    }
    
    /**
     * Hide a modal dialog
     * @param {string} id - Modal identifier
     */
    hideModal(id) {
        if (this.screenManager) {
            this.screenManager.hideModal(id);
        }
    }
    
    /**
     * Clean up resources when disposed
     */
    dispose() {
        // Remove event listeners
        window.removeEventListener('keydown', this._onKeyDown);
        EventManager.off('ui:toggleMenu', this._onToggleMenu);
        
        // Dispose components
        if (this.screenManager) {
            this.screenManager.dispose();
            this.screenManager = null;
        }
        
        if (this.worldMapScreen) {
            this.worldMapScreen.dispose();
            this.worldMapScreen = null;
        }
        
        if (this.missionBriefingScreen) {
            this.missionBriefingScreen.dispose();
            this.missionBriefingScreen = null;
        }
        
        if (this.roundSummaryScreen) {
            this.roundSummaryScreen.dispose();
            this.roundSummaryScreen = null;
        }
        
        if (this.weaponWheel) {
            this.weaponWheel.dispose();
            this.weaponWheel = null;
        }
        
        // Call parent dispose method to handle common cleanup
        super.dispose();
        
        this.isInitialized = false;
    }
}

