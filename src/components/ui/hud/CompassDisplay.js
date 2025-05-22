/**
 * CompassDisplay component for the RIFT HUD.
 * Displays player orientation with cardinal directions and degree markers.
 * 
 * @author Cline
 */

import UIComponent from '../UIComponent.js';
import { EventManager } from '../../../core/EventManager.js';
import { DOMFactory } from '../../../utils/DOMFactory.js';

class CompassDisplay extends UIComponent {
    /**
     * Create a new compass display
     * @param {Object} options - Component options
     */
    constructor(options = {}) {
        super({
            autoInit: false,
            id: options.id || 'rift-compass',
            className: 'rift-compass',
            container: options.container || document.body,
            ...options
        });
        
        // Config from options
        this.showDegrees = options.showDegrees !== false;
        this.showCardinalMarkers = options.showCardinalMarkers !== false;
        
        // Compass-specific elements
        this.elements = {
            viewport: null,
            strip: null,
            centerIndicator: null,
            degrees: null,
            cardinals: {
                n: null,
                e: null,
                s: null,
                w: null
            },
            waypoints: [],
            enemies: []
        };
        
        // Cardinal directions in degrees
        this.cardinalPoints = {
            n: 0,
            e: 90,
            s: 180,
            w: 270
        };
        
        // Initialize state
        this.state = {
            playerRotation: 0, // In degrees
            waypoints: [],
            enemies: []
        };
        
        // Constants
        this.stripWidth = 2500;
        this.viewportWidth = 350;
        this.degreeWidth = this.stripWidth / 360;
        
        // Register events
        this.registerEvents({
            'player:rotation': this._onPlayerRotation,
            'waypoint:added': this._onWaypointAdded,
            'waypoint:removed': this._onWaypointRemoved,
            'enemy:spotted': this._onEnemySpotted,
            'enemy:lost': this._onEnemyLost
        });
    }
    
    /**
     * Initialize the compass display
     */
    init() {
        if (this.isInitialized) return this;
        
        // Call parent init to create root element
        super.init();
        
        // Create compass elements
        this._createCompassElements();
        
        // Initial render
        this.render();
        
        return this;
    }
    
    /**
     * Update compass display
     * @param {Number} delta - Time elapsed since last frame in seconds
     */
    update(delta) {
        if (!this.isInitialized || !this.isActive) return this;
        
        // Call parent update
        super.update(delta);
        
        return this;
    }
    
    /**
     * Create all compass UI elements
     * @private
     */
    _createCompassElements() {
        // Create viewport element
        this.elements.viewport = this.createElement('div', {
            className: 'rift-compass__viewport'
        });
        
        // Create compass strip element
        this.elements.strip = this.createElement('div', {
            className: 'rift-compass__strip',
            parent: this.elements.viewport
        });
        
        // Create center indicator
        this.elements.centerIndicator = this.createElement('div', {
            className: 'rift-compass__center-indicator',
            parent: this.element
        });
        
        // Create degree display if enabled
        if (this.showDegrees) {
            this.elements.degrees = this.createElement('div', {
                className: 'rift-compass__degrees',
                parent: this.element,
                text: '000Â°'
            });
        }
        
        // Create cardinal direction markers if enabled
        if (this.showCardinalMarkers) {
            // Create N, E, S, W markers
            Object.keys(this.cardinalPoints).forEach(direction => {
                this.elements.cardinals[direction] = this.createElement('div', {
                    className: `rift-compass__cardinal rift-compass__cardinal--${direction}`,
                    parent: this.element,
                    text: direction.toUpperCase()
                });
            });
        }
    }
    
    /**
     * Update compass rotation based on player rotation
     * @param {Number} degrees - Player rotation in degrees
     */
    updateRotation(degrees) {
        // Normalize angles to 0-359 range
        const normalizedDegrees = ((degrees % 360) + 360) % 360;
        
        // Only update if rotation changed
        if (normalizedDegrees !== this.state.playerRotation) {
            // Update state
            this.setState({
                playerRotation: normalizedDegrees
            });
        }
    }
    
    /**
     * Add a waypoint to the compass
     * @param {Object} waypoint - Waypoint data
     * @param {Number} waypoint.direction - Direction in degrees
     * @param {String} waypoint.id - Unique identifier
     * @param {Boolean} waypoint.isActive - Whether it's the active waypoint
     */
    addWaypoint(waypoint) {
        // Check if waypoint already exists
        const existingIndex = this.state.waypoints.findIndex(wp => wp.id === waypoint.id);
        
        if (existingIndex >= 0) {
            // Update existing waypoint
            const updatedWaypoints = [...this.state.waypoints];
            updatedWaypoints[existingIndex] = { ...updatedWaypoints[existingIndex], ...waypoint };
            this.setState({ waypoints: updatedWaypoints });
        } else {
            // Add new waypoint
            this.setState({
                waypoints: [...this.state.waypoints, waypoint]
            });
        }
    }
    
