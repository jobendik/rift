/**
 * EnvironmentSystem.js
 * 
 * Manages all environmental UI effects such as weather, objective markers,
 * danger zones, and power-up displays.
 * 
 * This system coordinates various environmental components and manages their
 * interaction with the game world.
 */

import UIComponent from '../UIComponent.js';
import { EventManager } from '../../../core/EventManager.js';
import WeatherSystem from './WeatherSystem.js';
import ObjectiveMarkerSystem from './ObjectiveMarkerSystem.js';
import DangerZone from './DangerZone.js';
import PowerupDisplay from './PowerupDisplay.js';

class EnvironmentSystem extends UIComponent {
    /**
     * Creates a new EnvironmentSystem instance.
     * @param {Object} options - Configuration options
     * @param {World} options.world - World instance
     */
    constructor(options = {}) {
        super({
            id: 'environment-system',
            className: 'rift-environment',
            template: '<div class="rift-environment__content"></div>',
            container: options.container || document.body,
            ...options
        });

        this.world = options.world;
        this.activeWeather = null;
        this.isInitialized = false;

        // Bind methods
        this._onGamePauseChange = this._onGamePauseChange.bind(this);
    }

    /**
     * Initialize the environment system
     */
    init() {
        if (this.isInitialized) return this;

        // Create main element
        super.init();

        // Get content container
        this.content = this.element.querySelector('.rift-environment__content');

        // Initialize subsystems
        this._initWeatherSystem();
        this._initObjectiveMarkerSystem();
        this._initDangerZoneSystem();
        // Initialize powerup display system
        this._initPowerupDisplaySystem();

        // Register events
        this.registerEvents({
            'game:pause': this._onGamePauseChange,
            'game:resume': this._onGamePauseChange,
            'weather:change': this._onWeatherChange,
            'environment:update': this._onEnvironmentUpdate
        });

        this.isInitialized = true;
        return this;
    }

    /**
     * Update the environment system
     * @param {number} delta - Time elapsed since last update in seconds
     */
    update(delta) {
        if (!this.isInitialized || !this.isVisible) return;

        // Update subsystems
        if (this.weatherSystem) {
            this.weatherSystem.update(delta);
        }

        if (this.objectiveMarkerSystem) {
            this.objectiveMarkerSystem.update(delta);
        }

        if (this.dangerZoneSystem) {
            this.dangerZoneSystem.update(delta);
        }
        
        if (this.powerupDisplaySystem) {
            this.powerupDisplaySystem.update(delta);
        }
    }

    /**
     * Set the current weather type
     * @param {string} type - Weather type ('rain', 'snow', 'fog', 'clear')
     * @param {string} intensity - Weather intensity ('light', 'moderate', 'heavy', 'storm')
     */
    setWeather(type, intensity = 'moderate') {
        if (!this.weatherSystem) return this;
        this.weatherSystem.setWeatherType(type, intensity);
        return this;
    }

    /**
     * Get the current weather system
     * @returns {WeatherSystem} The weather system instance
     */
    getWeatherSystem() {
        return this.weatherSystem;
    }
    
    /**
     * Get the objective marker system
     * @returns {ObjectiveMarkerSystem} The objective marker system instance
     */
    getObjectiveMarkerSystem() {
        return this.objectiveMarkerSystem;
    }
    
    /**
     * Get the danger zone system
     * @returns {DangerZone} The danger zone system instance
     */
    getDangerZoneSystem() {
        return this.dangerZoneSystem;
    }
    
    /**
     * Get the powerup display system
     * @returns {PowerupDisplay} The powerup display system instance
     */
    getPowerupDisplaySystem() {
        return this.powerupDisplaySystem;
    }
    
    /**
     * Add a new objective marker
     * @param {Object} markerData - Marker data
     * @returns {Object} The created marker object
     */
    addMarker(markerData) {
        if (!this.objectiveMarkerSystem) return null;
        return this.objectiveMarkerSystem.addMarker(markerData);
    }
    
    /**
     * Update an existing marker
     * @param {string} id - Marker ID
     * @param {Object} updates - Properties to update
     * @returns {Object} Updated marker or null if not found
     */
    updateMarker(id, updates) {
        if (!this.objectiveMarkerSystem) return null;
        return this.objectiveMarkerSystem.updateMarker(id, updates);
    }
    
    /**
     * Remove a marker
     * @param {string} id - Marker ID
     * @returns {boolean} True if marker was removed
     */
    removeMarker(id) {
        if (!this.objectiveMarkerSystem) return false;
        return this.objectiveMarkerSystem.removeMarker(id);
    }
    
    /**
     * Set a player waypoint
     * @param {Object} position - 3D position {x, y, z}
     * @param {string} label - Optional waypoint label
     * @returns {Object} Created waypoint marker
     */
    setWaypoint(position, label = 'Waypoint') {
        if (!this.objectiveMarkerSystem) return null;
        return this.objectiveMarkerSystem.setWaypoint(position, label);
    }
    
    /**
     * Remove player waypoint
     * @returns {boolean} True if waypoint was removed
     */
    removeWaypoint() {
        if (!this.objectiveMarkerSystem) return false;
        return this.objectiveMarkerSystem.removeWaypoint();
    }

