/**
 * MovementSystem Component
 *
 * Responsible for detecting and emitting footstep events based on entity movement.
 * This component monitors player and entity movement, and emits standardized
 * 'movement:footstep-detected' events that will be picked up by the FootstepIndicator component.
 *
 * Following Event Standardization guidelines, this component is responsible for
 * emitting 'movement:footstep-detected' events with the standardized payload structure that
 * includes source entity information, position data, and movement characteristics.
 *
 * @extends UIComponent
 */

import UIComponent from '../UIComponent.js';
import { EventManager } from '../../../core/EventManager.js';
import EventStandardizationImplementer from '../../../core/EventStandardizationImplementer.js';

class MovementSystem extends UIComponent {
    /**
     * Create a new MovementSystem component
     * 
     * @param {Object} world - The game world object
     * @param {Object} options - Component configuration options
     * @param {number} [options.footstepThreshold=0.5] - Distance threshold to trigger footstep (meters)
     * @param {number} [options.footstepInterval=350] - Minimum time between footsteps (ms)
     * @param {number} [options.detectionRadius=20] - Maximum distance to detect footsteps (meters)
     * @param {number} [options.friendlyDetectionMultiplier=0.8] - Multiplier for friendly footstep detection radius
     */
    constructor(world, options = {}) {
        super({
            autoInit: false,
            id: options.id || 'movement-system',
            className: 'rift-movement-system',
            ...options
        });

        this.world = world;
        
        // Enable event validation for standardization
        EventManager.setValidateEventNames(true);
        EventManager.setValidateEventPayloads(true);
        
        // Configuration options with defaults
        this.footstepThreshold = options.footstepThreshold || 0.5; // meters
        this.footstepInterval = options.footstepInterval || 350;   // ms
        this.detectionRadius = options.detectionRadius || 20;      // meters
        this.friendlyDetectionMultiplier = options.friendlyDetectionMultiplier || 0.8;
        
        // State
        this.entityPositions = new Map(); // Track entity positions: Map<entityId, {position, lastFootstep, isMoving}>
        this.playerData = {
            position: null,
            rotation: 0,
            lastPosition: null,
            distanceTraveled: 0,
            lastFootstep: 0,
            isMoving: false,
            isSprinting: false
        };
        
        // Debug flags
        this.debugMode = false;
    }

    /**
     * Initialize the movement system
     */
    init() {
        // Call parent init first
        super.init();

        if (this.isInitialized) return this;
        
        // Register event handlers
        this._registerEventListeners();
        
        this.isInitialized = true;
        this.isActive = true;
        
        if (this.debugMode) {
            console.log(`[MovementSystem] Initialized with footstep threshold: ${this.footstepThreshold}m`);
        }
        
        return this;
    }

    /**
     * Update the movement system
     * 
     * @param {number} delta - Time since last update in ms
     */
    update(delta) {
        if (!this.isActive || !this.world) return this;
        
        // Update player position and check for footsteps
        this._updatePlayerMovement(delta);
        
        // Update other entities and check for their footsteps
        this._updateEntityMovements(delta);
        
        return this;
    }

    /**
     * Clean up resources when disposing the component
     */
    dispose() {
        this.entityPositions.clear();
        this.playerData = null;
        
        // Call parent dispose method
        super.dispose();
        
        return this;
    }

    /**
     * Register event listeners for movement events
     * @private
     */
    _registerEventListeners() {
        // Register for movement events
        this.registerEvents({
            'player:position': this._onPlayerPositionUpdate.bind(this),
            'player:rotation': this._onPlayerRotationUpdate.bind(this),
            'player:sprint': this._onPlayerSprintUpdate.bind(this),
            'entity:position': this._onEntityPositionUpdate.bind(this),
            'entity:removed': this._onEntityRemoved.bind(this),
            'game:paused': () => this._resetMovementTracking(),
            'game:resumed': () => this._resetMovementTracking()
        });
    }

    /**
     * Reset all movement tracking data
     * @private
     */
    _resetMovementTracking() {
        // Clear entity position cache
        this.entityPositions.clear();
        
        // Reset player movement data
        if (this.playerData) {
            this.playerData.lastFootstep = 0;
            this.playerData.distanceTraveled = 0;
            this.playerData.isMoving = false;
        }
    }

