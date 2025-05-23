/**
 * MinimapIntegration:
 * Handles the integration between the AdvancedMinimap component
 * and the game world, including visibility control, item and enemy
 * tracking, and map updates.
 */

import { AdvancedMinimap } from './AdvancedMinimap.js';
import * as THREE from 'three';

class MinimapIntegration {
  constructor(world) {
    this.world = world;
    this.minimap = null;
    this.minimapContainer = document.getElementById('minimap-container');
    this.initialized = false;
    this.lastPlayerPosition = null;
    this.movementVector = { x: 0, z: -1 }; // Default forward
    this.frameCount = 0;
    
    // Track markers for better management
    this._enemyMarkers = new Map();
    this._itemMarkers = new Map();
  }

  init() {
    // Wait until the necessary objects are available
    if (!this.world.scene || !this.world.camera || !this.world.player) {
      console.warn('Cannot initialize minimap: scene, camera or player not available');
      return false;
    }

    // Store initial player position for movement tracking
    this.lastPlayerPosition = this.world.player.position.clone();

    // Calculate appropriate scale based on level size
    let mapScale = 50; // Larger default scale to ensure good coverage
    const levelConfig = this.world.assetManager && this.world.assetManager.configs ? 
                        this.world.assetManager.configs.get('level') : null;
    
    if (levelConfig && levelConfig.spatialIndex) {
      // Use level config to determine map size
      mapScale = Math.max(levelConfig.spatialIndex.width, levelConfig.spatialIndex.depth) / 2;
    }

    // Create the minimap instance
    this.minimap = new AdvancedMinimap(
      this.world.scene, 
      this.world.camera, 
      this.world.player,
      {
        size: 180,
        position: 'none',
        scale: mapScale,
        height: 200,
        rotateWithPlayer: false,
        zoomable: false,
        enemyDetectionRadius: 100,
        heightIndicator: false,
        updateFrequency: 1,
        lowResolutionFactor: 1.0,
        simplifyGeometry: true,
        showObjectives: true,
        fogOfWar: false,
        radarSweep: false,
        border: '2px solid rgba(255, 255, 255, 0.7)',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        // Use a new function that gets camera direction
        getPlayerDirection: () => this.getPlayerCameraDirection()
      }
    );
    
    // Ensure the minimap has the required methods
    this._ensureMinimapMethods();

    // Override container to use our prepared DOM element
    if (this.minimapContainer && this.minimap.container) {
      // Remove auto-generated container from body
      if (this.minimap.container.parentNode) {
        this.minimap.container.parentNode.removeChild(this.minimap.container);
      }
      
      // Clear existing content
      while (this.minimapContainer.firstChild) {
        this.minimapContainer.removeChild(this.minimapContainer.firstChild);
      }
      
      this.minimapContainer.appendChild(this.minimap.container);
      this.minimapContainer.classList.remove('hidden');
      
      // Reset inline styles
      this.minimap.container.style.position = "static";
      this.minimap.container.style.top = "auto";
      this.minimap.container.style.right = "auto";
      this.minimap.container.style.bottom = "auto";
      this.minimap.container.style.left = "auto";
    }

    // Create a better level representation
    this.createSimplifiedLevelMap();
    
    // Add enemies and items
    this.addAllEnemies();
    this.addAllItems();
    
    this.initialized = true;
    
    // Add debug shapes to verify rendering (uncomment for debugging)
    // this.addDebugMarkers();
    
    return true;
  }

  getPlayerCameraDirection() {
    // Get direct camera rotation from FPS controls
    if (this.world.fpsControls && typeof this.world.fpsControls.movementX === 'number') {
      // This directly uses the camera's horizontal rotation value
      return this.world.fpsControls.movementX;
    }
    
    // If no FPS controls, fall back to player rotation
    if (this.world.player && this.world.player.rotation) {
      return this.world.player.rotation.y;
    }
    
    return 0; // Default direction if nothing else works
  }
  