    /**
     * Remove a waypoint from the compass
     * @param {String} id - Waypoint identifier
     */
    removeWaypoint(id) {
        this.setState({
            waypoints: this.state.waypoints.filter(wp => wp.id !== id)
        });
    }
    
    /**
     * Add an enemy to the compass
     * @param {Object} enemy - Enemy data
     * @param {Number} enemy.direction - Direction in degrees
     * @param {String} enemy.id - Unique identifier
     */
    addEnemy(enemy) {
        // Check if enemy already exists
        const existingIndex = this.state.enemies.findIndex(e => e.id === enemy.id);
        
        if (existingIndex >= 0) {
            // Update existing enemy
            const updatedEnemies = [...this.state.enemies];
            updatedEnemies[existingIndex] = { ...updatedEnemies[existingIndex], ...enemy };
            this.setState({ enemies: updatedEnemies });
        } else {
            // Add new enemy
            this.setState({
                enemies: [...this.state.enemies, enemy]
            });
        }
    }
    
    /**
     * Remove an enemy from the compass
     * @param {String} id - Enemy identifier
     */
    removeEnemy(id) {
        this.setState({
            enemies: this.state.enemies.filter(e => e.id !== id)
        });
    }
    
    /**
     * Convert world direction to position on compass strip
     * @param {Number} direction - Direction in degrees
     * @returns {Number} - Position on strip in pixels
     * @private
     */
    _directionToStripPosition(direction) {
        // Normalize direction to 0-359 range
        const normalizedDirection = ((direction % 360) + 360) % 360;
        
        // Calculate position based on player's rotation
        const relativeDegrees = (normalizedDirection - this.state.playerRotation + 720) % 360;
        
        // Map to strip position (center of viewport is current rotation)
        const stripCenter = this.stripWidth / 2;
        const pixelsPerDegree = this.stripWidth / 360;
        
        // Calculate position
        // If relativeDegrees is < 180, it's to the right of center
        // If relativeDegrees is > 180, it's to the left of center
        const offset = relativeDegrees <= 180 
            ? relativeDegrees * pixelsPerDegree
            : (relativeDegrees - 360) * pixelsPerDegree;
            
        return stripCenter + offset;
    }
    
    /**
     * Determine if a cardinal direction is visible in the viewport
     * @param {String} direction - Cardinal direction (n, e, s, w)
     * @returns {Boolean} - Whether the direction is visible
     * @private
     */
    _isCardinalVisible(direction) {
        const directionDegrees = this.cardinalPoints[direction];
        const stripPosition = this._directionToStripPosition(directionDegrees);
        
        // Check if position is within viewport (with some margin)
        const stripCenter = this.stripWidth / 2;
        const halfViewport = this.viewportWidth / 2;
        
        return stripPosition >= stripCenter - halfViewport && 
               stripPosition <= stripCenter + halfViewport;
    }
    
    /**
     * Update cardinal direction positions and visibility
     * @private
     */
    _updateCardinalMarkers() {
        if (!this.showCardinalMarkers) return;
        
        Object.keys(this.cardinalPoints).forEach(direction => {
            const cardinalElement = this.elements.cardinals[direction];
            if (!cardinalElement) return;
            
            const isVisible = this._isCardinalVisible(direction);
            const directionDegrees = this.cardinalPoints[direction];
            const stripPosition = this._directionToStripPosition(directionDegrees);
            
            // Calculate position relative to viewport
            const stripCenter = this.stripWidth / 2;
            const viewportPosition = stripPosition - stripCenter + (this.viewportWidth / 2);
            
            // Update position and visibility
            cardinalElement.style.left = `${viewportPosition}px`;
            cardinalElement.classList.toggle('rift-compass__cardinal--visible', isVisible);
        });
    }
    
