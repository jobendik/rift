/**
 * ObjectiveMarkerSystem.js
 * 
 * Manages objective markers in the game world, including waypoints, mission objectives,
 * points of interest, and item locations.
 */

import UIComponent from '../UIComponent.js';
import { EventManager } from '../../../core/EventManager.js';
import { DOMFactory } from '../../../utils/DOMFactory.js';

export class ObjectiveMarkerSystem extends UIComponent {
    /**
     * Creates a new ObjectiveMarkerSystem instance.
     * @param {Object} options - Configuration options
     * @param {World} options.world - World instance
     */
    constructor(options = {}) {
        super({
            id: 'objective-marker-system',
            className: 'rift-objective-markers',
            template: '<div class="rift-objective-markers__container"></div>',
            container: options.container || document.body,
            autoInit: false, // Prevent auto-initialization
            ...options
        });

        this.world = options.world;
        this.markerContainer = null;
        this.markers = new Map();
        this.isInitialized = false;
        this.screenBounds = {
            width: window.innerWidth,
            height: window.innerHeight,
            centerX: window.innerWidth / 2,
            centerY: window.innerHeight / 2
        };
        
        // Binding methods
        this._onResize = this._onResize.bind(this);
        this._onObjectiveAdded = this._onObjectiveAdded.bind(this);
        this._onObjectiveUpdated = this._onObjectiveUpdated.bind(this);
        this._onObjectiveRemoved = this._onObjectiveRemoved.bind(this);
        this._onWaypointPlaced = this._onWaypointPlaced.bind(this);
        this._onWaypointRemoved = this._onWaypointRemoved.bind(this);
        
        // Initialize manually after all properties are set
        this.init();
    }

    /**
     * Initialize the objective marker system
     */
    init() {
        if (this.isInitialized) return this;

        // Create main element
        super.init();
        
        // Set initialized flag early to prevent recursion
        this.isInitialized = true;

        // Get container reference
        this.markerContainer = this.element.querySelector('.rift-objective-markers__container');
        
        // Register events with standardized names
        this.registerEvents({
            'window:resized': this._onResize, // Changed from 'window:resize' to past tense
            'objective:added': this._onObjectiveAdded, // Already correct
            'objective:updated': this._onObjectiveUpdated, // Already correct
            'objective:removed': this._onObjectiveRemoved, // Already correct
            'waypoint:placed': this._onWaypointPlaced, // Using consistent naming with method
            'waypoint:removed': this._onWaypointRemoved // Already correct
        });
        
        // Update screen dimensions
        this._updateScreenDimensions();
        
        this.isInitialized = true;
        return this;
    }

    /**
     * Update the marker system
     * @param {number} delta - Time elapsed since last update in seconds
     */
    update(delta) {
        if (!this.isInitialized || !this.isVisible) return;

        // Update all marker positions relative to player
        for (const marker of this.markers.values()) {
            if (marker.active) {
                this._updateMarkerPosition(marker, delta);
            }
        }
    }

