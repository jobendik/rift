/**
 * WorldMapScreen.js
 * Integration file for the WorldMap component - initializes and registers
 * the world map with the ScreenManager system.
 * 
 * @author Cline
 */

import WorldMap from './WorldMap.js';
import { EventManager } from '../../../core/EventManager.js';

export default class WorldMapScreen {
    /**
     * Creates a new WorldMapScreen handler
     * @param {Object} options - Configuration options
     * @param {World} options.world - Reference to the game world
     * @param {ScreenManager} options.screenManager - Reference to the screen manager
     */
    constructor(options = {}) {
        this.world = options.world;
        this.screenManager = options.screenManager;
        this.worldMap = null;
        this.isInitialized = false;
        
        // Configuration - using a simple fallback config since UIConfig might not be available
        this.config = {
            title: 'World Map',
            pauseGameWhenActive: true
        };
        
        // Bind methods
        this._onShowWorldMap = this._onShowWorldMap.bind(this);
        this._onHideWorldMap = this._onHideWorldMap.bind(this);
        this._onToggleWorldMap = this._onToggleWorldMap.bind(this);
    }
    
    /**
     * Initialize the world map screen
     * @returns {WorldMapScreen} This instance for chaining
     */
    init() {
        if (this.isInitialized) {
            console.warn('WorldMapScreen already initialized');
            return this;
        }
        
        // Register with screen manager
        if (this.screenManager) {
            this._registerWorldMapScreen();
        } else {
            console.warn('No screen manager provided to WorldMapScreen');
        }
        
        // Register event listeners
        EventManager.on('ui:toggleWorldMap', this._onToggleWorldMap);
        EventManager.on('ui:showWorldMap', this._onShowWorldMap);
        EventManager.on('ui:hideWorldMap', this._onHideWorldMap);
        
        this.isInitialized = true;
        return this;
    }
    
    /**
     * Register the world map screen with the screen manager
     * @private
     */
    _registerWorldMapScreen() {
        // Register the world map screen with the screen manager
        const screenElement = this.screenManager.registerScreen('world-map', {
            title: this.config.title || 'World Map',
            allowBackNav: true,
            className: 'rift-screen--world-map',
            onShow: (data) => this._onShowWorldMap(data),
            onHide: () => this._onHideWorldMap()
        });
        
        // Create the world map component inside the screen content
        const screenContent = screenElement.querySelector('.rift-screen__body');
        
        if (screenContent) {
            try {
                // Create the world map instance with proper options
                this.worldMap = new WorldMap({
                    world: this.world,
                    container: screenContent,
                    autoInit: false  // Prevent auto-initialization to control the process
                });
                
                // Initialize the world map to create the element
                this.worldMap.init();
                
                // The WorldMap extends UIComponent which should create this.worldMap.element
                // But let's check if it was created properly
                if (this.worldMap.element && this.worldMap.element.nodeType === Node.ELEMENT_NODE) {
                    // Element exists and is a proper DOM node
                    screenContent.appendChild(this.worldMap.element);
                    console.log('WorldMap successfully added to screen content');
                } else {
                    console.error('WorldMap element not created properly:', this.worldMap.element);
                    
                    // Fallback: create a simple placeholder
                    const fallbackElement = document.createElement('div');
                    fallbackElement.className = 'rift-world-map-fallback';
                    fallbackElement.innerHTML = '<p>World Map temporarily unavailable</p>';
                    screenContent.appendChild(fallbackElement);
                }
            } catch (error) {
                console.error('Error creating WorldMap:', error);
                
                // Create a fallback element
                const errorElement = document.createElement('div');
                errorElement.className = 'rift-world-map-error';
                errorElement.innerHTML = `<p>Error loading World Map: ${error.message}</p>`;
                screenContent.appendChild(errorElement);
            }
        } else {
            console.error('Could not find screen content area for world map');
        }
    }
    