    /**
     * Update waypoint markers
     * @private
     */
    _updateWaypoints() {
        // First, ensure DOM elements exist for all waypoints
        this.state.waypoints.forEach((waypoint, index) => {
            if (!this.elements.waypoints[index]) {
                // Create waypoint element
                this.elements.waypoints[index] = this.createElement('div', {
                    className: `rift-compass__waypoint${waypoint.isActive ? ' rift-compass__waypoint--active' : ''}`,
                    parent: this.element,
                    dataset: { id: waypoint.id }
                });
            }
            
            // Update position
            const stripPosition = this._directionToStripPosition(waypoint.direction);
            const stripCenter = this.stripWidth / 2;
            const viewportPosition = stripPosition - stripCenter + (this.viewportWidth / 2);
            
            // Set position and visibility
            const waypointElement = this.elements.waypoints[index];
            waypointElement.style.left = `${viewportPosition}px`;
            waypointElement.classList.toggle('rift-compass__waypoint--active', waypoint.isActive);
            
            // Set visibility based on whether it's in viewport
            const halfViewport = this.viewportWidth / 2;
            const isVisible = stripPosition >= stripCenter - halfViewport && 
                             stripPosition <= stripCenter + halfViewport;
            waypointElement.style.visibility = isVisible ? 'visible' : 'hidden';
        });
        
        // Remove excess elements
        while (this.elements.waypoints.length > this.state.waypoints.length) {
            const element = this.elements.waypoints.pop();
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }
    }
    
    /**
     * Update enemy markers
     * @private
     */
    _updateEnemies() {
        // First, ensure DOM elements exist for all enemies
        this.state.enemies.forEach((enemy, index) => {
            if (!this.elements.enemies[index]) {
                // Create enemy element
                this.elements.enemies[index] = this.createElement('div', {
                    className: 'rift-compass__enemy',
                    parent: this.element,
                    dataset: { id: enemy.id }
                });
            }
            
            // Update position
            const stripPosition = this._directionToStripPosition(enemy.direction);
            const stripCenter = this.stripWidth / 2;
            const viewportPosition = stripPosition - stripCenter + (this.viewportWidth / 2);
            
            // Set position and visibility
            const enemyElement = this.elements.enemies[index];
            enemyElement.style.left = `${viewportPosition}px`;
            
            // Set visibility based on whether it's in viewport
            const halfViewport = this.viewportWidth / 2;
            const isVisible = stripPosition >= stripCenter - halfViewport && 
                             stripPosition <= stripCenter + halfViewport;
            enemyElement.style.visibility = isVisible ? 'visible' : 'hidden';
        });
        
        // Remove excess elements
        while (this.elements.enemies.length > this.state.enemies.length) {
            const element = this.elements.enemies.pop();
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }
    }
    
    /**
     * Render compass display based on current state
     */
    render() {
        if (!this.isInitialized) return this;
        
        // Update rotation of compass strip
        if (this.elements.strip) {
            // Calculate pixels to move compass strip
            const stripOffset = this.state.playerRotation * this.degreeWidth;
            this.elements.strip.style.transform = `translateX(calc(-50% - ${stripOffset}px))`;
        }
        
        // Update degree display
        if (this.showDegrees && this.elements.degrees) {
            // Format with leading zeros
            const formattedDegrees = this.state.playerRotation.toFixed(0).padStart(3, '0');
            this.elements.degrees.innerText = `${formattedDegrees}Â°`;
        }
        
        // Update cardinal markers
        this._updateCardinalMarkers();
        
        // Update waypoints
        this._updateWaypoints();
        
        // Update enemies
        this._updateEnemies();
        
        return this;
    }
    
    /**
     * Handle player rotation events
     * @param {Object} event - Event data
     * @private
     */
    _onPlayerRotation(event) {
        if (event && typeof event.rotation === 'number') {
            // Convert rotation to degrees
            const degrees = (event.rotation * 180 / Math.PI) % 360;
            this.updateRotation(degrees);
        }
    }
    
    /**
     * Handle waypoint added events
     * @param {Object} event - Event data
     * @private
     */
    _onWaypointAdded(event) {
        if (event && event.waypoint) {
            this.addWaypoint(event.waypoint);
        }
    }
    
    /**
     * Handle waypoint removed events
     * @param {Object} event - Event data
     * @private
     */
    _onWaypointRemoved(event) {
        if (event && event.id) {
            this.removeWaypoint(event.id);
        }
    }
    
    /**
     * Handle enemy spotted events
     * @param {Object} event - Event data
     * @private
     */
    _onEnemySpotted(event) {
        if (event && event.enemy) {
            const enemy = {
                id: event.enemy.id,
                direction: this._calculateDirectionToEntity(event.enemy)
            };
            this.addEnemy(enemy);
        }
    }
    
    /**
     * Handle enemy lost events
     * @param {Object} event - Event data
     * @private
     */
    _onEnemyLost(event) {
        if (event && event.id) {
            this.removeEnemy(event.id);
        }
    }
    
    /**
     * Calculate direction to an entity from player position
     * @param {Object} entity - Entity with position
     * @returns {Number} - Direction in degrees
     * @private
     */
    _calculateDirectionToEntity(entity) {
        // This is a placeholder - in a real implementation, this would use 
        // player position and entity position to calculate an actual direction
        // For now, we'll just use a random value for demonstration purposes
        return Math.floor(Math.random() * 360);
    }
}

export { CompassDisplay };