  // Create a more clear top-down minimap representation
  createSimplifiedLevelMap() {
    const levelMesh = this.world.scene.getObjectByName('level');
    
    // If no level mesh, try to find any large static meshes
    if (!levelMesh) {
      console.warn("No level mesh found. Creating simplified map from scene objects");
      this.createMapFromSceneObjects();
      return;
    }
    
    console.log("Creating minimap from level mesh");
    
    // Create a simplified representation for walls and floors
    const wallMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    
    const floorMaterial = new THREE.MeshBasicMaterial({
      color: 0x444444,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    
    // Process level geometry
    levelMesh.traverse(child => {
      if (!child.isMesh) return;
      
      // Skip very small objects
      if (child.geometry && child.geometry.boundingBox) {
        const box = child.geometry.boundingBox;
        const size = new THREE.Vector3();
        box.getSize(size);
        
        // Skip tiny objects that clutter the map
        if (size.x < 2 && size.z < 2) return;
      }
      
      // Determine if this is likely a floor or wall by orientation
      let isWall = false;
      
      if (child.geometry) {
        // Simple orientation test - walls are usually vertical
        const position = child.geometry.attributes.position;
        const normals = child.geometry.attributes.normal;
        
        if (normals && position) {
          // Sample some normals to guess if it's a wall or floor
          let verticalNormalCount = 0;
          let horizontalNormalCount = 0;
          
          // Sample up to 20 vertices
          const sampleCount = Math.min(20, position.count);
          for (let i = 0; i < sampleCount; i++) {
            const idx = Math.floor(i * position.count / sampleCount) * 3;
            const ny = normals.array[idx + 1]; // Y component (up/down)
            
            if (Math.abs(ny) > 0.7) {
              horizontalNormalCount++; // Pointing up/down = horizontal surface
            } else {
              verticalNormalCount++; // Pointing sideways = vertical surface
            }
          }
          
          isWall = verticalNormalCount > horizontalNormalCount;
        }
      }
      
      // Create a simple representation for the minimap
      const minimapMesh = new THREE.Mesh(
        child.geometry,
        isWall ? wallMaterial : floorMaterial
      );
      
      // Copy transformation
      minimapMesh.position.copy(child.position);
      minimapMesh.rotation.copy(child.rotation);
      minimapMesh.scale.copy(child.scale);
      
      // Add to minimap
      this.minimap.levelMap.add(minimapMesh);
    });
  }
  
  // Fallback method to create a map from scene objects
  createMapFromSceneObjects() {
    const minimapObjects = [];
    
    // Collect all static meshes that could form the level
    this.world.scene.traverse(object => {
      if (object.isMesh && object !== this.world.player) {
        // Skip small objects and obvious non-structural elements
        if (object.name && 
            (object.name.includes('enemy') || 
             object.name.includes('item') || 
             object.name.includes('pickup') || 
             object.name.includes('particle'))) {
          return;
        }
        
        // Get bounding box to check size
        if (!object.geometry.boundingBox) {
          object.geometry.computeBoundingBox();
        }
        
        const box = object.geometry.boundingBox;
        const size = new THREE.Vector3();
        box.getSize(size);
        
        // Only include objects of significant size
        if (size.x > 3 || size.z > 3) {
          minimapObjects.push(object);
        }
      }
    });
    
    // Simple floor material
    const floorMaterial = new THREE.MeshBasicMaterial({
      color: 0x555555,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    
    // Create simple representations for each object
    minimapObjects.forEach(object => {
      const minimapMesh = new THREE.Mesh(
        object.geometry.clone(),
        floorMaterial
      );
      
      minimapMesh.position.copy(object.position);
      minimapMesh.rotation.copy(object.rotation);
      minimapMesh.scale.copy(object.scale);
      
      this.minimap.levelMap.add(minimapMesh);
    });
  }
  
  // Calculate player movement direction based on position changes
  getPlayerMovementDirection() {
    if (!this.world || !this.world.player) {
      return 0;
    }
    
    // First try: Get direction from player's forward vector (most reliable)
    if (this.world.player.forward) {
      return Math.atan2(this.world.player.forward.x, this.world.player.forward.z);
    }
    
    // Second try: Get direction from player's rotation
    if (this.world.player.rotation) {
      return this.world.player.rotation.y;
    }
    
    // Fallback: Use a movement-based direction
    if (!this.lastPlayerPosition) {
      this.lastPlayerPosition = this.world.player.position.clone();
      this.movementVector = { x: 0, z: 1 }; // Default forward
      return 0;
    }
    
    const currentPos = this.world.player.position;
    const deltaX = currentPos.x - this.lastPlayerPosition.x;
    const deltaZ = currentPos.z - this.lastPlayerPosition.z;
    
    // Only update if significant movement
    if (Math.abs(deltaX) > 0.01 || Math.abs(deltaZ) > 0.01) {
      this.movementVector = { x: deltaX, z: deltaZ };
    }
    
    this.lastPlayerPosition.copy(currentPos);
    return Math.atan2(this.movementVector.x, this.movementVector.z);
  }
  
  /**
   * Ensure the minimap has all required methods
   * Adds stubs for missing methods to prevent errors
   * @private
   */
  _ensureMinimapMethods() {
    if (!this.minimap) return;
    
    console.log('[MinimapIntegration] Ensuring required methods exist');
    
    // Add stub for addEnemyMarker if missing
    if (typeof this.minimap.addEnemyMarker !== 'function') {
      console.warn('[MinimapIntegration] Adding stub implementation for addEnemyMarker');
      
      this.minimap.addEnemyMarker = (enemy) => {
        // Skip if already marked
        if (this._enemyMarkers.has(enemy)) {
          return this._enemyMarkers.get(enemy);
        }
        
        // Create a simple marker if minimap scene exists
        if (this.minimap.minimapScene) {
          const markerGeometry = new THREE.SphereGeometry(1.0, 8, 8);
          const markerMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000, // Red for enemies
            transparent: true,
            opacity: 0.8
          });
          
          const marker = new THREE.Mesh(markerGeometry, markerMaterial);
          
          // Set initial position
          if (enemy.position) {
            marker.position.set(enemy.position.x, 0, enemy.position.z);
          }
          
          // Store reference data
          marker.userData = { 
            enemy: enemy, 
            type: 'enemy',
            update: (delta) => {
              // Update marker position if enemy moved
              if (enemy.position) {
                marker.position.set(enemy.position.x, 0, enemy.position.z);
              }
            }
          };
          
          // Add to scene
          this.minimap.minimapScene.add(marker);
          
          // Store for tracking
          this._enemyMarkers.set(enemy, marker);
          
          return marker;
        }
        
        return null;
      };
    }
    
    // Add stub for addItemMarker if missing
    if (typeof this.minimap.addItemMarker !== 'function') {
      console.warn('[MinimapIntegration] Adding stub implementation for addItemMarker');
      
      this.minimap.addItemMarker = (item, itemType = 'generic') => {
        // Skip if already marked
        if (this._itemMarkers.has(item)) {
          return this._itemMarkers.get(item);
        }
        
        // Create a simple marker if minimap scene exists
        if (this.minimap.minimapScene) {
          // Choose color based on item type
          let color = 0x00ff00; // Default green
          
          if (itemType === 'health') color = 0x00ff00; // Green
          else if (itemType === 'weapon' || itemType === 'blaster' || 
                   itemType === 'shotgun' || itemType === 'assaultRifle') color = 0xffff00; // Yellow
          else if (itemType === 'ammo') color = 0x0088ff; // Blue
          
          const markerGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
          const markerMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.8
          });
          
          const marker = new THREE.Mesh(markerGeometry, markerMaterial);
          
          // Set initial position
          if (item.position) {
            marker.position.set(item.position.x, 0, item.position.z);
          }
          
          // Store reference data
          marker.userData = { 
            item: item, 
            type: itemType,
            update: (delta) => {
              // Update marker position if item moved
              if (item.position) {
                marker.position.set(item.position.x, 0, item.position.z);
              }
            }
          };
          
          // Add to scene
          this.minimap.minimapScene.add(marker);
          
          // Store for tracking
          this._itemMarkers.set(item, marker);
          
          return marker;
        }
        
        return null;
      };
    }
    
    // Log available methods for debugging
    if (this.world.isDebugMode) {
      this._debugMinimapMethods();
    }
  }
  