    /**
     * Handle player position updates
     * @private
     * @param {Object} event - Player position event data
     */
    _onPlayerPositionUpdate(event) {
        if (!event || !event.position) return;
        
        // Store previous position
        if (this.playerData.position) {
            this.playerData.lastPosition = { ...this.playerData.position };
        }
        
        // Update current position
        this.playerData.position = event.position;
        
        // Mark player as moving if position changed significantly
        if (this.playerData.lastPosition) {
            const distance = this._calculateDistance(
                this.playerData.position, 
                this.playerData.lastPosition
            );
            
            // Accumulate distance traveled
            this.playerData.distanceTraveled += distance;
            
            // Check if player is moving
            const wasMoving = this.playerData.isMoving;
            this.playerData.isMoving = distance > 0.01; // Small threshold to account for minor position adjustments
            
            // Detect movement state changes
            if (!wasMoving && this.playerData.isMoving) {
                this._onPlayerStartedMoving();
            } else if (wasMoving && !this.playerData.isMoving) {
                this._onPlayerStoppedMoving();
            }
        }
    }

    /**
     * Handle player rotation updates
     * @private
     * @param {Object} event - Player rotation event data
     */
    _onPlayerRotationUpdate(event) {
        if (!event || typeof event.rotation !== 'number') return;
        
        this.playerData.rotation = event.rotation;
    }

    /**
     * Handle player sprint state updates
     * @private
     * @param {Object} event - Player sprint event data
     */
    _onPlayerSprintUpdate(event) {
        if (!event || typeof event.isSprinting !== 'boolean') return;
        
        const wasSprinting = this.playerData.isSprinting;
        this.playerData.isSprinting = event.isSprinting;
        
        // Adjust footstep parameters when sprint state changes
        if (!wasSprinting && this.playerData.isSprinting) {
            // Player started sprinting - footsteps should be more frequent
            this.footstepInterval = 250; // ms
        } else if (wasSprinting && !this.playerData.isSprinting) {
            // Player stopped sprinting - return to normal footstep interval
            this.footstepInterval = 350; // ms
        }
    }

    /**
     * Handle entity position updates
     * @private
     * @param {Object} event - Entity position event data
     */
    _onEntityPositionUpdate(event) {
        if (!event || !event.entity || !event.position) return;
        
        const entityId = event.entity.id;
        
        // Get or create entity data
        let entityData = this.entityPositions.get(entityId);
        if (!entityData) {
            entityData = {
                entity: event.entity,
                position: event.position,
                lastPosition: null,
                lastFootstep: 0,
                distanceTraveled: 0,
                isMoving: false
            };
            this.entityPositions.set(entityId, entityData);
            return; // First update, just store the position
        }
        
        // Store previous position
        entityData.lastPosition = { ...entityData.position };
        
        // Update current position
        entityData.position = event.position;
        
        // Calculate distance moved
        if (entityData.lastPosition) {
            const distance = this._calculateDistance(
                entityData.position,
                entityData.lastPosition
            );
            
            // Accumulate distance traveled
            entityData.distanceTraveled += distance;
            
            // Check if entity is moving
            const wasMoving = entityData.isMoving;
            entityData.isMoving = distance > 0.01;
            
            // Check if this movement should generate footstep
            this._checkEntityFootstep(entityId, entityData);
            
            // Detect movement state changes
            if (!wasMoving && entityData.isMoving) {
                this._onEntityStartedMoving(entityId, entityData);
            } else if (wasMoving && !entityData.isMoving) {
                this._onEntityStoppedMoving(entityId, entityData);
            }
        }
    }

    /**
     * Handle entity removal
     * @private
     * @param {Object} event - Entity removed event data
     */
    _onEntityRemoved(event) {
        if (!event || !event.entityId) return;
        
        // Remove entity from tracking
        this.entityPositions.delete(event.entityId);
    }

