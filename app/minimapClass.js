import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Advanced Minimap class for Three.js FPS games
class AdvancedMinimap {
  constructor(scene, mainCamera, player, options = {}) {
    // Standard settings with extended options
    this.options = {
      size: 200,                 // Size of the minimap in pixels
      height: 100,               // Height above the scene
      border: '3px solid #fff',  // Border style
      borderRadius: '50%',       // Round shape
      backgroundColor: 'rgba(0, 0, 0, 0.5)', // Background color
      position: 'top-right',     // Position on the screen
      scale: 20,                 // Scale for the minimap (how much of the scene is shown)
      playerColor: 0x00ff00,     // Color for the player marker
      enemyColor: 0xff0000,      // Color for enemy markers
      itemColor: 0xffff00,       // Color for items
      
      // Advanced options
      rotateWithPlayer: false,   // Whether the map rotates with the player
      zoomable: true,            // Whether the player can zoom the map
      zoomMin: 10,               // Minimum zoom level
      zoomMax: 50,               // Maximum zoom level
      enemyDetectionRadius: 30,  // Radius for detecting enemies (in game units)
      heightIndicator: true,     // Whether height differences should be indicated
      updateFrequency: 1,        // Update every n-th frame (1 = every frame)
      lowResolutionFactor: 0.75, // Reduces resolution for better performance
      simplifyGeometry: true,    // Use simplified geometries for map view
      showObjectives: true,      // Show objectives on the map
      fogOfWar: false,           // Enable "fog of war" effect
      radarSweep: false,         // Enable radar sweep effect
      getPlayerDirection: null,  // Custom function to get player's direction
      
      ...options                 // Override with incoming options
    };

    // References to the scene and player object
    this.scene = scene;
    this.mainCamera = mainCamera;
    this.player = player;
    
    // Status variables
    this.frameCount = 0;
    this.currentZoom = this.options.scale;
    this.objectiveMarkers = new Map();
    this.discoveredAreas = new Set();
    
    // Create container for the minimap
    this.createMinimapContainer();
    
    // Create UI controllers if zoomable is enabled
    if (this.options.zoomable) {
      this.createZoomControls();
    }
    
    // Create the minimap renderer with lower resolution for better performance
    this.createMinimapRenderer();
    
    // Create the minimap camera
    this.createMinimapCamera();
    
    // Create a separate scene for the minimap
    this.minimapScene = new THREE.Scene();
    
    // Create markers for the player
    this.createPlayerMarker();
    
    // Create specialized containers for different types of objects
    this.markers = {
      enemies: new THREE.Group(),
      items: new THREE.Group(),
      objectives: new THREE.Group(),
    };
    
    // Add groups to the scene
    Object.values(this.markers).forEach(group => {
      this.minimapScene.add(group);
    });
    
    // Level handling
    this.levelMap = new THREE.Group();
    this.minimapScene.add(this.levelMap);
    
    // Add fog of war if enabled
    if (this.options.fogOfWar) {
      this.setupFogOfWar();
    }
    
    // Add radar sweep if enabled
    if (this.options.radarSweep) {
      this.setupRadarSweep();
    }
    
    // Initialize event listeners
    this.initEventListeners();
  }
  
  // Create HTML container for the minimap
  createMinimapContainer() {
    this.container = document.createElement('div');
    
    // Style container
    Object.assign(this.container.style, {
      position: 'absolute',
      width: `${this.options.size}px`,
      height: `${this.options.size}px`,
      border: this.options.border,
      borderRadius: this.options.borderRadius,
      backgroundColor: this.options.backgroundColor,
      overflow: 'hidden',
      zIndex: 1000,
      transition: 'all 0.3s ease'
    });
    
    // Positioning based on settings
    switch (this.options.position) {
      case 'top-left':
        Object.assign(this.container.style, {
          top: '20px',
          left: '20px'
        });
        break;
      case 'top-right':
        Object.assign(this.container.style, {
          top: '20px',
          right: '20px'
        });
        break;
      case 'bottom-left':
        Object.assign(this.container.style, {
          bottom: '20px',
          left: '20px'
        });
        break;
      case 'bottom-right':
        Object.assign(this.container.style, {
          bottom: '20px',
          right: '20px'
        });
        break;
      default:
        Object.assign(this.container.style, {
          top: '20px',
          right: '20px'
        });
    }
    
    document.body.appendChild(this.container);
  }
  
