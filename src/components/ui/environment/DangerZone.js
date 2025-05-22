/**
 * DangerZone.js
 * 
 * Visualizes and manages hazardous areas in the game world that can damage the player.
 * Provides visual feedback for different types of danger zones (radiation, fire, etc.)
 * and handles proximity warnings.
 */

import UIComponent from '../UIComponent.js';
import { EventManager } from '../../../core/EventManager.js';

export class DangerZone extends UIComponent {
    /**
     * Creates a new DangerZone instance.
     * @param {Object} options - Configuration options
     * @param {World} options.world - World instance
     */
    constructor(options = {}) {
        super({
            autoInit: false,
            id: 'danger-zone',
            className: 'rift-danger-zones',
            template: '<div class="rift-danger-zones__container"></div>',
            container: options.container || document.body,
            ...options
        });

        this.world = options.world;
        this.config = this.world?.config?.ui?.dangerZone || this.config.dangerZone;
        this.zones = new Map(); // Store all active danger zones
        this.container = null;
        this.proximityOverlay = null;
        this.lastProximityCheck = 0;
        this.proximityCheckInterval = 100; // ms
        
        // Store the player's proximity to danger zones
        this.playerProximity = {
            inDanger: false,
            closestZone: null,
            closestDistance: Infinity,
            closestType: null
        };
        
        // Bind methods
        this._onPlayerMove = this._onPlayerMove.bind(this);
        this._onZoneAdded = this._onZoneAdded.bind(this);
        this._onZoneRemoved = this._onZoneRemoved.bind(this);
        this._onZoneUpdated = this._onZoneUpdated.bind(this);
        this._onGamePaused = this._onGamePaused.bind(this);
    }
    
    /**
     * Initialize the danger zone system
     */
    init() {
        if (this.isInitialized) return this;
        
        // Create main element if needed
        if (!this.element) {
            super.init();
        }
        
        // Store the container reference
        this.container = this.element.querySelector('.rift-danger-zones__container');
        
        // Create proximity overlay
        this._createProximityOverlay();
        
        // Register events
        this.registerEvents({
            'player:move': this._onPlayerMove,
            'danger:add': this._onZoneAdded,
            'danger:remove': this._onZoneRemoved,
            'danger:update': this._onZoneUpdated,
            'game:pause': this._onGamePaused,
            'game:resume': this._onGamePaused
        });
        
        this.isInitialized = true;
        return this;
    }
    
    /**
     * Update danger zone visuals
     * @param {number} delta - Time elapsed since last update in seconds
     */
    update(delta) {
        if (!this.isInitialized || !this.isVisible || !this.world) return;
        
        const now = performance.now();
        
        // Check proximity to danger zones periodically
        if (now - this.lastProximityCheck >= this.proximityCheckInterval) {
            this._checkPlayerProximity();
            this.lastProximityCheck = now;
        }
        
        // Update zone positions based on world coordinates
        this._updateZonePositions();
    }
    
    /**
     * Add a new danger zone
     * @param {Object} zoneData - Zone configuration
     * @param {string} zoneData.id - Unique identifier for the zone
     * @param {string} zoneData.type - Zone type ('radiation', 'fire', 'electrical', 'poison', 'explosive', 'generic')
     * @param {Object} zoneData.position - 3D position {x, y, z}
     * @param {number} zoneData.radius - Radius for circular zones
     * @param {Object} zoneData.size - Size for rectangular zones {width, height}
     * @param {Array} zoneData.points - Array of points for polygon zones [{x, y, z}, ...]
     * @param {string} zoneData.shape - Zone shape ('circular', 'rectangular', 'polygon')
     * @param {string} zoneData.label - Optional label text
     * @param {boolean} zoneData.showIcon - Whether to show the zone icon
     * @param {boolean} zoneData.active - Whether the zone is active
     * @returns {Object} Created zone data
     */
    addZone(zoneData) {
        if (!this.isInitialized) {
            this.init();
        }
        
        // Generate id if not provided
        const id = zoneData.id || `danger-zone-${Date.now()}`;
        
        // Set defaults
        const zoneDefaults = {
            type: 'generic',
            position: { x: 0, y: 0, z: 0 },
            shape: 'circular',
            radius: this.config.defaultSize / 2,
            showIcon: this.config.showIcon,
            showLabel: this.config.showLabel,
            active: true,
            visible: true
        };
        
        // Merge with defaults
        const zone = {
            ...zoneDefaults,
            ...zoneData,
            id,
            element: null,
            screenPosition: { x: 0, y: 0 },
            isOnScreen: false,
            distanceToPlayer: Infinity,
            created: Date.now()
        };
        
        // Create DOM elements for the zone
        this._createZoneElements(zone);
        
        // Store the zone
        this.zones.set(id, zone);
        
        // Return the created zone data
        return zone;
    }
    