    /**
     * Add a new objective marker
     * @param {Object} markerData - Marker data
     * @param {string} markerData.id - Unique marker identifier
     * @param {string} markerData.type - Marker type: 'primary', 'secondary', 'bonus', etc.
     * @param {Object} markerData.position - 3D position {x, y, z}
     * @param {string} markerData.icon - Icon to use (e.g., 'attack', 'defend', 'capture', etc.)
     * @param {string} markerData.label - Text label to display
     * @param {boolean} markerData.showDistance - Whether to show distance
     * @param {boolean} markerData.showOffscreen - Whether to show an indicator when off-screen
     * @param {number} markerData.minDistance - Minimum distance to display marker (0 to always show)
     * @param {number} markerData.maxDistance - Maximum distance to display marker (0 for unlimited)
     * @returns {Object} The created marker object
     */
    addMarker(markerData) {
        if (!this.isInitialized) {
            console.warn('[ObjectiveMarkerSystem] System not initialized');
            return null;
        }

        // Generate ID if not provided
        const id = markerData.id || `marker-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        
        // Check for duplicates
        if (this.markers.has(id)) {
            console.warn(`[ObjectiveMarkerSystem] Marker with ID "${id}" already exists`);
            return this.markers.get(id);
        }
        
        // Default values
        const markerType = markerData.type || 'secondary';
        const showDistance = markerData.showDistance !== undefined ? markerData.showDistance : true;
        const showOffscreen = markerData.showOffscreen !== undefined ? markerData.showOffscreen : true;
        const iconType = markerData.icon || 'waypoint';
        
        // Create marker element
        const markerElement = DOMFactory.createElement('div', {
            id: `marker-${id}`,
            className: `rift-objective-marker rift-objective-marker--${markerType}`,
            appendTo: this.markerContainer
        });
        
        // Create marker container structure
        markerElement.innerHTML = `
            <div class="rift-objective-marker__offscreen"></div>
            <div class="rift-objective-marker__container">
                <div class="rift-objective-marker__ring"></div>
                <div class="rift-objective-marker__pulse"></div>
                <div class="rift-objective-marker__icon rift-objective-marker__icon--${iconType}"></div>
                ${markerData.label ? `<div class="rift-objective-marker__label">${markerData.label}</div>` : ''}
                ${showDistance ? '<div class="rift-objective-marker__distance"></div>' : ''}
            </div>
        `;
        
        // Store marker data
        const marker = {
            id,
            element: markerElement,
            position: { ...markerData.position },
            screenPosition: { x: 0, y: 0 },
            type: markerType,
            icon: iconType,
            label: markerData.label || '',
            showDistance,
            showOffscreen,
            minDistance: markerData.minDistance || 0,
            maxDistance: markerData.maxDistance || 0,
            isOffscreen: false,
            isVisible: true,
            active: true,
            distance: 0,
            alpha: 1,
            distanceElement: showDistance ? markerElement.querySelector('.rift-objective-marker__distance') : null,
            angle: 0,
            data: { ...markerData } // Store original data
        };
        
        // Add to markers map
        this.markers.set(id, marker);
        
        // Initial position update
        this._updateMarkerPosition(marker, 0);
        
        return marker;
    }

    /**
     * Update an existing marker
     * @param {string} id - Marker ID
     * @param {Object} updates - Properties to update
     * @returns {Object} Updated marker or null if not found
     */
    updateMarker(id, updates) {
        if (!this.markers.has(id)) {
            console.warn(`[ObjectiveMarkerSystem] Marker with ID "${id}" not found`);
            return null;
        }
        
        const marker = this.markers.get(id);
        
        // Update position if provided
        if (updates.position) {
            marker.position = { ...updates.position };
        }
        
        // Update visibility
        if (updates.visible !== undefined) {
            marker.isVisible = updates.visible;
            marker.element.classList.toggle('rift-objective-marker--hidden', !marker.isVisible);
        }
        
        // Update label
        if (updates.label !== undefined) {
            marker.label = updates.label;
            const labelElement = marker.element.querySelector('.rift-objective-marker__label');
            
            if (updates.label && !labelElement) {
                // Create label element if it doesn't exist
                const newLabel = DOMFactory.createElement('div', {
                    className: 'rift-objective-marker__label',
                    text: updates.label,
                    appendTo: marker.element.querySelector('.rift-objective-marker__container')
                });
            } else if (labelElement) {
                // Update existing label
                labelElement.textContent = updates.label;
            }
        }
        
        // Update type/class
        if (updates.type) {
            // Remove old type class
            marker.element.classList.remove(`rift-objective-marker--${marker.type}`);
            // Add new type class
            marker.type = updates.type;
            marker.element.classList.add(`rift-objective-marker--${marker.type}`);
        }
        
        // Update icon
        if (updates.icon) {
            const iconElement = marker.element.querySelector('.rift-objective-marker__icon');
            iconElement.classList.remove(`rift-objective-marker__icon--${marker.icon}`);
            marker.icon = updates.icon;
            iconElement.classList.add(`rift-objective-marker__icon--${marker.icon}`);
        }
        
        // Update highlight state
        if (updates.highlighted !== undefined) {
            marker.element.classList.toggle('rift-objective-marker--highlighted', updates.highlighted);
        }
        
        // Update completed state
        if (updates.completed !== undefined) {
            marker.element.classList.toggle('rift-objective-marker--completed', updates.completed);
        }
        
        // Update active state
        if (updates.active !== undefined) {
            marker.active = updates.active;
            marker.element.classList.toggle('rift-objective-marker--inactive', !marker.active);
        }
        
        // Update distance visibility
        if (updates.showDistance !== undefined && updates.showDistance !== marker.showDistance) {
            marker.showDistance = updates.showDistance;
            
            if (marker.showDistance && !marker.distanceElement) {
                // Create distance element
                marker.distanceElement = DOMFactory.createElement('div', {
                    className: 'rift-objective-marker__distance',
                    appendTo: marker.element.querySelector('.rift-objective-marker__container')
                });
            } else if (!marker.showDistance && marker.distanceElement) {
                // Remove distance element
                marker.distanceElement.remove();
                marker.distanceElement = null;
            }
        }
        
        // Update off-screen behavior
        if (updates.showOffscreen !== undefined) {
            marker.showOffscreen = updates.showOffscreen;
        }
        
        // Update min/max distances
        if (updates.minDistance !== undefined) marker.minDistance = updates.minDistance;
        if (updates.maxDistance !== undefined) marker.maxDistance = updates.maxDistance;
        
        // Force position update
        this._updateMarkerPosition(marker, 0);
        
        return marker;
    }

    /**
     * Remove a marker
     * @param {string} id - Marker ID
     * @returns {boolean} True if marker was removed
     */
    removeMarker(id) {
        if (!this.markers.has(id)) {
            return false;
        }
        
        const marker = this.markers.get(id);
        
        // Remove element from DOM
        if (marker.element && marker.element.parentNode) {
            marker.element.remove();
        }
        
        // Remove from map
        this.markers.delete(id);
        
        return true;
    }

    /**
     * Set a player waypoint
     * @param {Object} position - 3D position {x, y, z}
     * @param {string} label - Optional waypoint label
     * @returns {Object} Created waypoint marker
     */
    setWaypoint(position, label = 'Waypoint') {
        // Remove existing waypoint if any
        this.removeWaypoint();
        
        // Create new waypoint
        const waypoint = this.addMarker({
            id: 'player-waypoint',
            type: 'waypoint',
            position,
            icon: 'waypoint',
            label,
            showDistance: true,
            showOffscreen: true
        });
        
        // Highlight temporarily
        waypoint.element.classList.add('rift-objective-marker--highlighted');
        
        // Remove highlight after a moment
        setTimeout(() => {
            if (this.markers.has('player-waypoint')) {
                const marker = this.markers.get('player-waypoint');
                marker.element.classList.remove('rift-objective-marker--highlighted');
            }
        }, 2000);
        
        return waypoint;
    }

    /**
     * Remove player waypoint
     * @returns {boolean} True if waypoint was removed
     */
    removeWaypoint() {
        return this.removeMarker('player-waypoint');
    }

    /**
     * Highlight a marker temporarily
     * @param {string} id - Marker ID
     * @param {number} duration - Duration in milliseconds
     * @returns {boolean} True if marker was found and highlighted
     */
    highlightMarker(id, duration = 2000) {
        if (!this.markers.has(id)) {
            return false;
        }
        
        const marker = this.markers.get(id);
        
        marker.element.classList.add('rift-objective-marker--highlighted');
        
        setTimeout(() => {
            if (this.markers.has(id)) {
                const marker = this.markers.get(id);
                marker.element.classList.remove('rift-objective-marker--highlighted');
            }
        }, duration);
        
        return true;
    }

    /**
     * Clear all markers
     */
    clearMarkers() {
        // Remove all marker elements
        for (const marker of this.markers.values()) {
            if (marker.element && marker.element.parentNode) {
                marker.element.remove();
            }
        }
        
        // Clear map
        this.markers.clear();
    }

    /**
     * Show all markers
     */
    showMarkers() {
        for (const marker of this.markers.values()) {
            marker.isVisible = true;
            marker.element.classList.remove('rift-objective-marker--hidden');
        }
    }

    /**
     * Hide all markers
     */
    hideMarkers() {
        for (const marker of this.markers.values()) {
            marker.isVisible = false;
            marker.element.classList.add('rift-objective-marker--hidden');
        }
    }

    /**
     * Update the marker position relative to player
     * @param {Object} marker - Marker object
     * @param {number} delta - Time elapsed since last update
     * @private
     */
    _updateMarkerPosition(marker, delta) {
        if (!marker.active || !this.world) return;
        
        // Get player position and rotation
        const player = this.world.player;
        if (!player) return;
        
        const playerPosition = player.position || { x: 0, y: 0, z: 0 };
        const playerRotation = player.rotation || { y: 0 };
        
        // Calculate distance from player to marker
        const dx = marker.position.x - playerPosition.x;
        const dz = marker.position.z - playerPosition.z;
        const dy = (marker.position.y || 0) - (playerPosition.y || 0);
        
        // Calculate distance (horizontal and 3D)
        const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        // Store distance
        marker.distance = distance;
        
        // Check distance constraints
        const isWithinDistance = (marker.minDistance === 0 || distance >= marker.minDistance) &&
                              (marker.maxDistance === 0 || distance <= marker.maxDistance);
        
        // Calculate angle relative to player facing
        const angleToMarker = Math.atan2(dz, dx);
        const playerAngle = playerRotation.y;
        let relativeAngle = angleToMarker - playerAngle;
        
        // Normalize angle to [0, 2Ï€]
        while (relativeAngle < 0) relativeAngle += Math.PI * 2;
        while (relativeAngle >= Math.PI * 2) relativeAngle -= Math.PI * 2;
        
        // Store angle
        marker.angle = relativeAngle;
        
        // Convert angle to screen position (angle 0 is right, Ï€/2 is down, etc.)
        const screenRadius = Math.min(this.screenBounds.width, this.screenBounds.height) * 0.4;
        
        // Calculate ideal screen position (center of screen + offset based on angle)
        const idealX = this.screenBounds.centerX + Math.cos(relativeAngle) * screenRadius;
        const idealY = this.screenBounds.centerY - Math.sin(relativeAngle) * screenRadius;
        
        // Check if position is off-screen
        const margin = 50; // Margin from screen edge
        const minX = margin;
        const maxX = this.screenBounds.width - margin;
        const minY = margin;
        const maxY = this.screenBounds.height - margin;
        
        let isOffscreen = idealX < minX || idealX > maxX || idealY < minY || idealY > maxY;
        
        // Calculate constrained position
        let x = Math.max(minX, Math.min(maxX, idealX));
        let y = Math.max(minY, Math.min(maxY, idealY));
        
        // Update marker visibility
        const shouldBeVisible = isWithinDistance && marker.isVisible;
        
        // Store screen position
        marker.screenPosition = { x, y };
        marker.isOffscreen = isOffscreen && marker.showOffscreen;
        
        // Update element position
        marker.element.style.left = `${x}px`;
        marker.element.style.top = `${y}px`;
        
        // Update off-screen indicator
        if (marker.showOffscreen) {
            marker.element.classList.toggle('rift-objective-marker--offscreen', isOffscreen);
            
            if (isOffscreen) {
                // Point indicator in direction of off-screen marker
                const angleOffset = relativeAngle - (Math.PI / 2); // Rotate so 0 is up
                marker.element.style.setProperty('--offscreen-rotation', `${angleOffset}rad`);
                marker.element.querySelector('.rift-objective-marker__offscreen').style.transform = 
                    `translate(-50%, -50%) rotate(${angleOffset}rad)`;
            }
        }
        
        // Update distance text if available
        if (marker.distanceElement) {
            const distanceText = distance < 1000 ? 
                `${Math.round(distance)}m` : 
                `${(distance / 1000).toFixed(1)}km`;
            
            marker.distanceElement.textContent = distanceText;
        }
        
        // Hide completely if outside of distance constraints
        marker.element.style.display = shouldBeVisible ? 'flex' : 'none';
    }

    /**
     * Update screen dimensions on resize
     * @private
     */
    _updateScreenDimensions() {
        this.screenBounds = {
            width: window.innerWidth,
            height: window.innerHeight,
            centerX: window.innerWidth / 2,
            centerY: window.innerHeight / 2
        };
    }

    /**
     * Handle window resize event
     * @private
     */
    _onResize() {
        this._updateScreenDimensions();
        
        // Update all markers
        for (const marker of this.markers.values()) {
            if (marker.active) {
                this._updateMarkerPosition(marker, 0);
            }
        }
    }

    /**
     * Handle objective added event
     * @param {Object} data - Event data
     * @private
     */
    _onObjectiveAdded(data) {
        if (!data || !data.id || !data.position) return;
        
        // Create marker for objective
        this.addMarker({
            id: `objective-${data.id}`,
            type: data.type || 'primary',
            position: data.position,
            icon: data.icon || 'capture',
            label: data.label || data.title || 'Objective',
            showDistance: true,
            showOffscreen: true,
            minDistance: data.minDistance || 0,
            maxDistance: data.maxDistance || 0
        });
    }

    /**
     * Handle objective updated event
     * @param {Object} data - Event data
     * @private
     */
    _onObjectiveUpdated(data) {
        if (!data || !data.id) return;
        
        const markerId = `objective-${data.id}`;
        
        // Update marker if exists
        if (this.markers.has(markerId)) {
            const updates = {};
            
            if (data.position) updates.position = data.position;
            if (data.label) updates.label = data.label;
            if (data.type) updates.type = data.type;
            if (data.icon) updates.icon = data.icon;
            if (data.completed !== undefined) updates.completed = data.completed;
            if (data.active !== undefined) updates.active = data.active;
            if (data.highlighted !== undefined) updates.highlighted = data.highlighted;
            
            this.updateMarker(markerId, updates);
        }
    }

    /**
     * Handle objective removed event
     * @param {Object} data - Event data
     * @private
     */
    _onObjectiveRemoved(data) {
        if (!data || !data.id) return;
        
        this.removeMarker(`objective-${data.id}`);
    }

    /**
     * Handle waypoint placed event
     * @param {Object} data - Event data
     * @private
     */
    _onWaypointPlaced(data) {
        if (!data || !data.position) return;
        
        this.setWaypoint(data.position, data.label);
    }

    /**
     * Handle waypoint removed event
     * @private
     */
    _onWaypointRemoved() {
        this.removeWaypoint();
    }

    /**
     * Clean up resources when component is destroyed
     */
    dispose() {
        // Clear all markers
        this.clearMarkers();
        
        // Unregister events and remove element
        super.dispose();
    }
}