  /**
   * Debug method to log available methods on the minimap
   * @private
   */
  _debugMinimapMethods() {
    console.log('[MinimapIntegration] Debugging AdvancedMinimap methods:');
    
    // Get all properties and methods
    const properties = [];
    const methods = [];
    
    // Check own properties
    for (let prop in this.minimap) {
      if (this.minimap.hasOwnProperty(prop)) {
        if (typeof this.minimap[prop] === 'function') {
          methods.push(prop);
        } else {
          properties.push(prop);
        }
      }
    }
    
    // Check prototype methods
    const proto = Object.getPrototypeOf(this.minimap);
    const protoMethods = Object.getOwnPropertyNames(proto)
      .filter(name => typeof proto[name] === 'function' && name !== 'constructor');
    
    console.log('Direct methods:', methods);
    console.log('Prototype methods:', protoMethods);
    
    // Check for specific expected methods
    const expectedMethods = [
      'addEnemyMarker', 'addItemMarker', 'update', 'destroy'
    ];
    
    console.log('\nChecking expected methods:');
    expectedMethods.forEach(method => {
      const exists = typeof this.minimap[method] === 'function';
      console.log(`- ${method}: ${exists ? '✓ exists' : '✗ missing'}`);
    });
  }
  
  // Add all enemies to the minimap
  addAllEnemies() {
    // First check if minimap and the required method exist
    if (!this.minimap) {
      console.error('[MinimapIntegration] Minimap not initialized');
      return;
    }
    
    // Check if the addEnemyMarker method exists
    if (typeof this.minimap.addEnemyMarker !== 'function') {
      console.warn('[MinimapIntegration] addEnemyMarker method not available');
      
      // Try to ensure methods are available
      this._ensureMinimapMethods();
      
      // If still not available after ensuring, log and return
      if (typeof this.minimap.addEnemyMarker !== 'function') {
        console.error('[MinimapIntegration] Could not create addEnemyMarker method stub');
        return;
      }
    }
    
    try {
      // Add competitors (bots, other players)
      if (this.world.competitors) {
        this.world.competitors.forEach(competitor => {
          if (competitor !== this.world.player && competitor.position) {
            try {
              this.minimap.addEnemyMarker(competitor);
            } catch (err) {
              console.warn(`[MinimapIntegration] Error adding competitor ${competitor.name || 'unnamed'}:`, err);
            }
          }
        });
      }

      // Also check enemies array if it exists
      if (this.world.enemies) {
        this.world.enemies.forEach(enemy => {
          try {
            this.minimap.addEnemyMarker(enemy);
          } catch (err) {
            console.warn(`[MinimapIntegration] Error adding enemy ${enemy.name || 'unnamed'}:`, err);
          }
        });
      }
    } catch (error) {
      console.error('[MinimapIntegration] Error adding enemies:', error);
    }
  }
  
