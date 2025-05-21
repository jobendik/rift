/**
 * Main UI manager class that coordinates all UI components and subsystems.
 * This class serves as the central point for controlling the game UI, handling
 * initialization, updates, and communication between components.
 * 
 * @author Cline
 */

import EventManager from './EventManager.js';
import UIConfig from './UIConfig.js';
import { DOMFactory } from '../utils/DOMFactory.js';

// Import UI component systems
// These will be uncommented and used as we implement each system
import HUDSystem from '../components/ui/hud/HUDSystem.js';
import CombatSystem from '../components/ui/combat/CombatSystem.js';
import NotificationSystem from '../components/ui/notifications/NotificationSystem.js';
import MenuSystem from '../components/ui/menus/MenuSystem.js';
// import { MarkerSystem } from '../components/ui/markers/MarkerSystem.js';
import ProgressionSystem from '../components/ui/progression/ProgressionSystem.js';
import EnvironmentSystem from '../components/ui/environment/EnvironmentSystem.js';
// import { DamageEffects } from '../components/ui/effects/DamageEffects.js';
// import { ScreenShakeSystem } from '../components/ui/effects/ScreenShakeSystem.js';
// import { FootstepSystem } from '../components/ui/effects/FootstepSystem.js';
// import { DebugUI } from '../components/ui/debug/DebugUI.js';

export class UIManager {
    /**
     * Creates a new UI manager with the given world reference
     * @param {World} world - Reference to the game world
     */
    constructor(world) {
        this.world = world;
        this.config = UIConfig;
        this.isInitialized = false;
        this.isGamePaused = false;
        this.activeView = 'game'; // 'game', 'menu', 'pause'
        
        // Systems collection
        this.systems = {};
        
        // Track performance
        this.frameTime = 0;
        this.fpsCounter = {
            frames: 0,
            lastTime: 0,
            fps: 0,
            element: null
        };
        
        // Set up debug mode from config
        if (EventManager) {
            EventManager.setDebugMode(this.config.debug?.debugEvents || false);
        }
        
        // Bind methods to ensure correct 'this' context
        this.update = this.update.bind(this);
        this._onWindowResize = this._onWindowResize.bind(this);
    }
    
    /**
     * Initialize all UI systems
     * @return {UIManager} This UIManager instance
     */
    init() {
        if (this.isInitialized) {
            console.warn('UIManager already initialized');
            return this;
        }
        
        console.log('Initializing RIFT UI Manager...');
        
        // Register global event listeners
        window.addEventListener('resize', this._onWindowResize);
        
        // Initialize each UI system
        this._initSystems();
        
        // Setup FPS counter if enabled
        if (this.config.debug?.showFps) {
            this._setupFPSCounter();
        }
        
        this.isInitialized = true;
        console.log('RIFT UI Manager initialized');
        
        // Emit initialization event
        if (EventManager) {
            EventManager.emit('ui:initialized', { manager: this });
        }
        
        return this;
    }
    
    /**
     * Initialize all UI subsystems
     * @private
     */
    _initSystems() {
        // Create system instances
        // We'll gradually replace the placeholders as we implement each system
        this.systems = {
            hud: new HUDSystem(this.world),
            combat: new CombatSystem(this.world),
            notifications: new NotificationSystem(this.world),
            menus: new MenuSystem(this.world),
            environment: new EnvironmentSystem({ world: this.world }),
            // Keep screens for backward compatibility - the MenuSystem will manage this
            screens: { 
                init: () => {}, 
                update: () => {},
                // Proxy these methods to call the MenuSystem methods
                showScreen: (id, options) => this.systems.menus?.showScreen(id, options),
                hideScreen: (options) => this.systems.menus?.hideScreen(options),
                goBack: (options) => this.systems.menus?.goBackScreen(options),
                showModal: (id, options) => this.systems.menus?.showModal(id, options),
                hideModal: (id) => this.systems.menus?.hideModal(id),
                registerScreen: (id, options) => this.systems.menus?.registerScreen(id, options),
                registerModal: (id, options) => this.systems.menus?.registerModal(id, options)
            },
            markers: { init: () => {}, update: () => {} },
            progression: new ProgressionSystem(this.world),
            effects: {
                damage: { init: () => {}, update: () => {} },
                // Weather is now handled by the EnvironmentSystem
                weather: {
                    init: () => {
                        console.log('Legacy weather system redirecting to EnvironmentSystem');
                    },
                    update: () => {},
                    // Proxy methods to the new environment system for backward compatibility
                    setWeather: (type, intensity) => this.systems.environment?.setWeather(type, intensity)
                },
                screenShake: { init: () => {}, update: () => {} },
                // Note: FootstepIndicator is now handled by CombatSystem
                footsteps: { 
                    init: () => {
                        if (EventManager && this.systems.combat?.footstepIndicator) {
                            console.log('Registering footstep event handlers');
                            
                            // Listen for entity footstep events and pass to combat system
                            EventManager.on('entity:footstep', (data) => {
                                if (this.systems.combat) {
                                    // Extract the info we need for FootstepIndicator
                                    const footstepData = {
                                        angle: data.angle,
                                        distance: data.distance,
                                        isEnemy: data.isEnemy || !data.isFriendly, // Default to enemy if not specified
                                        count: data.count || 1, // Default to single footstep
                                        entityId: data.entityId
                                    };
                                    
                                    // Pass to combat system's footstep indicator
                                    this.systems.combat.footstepIndicator.showFootstepFrom(footstepData);
                                }
                            });
                        }
                    }, 
                    update: () => {} 
                }
            },
            debug: { init: () => {}, update: () => {} }
        };
        
        // Initialize each system
        for (const key in this.systems) {
            const system = this.systems[key];
            
            // Check if it's a direct system or a group
            if (typeof system.init === 'function') {
                system.init();
            } else if (typeof system === 'object') {
                // It's a group of systems (like effects)
                for (const subKey in system) {
                    if (typeof system[subKey].init === 'function') {
                        system[subKey].init();
                    }
                }
            }
        }
    }
    
