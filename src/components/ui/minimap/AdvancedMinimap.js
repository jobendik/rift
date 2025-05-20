/**
 * AdvancedMinimap Component
 * 
 * A robust, feature-rich minimap implementation for the RIFT game engine.
 * Provides player position tracking, enemy detection, objective markers,
 * and various visualization options.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Advanced Minimap class for Three.js FPS games
 */
class AdvancedMinimap {
  /**
   * Create a new minimap instance
   * @param {Object} scene - The Three.js scene
   * @param {Object} mainCamera - The main camera
   * @param {Object} player - Player object with position
   * @param {Object} options - Configuration options
   */
  constructor(scene, mainCamera, player, options = {}) {
    // Standard settings with extended options
    this.options = {
      size: 200,                 // Size of the minimap in pixels
      height: 100,               // Height above the scene
      border: '3px solid #fff',  // Border style
      borderRadius: '50%',       // Round shape
      backgroundColor: 'rgba(0, 0, 0, 0.5)', // Background color
      position: 'bottom-left',   // Position on the screen (changed default to bottom-left)
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
  
  /**
   * Create HTML container for the minimap
   * @private
   */
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
    
    // Set ID for external CSS targeting
    this.container.id = 'advancedMinimapContainer';

    // Add class for CSS styling
    this.container.classList.add('minimap');

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
          bottom: '20px',
          left: '20px'
        });
    }
    
    document.body.appendChild(this.container);
  }
  
  /**
   * Create zoom controls for the minimap
   * @private
   */
  createZoomControls() {
    // Container for zoom controls
    this.zoomControls = document.createElement('div');
    this.zoomControls.className = 'minimap-controls';
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
    this.zoomInButton.className = 'minimap-control-button';
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
    this.zoomOutButton.className = 'minimap-control-button';
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
    this.rotateToggleButton.className = 'minimap-control-button';
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
  
  /**
   * Create WebGL renderer for the minimap with reduced resolution
   * @private
   */
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
  
  /**
   * Create orthographic camera for the minimap
   * @private
   */
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
  
  /**
   * Create marker for the player with improved appearance
   * @private 
   */
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
    coneShape.moveTo(0, 0);        // Apex at player's position
    coneShape.lineTo(-6, 12);      // Left edge extends outward
    coneShape.lineTo(6, 12);       // Right edge extends outward
    coneShape.lineTo(0, 0);        // Back to apex to close shape
    
    const coneGeometry = new THREE.ShapeGeometry(coneShape);
    
    // Bright, high-contrast material
    const coneMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,             // Bright green
      transparent: true,           // Use transparency
      opacity: 0.10,               // Much more transparent
      side: THREE.DoubleSide
    });
    
    this.visionCone = new THREE.Mesh(coneGeometry, coneMaterial);
    
    // Rotate to lay flat along X-Z plane
    this.visionCone.rotation.x = -Math.PI / 2;
    
    // Add cone to the container
    this.coneContainer.add(this.visionCone);
  }
  
  /**
   * Update player marker position and direction
   * @param {THREE.Vector3} playerPosition - The player's current position
   * @param {number} playerDirection - The player's direction in radians
   */
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
  
  /**
   * Zoom in function
   */
  zoomIn() {
    if (this.currentZoom > this.options.zoomMin) {
      this.currentZoom -= 5;
      this.updateCameraZoom();
    }
  }
  
  /**
   * Zoom out function
   */
  zoomOut() {
    if (this.currentZoom < this.options.zoomMax) {
      this.currentZoom += 5;
      this.updateCameraZoom();
    }
  }
  
  /**
   * Update camera zoom
   */
  updateCameraZoom() {
    const scale = this.currentZoom;
    this.camera.left = -scale;
    this.camera.right = scale;
    this.camera.top = scale;
    this.camera.bottom = -scale;
    this.camera.updateProjectionMatrix();
  }
  
  /**
   * Toggle between fixed and rotating map
   */
  toggleRotation() {
    this.options.rotateWithPlayer = !this.options.rotateWithPlayer;
    this.rotateToggleButton.style.backgroundColor = this.options.rotateWithPlayer ? 
      'rgba(0, 128, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
  }
  
  /**
   * Add the level to the minimap with simplified geometries
   * @param {Object} levelObject - The level object to add to the minimap
   */
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
  
  /**
   * Initialize event listeners
   * @private
   */
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
  
  /**
   * Generate simplified geometry for level meshes
   * @param {THREE.BufferGeometry} geometry - The original geometry
   * @returns {THREE.BufferGeometry} The simplified geometry
   * @private
   */
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
  
  /**
   * Main update function - call this once per frame from your game loop
   */
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
    
    // Render the minimap
    this.renderer.render(this.minimapScene, this.camera);
  }
  
  /**
   * Change size of the minimap
   * @param {number|string} size - New size for the minimap
   */
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
  
  /**
   * Remove the minimap from the document and clean up resources
   */
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
