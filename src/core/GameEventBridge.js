/**
 * Bridge between the game engine events and the UI system events.
 * Converts game-specific method calls to standardized UI events.
 * 
 * @author Integration Helper
 */

import EventManager from '../core/EventManager.js';

export class GameEventBridge {
    constructor(world) {
        this.world = world;
        this.player = null;
        this.lastHealthValue = 100;
        this.lastAmmoValue = { current: 30, max: 30 };
        this.lastWeaponType = null;
        
        // Enable event validation in development
        if (world.debug) {
            EventManager.setDebugMode(true);
            EventManager.setValidateEventNames(true);
            EventManager.setValidateEventPayloads(true);
        }
    }
    
    /**
     * Initialize the bridge after the player is created
     */
    init(player) {
        this.player = player;
        this.lastHealthValue = player.health;
        
        // Get initial weapon info
        if (player.weaponSystem?.currentWeapon) {
            this.lastAmmoValue = {
                current: player.weaponSystem.currentWeapon.roundsLeft,
                max: player.weaponSystem.currentWeapon.roundsPerClip
            };
            this.lastWeaponType = player.weaponSystem.currentWeapon.type;
        }
        
        console.log('[GameEventBridge] Initialized with player');
    }
    
    /**
     * Update method called each frame to check for state changes
     */
    update() {
        if (!this.player) return;
        
        this._checkHealthChanges();
        this._checkAmmoChanges();
        this._checkWeaponChanges();
    }
    
    /**
     * Check for health changes and emit events
     */
    _checkHealthChanges() {
        const currentHealth = this.player.health;
        const maxHealth = this.player.maxHealth;
        
        if (currentHealth !== this.lastHealthValue) {
            const delta = currentHealth - this.lastHealthValue;
            
            // Emit standardized health change event
            EventManager.emit('health:changed', EventManager.createStateChangeEvent(
                'health',
                currentHealth,
                this.lastHealthValue,
                delta,
                maxHealth,
                delta < 0 ? 'damage' : 'healing'
            ));
            
            this.lastHealthValue = currentHealth;
        }
    }
    
    /**
     * Check for ammo changes and emit events
     */
    _checkAmmoChanges() {
        if (!this.player.weaponSystem?.currentWeapon) return;
        
        const weapon = this.player.weaponSystem.currentWeapon;
        const currentAmmo = {
            current: weapon.roundsLeft,
            max: weapon.roundsPerClip
        };
        
        if (currentAmmo.current !== this.lastAmmoValue.current || 
            currentAmmo.max !== this.lastAmmoValue.max) {
            
            const delta = currentAmmo.current - this.lastAmmoValue.current;
            
            // Emit standardized ammo change event
            EventManager.emit('ammo:changed', EventManager.createStateChangeEvent(
                'ammo',
                currentAmmo.current,
                this.lastAmmoValue.current,
                delta,
                currentAmmo.max,
                delta < 0 ? 'shot' : 'reload'
            ));
            
            this.lastAmmoValue = { ...currentAmmo };
        }
    }
    
    /**
     * Check for weapon changes and emit events
     */
    _checkWeaponChanges() {
        if (!this.player.weaponSystem?.currentWeapon) return;
        
        const currentWeaponType = this.player.weaponSystem.currentWeapon.type;
        
        if (currentWeaponType !== this.lastWeaponType) {
            // Emit weapon change event
            EventManager.emit('weapon:changed', {
                weaponType: currentWeaponType,
                previousWeaponType: this.lastWeaponType,
                weapon: {
                    type: currentWeaponType,
                    name: this._getWeaponName(currentWeaponType),
                    ammo: {
                        current: this.player.weaponSystem.currentWeapon.roundsLeft,
                        max: this.player.weaponSystem.currentWeapon.roundsPerClip
                    }
                }
            });
            
            this.lastWeaponType = currentWeaponType;
        }
    }
    
    /**
     * Convert weapon type constants to readable names
     */
    _getWeaponName(weaponType) {
        // You'll need to import your weapon type constants and map them
        const weaponNames = {
            0: 'Blaster',
            1: 'Shotgun', 
            2: 'Assault Rifle'
            // Add more weapon types as needed
        };
        
        return weaponNames[weaponType] || 'Unknown Weapon';
    }
    