    /**
     * Update method called each frame to update all UI components
     * @param {Number} delta - Time elapsed since last frame in seconds
     * @return {UIManager} This UIManager instance
     */
    update(delta) {
        // Skip updates if not initialized
        if (!this.isInitialized) return this;
        
        // Skip most updates if game is paused (except critical UI)
        if (this.isGamePaused && this.activeView !== 'pause') {
            this._updateFPSCounter(performance.now());
            return this;
        }
        
        const now = performance.now();
        this.frameTime += delta;
        
        // Update FPS counter
        this._updateFPSCounter(now);
        
        // Update each system
        for (const key in this.systems) {
            const system = this.systems[key];
            
            // Check if it's a direct system or a group
            if (typeof system.update === 'function') {
                system.update(delta);
            } else if (typeof system === 'object') {
                // It's a group of systems (like effects)
                for (const subKey in system) {
                    if (typeof system[subKey].update === 'function') {
                        system[subKey].update(delta);
                    }
                }
            }
        }
        
        return this;
    }
    
    /**
     * Setup the FPS counter
     * @private
     */
    _setupFPSCounter() {
        if (this.fpsCounter.element) return;
        
        this.fpsCounter.element = DOMFactory.createElement('div', {
            id: 'fpsCounter',
            text: '0 FPS',
            className: 'rift-fps-counter',
            styles: {
                position: 'fixed',
                top: '10px',
                right: '10px',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                color: '#00ff00',
                padding: '5px 10px',
                borderRadius: '4px',
                fontFamily: 'monospace',
                zIndex: this.config.zIndex.cursor
            },
            appendToBody: true
        });
    }
    
    /**
     * Update the FPS counter
     * @private
     * @param {Number} timestamp - Current timestamp
     */
    _updateFPSCounter(timestamp) {
        if (!this.config.debug?.showFps || !this.fpsCounter.element) return;
        
        this.fpsCounter.frames++;
        
        if (timestamp > this.fpsCounter.lastTime + 1000) {
            this.fpsCounter.fps = Math.round((this.fpsCounter.frames * 1000) / 
                (timestamp - this.fpsCounter.lastTime));
                
            this.fpsCounter.lastTime = timestamp;
            this.fpsCounter.frames = 0;
            this.fpsCounter.element.textContent = `${this.fpsCounter.fps} FPS`;
            
            // Update color based on performance
            if (this.fpsCounter.fps >= 60) {
                this.fpsCounter.element.style.color = '#00ff00'; // Good
            } else if (this.fpsCounter.fps >= 30) {
                this.fpsCounter.element.style.color = '#ffff00'; // OK
            } else {
                this.fpsCounter.element.style.color = '#ff0000'; // Poor
            }
        }
    }
    
    /**
     * Handle window resize event
     * @private
     */
    _onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.setSize(width, height);
        