  // Create zoom controls for the minimap
  createZoomControls() {
    // Container for zoom controls
    this.zoomControls = document.createElement('div');
    Object.assign(this.zoomControls.style, {
      position: 'absolute',
      bottom: '10px',
      right: '10px',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1001
    });
    
    // Zoom in button
    this.zoomInButton = document.createElement('button');
    this.zoomInButton.textContent = '+';
    Object.assign(this.zoomInButton.style, {
      width: '24px',
      height: '24px',
      margin: '2px',
      border: '1px solid #ffffff',
      borderRadius: '4px',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      color: 'white',
      cursor: 'pointer',
      fontSize: '16px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      lineHeight: '1'
    });
    
    // Zoom out button
    this.zoomOutButton = document.createElement('button');
    this.zoomOutButton.textContent = '-';
    Object.assign(this.zoomOutButton.style, {
      width: '24px',
      height: '24px',
      margin: '2px',
      border: '1px solid #ffffff',
      borderRadius: '4px',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      color: 'white',
      cursor: 'pointer',
      fontSize: '16px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      lineHeight: '1'
    });
    
    // Toggle rotation button
    this.rotateToggleButton = document.createElement('button');
    this.rotateToggleButton.textContent = '↻';
    Object.assign(this.rotateToggleButton.style, {
      width: '24px',
      height: '24px',
      margin: '2px',
      border: '1px solid #ffffff',
      borderRadius: '4px',
      backgroundColor: this.options.rotateWithPlayer ? 'rgba(0, 128, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
      color: 'white',
      cursor: 'pointer',
      fontSize: '16px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      lineHeight: '1'
    });
    
    // Add buttons to container
    this.zoomControls.appendChild(this.zoomInButton);
    this.zoomControls.appendChild(this.zoomOutButton);
    this.zoomControls.appendChild(this.rotateToggleButton);
    
    // Add container to minimap
    this.container.appendChild(this.zoomControls);
    
    // Event listeners for buttons
    this.zoomInButton.addEventListener('click', () => this.zoomIn());
    this.zoomOutButton.addEventListener('click', () => this.zoomOut());
    this.rotateToggleButton.addEventListener('click', () => this.toggleRotation());
  }
  
  // Zoom in function
  zoomIn() {
    if (this.currentZoom > this.options.zoomMin) {
      this.currentZoom -= 5;
      this.updateCameraZoom();
    }
  }
  
  // Zoom out function
  zoomOut() {
    if (this.currentZoom < this.options.zoomMax) {
      this.currentZoom += 5;
      this.updateCameraZoom();
    }
  }
  
  // Update camera zoom
  updateCameraZoom() {
    const scale = this.currentZoom;
    this.camera.left = -scale;
    this.camera.right = scale;
    this.camera.top = scale;
    this.camera.bottom = -scale;
    this.camera.updateProjectionMatrix();
  }
  
  // Toggle between fixed and rotating map
  toggleRotation() {
    this.options.rotateWithPlayer = !this.options.rotateWithPlayer;
    this.rotateToggleButton.style.backgroundColor = this.options.rotateWithPlayer ? 
      'rgba(0, 128, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
  }
  