    /**
     * Update player movement and check for footsteps
     * @private
     * @param {number} delta - Time since last frame in ms
     */
    _updatePlayerMovement(delta) {
        if (!this.playerData.position || !this.playerData.isMoving) return;
        
        // Check if enough distance has been traveled for a footstep
        if (this.playerData.distanceTraveled >= this.footstepThreshold) {
            const now = performance.now();
            
            // Check if enough time has passed since last footstep
            if (now - this.playerData.lastFootstep >= this.footstepInterval) {
                // Emit player footstep event
                this._emitPlayerFootstep();
                
                // Reset distance tracker and update timestamp
                this.playerData.distanceTraveled = 0;
                this.playerData.lastFootstep = now;
            }
        }
    }

    /**
     * Update entity movements and check for footsteps
     * @private
     * @param {number} delta - Time since last frame in ms
     */
    _updateEntityMovements(delta) {
        if (!this.playerData.position) return;
        
        // Process each tracked entity
        this.entityPositions.forEach((entityData, entityId) => {
            if (!entityData.position || !entityData.isMoving) return;
            
            // Check if entity is close enough to player to be heard
            const distanceToPlayer = this._calculateDistance(
                this.playerData.position,
                entityData.position
            );
            
            // Adjust detection radius based on entity type
            const detectionLimit = entityData.entity.isFriendly 
                ? this.detectionRadius * this.friendlyDetectionMultiplier
                : this.detectionRadius;
            
            // Skip if too far to hear
            if (distanceToPlayer > detectionLimit) return;
            
            // Check if enough distance has been traveled for a footstep
            if (entityData.distanceTraveled >= this.footstepThreshold) {
                const now = performance.now();
                
                // Check if enough time has passed since last footstep
                if (now - entityData.lastFootstep >= this.footstepInterval) {
                    // Emit entity footstep event
                    this._emitEntityFootstep(entityId, entityData, distanceToPlayer);
                    
                    // Reset distance tracker and update timestamp
                    entityData.distanceTraveled = 0;
                    entityData.lastFootstep = now;
                }
            }
        });
    }

    /**
     * Handler when player starts moving
     * @private
     */
    _onPlayerStartedMoving() {
        if (this.debugMode) {
            console.log('[MovementSystem] Player started moving');
        }
        
        // Could emit a movement state change event here if needed
    }

    /**
     * Handler when player stops moving
     * @private
     */
    _onPlayerStoppedMoving() {
        if (this.debugMode) {
            console.log('[MovementSystem] Player stopped moving');
        }
        
        // Reset distance tracker when stopping
        this.playerData.distanceTraveled = 0;
    }

    /**
     * Handler when entity starts moving
     * @private
     * @param {string} entityId - Entity identifier
     * @param {Object} entityData - Entity movement data
     */
    _onEntityStartedMoving(entityId, entityData) {
        if (this.debugMode) {
            const entityName = entityData.entity.name || entityId;
            console.log(`[MovementSystem] Entity ${entityName} started moving`);
        }
    }

    /**
     * Handler when entity stops moving
     * @private
     * @param {string} entityId - Entity identifier
     * @param {Object} entityData - Entity movement data
     */
    _onEntityStoppedMoving(entityId, entityData) {
        if (this.debugMode) {
            const entityName = entityData.entity.name || entityId;
            console.log(`[MovementSystem] Entity ${entityName} stopped moving`);
        }
        
        // Reset distance tracker when stopping
        entityData.distanceTraveled = 0;
    }

    /**
     * Check if an entity should generate a footstep
     * @private
     * @param {string} entityId - Entity identifier
     * @param {Object} entityData - Entity movement data
     */
    _checkEntityFootstep(entityId, entityData) {
        if (!this.playerData.position) return;
        
        // Check if entity is close enough to player to be heard
        const distanceToPlayer = this._calculateDistance(
            this.playerData.position,
            entityData.position
        );
        
        // Adjust detection radius based on entity type
        const detectionLimit = entityData.entity.isFriendly 
            ? this.detectionRadius * this.friendlyDetectionMultiplier
            : this.detectionRadius;
        
        // Skip if too far to hear
        if (distanceToPlayer > detectionLimit) return;
        
        // Check if enough distance has been traveled for a footstep
        if (entityData.distanceTraveled >= this.footstepThreshold) {
            const now = performance.now();
            
            // Check if enough time has passed since last footstep
            if (now - entityData.lastFootstep >= this.footstepInterval) {
                // Generate footstep
                this._emitEntityFootstep(entityId, entityData, distanceToPlayer);
                
                // Reset distance tracker and update timestamp
                entityData.distanceTraveled = 0;
                entityData.lastFootstep = now;
            }
        }
    }