        // Emit resize event
        if (EventManager) {
            EventManager.emit('ui:resize', { width, height });
        }
    }
    
    /**
     * Update UI elements' sizes based on window dimensions
     * @param {Number} width - Window width
     * @param {Number} height - Window height
     * @return {UIManager} This UIManager instance
     */
    setSize(width, height) {
        // Update each system that needs resizing
        for (const key in this.systems) {
            const system = this.systems[key];
            
            if (typeof system.setSize === 'function') {
                system.setSize(width, height);
            } else if (typeof system === 'object') {
                // It's a group of systems
                for (const subKey in system) {
                    if (typeof system[subKey].setSize === 'function') {
                        system[subKey].setSize(width, height);
                    }
                }
            }
        }
        
        return this;
    }
    
    /**
     * Show the FPS interface elements
     * @return {UIManager} This UIManager instance
     */
    showFPSInterface() {
        this.activeView = 'game';
        
        // Show HUD
        if (this.systems.hud?.show) {
            this.systems.hud.show();
        }
        
        // Emit event
        if (EventManager) {
            EventManager.emit('ui:view:changed', { view: 'game' });
        }
        
        return this;
    }
    
    /**
     * Hide the FPS interface elements
     * @return {UIManager} This UIManager instance
     */
    hideFPSInterface() {
        // Hide HUD
        if (this.systems.hud?.hide) {
            this.systems.hud.hide();
        }
        
        // Emit event
        if (EventManager) {
            EventManager.emit('ui:view:changed', { view: 'hidden' });
        }
        
        return this;
    }
    
    /**
     * Toggle game pause state
     * @param {Boolean} isPaused - Whether the game should be paused
     * @return {UIManager} This UIManager instance
     */
    setPaused(isPaused) {
        this.isGamePaused = isPaused;
        
        // Emit event
        if (EventManager) {
            EventManager.emit('ui:pause:changed', { paused: isPaused });
        }
        
        return this;
    }
    
    /**
     * Add notification to the notification system
     * @param {String} text - Notification text
     * @param {String} type - Notification type (info, warning, error, success)
     * @param {Object} options - Additional notification options
     * @return {UIManager} This UIManager instance
     */
    addNotification(text, type = 'info', options = {}) {
        if (this.systems.notifications?.addNotification) {
            this.systems.notifications.addNotification(text, type, options);
        } else {
            console.log(`[Notification] ${type}: ${text}`);
        }
        
        return this;
    }
    
    /**
     * Show a match event banner
     * @param {String} text - Event text
     * @param {String} className - CSS class for styling
     * @param {Object} options - Additional banner options
     * @return {UIManager} This UIManager instance
     */
    showMatchEvent(text, className = '', options = {}) {
        if (this.systems.notifications?.showMatchEvent) {
            this.systems.notifications.showMatchEvent(text, className);
        } else {
            console.log(`[Match Event] ${text}`);
        }
        
        return this;
    }
    
    /**
     * Show an event banner
     * @param {String} text - Banner text
     * @param {String} type - Banner type: 'default', 'objective', 'alert', 'success', 'danger'
     * @param {Object} options - Additional options (title, subtitle, duration)
     * @return {UIManager} This UIManager instance
     */
    showBanner(text, type = 'default', options = {}) {
        if (this.systems.notifications?.showBanner) {
            this.systems.notifications.showBanner(text, type, options);
        } else {
            console.log(`[Banner] ${type}: ${text}`);
        }
        
        return this;
    }
    
    /**
     * Show a round outcome banner (victory, defeat, draw)
     * @param {String} outcome - The outcome: 'victory', 'defeat', or 'draw'
     * @param {String} subtitle - Optional subtitle text
     * @return {UIManager} This UIManager instance
     */
    showRoundOutcome(outcome, subtitle = '') {
        if (this.systems.notifications?.showRoundOutcome) {
            this.systems.notifications.showRoundOutcome(outcome, subtitle);
        } else {
            console.log(`[Round Outcome] ${outcome}: ${subtitle}`);
        }
        
        return this;
    }
    
    /**
     * Show an achievement notification
     * @param {Object} achievement - Achievement data object
     * @return {UIManager} This UIManager instance
     */
    showAchievement(achievement) {
        if (this.systems.notifications?.showAchievement) {
            this.systems.notifications.showAchievement(achievement);
        } else {
            console.log(`[Achievement] ${achievement.title}: ${achievement.description}`);
        }
        
        return this;
    }
    
    /**
     * Show a screen using the screen manager
     * @param {String} id - Screen identifier
     * @param {Object} options - Additional options for the screen
     * @return {UIManager} This UIManager instance
     */
    showScreen(id, options = {}) {
        if (this.systems.screens?.showScreen) {
            this.systems.screens.showScreen(id, options);
            
            // Update active view
            this.activeView = 'menu';
            
            // Emit view change event
            if (EventManager) {
                EventManager.emit('ui:view:changed', { view: 'menu', screen: id });
            }
        } else {
            console.log(`[Screen] Show: ${id}`);
        }
        
        return this;
    }
    
    /**
     * Hide the current screen
     * @param {Object} options - Additional options
     * @return {UIManager} This UIManager instance
     */
    hideScreen(options = {}) {
        if (this.systems.screens?.hideScreen) {
            this.systems.screens.hideScreen(options);
            
            // Update active view back to game
            this.activeView = 'game';
            
            // Emit view change event
            if (EventManager) {
                EventManager.emit('ui:view:changed', { view: 'game' });
            }
        } else {
            console.log('[Screen] Hide current screen');
        }
        
        return this;
    }
    
    /**
     * Navigate back to the previous screen
     * @param {Object} options - Additional navigation options
     * @return {UIManager} This UIManager instance
     */
    goBackScreen(options = {}) {
        if (this.systems.screens?.goBack) {
            this.systems.screens.goBack(options);
        } else {
            console.log('[Screen] Go back');
        }
        
        return this;
    }
    
    /**
     * Show a modal dialog
     * @param {String} id - Modal identifier
     * @param {Object} options - Additional options
     * @return {UIManager} This UIManager instance
     */
    showModal(id, options = {}) {
        if (this.systems.screens?.showModal) {
            this.systems.screens.showModal(id, options);
        } else {
            console.log(`[Modal] Show: ${id}`);
        }
        
        return this;
    }
    
    /**
     * Hide a modal dialog
     * @param {String} id - Modal identifier
     * @return {UIManager} This UIManager instance
     */
    hideModal(id) {
        if (this.systems.screens?.hideModal) {
            this.systems.screens.hideModal(id);
        } else {
            console.log(`[Modal] Hide: ${id}`);
        }
        
        return this;
    }
    
    /**
     * Register a screen with the screen manager
     * @param {String} id - Screen identifier
     * @param {Object} options - Screen options
     * @return {UIManager} This UIManager instance
     */
    registerScreen(id, options = {}) {
        if (this.systems.screens?.registerScreen) {
            this.systems.screens.registerScreen(id, options);
        } else {
            console.log(`[Screen] Register: ${id}`);
        }
        
        return this;
    }
    
    /**
     * Register a modal with the screen manager
     * @param {String} id - Modal identifier
     * @param {Object} options - Modal options
     * @return {UIManager} This UIManager instance
     */
    registerModal(id, options = {}) {
        if (this.systems.screens?.registerModal) {
            this.systems.screens.registerModal(id, options);
        } else {
            console.log(`[Modal] Register: ${id}`);
        }
        
        return this;
    }
    
    /**
     * Set the current weather type
     * @param {string} type - Weather type ('rain', 'snow', 'fog', 'clear')
     * @param {string} intensity - Weather intensity ('light', 'moderate', 'heavy', 'storm')
     * @return {UIManager} This UIManager instance
     */
    setWeather(type, intensity = 'moderate') {
        if (this.systems.environment?.setWeather) {
            this.systems.environment.setWeather(type, intensity);
            console.log(`[UIManager] Setting weather: ${type} (${intensity})`);
        } else if (this.systems.effects?.weather?.setWeather) {
            // Fallback to legacy weather system
            this.systems.effects.weather.setWeather(type, intensity);
        } else {
            console.log(`[UIManager] Weather system not available`);
        }
        
        return this;
    }

    /**
     * Test different weather types (helper method for development)
     * @param {string} weatherType - Weather type to test ('rain', 'snow', 'fog', 'clear')
     * @param {string} intensity - Weather intensity ('light', 'moderate', 'heavy', 'storm')
     * @return {UIManager} This UIManager instance
     */
    testWeather(weatherType = 'rain', intensity = 'moderate') {
        if (this.systems.environment?.testWeather) {
            this.systems.environment.testWeather(weatherType, intensity);
        } else {
            this.setWeather(weatherType, intensity);
        }
        
        return this;
    }
    
    /**
     * Add an objective marker to the world
     * @param {Object} markerData - Marker data
     * @returns {Object} The created marker object
     */
    addMarker(markerData) {
        if (this.systems.environment?.addMarker) {
            return this.systems.environment.addMarker(markerData);
        }
        
        console.log('[UIManager] Environment system not available for addMarker');
        return null;
    }
    
    /**
     * Update an existing marker
     * @param {string} id - Marker ID
     * @param {Object} updates - Properties to update
     * @returns {Object} Updated marker or null if not found
     */
    updateMarker(id, updates) {
        if (this.systems.environment?.updateMarker) {
            return this.systems.environment.updateMarker(id, updates);
        }
        
        console.log('[UIManager] Environment system not available for updateMarker');
        return null;
    }
    
    /**
     * Remove a marker
     * @param {string} id - Marker ID
     * @returns {boolean} True if marker was removed
     */
    removeMarker(id) {
        if (this.systems.environment?.removeMarker) {
            return this.systems.environment.removeMarker(id);
        }
        
        console.log('[UIManager] Environment system not available for removeMarker');
        return false;
    }
    
    /**
     * Set a player waypoint
     * @param {Object} position - 3D position {x, y, z}
     * @param {string} label - Optional waypoint label
     * @returns {Object} Created waypoint marker
     */
    setWaypoint(position, label = 'Waypoint') {
        if (this.systems.environment?.setWaypoint) {
            return this.systems.environment.setWaypoint(position, label);
        }
        
        console.log('[UIManager] Environment system not available for setWaypoint');
        return null;
    }
    
    /**
     * Remove player waypoint
     * @returns {boolean} True if waypoint was removed
     */
    removeWaypoint() {
        if (this.systems.environment?.removeWaypoint) {
            return this.systems.environment.removeWaypoint();
        }
        
        console.log('[UIManager] Environment system not available for removeWaypoint');
        return false;
    }
    
    /**
     * Test objective marker (helper method for development)
     * @param {string} markerType - Marker type to create ('primary', 'secondary', 'waypoint', 'item', 'danger')
     * @param {string} iconType - Icon type to use ('attack', 'defend', 'capture', 'waypoint', 'health', 'ammo', 'weapon', 'danger')
     * @return {UIManager} This UIManager instance
     */
    testMarker(markerType = 'primary', iconType = 'waypoint') {
        if (this.systems.environment?.testMarker) {
            this.systems.environment.testMarker(markerType, iconType);
            console.log(`[UIManager] Testing marker: ${markerType} (${iconType})`);
        } else {
            console.log('[UIManager] Environment system not available for testMarker');
        }
        
        return this;
    }
    
    /**
     * Test method to simulate a footstep at a given angle and distance
     * For development/debugging only
     * 
     * @param {Object} options - Footstep options
     * @param {number} options.angle - Direction angle in degrees (0-360)
     * @param {number} options.distance - Distance in world units
     * @param {boolean} options.isEnemy - Whether it's an enemy footstep (true) or friendly (false)
     * @param {number} options.count - Number of footsteps in sequence
     * @return {UIManager} This UIManager instance
     */
    testFootstepIndicator(options = {}) {
        const defaults = {
            angle: Math.floor(Math.random() * 360),
            distance: Math.floor(Math.random() * 15) + 5,
            isEnemy: true,
            count: 1
        };
        
        const footstepData = { ...defaults, ...options };
        
        if (this.systems.combat?.testFootstepIndicator) {
            const intensity = footstepData.distance <= 4 ? 'high' : 
                            footstepData.distance <= 12 ? 'medium' : 'low';
                            
            this.systems.combat.testFootstepIndicator(
                intensity, 
                footstepData.angle, 
                footstepData.isEnemy, 
                footstepData.count
            );
            
            console.log(`Test footstep: ${footstepData.isEnemy ? 'Enemy' : 'Friendly'} at ${footstepData.angle}° (${footstepData.distance} units away)`);
        }
        
        return this;
    }
    
    /**
     * Clean up and dispose of all UI systems
     * @return {UIManager} This UIManager instance
     */
    dispose() {
        // Remove event listeners
        window.removeEventListener('resize', this._onWindowResize);
        
        // Dispose each system
        for (const key in this.systems) {
            const system = this.systems[key];
            
            if (typeof system.dispose === 'function') {
                system.dispose();
            } else if (typeof system === 'object') {
                // It's a group of systems
                for (const subKey in system) {
                    if (typeof system[subKey].dispose === 'function') {
                        system[subKey].dispose();
                    }
                }
            }
        }
        
        // Remove FPS counter
        if (this.fpsCounter.element?.parentNode) {
            this.fpsCounter.element.remove();
            this.fpsCounter.element = null;
        }
        
        this.isInitialized = false;
        
        // Emit event
        if (EventManager) {
            EventManager.emit('ui:disposed', { manager: this });
        }
        
        return this;
    }
}

export default UIManager;