  // Create webGL renderer for the minimap with reduced resolution
  createMinimapRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'low-power' // Better battery life on mobile devices
    });
    
    // Calculate size with resolution factor
    const rendererSize = Math.floor(this.options.size * this.options.lowResolutionFactor);
    
    this.renderer.setSize(rendererSize, rendererSize);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1)); // Limit to 1x
    
    // Set canvas to fill entire container
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    
    this.container.appendChild(this.renderer.domElement);
  }
  
  // Create orthographic camera for the minimap
  createMinimapCamera() {
    const scale = this.options.scale;
    this.currentZoom = scale;
    
    this.camera = new THREE.OrthographicCamera(
      -scale, scale, 
      scale, -scale, 
      1, 1000
    );
    
    // Position camera high above the scene, looking down
    this.camera.position.set(0, this.options.height, 0);
    this.camera.lookAt(0, 0, 0);
    this.camera.up.set(0, 0, -1); // Set up vector to orient map correctly
    this.camera.updateProjectionMatrix();
  }
  
updatePlayerMarker(playerPosition, playerDirection) {
  // Update player dot position
  this.playerDot.position.set(playerPosition.x, 0, playerPosition.z);
  
  // Handle vision cone with direct matrix manipulation
  if (this.visionCone) {
    // Position cone at player position
    this.visionCone.position.copy(playerPosition);
    this.visionCone.position.y = 0;
    
    // Reset rotation first
    this.visionCone.rotation.set(0, 0, 0);
    
    // Then apply the player direction rotation
    this.visionCone.rotateY(playerDirection);
  }
}

// Create marker for the player with improved appearance

