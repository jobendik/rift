import { AdvancedMinimap } from './minimapClass.js';
import * as THREE from 'three';

class MinimapIntegration {
  constructor(world) {
    this.world = world;
    this.minimap = null;
    this.minimapContainer = document.getElementById('advancedMinimapContainer');
    this.initialized = false;
    this.lastPlayerPosition = null;
    this.movementVector = { x: 0, z: -1 }; // Default forward
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
        height: 200, // Higher to ensure proper top-down view
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
        // Pass our custom movement detection function
        getPlayerDirection: () => this.getPlayerMovementDirection()
      }
    );

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
    return true;
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
    if (!this.world.player || !this.lastPlayerPosition) {
      return 0;
    }
    
    const currentPos = this.world.player.position;
    
    // Calculate movement vector since last frame
    const deltaX = currentPos.x - this.lastPlayerPosition.x;
    const deltaZ = currentPos.z - this.lastPlayerPosition.z;
    
    // Only update direction if player moved enough
    const movementThreshold = 0.01;
    if (Math.abs(deltaX) > movementThreshold || Math.abs(deltaZ) > movementThreshold) {
      this.movementVector = { x: deltaX, z: deltaZ };
    }
    
    // Store current position for next frame
    this.lastPlayerPosition.copy(currentPos);
    
    // Calculate angle from movement vector
    return Math.atan2(this.movementVector.x, this.movementVector.z);
  }
  
  // Add all enemies to the minimap
  addAllEnemies() {
    // Add competitors (bots, other players)
    if (this.world.competitors) {
      this.world.competitors.forEach(competitor => {
        if (competitor !== this.world.player && competitor.position) {
          this.minimap.addEnemyMarker(competitor);
        }
      });
    }

    // Also check enemies array if it exists
    if (this.world.enemies) {
      this.world.enemies.forEach(enemy => {
        this.minimap.addEnemyMarker(enemy);
      });
    }
  }
  
  // Add all items to the minimap
  addAllItems() {
    // Check for various item containers
    const itemArrays = [
      this.world.items,
      this.world.pickups,
      this.world.pickableItems,
      this.world.collectibles
    ];
    
    itemArrays.forEach(items => {
      if (!items || !Array.isArray(items)) return;
      
      items.forEach(item => {
        if (!item || !item.position) return;
        
        let itemType = 'generic';
        
        // Determine item type
        if (item.name) {
          const name = item.name.toLowerCase();
          if (name.includes('health') || name.includes('med')) {
            itemType = 'health';
          } else if (name.includes('ammo') || name.includes('bullet')) {
            itemType = 'ammo';
          } else if (name.includes('gun') || name.includes('weapon') || 
                     name.includes('rifle') || name.includes('pistol')) {
            itemType = 'weapon';
          }
        }
        
        // Also check userData
        if (item.userData && item.userData.type) {
          itemType = item.userData.type;
        }
        
        this.minimap.addItemMarker(item, itemType);
      });
    });
  }

  update() {
    if (this.initialized && this.minimap) {
      this.minimap.update();
    }
  }

  show() {
    if (this.minimapContainer) {
      this.minimapContainer.classList.remove('hidden');
    }
  }

  hide() {
    if (this.minimapContainer) {
      this.minimapContainer.classList.add('hidden');
    }
  }

  destroy() {
    if (this.minimap) {
      this.minimap.destroy();
      this.minimap = null;
    }
    this.initialized = false;
  }
}

export { MinimapIntegration };