    /**
     * Update an existing zone
     * @param {string} id - Zone ID
     * @param {Object} updates - Properties to update
     * @returns {Object|null} Updated zone data or null if not found
     */
    updateZone(id, updates) {
        if (!this.zones.has(id)) return null;
        
        const zone = this.zones.get(id);
        
        // Apply updates
        Object.assign(zone, updates);
        
        // Update DOM elements
        this._updateZoneElements(zone);
        
        return zone;
    }
    
    /**
     * Remove a zone
     * @param {string} id - Zone ID
     * @returns {boolean} True if zone was removed
     */
    removeZone(id) {
        if (!this.zones.has(id)) return false;
        
        const zone = this.zones.get(id);
        
        // Remove DOM elements
        if (zone.element && zone.element.parentNode) {
            zone.element.parentNode.removeChild(zone.element);
        }
        
        // Remove from collection
        this.zones.delete(id);
        
        return true;
    }
    
    /**
     * Clear all zones
     */
    clearZones() {
        // Remove all zone elements
        this.zones.forEach(zone => {
            if (zone.element && zone.element.parentNode) {
                zone.element.parentNode.removeChild(zone.element);
            }
        });
        
        // Clear collection
        this.zones.clear();
        
        // Reset proximity state
        this._resetProximity();
    }
    
    /**
     * Set a zone's active state
     * @param {string} id - Zone ID
     * @param {boolean} active - Whether the zone is active
     * @returns {Object|null} Updated zone or null if not found
     */
    setZoneActive(id, active = true) {
        return this.updateZone(id, { active });
    }
    
    /**
     * Set a zone's visibility
     * @param {string} id - Zone ID
     * @param {boolean} visible - Whether the zone is visible
     * @returns {Object|null} Updated zone or null if not found
     */
    setZoneVisible(id, visible = true) {
        return this.updateZone(id, { visible });
    }
    
    /**
     * Get a zone by ID
     * @param {string} id - Zone ID
     * @returns {Object|undefined} Zone data or undefined if not found
     */
    getZone(id) {
        return this.zones.get(id);
    }
    
    /**
     * Get all zones
     * @returns {Array} Array of all zone objects
     */
    getAllZones() {
        return Array.from(this.zones.values());
    }
    
    /**
     * Get zones of a specific type
     * @param {string} type - Zone type
     * @returns {Array} Array of matching zone objects
     */
    getZonesByType(type) {
        return Array.from(this.zones.values()).filter(zone => zone.type === type);
    }
    
    /**
     * Check if player is in any danger zones
     * @returns {Object} Proximity data
     */
    checkPlayerInDanger() {
        this._checkPlayerProximity();
        return this.playerProximity;
    }
    