createPlayerMarker() {
  // Create a circle for player position
  const circleGeometry = new THREE.CircleGeometry(1.0, 16);
  const circleMaterial = new THREE.MeshBasicMaterial({ 
    color: this.options.playerColor 
  });
  
  this.playerDot = new THREE.Mesh(circleGeometry, circleMaterial);
  this.playerDot.rotation.x = -Math.PI / 2;
  this.minimapScene.add(this.playerDot);
  
  // Create a container for the vision cone - this will handle the Y rotation
  this.coneContainer = new THREE.Object3D();
  this.minimapScene.add(this.coneContainer);
  
  // Create vision cone - this time as a proper FOV indicator
  const coneShape = new THREE.Shape();
  
  // Define a field of view cone shape - apex at player, spreading outward
  // (NOTE: This is the key change - we're flipping the orientation)
  coneShape.moveTo(0, 0);        // Apex at player's position
  coneShape.lineTo(-6, 12);      // Left edge extends outward
  coneShape.lineTo(6, 12);       // Right edge extends outward
  coneShape.lineTo(0, 0);        // Back to apex to close shape
  
  const coneGeometry = new THREE.ShapeGeometry(coneShape);
  
  // Bright, high-contrast material
const coneMaterial = new THREE.MeshBasicMaterial({
  color: 0x00ff00,             // Bright green
  transparent: true,           // Use transparency
  opacity: 0.10,               // Much more transparent (was 0.5)
  side: THREE.DoubleSide
});
  
  this.visionCone = new THREE.Mesh(coneGeometry, coneMaterial);
  
  // Rotate to lay flat along X-Z plane
  this.visionCone.rotation.x = -Math.PI / 2;
  
  // Add cone to the container
  this.coneContainer.add(this.visionCone);
}
  
  // Set up "fog of war" effect
  setupFogOfWar() {
    // Create a grid of boxes covering the entire game area
    this.fogGrid = [];
    const gridSize = 5; // Size of each fog cell
    const worldSize = 200; // Assumed size of the world
    const halfWorldSize = worldSize / 2;
    
    // Create fog group
    this.fogOfWarGroup = new THREE.Group();
    this.minimapScene.add(this.fogOfWarGroup);
    
    // Create material setup for fog
    const fogMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    
    // Create grid of fog cells
    for (let x = -halfWorldSize; x < halfWorldSize; x += gridSize) {
      for (let z = -halfWorldSize; z < halfWorldSize; z += gridSize) {
        const fogGeometry = new THREE.PlaneGeometry(gridSize, gridSize);
        const fogCell = new THREE.Mesh(fogGeometry, fogMaterial.clone());
        
        fogCell.position.set(x + gridSize/2, 0.1, z + gridSize/2);
        fogCell.rotation.x = -Math.PI / 2;
        
        // Add to group and array
        this.fogOfWarGroup.add(fogCell);
        this.fogGrid.push({
          mesh: fogCell,
          x: x + gridSize/2,
          z: z + gridSize/2,
          discovered: false
        });
      }
    }
  }
  
  // Set up radar sweep effect
  setupRadarSweep() {
    // Create radar sweep geometry
    const radarGeometry = new THREE.RingGeometry(1, 30, 32, 1, 0, Math.PI / 4);
    const radarMaterial = new THREE.MeshBasicMaterial({
      color: this.options.playerColor,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide
    });
    
    this.radarSweep = new THREE.Mesh(radarGeometry, radarMaterial);
    this.radarSweep.rotation.x = -Math.PI / 2;
    this.radarSweepAngle = 0;
    this.minimapScene.add(this.radarSweep);
  }
  
  // Initialize event listeners
  initEventListeners() {
    // Handle mouse wheel for zoom
    if (this.options.zoomable) {
      this.container.addEventListener('wheel', (event) => {
        event.preventDefault();
        
        if (event.deltaY < 0) {
          this.zoomIn();
        } else {
          this.zoomOut();
        }
      });
    }
    
    // Handle window resize
    window.addEventListener('resize', () => {
      // If minimap uses a percentage of screen, update size
      if (typeof this.options.size === 'string' && this.options.size.includes('%')) {
        this.resize();
      }
    });
  }
  
  // Generate simplified geometry for level meshes
  simplifyGeometry(geometry) {
    if (!this.options.simplifyGeometry) return geometry.clone();
    
    // Simple geometry simplification - could use a decimator for more advanced
    // Here we use a simple limitation on number of vertices
    
    // For boxes and other simple shapes, return a simple box
    if (geometry.type.includes('BoxGeometry') || 
        geometry.type.includes('PlaneGeometry') ||
        geometry.attributes.position.count < 100) {
      return geometry.clone();
    }
    
    // For more complex geometries, create a simplified version
    // In a complete implementation, we would use a more advanced decimation algorithm
    // such as THREE.BufferGeometryUtils.mergeVertices or an external decimator
    
    // Here we do a simple sampling of vertices
    const positions = geometry.attributes.position.array;
    const simplifiedPositions = [];
    
    // Sample every 10th vertex
    for (let i = 0; i < positions.length; i += 30) {
      simplifiedPositions.push(positions[i], positions[i+1], positions[i+2]);
    }
    
    // Create new geometry
    const simplifiedGeometry = new THREE.BufferGeometry();
    simplifiedGeometry.setAttribute('position', 
      new THREE.Float32BufferAttribute(simplifiedPositions, 3));
    
    return simplifiedGeometry;
  }
  
  // Add the level to the minimap with simplified geometries
  addLevelToMinimap(levelObject) {
    // Clear existing levelMap
    while (this.levelMap.children.length > 0) {
      const child = this.levelMap.children[0];
      this.levelMap.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }
    
    // Traverse level object
    levelObject.traverse(child => {
      if (child.isMesh && child.geometry) {
        // Ignore objects that should not be visible on the map
        if (child.name.includes('sky') || 
            child.name.includes('particle') || 
            child.name.includes('light') ||
            child.name.includes('collider')) {
          return;
        }
        
        // Determine color based on object type
        let color = 0xaaaaaa; // Standard gray
        
        // Adjust color based on object name or material
        if (child.name.includes('wall') || child.material?.name?.includes('wall')) {
          color = 0xffffff; // White for walls
        } else if (child.name.includes('floor') || child.material?.name?.includes('floor')) {
          color = 0x555555; // Darker gray for floors
        } else if (child.name.includes('water') || child.material?.name?.includes('water')) {
          color = 0x0055ff; // Blue for water
        }
        
        // Create simplified geometry
        const simplifiedGeom = this.simplifyGeometry(child.geometry);
        
        // Create mesh with simple material
        const minimapMesh = new THREE.Mesh(
          simplifiedGeom,
          new THREE.MeshBasicMaterial({ 
            color: color,
            wireframe: false,
            opacity: 0.7,
            transparent: true
          })
        );
        
        // Copy transformations from original object
        minimapMesh.position.copy(child.position);
        minimapMesh.rotation.copy(child.rotation);
        minimapMesh.scale.copy(child.scale);
        
        // Original height info for height indication
        minimapMesh.userData.originalHeight = child.position.y;
        
        this.levelMap.add(minimapMesh);
      }
    });
  }
  
  // Add enemies to the minimap with height indication
  addEnemyMarker(enemy) {
    const geometry = new THREE.CircleGeometry(0.8, 16);
    
    // Create material with base color
    const material = new THREE.MeshBasicMaterial({ 
      color: this.options.enemyColor,
      transparent: true,
      opacity: 0.8
    });
    
    const marker = new THREE.Mesh(geometry, material);
    marker.rotation.x = -Math.PI / 2;
    marker.userData.enemy = enemy; // Store reference to the enemy
    marker.userData.isEnemy = true;
    marker.userData.isDiscovered = false;
    marker.visible = false; // Start invisible until discovered
    
    // Add to enemy group
    this.markers.enemies.add(marker);
    
    return marker;
  }
  
  // Add items to the minimap
  addItemMarker(item, type) {
    // Choose color and shape based on type
    let color;
    let size = 0.8;
    
    // Assign colors based on item type
    if (type === 'health') {
      color = 0xffffff; // White for health packs
      size = 1.0; // Slightly larger for visibility
    } else if (type === 'blaster') {
      color = 0x00ffff; // Cyan for blaster
    } else if (type === 'shotgun') {
      color = 0x0088ff; // Medium blue for shotgun
    } else if (type === 'assaultRifle') {
      color = 0x4444ff; // Darker blue for assault rifle
    } else if (type === 'weapon') {
      color = 0x00aaff; // Default blue for generic weapons
    } else {
      color = this.options.itemColor; // Default color from options
    }
    
    // Create a simple circle geometry for all items
    const geometry = new THREE.CircleGeometry(size, 8);
    
    // Create material with full opacity
    const material = new THREE.MeshBasicMaterial({ 
      color: color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1.0
    });
    
    // Create marker
    const marker = new THREE.Mesh(geometry, material);
    marker.rotation.x = -Math.PI / 2; // Face upward
    marker.userData.item = item;
    marker.userData.type = type;
    
    // Ensure best visibility
    marker.renderOrder = 1;
    marker.material.depthTest = false;
    
    // Add to items group
    this.markers.items.add(marker);
    
    return marker;
  }
  
  // Add an objective/goal to the minimap
  addObjectiveMarker(position, type = 'primary', label = '') {
    // Determine color based on type
    let color;
    let size = 1.2;
    
    switch (type) {
      case 'primary':
        color = 0x00ffff; // Cyan for main objectives
        size = 1.2;
        break;
      case 'secondary':
        color = 0xffaa00; // Orange for secondary objectives
        size = 1.0;
        break;
      case 'bonus':
        color = 0xaaaaff; // Light blue for bonus objectives
        size = 0.8;
        break;
      default:
        color = 0xffffff; // White for standard objectives
    }
    
    // Create geometry and material
    const geometry = new THREE.RingGeometry(size * 0.7, size, 16);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    
    // Create mesh
    const marker = new THREE.Mesh(geometry, material);
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(position.x, 0, position.z);
    marker.userData.type = type;
    marker.userData.label = label;
    
    // Add extra effect for primary objectives
    if (type === 'primary') {
      const innerGeometry = new THREE.CircleGeometry(size * 0.3, 16);
      const innerMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.6
      });
      
      const innerCircle = new THREE.Mesh(innerGeometry, innerMaterial);
      innerCircle.rotation.x = -Math.PI / 2;
      marker.add(innerCircle);
    }
    
    // Add to objectives group
    this.markers.objectives.add(marker);
    
    // Store in objective map for easy access
    const id = THREE.MathUtils.generateUUID();
    this.objectiveMarkers.set(id, marker);
    
    return id; // Return ID for later reference
  }
  
  // Remove an objective/goal from the map
  removeObjectiveMarker(id) {
    if (this.objectiveMarkers.has(id)) {
      const marker = this.objectiveMarkers.get(id);
      this.markers.objectives.remove(marker);
      this.objectiveMarkers.delete(id);
      
      // Free resources
      if (marker.geometry) marker.geometry.dispose();
      if (marker.material) marker.material.dispose();
    }
  }
  
  // Add directional arrow to an objective
  addDirectionalArrow(targetId) {
    if (!this.objectiveMarkers.has(targetId)) return;
    
    const target = this.objectiveMarkers.get(targetId);
    
    // Create arrow geometry
    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(0, 2);
    arrowShape.lineTo(1, 0);
    arrowShape.lineTo(0.5, 0);
    arrowShape.lineTo(0.5, -1);
    arrowShape.lineTo(-0.5, -1);
    arrowShape.lineTo(-0.5, 0);
    arrowShape.lineTo(-1, 0);
    arrowShape.lineTo(0, 2);
    
    const geometry = new THREE.ShapeGeometry(arrowShape);
    const material = new THREE.MeshBasicMaterial({
      color: target.material.color,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    
    // Create arrow mesh
    this.directionalArrow = new THREE.Mesh(geometry, material);
    this.directionalArrow.scale.set(0.7, 0.7, 0.7);
    this.directionalArrow.rotation.x = -Math.PI / 2;
    this.directionalArrow.userData.targetId = targetId;
    
    // Add to scene
    this.minimapScene.add(this.directionalArrow);
    
    return this.directionalArrow;
  }
  
  // Update directional arrow
  updateDirectionalArrow() {
    if (!this.directionalArrow) return;
    
    const targetId = this.directionalArrow.userData.targetId;
    if (!this.objectiveMarkers.has(targetId)) {
      // Target is removed, remove the arrow
      this.minimapScene.remove(this.directionalArrow);
      if (this.directionalArrow.geometry) this.directionalArrow.geometry.dispose();
      if (this.directionalArrow.material) this.directionalArrow.material.dispose();
      this.directionalArrow = null;
      return;
    }
    
    // Get target position and player position
    const target = this.objectiveMarkers.get(targetId);
    const playerPos = this.player.position.clone();
    const targetPos = target.position.clone();
    
    // Calculate direction to target
    const direction = new THREE.Vector2(
      targetPos.x - playerPos.x,
      targetPos.z - playerPos.z
    );
    
    const distance = direction.length();
    
    // If target is within minimap view, don't show arrow
    if (distance < this.currentZoom * 0.8) {
      this.directionalArrow.visible = false;
      return;
    }
    
    // Show arrow
    this.directionalArrow.visible = true;
    
    // Normalize direction
    direction.normalize();
    
    // Calculate angle
    const angle = Math.atan2(direction.y, direction.x);
    
    // Position arrow at edge of minimap
    const radius = this.currentZoom * 0.8;
    const arrowX = Math.cos(angle) * radius;
    const arrowZ = Math.sin(angle) * radius;
    
    // Set position and rotation
    this.directionalArrow.position.set(
      playerPos.x + arrowX,
      0,
      playerPos.z + arrowZ
    );
    
    this.directionalArrow.rotation.z = -angle + Math.PI / 2;
  }
  
  // Check if an enemy is detected (within detection radius)
  isEnemyDetected(enemy) {
    // If we don't have a player or enemy, return false
    if (!this.player || !enemy) return false;
    
    const playerPos = this.player.position;
    const enemyPos = enemy.position;
    
    // Calculate distance between player and enemy
    const distance = new THREE.Vector2(
      enemyPos.x - playerPos.x,
      enemyPos.z - playerPos.z
    ).length();
    
    // Check if enemy is within detection radius
    return distance <= this.options.enemyDetectionRadius;
  }
  
  // Update fog of war
  updateFogOfWar() {
    if (!this.options.fogOfWar || !this.fogGrid) return;
    
    const playerPos = this.player.position;
    const detectionRadius = this.options.enemyDetectionRadius;
    
    // Go through all fog cells
    for (const fogCell of this.fogGrid) {
      // Calculate distance between player and cell
      const distance = new THREE.Vector2(
        fogCell.x - playerPos.x,
        fogCell.z - playerPos.z
      ).length();
      
      // If player is close enough, reveal fog
      if (distance <= detectionRadius) {
        if (!fogCell.discovered) {
          fogCell.discovered = true;
          
          // Fade out fog
          const fogMesh = fogCell.mesh;
          
          // Animation for fade-out
          const fadeOut = () => {
            if (fogMesh.material.opacity > 0.05) {
              fogMesh.material.opacity -= 0.05;
              requestAnimationFrame(fadeOut);
            } else {
              fogMesh.material.opacity = 0;
              fogMesh.visible = false;
            }
          };
          
          fadeOut();
          
          // Add to discovered areas
          this.discoveredAreas.add(`${fogCell.x.toFixed(1)},${fogCell.z.toFixed(1)}`);
        }
      }
    }
  }
  
  // Update radar sweep
  updateRadarSweep() {
    if (!this.options.radarSweep || !this.radarSweep) return;
    
    const playerPos = this.player.position;
    
    // Update sweep position to player
    this.radarSweep.position.set(playerPos.x, 0, playerPos.z);
    
    // Rotate sweep
    this.radarSweepAngle += 0.02;
    if (this.radarSweepAngle > Math.PI * 2) {
      this.radarSweepAngle = 0;
    }
    
    // Update sweep rotation
    this.radarSweep.rotation.y = this.radarSweepAngle;
    
    // Check for enemies in spotlight
    const sweepDirection = new THREE.Vector3(
      Math.cos(this.radarSweepAngle),
      0,
      Math.sin(this.radarSweepAngle)
    );
    
    // Go through all enemy markers
    this.markers.enemies.children.forEach(enemyMarker => {
      if (!enemyMarker.userData.enemy) return;
      
      const enemyPos = enemyMarker.userData.enemy.position;
      const toEnemy = new THREE.Vector3(
        enemyPos.x - playerPos.x,
        0,
        enemyPos.z - playerPos.z
      );
      
      const distance = toEnemy.length();
      
      // Normalize vector
      toEnemy.normalize();
      
      // Calculate dot product to find angle
      const dotProduct = toEnemy.dot(sweepDirection);
      
      // If enemy is in spotlight (within an angle) and within range
      if (dotProduct > 0.97 && distance <= this.options.enemyDetectionRadius) {
        // Set enemy as discovered
        if (!enemyMarker.userData.isDiscovered) {
          enemyMarker.userData.isDiscovered = true;
          enemyMarker.visible = true;
          
          // Flash effect
          const originalOpacity = enemyMarker.material.opacity;
          enemyMarker.material.opacity = 1;
          
          setTimeout(() => {
            enemyMarker.material.opacity = originalOpacity;
          }, 300);
        }
      }
    });
  }
  
  // Main update function
// Main update function
// Main update function
update() {
  // Performance optimization: only update every n-th frame
  this.frameCount++;
  if (this.frameCount % this.options.updateFrequency !== 0) return;
  
  if (!this.player) return;
  
  // Get player position
  const playerPosition = this.player.position.clone();
  
  // Get player direction - ONLY use custom function from options
  let playerDirection = 0;
  
  if (this.options.getPlayerDirection && typeof this.options.getPlayerDirection === 'function') {
    // Always use the custom direction function when available
    playerDirection = this.options.getPlayerDirection();
  }
  
  // Update player dot position
  this.playerDot.position.set(playerPosition.x, 0, playerPosition.z);
  
  // Update cone container position to follow player
  if (this.coneContainer) {
    this.coneContainer.position.set(playerPosition.x, 0, playerPosition.z);
    
    // Clear any previous rotation
    this.coneContainer.rotation.set(0, 0, 0);
    
    // Apply Y-axis rotation for direction - this will rotate the cone around its center
    this.coneContainer.rotation.y = playerDirection;
  }
  
  // If map should rotate with player
  if (this.options.rotateWithPlayer) {
    this.minimapScene.rotation.y = -playerDirection;
  } else {
    this.minimapScene.rotation.y = 0;
  }
  
  // Update camera position to follow player
  this.camera.position.set(playerPosition.x, this.options.height, playerPosition.z);
  
  // Update enemy markers
  this.markers.enemies.children.forEach(enemyMarker => {
    if (!enemyMarker.userData.enemy) return;
    
    const enemy = enemyMarker.userData.enemy;
    const enemyPosition = enemy.position;
    
    // Update position
    enemyMarker.position.set(enemyPosition.x, 0, enemyPosition.z);
    
    // Height indication
    if (this.options.heightIndicator) {
      // Compare enemy height with player's
      const heightDiff = enemyPosition.y - playerPosition.y;
      
      let enemyColor;
      if (heightDiff > 3) {
        // Enemy is significantly higher than player
        enemyColor = 0xff8800; // Orange
      } else if (heightDiff < -3) {
        // Enemy is significantly lower than player
        enemyColor = 0x0088ff; // Blue
      } else {
        // Enemy is about the same height
        enemyColor = this.options.enemyColor;
      }
      
      // Update color of marker
      enemyMarker.material.color.set(enemyColor);
    }
    
    // Check if enemy is detected
    if (this.isEnemyDetected(enemy)) {
      enemyMarker.userData.isDiscovered = true;
      enemyMarker.visible = true;
    } else {
      // If enemy has been discovered before, keep it on map with lower opacity
      if (enemyMarker.userData.isDiscovered) {
        enemyMarker.material.opacity = 0.5;
      } else {
        enemyMarker.visible = false;
      }
    }
  });
  
  // Update item markers
  this.markers.items.children.forEach(itemMarker => {
    if (!itemMarker.userData.item) return;
    
    const item = itemMarker.userData.item;
    const itemPosition = item.position;
    
    // Update position
    itemMarker.position.set(itemPosition.x, 0, itemPosition.z);
  });
  
  // Update Fog of War
  this.updateFogOfWar();
  
  // Update radar sweep
  this.updateRadarSweep();
  
  // Update directional arrow to objective
  this.updateDirectionalArrow();
  
  // Render the minimap
  this.renderer.render(this.minimapScene, this.camera);
}
  
  // Change size of the minimap
  resize(size) {
    if (size) {
      this.options.size = size;
    }
    
    // Update container
    this.container.style.width = `${this.options.size}px`;
    this.container.style.height = `${this.options.size}px`;
    
    // Calculate renderer size with resolution factor
    const rendererSize = Math.floor(this.options.size * this.options.lowResolutionFactor);
    
    // Update renderer
    this.renderer.setSize(rendererSize, rendererSize);
  }
  
  // Remove the minimap from the document
  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    // Remove event listeners
    if (this.zoomInButton) {
      this.zoomInButton.removeEventListener('click', this.zoomIn);
    }
    
    if (this.zoomOutButton) {
      this.zoomOutButton.removeEventListener('click', this.zoomOut);
    }
    
    if (this.rotateToggleButton) {
      this.rotateToggleButton.removeEventListener('click', this.toggleRotation);
    }
    
    // Free resources
    this.renderer.dispose();
    
    // Free geometries and materials
    const disposeObject = (obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(material => material.dispose());
        } else {
          obj.material.dispose();
        }
      }
      
      // Recursively for children
      if (obj.children) {
        obj.children.forEach(disposeObject);
      }
    };
    
    // Free all objects in the scene
    this.minimapScene.children.forEach(disposeObject);
  }
}

export { AdvancedMinimap };