    /**
     * Emit a player footstep event
     * @private
     */
    _emitPlayerFootstep() {
        // Player footsteps aren't typically shown to the player
        // as they'd be constantly in view, but the code is here
        // in case it's needed for sound effects or other feedback
        
        if (this.debugMode) {
            console.log('[MovementSystem] Player footstep');
        }
    }

    /**
     * Emit an entity footstep event using standardized event format
     * @private
     * @param {string} entityId - Entity identifier
     * @param {Object} entityData - Entity movement data
     * @param {number} distanceToPlayer - Distance from entity to player
     */
    _emitEntityFootstep(entityId, entityData, distanceToPlayer) {
        if (!this.playerData.position || !this.playerData.rotation) return;
        
        // Only emit if we have the necessary data
        if (!entityData.position) return;
        
        // Get entity data
        const entity = entityData.entity;
        const entityPos = entityData.position;
        const isFriendly = entity.isFriendly === true;
        const entityType = entity.type || 'enemy';
        const entityName = entity.name || `${entityType}-${entityId}`;
        
        // Create standardized movement:footstep event using EventStandardizationImplementer templates
        const footstepEvent = {
            // Source entity information
            source: {
                id: entityId,
                type: entityType,
                name: entityName,
                position: {
                    x: entityPos.x,
                    y: entityPos.y,
                    z: entityPos.z
                }
            },
            // Position data
            position: {
                x: entityPos.x,
                y: entityPos.y,
                z: entityPos.z
            },
            playerPosition: {
                x: this.playerData.position.x,
                y: this.playerData.position.y,
                z: this.playerData.position.z
            },
            playerRotation: this.playerData.rotation,
            
            // Additional metadata
            isFriendly: isFriendly,
            isContinuous: entity.isMoving === true,
            distance: distanceToPlayer,
            direction: this._calculateAngle(
                this.playerData.position,
                this.playerData.rotation,
                entityPos
            ),
            timestamp: performance.now()
        };
        
        // Emit the standardized event that follows EventStandardizationCatalog naming standards
        // This event will be picked up by FootstepIndicator component
        EventManager.emit('movement:footstep-detected', footstepEvent);
        
        if (this.debugMode) {
            const entityName = entity.name || entityId;
            console.log(`[MovementSystem] Entity ${entityName} footstep at distance ${distanceToPlayer.toFixed(2)}m`);
        }
    }