    /**
     * Create DOM elements for a zone
     * @param {Object} zone - Zone data
     * @private
     */
    _createZoneElements(zone) {
        // Create main element
        const element = document.createElement('div');
        element.className = `rift-danger-zone rift-danger-zone--${zone.type} rift-danger-zone--${zone.shape}`;
        element.id = `rift-danger-zone-${zone.id}`;
        
        if (zone.active) {
            element.classList.add('rift-danger-zone--active');
        }
        
        // Create container for zone elements
        const container = document.createElement('div');
        container.className = 'rift-danger-zone__container';
        element.appendChild(container);
        
        // Create pulse effect
        const pulse = document.createElement('div');
        pulse.className = 'rift-danger-zone__pulse';
        container.appendChild(pulse);
        
        // Create edge effect
        const edgeEffect = document.createElement('div');
        edgeEffect.className = 'rift-danger-zone__edge-effect';
        container.appendChild(edgeEffect);
        
        // Create icon if enabled
        if (zone.showIcon) {
            const icon = document.createElement('div');
            icon.className = `rift-danger-zone__icon rift-danger-zone__icon--${zone.type}`;
            container.appendChild(icon);
        }
        
        // Create label if provided and enabled
        if (zone.label && zone.showLabel) {
            const label = document.createElement('div');
            label.className = 'rift-danger-zone__label';
            label.textContent = zone.label;
            container.appendChild(label);
        }
        
        // Set initial position and size
        this._updateZoneElementStyle(zone, element);
        
        // Add to DOM
        this.container.appendChild(element);
        
        // Store element reference in zone data
        zone.element = element;
    }
    
    /**
     * Update DOM elements for a zone
     * @param {Object} zone - Zone data
     * @private
     */
    _updateZoneElements(zone) {
        if (!zone.element) return;
        
        // Update class based on active state
        if (zone.active) {
            zone.element.classList.add('rift-danger-zone--active');
        } else {
            zone.element.classList.remove('rift-danger-zone--active');
        }
        
        // Update visibility
        zone.element.style.display = zone.visible ? 'block' : 'none';
        
        // Update type class
        const typeClasses = Array.from(zone.element.classList)
            .filter(cls => cls.startsWith('rift-danger-zone--') && 
                  !['rift-danger-zone--active', 'rift-danger-zone--warning', 
                    'rift-danger-zone--inactive', 'rift-danger-zone--circular', 
                    'rift-danger-zone--rectangular', 'rift-danger-zone--polygon'].includes(cls));
        
        typeClasses.forEach(cls => zone.element.classList.remove(cls));
        zone.element.classList.add(`rift-danger-zone--${zone.type}`);
        
        // Update shape class
        const shapeClasses = Array.from(zone.element.classList)
            .filter(cls => ['rift-danger-zone--circular', 'rift-danger-zone--rectangular', 
                           'rift-danger-zone--polygon'].includes(cls));
        
        shapeClasses.forEach(cls => zone.element.classList.remove(cls));
        zone.element.classList.add(`rift-danger-zone--${zone.shape}`);
        
        // Update label if it exists
        const label = zone.element.querySelector('.rift-danger-zone__label');
        if (label && zone.label) {
            label.textContent = zone.label;
            label.style.display = zone.showLabel ? 'block' : 'none';
        }
        
        // Update icon visibility
        const icon = zone.element.querySelector('.rift-danger-zone__icon');
        if (icon) {
            icon.style.display = zone.showIcon ? 'block' : 'none';
            
            // Update icon type if needed
            const iconClassPrefix = 'rift-danger-zone__icon--';
            const iconTypeClasses = Array.from(icon.classList)
                .filter(cls => cls.startsWith(iconClassPrefix) && 
                      cls !== `${iconClassPrefix}${zone.type}`);
            
            iconTypeClasses.forEach(cls => icon.classList.remove(cls));
            icon.classList.add(`${iconClassPrefix}${zone.type}`);
        }
        
        // Update position and size
        this._updateZoneElementStyle(zone, zone.element);
    }
    