  // Add all items to the minimap
  addAllItems() {
    // First check if minimap exists
    if (!this.minimap) {
      console.error('[MinimapIntegration] Minimap not initialized');
      return;
    }
    
    // Check if the addItemMarker method exists
    if (typeof this.minimap.addItemMarker !== 'function') {
      console.warn('[MinimapIntegration] addItemMarker method not available');
      
      // Try to ensure methods are available
      this._ensureMinimapMethods();
      
      // If still not available after ensuring, log and return
      if (typeof this.minimap.addItemMarker !== 'function') {
        console.error('[MinimapIntegration] Could not create addItemMarker method stub');
        return;
      }
    }
    
    try {
      const itemArrays = [
        this.world.items,
        this.world.pickups,
        this.world.pickableItems,
        this.world.collectibles
      ];

      // Add items from spawning manager if available
      if (this.world.spawningManager) {
        const spawner = this.world.spawningManager;

        if (spawner.healthPacks && Array.isArray(spawner.healthPacks)) {
          console.log("Adding health packs to minimap:", spawner.healthPacks.length);
          itemArrays.push(spawner.healthPacks);
        }

        if (spawner.blasters && Array.isArray(spawner.blasters)) {
          console.log("Adding blasters to minimap:", spawner.blasters.length);
          itemArrays.push(spawner.blasters);
        }

        if (spawner.shotguns && Array.isArray(spawner.shotguns)) {
          console.log("Adding shotguns to minimap:", spawner.shotguns.length);
          itemArrays.push(spawner.shotguns);
        }

        if (spawner.assaultRifles && Array.isArray(spawner.assaultRifles)) {
          console.log("Adding assault rifles to minimap:", spawner.assaultRifles.length);
          itemArrays.push(spawner.assaultRifles);
        }
      }

      let totalWeaponsAdded = 0;
      let totalHealthAdded = 0;

      itemArrays.forEach(items => {
        if (!items || !Array.isArray(items)) return;

        items.forEach(item => {
          if (!item || !item.position) return;

          let itemType = 'generic';

          // Check render component name
          if (item._renderComponent) {
            const model = item._renderComponent;
            const modelName = model.name?.toLowerCase() || '';

            if (modelName.includes('health')) {
              itemType = 'health';
            } else if (modelName.includes('blaster')) {
              itemType = 'blaster';
            } else if (modelName.includes('shotgun')) {
              itemType = 'shotgun';
            } else if (modelName.includes('assault') || modelName.includes('rifle')) {
              itemType = 'assaultRifle';
            }
          }

          // Check item name
          if (itemType === 'generic' && item.name) {
            const name = item.name.toLowerCase();
            if (name.includes('health') || name.includes('med')) {
              itemType = 'health';
            } else if (name.includes('ammo') || name.includes('bullet')) {
              itemType = 'ammo';
            } else if (name.includes('blaster')) {
              itemType = 'blaster';
            } else if (name.includes('shotgun')) {
              itemType = 'shotgun';
            } else if (name.includes('rifle') || name.includes('assault')) {
              itemType = 'assaultRifle';
            } else if (name.includes('gun') || name.includes('weapon') || name.includes('pistol')) {
              itemType = 'weapon';
            }
          }

          // Check item type constant
          if (itemType === 'generic' && item.type !== undefined) {
            switch (item.type) {
              case 1: itemType = 'blaster'; break;
              case 2: itemType = 'shotgun'; break;
              case 3: itemType = 'assaultRifle'; break;
              case 15: itemType = 'health'; break;
            }
          }

          // Check userData
          if (itemType === 'generic' && item.userData?.type) {
            itemType = item.userData.type;
          }

          // Check file path
          if (itemType === 'generic' && item.filePath) {
            const path = item.filePath.toLowerCase();
            if (path.includes('blaster')) {
              itemType = 'blaster';
            } else if (path.includes('shotgun')) {
              itemType = 'shotgun';
            } else if (path.includes('assault') || path.includes('rifle')) {
              itemType = 'assaultRifle';
            } else if (path.includes('health')) {
              itemType = 'health';
            }
          }

          // Check model path
          if (itemType === 'generic' && item._modelPath) {
            const modelPath = item._modelPath.toLowerCase();
            if (modelPath.includes('blaster')) {
              itemType = 'blaster';
            } else if (modelPath.includes('shotgun')) {
              itemType = 'shotgun';
            } else if (modelPath.includes('assault') || modelPath.includes('rifle')) {
              itemType = 'assaultRifle';
            } else if (modelPath.includes('health')) {
              itemType = 'health';
            }
          }

          // Log item type detection for debugging
          console.log("Item type detected:", itemType, "for item:", item.name || "unnamed", "at position:", item.position.x.toFixed(2), item.position.y.toFixed(2), item.position.z.toFixed(2));

          // Add to minimap - now with error handling
          try {
            if (typeof this.minimap.addItemMarker === 'function') {
              const marker = this.minimap.addItemMarker(item, itemType || 'generic');
              
              // Ensure marker is initially visible
              if (marker) {
                marker.visible = true;
                
                // Track item types added for debugging
                if (itemType === 'health') {
                  totalHealthAdded++;
                } else if (['blaster', 'shotgun', 'assaultRifle', 'weapon'].includes(itemType)) {
                  totalWeaponsAdded++;
                }
              }
            } else {
              console.warn('[MinimapIntegration] addItemMarker method not available');
            }
          } catch (error) {
            console.error('[MinimapIntegration] Error adding item marker:', error);
          }
        });
      });
      
      // Log summary of items added
      console.log("Minimap items summary - Health packs:", totalHealthAdded, "Weapons:", totalWeaponsAdded);
    } catch (error) {
      console.error('[MinimapIntegration] Error in addAllItems:', error);
    }
  }