    /**
     * Calculate distance between two positions
     * @private
     * @param {Object} pos1 - First position {x, y, z}
     * @param {Object} pos2 - Second position {x, y, z}
     * @return {number} Distance between positions
     */
    _calculateDistance(pos1, pos2) {
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const dz = pos2.z - pos1.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * Calculate angle between player and position
     * @private
     * @param {Object} playerPos - Player position {x, y, z}
     * @param {number} playerRot - Player rotation in radians
     * @param {Object} targetPos - Target position {x, y, z}
     * @return {number} Angle in degrees (0-360)
     */
    _calculateAngle(playerPos, playerRot, targetPos) {
        const dx = targetPos.x - playerPos.x;
        const dz = targetPos.z - playerPos.z;
        
        // Calculate angle in degrees (0 = north, clockwise)
        let angle = Math.atan2(dx, dz) * (180 / Math.PI);
        
        // Adjust for player rotation
        if (typeof playerRot === 'number') {
            const playerAngle = playerRot * (180 / Math.PI);
            angle = (angle - playerAngle + 360) % 360;
        }
        
        return angle;
    }

    /**
     * Test method to simulate an entity footstep using standardized event format
     * For development/debugging only
     * 
     * @param {Object} options - Test footstep options
     * @param {number} [options.angle=null] - Angle in degrees relative to player (random if null)
     * @param {number} [options.distance=10] - Distance from player in meters
     * @param {boolean} [options.isFriendly=false] - Whether the footstep is from a friendly entity
     * @param {boolean} [options.isContinuous=false] - Whether this is part of a continuous series
     * @param {string} [options.entityId] - Custom entity ID (generates one if not provided)
     */
    testFootstep(options = {}) {
        // Default player position at origin if not set
        const playerPosition = this.playerData.position || { x: 0, y: 0, z: 0 };
        const playerRotation = this.playerData.rotation || 0;
        
        // Get angle (random if not specified)
        const angle = options.angle !== undefined ? options.angle : Math.random() * 360;
        
        // Convert angle to radians
        const angleRad = angle * (Math.PI / 180);
        
        // Calculate position based on angle and distance
        const distance = options.distance || 10;
        const entityPosition = {
            x: playerPosition.x + Math.sin(angleRad) * distance,
            y: playerPosition.y,
            z: playerPosition.z + Math.cos(angleRad) * distance
        };
        
        // Entity information
        const entityId = options.entityId || `test_${Date.now()}`;
        const entityType = options.isFriendly ? 'ally' : 'enemy';
        const entityName = `${entityType}-${entityId}`;
        
        // Create standardized movement:footstep-detected event
        const footstepEvent = {
            // Source entity information
            source: {
                id: entityId,
                type: entityType,
                name: entityName,
                position: entityPosition
            },
            // Position data
            position: entityPosition,
            playerPosition: playerPosition,
            playerRotation: playerRotation,
            
            // Additional metadata
            isFriendly: options.isFriendly === true,
            isContinuous: options.isContinuous === true,
            distance: distance,
            direction: angle,
            timestamp: performance.now()
        };
        
        // Emit the standardized event
        EventManager.emit('movement:footstep-detected', footstepEvent);
        
        console.log(`[MovementSystem] Test footstep: ${options.isFriendly ? 'friendly' : 'enemy'} at ${distance.toFixed(1)}m, angle ${angle.toFixed(1)}Â°`);
        
        return this;
    }
    
    /**
     * Test method to simulate a series of footsteps from the same entity using standardized event format
     * For development/debugging only
     * 
     * @param {Object} options - Test footstep options
     * @param {number} [options.angle=null] - Angle in degrees relative to player (random if null)
     * @param {number} [options.distance=10] - Distance from player in meters
     * @param {boolean} [options.isFriendly=false] - Whether the footstep is from a friendly entity
     * @param {number} [options.count=4] - Number of footsteps in the series
     * @param {number} [options.interval=200] - Time between footsteps in ms
     */
    testFootstepSequence(options = {}) {
        const angle = options.angle !== undefined ? options.angle : Math.random() * 360;
        const distance = options.distance || 10;
        const isFriendly = options.isFriendly === true;
        const count = options.count || 4;
        const interval = options.interval || 200;
        
        // Generate a unique entity ID for this sequence
        const entityId = `test_seq_${Date.now()}`;
        
        console.log(`[MovementSystem] Starting test footstep sequence: ${count} ${isFriendly ? 'friendly' : 'enemy'} footsteps at ${distance.toFixed(1)}m, angle ${angle.toFixed(1)}Â°`);
        
        // Create a sequence of footsteps with the same entityId
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                // For the last step, don't mark as continuous
                const isContinuous = i < count - 1;
                
                this.testFootstep({
                    angle: angle,
                    distance: distance,
                    isFriendly: isFriendly,
                    isContinuous: isContinuous,
                    entityId: entityId
                });
            }, i * interval);
        }
        
        // Return a method that can be used to add a new footstep to this sequence
        return {
            addFootstep: (options = {}) => {
                setTimeout(() => {
                    this.testFootstep({
                        angle: options.angle || angle,
                        distance: options.distance || distance,
                        isFriendly: options.isFriendly !== undefined ? options.isFriendly : isFriendly,
                        isContinuous: options.isContinuous !== undefined ? options.isContinuous : false,
                        entityId: entityId
                    });
                }, count * interval + (options.delay || 100));
                return this;
            }
        };
    }
    
    /**
     * Enable or disable debug mode
     * @param {boolean} enabled - Whether to enable debug mode
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`[MovementSystem] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
        return this;
    }
}

export { MovementSystem };