    /**
     * Update a zone element's style based on shape, position, size, etc.
     * @param {Object} zone - Zone data
     * @param {HTMLElement} element - Zone DOM element
     * @private
     */
    _updateZoneElementStyle(zone, element) {
        // Set size based on shape
        if (zone.shape === 'circular') {
            const diameter = zone.radius * 2;
            element.style.width = `${diameter}px`;
            element.style.height = `${diameter}px`;
        } else if (zone.shape === 'rectangular' && zone.size) {
            element.style.width = `${zone.size.width}px`;
            element.style.height = `${zone.size.height}px`;
        } else if (zone.shape === 'polygon' && zone.points) {
            // For polygon, we use clip-path
            const pointsStr = zone.points
                .map(pt => `${pt.x}% ${pt.y}%`)
                .join(', ');
            
            element.style.clipPath = `polygon(${pointsStr})`;
            
            // Set a reasonable size for the container
            element.style.width = '200px';
            element.style.height = '200px';
        }
        
        // Position and opacity will be updated in _updateZonePositions
    }
    
    /**
     * Update zone positions based on world coordinates
     * @private
     */
    _updateZonePositions() {
        if (!this.world || !this.world.camera) return;
        
        const camera = this.world.camera;
        const maxDistance = this.config.maxDisplayDistance;
        
        this.zones.forEach(zone => {
            if (!zone.element || !zone.visible) return;
            
            // Calculate distance to player
            const player = this.world.player;
            if (player && player.position && zone.position) {
                const dx = player.position.x - zone.position.x;
                const dy = player.position.y - zone.position.y;
                const dz = player.position.z - zone.position.z;
                zone.distanceToPlayer = Math.sqrt(dx*dx + dy*dy + dz*dz);
            }
            
            // Project 3D position to screen coordinates
            zone.screenPosition = this._worldToScreen(zone.position, camera);
            
            // Check if zone is on screen
            zone.isOnScreen = (
                zone.screenPosition.x >= -100 && 
                zone.screenPosition.x <= window.innerWidth + 100 &&
                zone.screenPosition.y >= -100 && 
                zone.screenPosition.y <= window.innerHeight + 100 &&
                zone.screenPosition.z < 1 // In front of camera
            );
            
            // Update element position
            zone.element.style.left = `${zone.screenPosition.x}px`;
            zone.element.style.top = `${zone.screenPosition.y}px`;
            
            // Scale based on distance
            const distanceFactor = Math.max(0, 1 - zone.distanceToPlayer / maxDistance);
            const fadeDistance = this.config.fadeDistance;
            
            // Fade out based on distance
            let opacity = 1;
            if (zone.distanceToPlayer > maxDistance - fadeDistance) {
                opacity = Math.max(0, 1 - (zone.distanceToPlayer - (maxDistance - fadeDistance)) / fadeDistance);
            }
            
            zone.element.style.opacity = opacity.toString();
            
            // Hide if too far or behind camera
            zone.element.style.display = (zone.visible && zone.isOnScreen && zone.distanceToPlayer <= maxDistance) ? 'block' : 'none';
            
            // Add warning class if player is near
            if (zone.distanceToPlayer <= this.config.criticalThreshold && zone.active) {
                zone.element.classList.add('rift-danger-zone--warning');
            } else {
                zone.element.classList.remove('rift-danger-zone--warning');
            }
        });
    }
    