    /**
     * Handle show world map event
     * @private
     * @param {Object} data - Event data
     */
    _onShowWorldMap(data = {}) {
        if (this.config.pauseGameWhenActive && this.world) {
            // Store the previous pause state
            this._wasPaused = this.world.isPaused;
            
            // Pause the game if it's not already paused
            if (!this._wasPaused && typeof this.world.pause === 'function') {
                this.world.pause();
            }
        }
        
        // If the map needs additional data when shown
        if (this.worldMap) {
            // If we were given a specific area to focus on
            if (data.focusAreaId && typeof this.worldMap.focusOnArea === 'function') {
                this.worldMap.focusOnArea(data.focusAreaId);
            }
            
            // If we were given a waypoint to set/highlight
            if (data.waypoint && typeof this.worldMap._onWaypointAdded === 'function') {
                this.worldMap._onWaypointAdded({
                    position: data.waypoint.position,
                    id: data.waypoint.id || `waypoint-${Date.now()}`,
                    name: data.waypoint.name || 'New Waypoint',
                    active: true
                });
            }
            
            // If we need to highlight an objective
            if (data.objectiveId && typeof this.worldMap.highlightObjective === 'function') {
                this.worldMap.highlightObjective(data.objectiveId);
            }
        }
        
        // Emit event that world map is open
        EventManager.emit('worldMap:opened', data);
    }
    
    /**
     * Handle hide world map event
     * @private
     */
    _onHideWorldMap() {
        // If we paused the game when opening, resume it now
        if (this.config.pauseGameWhenActive && this.world && !this._wasPaused) {
            if (typeof this.world.resume === 'function') {
                this.world.resume();
            }
        }
        
        // Emit event that world map is closed
        EventManager.emit('worldMap:closed', {});
    }
    
    /**
     * Handle toggle world map event
     * @private
     * @param {Object} data - Event data
     */
    _onToggleWorldMap(data = {}) {
        if (this.screenManager) {
            // Check if the world map screen is currently active
            if (this.screenManager.currentScreen === 'world-map') {
                // If it's active, hide it
                this.screenManager.hideScreen();
            } else {
                // If it's not active, show it
                this.screenManager.showScreen('world-map', {
                    data: data
                });
            }
        }
    }
    
    /**
     * Show the world map
     * @param {Object} options - Show options
     */
    show(options = {}) {
        if (this.screenManager) {
            this.screenManager.showScreen('world-map', {
                data: options
            });
        }
    }
    
    /**
     * Hide the world map
     */
    hide() {
        if (this.screenManager && this.screenManager.currentScreen === 'world-map') {
            this.screenManager.hideScreen();
        }
    }
    
    /**
     * Set focus on a specific area on the map
     * @param {string} areaId - Area identifier
     */
    focusOnArea(areaId) {
        if (this.worldMap && typeof this.worldMap.focusOnArea === 'function') {
            this.worldMap.focusOnArea(areaId);
        }
    }
    
    /**
     * Set a waypoint on the map
     * @param {Object} waypoint - Waypoint data
     */
    setWaypoint(waypoint) {
        if (this.worldMap && typeof this.worldMap._onWaypointAdded === 'function') {
            this.worldMap._onWaypointAdded(waypoint);
        }
    }
    
    /**
     * Highlight an objective on the map
     * @param {string} objectiveId - Objective identifier
     */
    highlightObjective(objectiveId) {
        if (this.worldMap && typeof this.worldMap.highlightObjective === 'function') {
            this.worldMap.highlightObjective(objectiveId);
        }
    }
    
    /**
     * Update method called each frame
     * @param {number} delta - Time since last frame in seconds
     */
    update(delta) {
        // Only update if visible
        if (this.worldMap && this.screenManager?.currentScreen === 'world-map') {
            if (typeof this.worldMap.update === 'function') {
                this.worldMap.update(delta);
            }
        }
    }
    
    /**
     * Cleanup and dispose of resources
     */
    dispose() {
        // Remove event listeners
        EventManager.off('ui:toggleWorldMap', this._onToggleWorldMap);
        EventManager.off('ui:showWorldMap', this._onShowWorldMap);
        EventManager.off('ui:hideWorldMap', this._onHideWorldMap);
        
        // Dispose of the world map component
        if (this.worldMap) {
            if (typeof this.worldMap.dispose === 'function') {
                this.worldMap.dispose();
            }
            this.worldMap = null;
        }
        
        this.isInitialized = false;
    }
}
