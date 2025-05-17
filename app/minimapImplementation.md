# Detailed Implementation Guide: Advanced Three.js Minimap System

## Overview

This guide will help you implement an advanced minimap system in the existing Three.js first-person shooter project. The minimap will provide players with real-time navigational awareness including player position, enemies, objectives, and level layout. The implementation includes professional features similar to games like Battlefield and Fortnite, with optimizations for performance.

## Prerequisites Assessment

Before implementation, ensure:

1. The project has a functioning Three.js setup with:
   - A main scene (`scene`)
   - A camera (`camera`) attached to the player
   - A player object (`player`) with position and rotation properties
   - Properly loaded level geometry (likely from a GLTF/GLB file)
   - Enemy and item objects in the scene

2. Required Three.js modules are imported:
   - Core Three.js
   - GLTFLoader (if not already implemented)

## Implementation Steps

### Step 1: Create the AdvancedMinimap Class

1. Create a new file called `AdvancedMinimap.js` and implement the full class structure from the provided code.

2. Ensure all dependencies are correctly imported at the top:

```javascript
// Only needed if you're splitting into separate files
import * as THREE from 'three';
```

### Step 2: Add HTML Structure Support

1. The minimap creates its own DOM elements. Verify the application has a proper HTML structure where elements can be appended to the document body.

2. Ensure the CSS styling doesn't conflict with the minimap's positioning system.

### Step 3: Initialize the Minimap

After your scene, camera, and player are initialized, add:

```javascript
// Create minimap with appropriate options
const minimap = new AdvancedMinimap(scene, camera, player, {
  size: 180,                 // Size in pixels
  position: 'top-right',     // Screen position
  scale: 25,                 // Initial scale (view range)
  height: 80,                // Height above scene
  rotateWithPlayer: false,   // Start with fixed orientation
  zoomable: true,            // Allow zooming
  enemyDetectionRadius: 30,  // Detection radius for enemies
  heightIndicator: true,     // Show height indicators
  updateFrequency: 2,        // Update every other frame for better performance
  lowResolutionFactor: 0.8,  // Use 80% of full resolution
  simplifyGeometry: true,    // Use simplified geometries
  showObjectives: true,      // Show objectives on map
  fogOfWar: true,            // Enable fog of war
  radarSweep: true           // Enable radar sweep effect
});
```

Adjust these values to match the scale and design requirements of the specific project.

### Step 4: Add Level Geometry to Minimap

After loading your level GLTF/GLB file, add this to your load callback:

```javascript
// Assuming you have a loader and callback like this:
loader.load('level.glb', (gltf) => {
  scene.add(gltf.scene);
  
  // Add the level to the minimap
  minimap.addLevelToMinimap(gltf.scene);
  
  // Additional minimap setup can go here
});
```

### Step 5: Add Enemies and Items to Minimap

For each enemy or item in your game, add corresponding markers:

```javascript
// For enemies:
levelObject.traverse(child => {
  // Check if this object is an enemy
  if (child.userData && child.userData.type === 'enemy') {
    // Store reference to the enemy
    enemies.push(child);
    
    // Add to minimap
    const marker = minimap.addEnemyMarker(child);
    
    // Optionally store reference to the marker
    enemyMarkers.push(marker);
  }
  
  // Check for items
  if (child.userData && child.userData.type) {
    if (['health', 'weapon', 'ammo'].includes(child.userData.type)) {
      const marker = minimap.addItemMarker(child, child.userData.type);
      itemMarkers.push(marker);
    }
  }
  
  // Check for objectives
  if (child.userData && child.userData.objective) {
    const id = minimap.addObjectiveMarker(
      child.position,
      child.userData.objectiveType || 'primary',
      child.userData.objectiveLabel || ''
    );
    objectives.push(id);
  }
});
```

### Step 6: Update the Minimap in Animation Loop

In your main animation/game loop, add:

```javascript
function animate() {
  requestAnimationFrame(animate);
  
  // Game updates here
  
  // Update minimap
  minimap.update();
  
  // Render scene
  renderer.render(scene, camera);
}
```

### Step 7: Add Keyboard Controls

Implement keyboard controls for minimap functionality:

```javascript
document.addEventListener('keydown', (event) => {
  switch(event.code) {
    // Game controls
    
    // Minimap controls
    case 'KeyM': toggleMinimapSize(); break;
    case 'KeyR': minimap.toggleRotation(); break;
  }
});

// Function to toggle minimap size
function toggleMinimapSize() {
  const sizes = [150, 180, 220, 280];
  const currentSize = parseInt(minimap.container.style.width);
  
  let nextSizeIndex = 0;
  for (let i = 0; i < sizes.length; i++) {
    if (currentSize === sizes[i]) {
      nextSizeIndex = (i + 1) % sizes.length;
      break;
    }
  }
  
  minimap.resize(sizes[nextSizeIndex]);
}
```

### Step 8: Handle Window Resizing

Ensure the minimap adjusts properly when the window is resized:

```javascript
window.addEventListener('resize', () => {
  // Update camera
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  // Minimap resize is automatic if using percentage sizing
  // If using fixed sizing, no action needed
});
```