  // Add debug markers for development and testing
  addDebugMarkers() {
    if (!this.minimap) return;
    
    // Add weapon position markers
    const positions = [
      { x: 5.0, z: 45.0, type: 'shotgun' },
      { x: -7.0, z: -19.0, type: 'shotgun' }
    ];
    
    positions.forEach(pos => {
      const markerGeometry = new THREE.ConeGeometry(1.5, 3, 8);
      const markerMaterial = new THREE.MeshBasicMaterial({
        color: 0xff00ff, // Bright magenta
        transparent: true,
        opacity: 1.0
      });
      
      const testMarker = new THREE.Mesh(markerGeometry, markerMaterial);
      testMarker.rotation.x = -Math.PI / 2;
      testMarker.position.set(pos.x, 0, pos.z);
      
      this.minimap.minimapScene.add(testMarker);
      
      console.log(`Added debug marker at ${pos.x}, ${pos.z} for ${pos.type}`);
    });
  }

  // Main update function called every frame
  update() {
    if (this.initialized && this.minimap) {
      // Debug visibility states occasionally
      const debugInterval = 100; // Log every 100 frames
      const shouldDebug = (this.frameCount % debugInterval === 0);
      
      this.frameCount++;
      
      // Update visibility of markers based on whether items are available
      if (this.minimap.markers && this.minimap.markers.items) {
        let weaponsVisible = 0;
        let weaponsHidden = 0;
        
        this.minimap.markers.items.children.forEach(marker => {
          if (marker.userData && marker.userData.item) {
            const item = marker.userData.item;
            let shouldBeVisible = true; // Default to visible
            
            // Check if this item has a trigger (from spawning manager)
            if (this.world.spawningManager && this.world.spawningManager.itemTriggerMap) {
              const trigger = this.world.spawningManager.itemTriggerMap.get(item);
              
              // If trigger exists, use its active state
              if (trigger) {
                shouldBeVisible = trigger.active;
              } else if (item.visible !== undefined) {
                // If no trigger found but item has visible property
                shouldBeVisible = item.visible;
              }
            } else if (item.visible !== undefined) {
              // If no spawning manager but item has visible property
              shouldBeVisible = item.visible;
            }
            
            // For weapons, log visibility changes
            const isWeapon = marker.userData.type && 
                             ['blaster', 'shotgun', 'assaultRifle', 'weapon'].includes(marker.userData.type);
            
            if (isWeapon) {
              if (shouldBeVisible) {
                weaponsVisible++;
              } else {
                weaponsHidden++;
              }
            }
            
            marker.visible = shouldBeVisible;
          }
        });
        
        // Log weapon visibility statistics occasionally
        if (shouldDebug && (weaponsVisible > 0 || weaponsHidden > 0)) {
          console.log(`Minimap weapons: ${weaponsVisible} visible, ${weaponsHidden} hidden`);
        }
      }

      // Update the minimap
      this.minimap.update();
      
      // Update enemy and item markers (if using stubs)
      this._updateMarkers();
    }
  }