    /**
     * Add a new danger zone
     * @param {Object} zoneData - Zone configuration
     * @returns {Object} Created zone data
     */
    addDangerZone(zoneData) {
        if (!this.dangerZoneSystem) return null;
        return this.dangerZoneSystem.addZone(zoneData);
    }

    /**
     * Update an existing danger zone
     * @param {string} id - Zone ID
     * @param {Object} updates - Properties to update
     * @returns {Object|null} Updated zone data or null if not found
     */
    updateDangerZone(id, updates) {
        if (!this.dangerZoneSystem) return null;
        return this.dangerZoneSystem.updateZone(id, updates);
    }

    /**
     * Remove a danger zone
     * @param {string} id - Zone ID
     * @returns {boolean} True if zone was removed
     */
    removeDangerZone(id) {
        if (!this.dangerZoneSystem) return false;
        return this.dangerZoneSystem.removeZone(id);
    }

    /**
     * Clear all danger zones
     * @returns {this} For chaining
     */
    clearDangerZones() {
        if (this.dangerZoneSystem) {
            this.dangerZoneSystem.clearZones();
        }
        return this;
    }

    /**
     * Check if player is in any danger zones
     * @returns {Object} Proximity data with closestZone, closestDistance, etc.
     */
    checkPlayerDangerProximity() {
        if (!this.dangerZoneSystem) return { inDanger: false };
        return this.dangerZoneSystem.checkPlayerInDanger();
    }
    
    /**
     * Add a new powerup to display
     * @param {Object} powerupData - Powerup configuration
     * @returns {Object} Created powerup data
     */
    addPowerup(powerupData) {
        if (!this.powerupDisplaySystem) return null;
        return this.powerupDisplaySystem.addPowerup(powerupData);
    }
    
    /**
     * Remove a powerup
     * @param {string} id - Powerup ID
     * @returns {boolean} True if powerup was removed
     */
    removePowerup(id) {
        if (!this.powerupDisplaySystem) return false;
        return this.powerupDisplaySystem.removePowerup(id);
    }
    
    /**
     * Update an existing powerup
     * @param {string} id - Powerup ID
     * @param {Object} updates - Properties to update
     * @returns {Object|null} Updated powerup data or null if not found
     */
    updatePowerup(id, updates) {
        if (!this.powerupDisplaySystem) return null;
        return this.powerupDisplaySystem.updatePowerup(id, updates);
    }
    
    /**
     * Get all active powerups
     * @returns {Array} Array of all powerup objects
     */
    getAllPowerups() {
        if (!this.powerupDisplaySystem) return [];
        return this.powerupDisplaySystem.getAllPowerups();
    }

    /**
     * Initialize the weather system
     * @private
     */
    _initWeatherSystem() {
        this.weatherSystem = new WeatherSystem({
            container: this.content,
            world: this.world
        });
        
        this.weatherSystem.init();
        this.addChild(this.weatherSystem);
    }
    
    /**
     * Initialize the objective marker system
     * @private
     */
    _initObjectiveMarkerSystem() {
        this.objectiveMarkerSystem = new ObjectiveMarkerSystem({
            container: this.content,
            world: this.world
        });
        
        this.objectiveMarkerSystem.init();
        this.addChild(this.objectiveMarkerSystem);
    }
    
    /**
     * Initialize the danger zone system
     * @private
     */
    _initDangerZoneSystem() {
        this.dangerZoneSystem = new DangerZone({
            container: this.content,
            world: this.world
        });
        
        this.dangerZoneSystem.init();
        this.addChild(this.dangerZoneSystem);
    }
    
    /**
     * Initialize the powerup display system
     * @private
     */
    _initPowerupDisplaySystem() {
        this.powerupDisplaySystem = new PowerupDisplay({
            container: this.content,
            world: this.world
        });
        
        this.powerupDisplaySystem.init();
        this.addChild(this.powerupDisplaySystem);
    }

    /**
     * Handle game pause state changes
     * @param {Object} event - Event data
     * @private
     */
    _onGamePauseChange(event) {
        const isPaused = this.world?.isGamePaused || false;
        
        // If configured to pause weather effects when game is paused
        if (this.config.weather.pauseWhenGamePaused) {
            if (this.weatherSystem) {
                if (isPaused) {
                    this.weatherSystem.pause();
                } else {
                    this.weatherSystem.resume();
                }
            }
        }
    }

    /**
     * Handle weather change events
     * @param {Object} event - Event data
     * @private
     */
    _onWeatherChange(event) {
        if (!event || !event.type || !event.intensity) return;
        
        this.setWeather(event.type, event.intensity);
    }

    /**
     * Handle general environment updates
     * @param {Object} event - Event data
     * @private
     */
    _onEnvironmentUpdate(event) {
        // Handle general environment updates
        // This will be expanded as more environmental systems are added
    }