    /**
     * Convert a 3D world position to screen coordinates
     * @param {Object} position - 3D position {x, y, z}
     * @param {Object} camera - Three.js camera
     * @returns {Object} Screen position with {x, y, z} coordinates
     * @private
     */
    _worldToScreen(position, camera) {
        if (!position || !camera) {
            return { x: 0, y: 0, z: 0 };
        }
        
        // This is a simplified version
        // In a real Three.js implementation, you would use camera.projectVector or Vector3.project
        // For now, we'll use a simplified approach
        
        // Convert to camera space
        const camPos = camera.position || { x: 0, y: 0, z: 0 };
        const camRot = camera.rotation || { x: 0, y: 0, z: 0 };
        
        // Direction from camera to position
        const dx = position.x - camPos.x;
        const dy = position.y - camPos.y;
        const dz = position.z - camPos.z;
        
        // Distance from camera
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
        
        // If too close, avoid division by zero
        if (distance < 0.1) {
            return { 
                x: window.innerWidth / 2, 
                y: window.innerHeight / 2,
                z: 0
            };
        }
        
        // Calculate screen position
        // This is highly simplified and doesn't account for proper camera projection
        // In a real system, you would use THREE.Vector3.project()
        
        // Simplified yaw calculation based on camera rotation
        const yaw = camRot.y || 0;
        
        // Rotate position around camera's y-axis
        const cosYaw = Math.cos(-yaw);
        const sinYaw = Math.sin(-yaw);
        
        const rotX = dx * cosYaw - dz * sinYaw;
        const rotZ = dz * cosYaw + dx * sinYaw;
        
        // Project to screen
        let screenX, screenY, screenZ;
        
        if (rotZ <= 0) {
            // Behind camera, place off-screen
            screenZ = 1.5;
            screenX = -1000; 
            screenY = -1000;
        } else {
            // Simple perspective projection
            // z is used for depth
            const scale = 1000; // scale factor
            screenX = (rotX / rotZ) * scale + window.innerWidth / 2;
            screenY = (-dy / rotZ) * scale + window.innerHeight / 2;
            screenZ = rotZ / 100; // normalized depth
        }
        
        return { x: screenX, y: screenY, z: screenZ };
    }
    
    /**
     * Create the proximity warning overlay
     * @private
     */
    _createProximityOverlay() {
        if (this.proximityOverlay) return;
        
        // Create overlay element
        this.proximityOverlay = document.createElement('div');
        this.proximityOverlay.className = 'rift-danger-zone-proximity';
        document.body.appendChild(this.proximityOverlay);
    }
    
    /**
     * Check player proximity to danger zones
     * @private
     */
    _checkPlayerProximity() {
        // Reset proximity data
        this._resetProximity();
        
        if (!this.world || !this.world.player) return;
        
        const player = this.world.player;
        
        // Find closest active danger zone
        this.zones.forEach(zone => {
            if (!zone.active) return;
            
            if (zone.distanceToPlayer < this.playerProximity.closestDistance) {
                this.playerProximity.closestDistance = zone.distanceToPlayer;
                this.playerProximity.closestZone = zone;
                this.playerProximity.closestType = zone.type;
            }
        });
        
        // Update proximity state
        if (this.playerProximity.closestZone) {
            const zone = this.playerProximity.closestZone;
            
            // Check if player is in danger zone
            if (this.playerProximity.closestDistance <= this.config.proximityThreshold) {
                this.playerProximity.inDanger = true;
                
                // Update overlay
                if (this.proximityOverlay) {
                    // Calculate opacity based on distance
                    const proximityFactor = 1 - (this.playerProximity.closestDistance / this.config.proximityThreshold);
                    const opacity = Math.max(0.1, proximityFactor * 0.7);
                    
                    // Set type-specific class
                    const typeClasses = Array.from(this.proximityOverlay.classList)
                        .filter(cls => cls.startsWith('rift-danger-zone-proximity--'));
                    
                    typeClasses.forEach(cls => this.proximityOverlay.classList.remove(cls));
                    this.proximityOverlay.classList.add(`rift-danger-zone-proximity--${zone.type}`);
                    
                    // Make visible with calculated opacity
                    this.proximityOverlay.classList.add('rift-danger-zone-proximity--active');
                    this.proximityOverlay.style.setProperty('--proximity-opacity', opacity.toString());
                }
                
                // Emit event if in critical range
                if (this.playerProximity.closestDistance <= this.config.criticalThreshold) {
                    EventManager.emit('danger:critical', {
                        type: zone.type,
                        distance: this.playerProximity.closestDistance,
                        zone: zone.id,
                        damageRate: this.config.types[zone.type]?.damageRate || 5
                    });
                }
            } else {
                // Hide overlay when not in danger
                if (this.proximityOverlay) {
                    this.proximityOverlay.classList.remove('rift-danger-zone-proximity--active');
                }
            }
        }
    }
    