    /**
     * Handle player taking damage
     */
    onPlayerDamaged(damage, attackDirection, attacker) {
        // Calculate angle to attacker for directional damage indicator
        const angle = this.player.computeAngleToAttacker(attackDirection);
        const angleDegrees = (angle * 180 / Math.PI + 360) % 360;
        
        // Emit damage event
        EventManager.emit('player:damaged', EventManager.createCombatEvent(
            {
                id: attacker?.uuid || 'unknown',
                type: attacker?.isPlayer ? 'player' : 'enemy',
                name: attacker?.name || 'Unknown',
                position: attacker?.position ? {
                    x: attacker.position.x,
                    y: attacker.position.y, 
                    z: attacker.position.z
                } : null
            },
            {
                id: this.player.uuid,
                type: 'player',
                name: this.player.name || 'Player',
                position: {
                    x: this.player.position.x,
                    y: this.player.position.y,
                    z: this.player.position.z
                }
            },
            null, // weapon info would go here if available
            damage,
            false, // isCritical
            false, // isHeadshot  
            {
                angle: angleDegrees,
                x: attackDirection.x,
                y: attackDirection.y,
                z: attackDirection.z
            }
        ));
    }
    
    /**
     * Handle player hitting an enemy
     */
    onEnemyHit(enemy, damage, isCritical = false, isHeadshot = false) {
        EventManager.emit('hit:registered', EventManager.createCombatEvent(
            {
                id: this.player.uuid,
                type: 'player',
                name: 'Player',
                position: {
                    x: this.player.position.x,
                    y: this.player.position.y,
                    z: this.player.position.z
                }
            },
            {
                id: enemy.uuid,
                type: 'enemy',
                name: enemy.name || 'Enemy',
                position: {
                    x: enemy.position.x,
                    y: enemy.position.y,
                    z: enemy.position.z
                }
            },
            this.player.weaponSystem?.currentWeapon ? {
                type: this.player.weaponSystem.currentWeapon.type,
                name: this._getWeaponName(this.player.weaponSystem.currentWeapon.type)
            } : null,
            damage,
            isCritical,
            isHeadshot
        ));
    }
    
    /**
     * Handle enemy being killed
     */
    onEnemyKilled(enemy, killer) {
        EventManager.emit('enemy:killed', EventManager.createCombatEvent(
            {
                id: killer.uuid,
                type: killer.isPlayer ? 'player' : 'enemy',
                name: killer.name || (killer.isPlayer ? 'Player' : 'Enemy')
            },
            {
                id: enemy.uuid,
                type: 'enemy', 
                name: enemy.name || 'Enemy'
            }
        ));
    }
    
    /**
     * Handle player shooting (for crosshair feedback)
     */
    onPlayerShoot() {
        EventManager.emit('weapon:fired', {
            weaponType: this.lastWeaponType,
            timestamp: performance.now()
        });
    }
    
    /**
     * Handle footstep detection
     */
    onFootstepDetected(sourceEntity, playerPosition, playerRotation) {
        if (!sourceEntity || !playerPosition) return;
        
        // Calculate distance
        const dx = sourceEntity.position.x - playerPosition.x;
        const dz = sourceEntity.position.z - playerPosition.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        // Calculate angle
        let angle = Math.atan2(dx, dz) * (180 / Math.PI);
        if (playerRotation !== undefined) {
            const playerAngle = playerRotation * (180 / Math.PI);
            angle = (angle - playerAngle + 360) % 360;
        }
        
        // Emit standardized movement event
        EventManager.emit('movement:footstep', {
            source: {
                id: sourceEntity.uuid,
                type: sourceEntity.isPlayer ? 'player' : 'enemy',
                name: sourceEntity.name || (sourceEntity.isPlayer ? 'Player' : 'Enemy'),
                position: {
                    x: sourceEntity.position.x,
                    y: sourceEntity.position.y,
                    z: sourceEntity.position.z
                }
            },
            player: {
                position: playerPosition,
                rotation: playerRotation
            },
            distance,
            angle,
            isFriendly: sourceEntity.isPlayer || false,
            isEnemy: !sourceEntity.isPlayer,
            isContinuous: false,
            timestamp: performance.now()
        });
    }
}