  /**
   * Update all markers created by our stub implementation
   * @private
   */
  _updateMarkers() {
    // Update enemy markers
    this._enemyMarkers.forEach((marker, enemy) => {
      if (marker && marker.userData && marker.userData.update) {
        marker.userData.update();
      }
    });
    
    // Update item markers
    this._itemMarkers.forEach((marker, item) => {
      if (marker && marker.userData && marker.userData.update) {
        marker.userData.update();
      }
    });
  }

  // Show the minimap
  show() {
    if (this.minimapContainer) {
      this.minimapContainer.classList.remove('hidden');
      
      if (this.initialized && this.minimap) {
        this.minimap.update();
      }
    }
  }

  // Hide the minimap
  hide() {
    if (this.minimapContainer) {
      this.minimapContainer.classList.add('hidden');
    }
  }
  
  // Toggle the rotation of the minimap with the player
  toggleRotation() {
    if (this.minimap) {
      this.minimap.options.rotateWithPlayer = !this.minimap.options.rotateWithPlayer;
      return this.minimap.options.rotateWithPlayer;
    }
    return false;
  }

  // Clean up resources when the minimap is no longer needed
  destroy() {
    if (this.minimap) {
      this.minimap.destroy();
      this.minimap = null;
    }
    this.initialized = false;
  }
}

export { MinimapIntegration };