    /**
     * Reset proximity tracking data
     * @private
     */
    _resetProximity() {
        this.playerProximity = {
            inDanger: false,
            closestZone: null,
            closestDistance: Infinity,
            closestType: null
        };
        
        // Hide overlay
        if (this.proximityOverlay) {
            this.proximityOverlay.classList.remove('rift-danger-zone-proximity--active');
        }
    }
    
    /**
     * Handle player movement events
     * @param {Object} event - Event data
     * @private
     */
    _onPlayerMove(event) {
        // Will trigger update on next frame
    }
    
    /**
     * Handle new zone addition events
     * @param {Object} event - Event data
     * @private
     */
    _onZoneAdded(event) {
        if (!event || !event.zoneData) return;
        
        this.addZone(event.zoneData);
    }
    
    /**
     * Handle zone removal events
     * @param {Object} event - Event data
     * @private
     */
    _onZoneRemoved(event) {
        if (!event || !event.id) return;
        
        this.removeZone(event.id);
    }
    
    /**
     * Handle zone update events
     * @param {Object} event - Event data
     * @private
     */
    _onZoneUpdated(event) {
        if (!event || !event.id || !event.updates) return;
        
        this.updateZone(event.id, event.updates);
    }
    
    /**
     * Handle game pause/resume events
     * @param {Object} event - Event data
     * @private
     */
    _onGamePaused(event) {
        // Handle pause state if needed
    }
    
    /**
     * Test function to create sample danger zones
     * @param {string} type - Danger zone type
     * @param {number} count - Number of zones to create
     * @returns {Array} Created zones
     */
    testZones(type = 'generic', count = 1) {
        const zones = [];
        const types = ['radiation', 'fire', 'electrical', 'poison', 'explosive', 'generic'];
        
        // Use specified type or random if not valid
        const zoneType = types.includes(type) ? type : types[Math.floor(Math.random() * types.length)];
        
        // Get player position or use center of screen
        let basePosition = { x: 0, y: 0, z: 0 };
        if (this.world && this.world.player && this.world.player.position) {
            basePosition = { ...this.world.player.position };
        }
        
        // Create specified number of zones
        for (let i = 0; i < count; i++) {
            // Randomize position slightly
            const position = {
                x: basePosition.x + (Math.random() - 0.5) * 50,
                y: basePosition.y,
                z: basePosition.z + (Math.random() - 0.5) * 50
            };
            
            // Determine zone radius based on type
            let radius = this.config.defaultSize / 2;
            switch (zoneType) {
                case 'radiation': radius *= 1.5; break;
                case 'fire': radius *= 0.8; break;
                case 'electrical': radius *= 1.2; break;
                case 'poison': radius *= 1.8; break;
                case 'explosive': radius *= 0.6; break;
            }
            
            // Create zone with label
            const label = `${zoneType.charAt(0).toUpperCase() + zoneType.slice(1)} Zone`;
            const zone = this.addZone({
                type: zoneType,
                position,
                radius,
                shape: 'circular',
                label,
                showIcon: true,
                showLabel: true,
                active: true
            });
            
            zones.push(zone);
        }
        
        console.log(`[DangerZone] Created ${count} test zones of type '${zoneType}'`);
        return zones;
    }
    
    /**
     * Clean up resources and event subscriptions
     */
    dispose() {
        // Clear zones
        this.clearZones();
        
        // Remove proximity overlay
        if (this.proximityOverlay && this.proximityOverlay.parentNode) {
            this.proximityOverlay.parentNode.removeChild(this.proximityOverlay);
            this.proximityOverlay = null;
        }
        
        // Call parent dispose
        super.dispose();
    }
}