## Integration Specific Instructions

### Data Structure Requirements

1. **Player Object**: Must have:
   - `position` (THREE.Vector3)
   - `rotation` (with accessible `.y` property for heading)

2. **Enemy Objects**: Should have:
   - `position` (THREE.Vector3)
   - Ideally mark them in `userData.type = 'enemy'`

3. **Item Objects**: Should have:
   - `position` (THREE.Vector3)
   - Ideally mark them in `userData.type = 'health'/'weapon'/'ammo'`

### Marking Objectives

To define objectives in your game world:

```javascript
// Create an objective
const objective = new THREE.Object3D();
objective.position.set(x, y, z);
objective.userData.objective = true;
objective.userData.objectiveType = 'primary'; // or 'secondary', 'bonus'
objective.userData.objectiveLabel = 'Reach the exit';
scene.add(objective);

// Later, add it to minimap
const id = minimap.addObjectiveMarker(
  objective.position,
  objective.userData.objectiveType,
  objective.userData.objectiveLabel
);
objectives.push(id);
```

### Dynamic Enemy/Item Management

For games where enemies or items are created or destroyed dynamically:

```javascript
// When spawning a new enemy
function spawnEnemy(position) {
  const enemy = createEnemyAtPosition(position);
  enemies.push(enemy);
  
  // Add to minimap
  const marker = minimap.addEnemyMarker(enemy);
  enemyMarkers.push(marker);
  
  return enemy;
}

// When enemy is defeated/removed
function removeEnemy(enemy, index) {
  // Find and remove marker
  for (let i = 0; i < enemyMarkers.length; i++) {
    if (enemyMarkers[i].userData.enemy === enemy) {
      // Remove from minimap scene
      minimap.markers.enemies.remove(enemyMarkers[i]);
      enemyMarkers.splice(i, 1);
      break;
    }
  }
  
  // Remove enemy from game
  scene.remove(enemy);
  enemies.splice(index, 1);
}
```

## Testing and Troubleshooting

After implementation, verify:

1. **Minimap Display**: Check if the minimap appears correctly in the specified position
2. **Player Marker**: Verify the player marker moves and rotates with the player
3. **Enemy Markers**: Confirm enemies appear on the minimap when in range
4. **Item Markers**: Check if items appear with correct colors
5. **Objective Markers**: Test if objectives are properly displayed
6. **Rotation Toggle**: Verify the rotation toggle works correctly
7. **Zoom Controls**: Test zoom in/out functionality

Common issues and solutions:

1. **Missing Minimap**: 
   - Check if CSS conflicts are preventing display
   - Verify container is appended to document body

2. **Incorrect Positions**:
   - Ensure world scales match between game and minimap
   - Check if the `scale` option is appropriate for your level size

3. **Performance Issues**:
   - Increase `updateFrequency` to update less often
   - Decrease `lowResolutionFactor` for lower resolution rendering
   - Verify `simplifyGeometry` is enabled

## Optimization Tips

1. **Level Geometry**: For very large levels, consider:
   ```javascript
   // Create a simplified representation specifically for the minimap
   const minimapGeometry = new THREE.PlaneGeometry(levelWidth, levelHeight);
   const minimapMaterial = new THREE.MeshBasicMaterial({
     map: minimapTexture, // A top-down image of your level
     transparent: true
   });
   const minimapMesh = new THREE.Mesh(minimapGeometry, minimapMaterial);
   minimap.levelMap.add(minimapMesh);
   ```

2. **Update Frequency**:
   - For high-action games, use `updateFrequency: 1`
   - For slower-paced games, increase to `2` or `3`

3. **Feature Selection**:
   - Disable unnecessary features like `fogOfWar` or `radarSweep` if not needed

## Common Pitfalls to Avoid

1. **Coordinate System Mismatch**: Ensure your game uses the same coordinate system as the minimap (Y-up typically)

2. **Marker Overload**: Too many markers can cause clutter and performance issues. Consider:
   ```javascript
   // Group similar items
   addItemGroupMarker(itemPositions, 'ammo');
   
   // Or implement density-based clustering
   ```

3. **Memory Leaks**: When removing objects from your game:
   ```javascript
   // Always properly dispose of THREE.js objects
   // And remove markers from the minimap
   ```

4. **Missing User-Interface Feedback**: Add visual/audio cues:
   ```javascript
   // Flash enemy marker when detected
   marker.userData.pulse.mesh.material.opacity = 1;
   setTimeout(() => {
     marker.userData.pulse.mesh.material.opacity = 0.3;
   }, 300);
   ```

## Final Integration Checklist

- [ ] AdvancedMinimap class implemented
- [ ] Minimap initialized with appropriate options
- [ ] Level geometry added to minimap
- [ ] Enemy and item markers added
- [ ] Minimap update integrated into animation loop
- [ ] Keyboard controls implemented
- [ ] Window resize handler added
- [ ] Tested and optimized for performance

By following these steps, you'll successfully implement a professional minimap system that enhances your Three.js FPS game with features comparable to commercial titles.