    /**
     * Test function to demonstrate different weather types
     * @param {string} weatherType - Weather type to demonstrate ('rain', 'snow', 'fog', 'clear')
     * @param {string} intensity - Weather intensity ('light', 'moderate', 'heavy', 'storm')
     */
    testWeather(weatherType = 'rain', intensity = 'moderate') {
        if (!this.weatherSystem) return this;
        
        console.log(`[EnvironmentSystem] Testing weather: ${weatherType} (${intensity})`);
        this.setWeather(weatherType, intensity);
        
        return this;
    }
    
    /**
     * Test function to demonstrate objective markers
     * @param {string} markerType - Marker type to create ('primary', 'secondary', 'waypoint', 'item', 'danger')
     * @param {string} iconType - Icon type to use ('attack', 'defend', 'capture', 'waypoint', 'health', 'ammo', 'weapon', 'danger')
     */
    testMarker(markerType = 'primary', iconType = 'waypoint') {
        if (!this.objectiveMarkerSystem) return this;
        
        // Create a test position in front of the player
        let position = { x: 0, y: 0, z: 0 };
        
        if (this.world && this.world.player) {
            const player = this.world.player;
            const playerPos = player.position || { x: 0, y: 0, z: 0 };
            const playerRot = player.rotation || { y: 0 };
            
            // Place marker 20 units in front of player
            const angle = playerRot.y;
            position = {
                x: playerPos.x + Math.sin(angle) * 20,
                y: playerPos.y,
                z: playerPos.z + Math.cos(angle) * 20
            };
        }
        
        // Create descriptive label based on type
        let label = 'Test Marker';
        switch (markerType) {
            case 'primary': label = 'Primary Objective'; break;
            case 'secondary': label = 'Secondary Objective'; break;
            case 'waypoint': label = 'Custom Waypoint'; break;
            case 'item': label = 'Item Pickup'; break;
            case 'danger': label = 'Danger Zone'; break;
        }
        
        console.log(`[EnvironmentSystem] Testing marker: ${markerType} (${iconType}) at position:`, position);
        
        // Create the marker
        const marker = this.addMarker({
            id: `test-marker-${Date.now()}`,
            type: markerType,
            position,
            icon: iconType,
            label,
            showDistance: true,
            showOffscreen: true
        });
        
        // Highlight the marker
        if (marker && this.objectiveMarkerSystem) {
            this.objectiveMarkerSystem.highlightMarker(marker.id);
        }
        
        return this;
    }
    
    /**
     * Test function to demonstrate danger zones
     * @param {string} zoneType - Zone type to create ('radiation', 'fire', 'electrical', 'poison', 'explosive', 'generic')
     * @param {number} count - Number of zones to create (default: 1)
     * @param {Object} position - Optional position override, otherwise uses player position
     * @returns {Array} Array of created zone objects
     */
    testDangerZone(zoneType = 'radiation', count = 1, position = null) {
        if (!this.dangerZoneSystem) return [];
        
        // If specific position provided, use it
        if (position) {
            // Create zones at the specified position
            const zones = [];
            for (let i = 0; i < count; i++) {
                // Randomize position slightly if creating multiple
                const posVariation = count > 1 ? {
                    x: position.x + (Math.random() - 0.5) * 30,
                    y: position.y,
                    z: position.z + (Math.random() - 0.5) * 30
                } : position;
                
                const zone = this.addDangerZone({
                    type: zoneType,
                    position: posVariation,
                    shape: 'circular',
                    label: `${zoneType.charAt(0).toUpperCase() + zoneType.slice(1)} Zone`,
                    showIcon: true,
                    showLabel: true,
                    active: true
                });
                
                zones.push(zone);
            }
            
            console.log(`[EnvironmentSystem] Created ${count} danger zones of type '${zoneType}' at specified position`);
            return zones;
        }
        
        // Otherwise use dangerZoneSystem test function
        console.log(`[EnvironmentSystem] Testing danger zones: ${count} of type '${zoneType}'`);
        return this.dangerZoneSystem.testZones(zoneType, count);
    }
    
    /**
     * Test function to demonstrate powerups
     * @param {string} powerupType - Powerup type to create ('damage', 'speed', 'armor', 'health', 'ammo', 'invisible')
     * @param {number} duration - Duration in seconds (default: 10)
     * @returns {Object} Created powerup object
     */
    testPowerup(powerupType = 'damage', duration = 10) {
        if (!this.powerupDisplaySystem) return null;
        
        console.log(`[EnvironmentSystem] Testing powerup: ${powerupType} (${duration}s)`);
        return this.powerupDisplaySystem.testPowerup(powerupType, duration);
    }

    /**
     * Clean up resources when component is destroyed
     */
    dispose() {
        // Clean up subsystems
        if (this.weatherSystem) {
            this.weatherSystem.dispose();
        }
        
        if (this.objectiveMarkerSystem) {
            this.objectiveMarkerSystem.dispose();
        }
        
        if (this.dangerZoneSystem) {
            this.dangerZoneSystem.dispose();
        }
        
        if (this.powerupDisplaySystem) {
            this.powerupDisplaySystem.dispose();
        }
        
        // Unregister events and remove element
        super.dispose();
    }
}

export default EnvironmentSystem;
