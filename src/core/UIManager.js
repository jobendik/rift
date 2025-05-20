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
// import { NotificationSystem } from '../components/ui/notifications/NotificationSystem.js';
// import { ScreenManager } from '../components/ui/screens/ScreenManager.js';
// import { MarkerSystem } from '../components/ui/markers/MarkerSystem.js';
// import { ProgressionSystem } from '../components/ui/progression/ProgressionSystem.js';
// import { DamageEffects } from '../components/ui/effects/DamageEffects.js';
// import { WeatherSystem } from '../components/ui/effects/WeatherSystem.js';
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
            notifications: { init: () => {}, update: () => {} },
            screens: { init: () => {}, update: () => {} },
            markers: { init: () => {}, update: () => {} },
            progression: { init: () => {}, update: () => {} },
            effects: {
                damage: { init: () => {}, update: () => {} },
                weather: { init: () => {}, update: () => {} },
                screenShake: { init: () => {}, update: () => {} },
                footsteps: { init: () => {}, update: () => {} }
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
     * @return {UIManager} This UIManager instance
     */
    addNotification(text, type = 'info') {
        if (this.systems.notifications?.addNotification) {
            this.systems.notifications.addNotification(text, type);
        } else {
            console.log(`[Notification] ${type}: ${text}`);
        }
        
        return this;
    }
    
    /**
     * Show a match event banner
     * @param {String} text - Event text
     * @param {String} className - CSS class for styling
     * @return {UIManager} This UIManager instance
     */
    showMatchEvent(text, className = '') {
        if (this.systems.notifications?.showMatchEvent) {
            this.systems.notifications.showMatchEvent(text, className);
        } else {
            console.log(`[Match Event] ${text}`);
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
